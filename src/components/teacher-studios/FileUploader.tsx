import { useState, useRef } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Upload, File, FileText, Video, X, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface FileUploaderProps {
  user: User;
  onUploadComplete: (fileUrl: string, fileName: string) => void;
  acceptedTypes?: string;
  maxSizeMB?: number;
}

export default function FileUploader({ 
  user, 
  onUploadComplete, 
  acceptedTypes = ".pdf,.mp4,.webm,.mov",
  maxSizeMB = 50
}: FileUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size
    if (file.size > maxSizeMB * 1024 * 1024) {
      toast({
        title: "File too large",
        description: `Maximum file size is ${maxSizeMB}MB`,
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
  };

  const getFileIcon = (file: File) => {
    if (file.type.includes('pdf')) return <FileText className="w-8 h-8 text-red-500" />;
    if (file.type.includes('video')) return <Video className="w-8 h-8 text-purple-500" />;
    return <File className="w-8 h-8 text-blue-500" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setProgress(0);

    try {
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Date.now()}_${selectedFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const filePath = `teacher-content/${user.id}/${fileName}`;

      // Simulate progress (Supabase doesn't provide upload progress)
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const { data, error } = await supabase.storage
        .from('media')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: false,
        });

      clearInterval(progressInterval);

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('media')
        .getPublicUrl(filePath);

      setProgress(100);

      toast({
        title: "Upload successful!",
        description: `${selectedFile.name} has been uploaded`,
      });

      onUploadComplete(urlData.publicUrl, selectedFile.name);
      
      // Reset after short delay
      setTimeout(() => {
        setSelectedFile(null);
        setProgress(0);
        setUploading(false);
      }, 1000);

    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
      setUploading(false);
      setProgress(0);
    }
  };

  const clearSelection = () => {
    setSelectedFile(null);
    setProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedTypes}
        onChange={handleFileSelect}
        className="hidden"
      />

      {!selectedFile ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
        >
          <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
          <p className="font-medium">Click to upload a file</p>
          <p className="text-sm text-muted-foreground mt-1">
            PDF, MP4, WebM up to {maxSizeMB}MB
          </p>
        </div>
      ) : (
        <div className="border rounded-lg p-4 space-y-4">
          <div className="flex items-center gap-4">
            {getFileIcon(selectedFile)}
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{selectedFile.name}</p>
              <p className="text-sm text-muted-foreground">
                {formatFileSize(selectedFile.size)}
              </p>
            </div>
            {!uploading && (
              <Button variant="ghost" size="icon" onClick={clearSelection}>
                <X className="w-4 h-4" />
              </Button>
            )}
            {progress === 100 && (
              <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                <Check className="w-5 h-5 text-green-500" />
              </div>
            )}
          </div>

          {uploading && (
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground text-center">
                {progress < 100 ? 'Uploading...' : 'Complete!'}
              </p>
            </div>
          )}

          {!uploading && progress !== 100 && (
            <Button onClick={handleUpload} className="w-full">
              <Upload className="w-4 h-4 mr-2" />
              Upload File
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
