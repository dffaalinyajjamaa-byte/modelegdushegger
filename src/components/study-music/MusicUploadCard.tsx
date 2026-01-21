import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, FileText, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

interface MusicUploadCardProps {
  userId: string;
  uploadedFile: { url: string; name: string } | null;
  onFileUploaded: (file: { url: string; name: string } | null) => void;
  subject: string;
  onSubjectChange: (subject: string) => void;
  grade: string;
  onGradeChange: (grade: string) => void;
  disabled?: boolean;
}

const subjects = [
  'Mathematics',
  'Physics',
  'Chemistry',
  'Biology',
  'English',
  'History',
  'Geography',
  'Civics',
  'Economics',
  'Afaan Oromoo',
  'Amharic',
  'Other'
];

const grades = ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];

export default function MusicUploadCard({
  userId,
  uploadedFile,
  onFileUploaded,
  subject,
  onSubjectChange,
  grade,
  onGradeChange,
  disabled
}: MusicUploadCardProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast.error('Please upload a PDF file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const fileName = `${userId}/${Date.now()}-${file.name}`;
      
      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const { data, error } = await supabase.storage
        .from('study-music-pdfs')
        .upload(fileName, file);

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('study-music-pdfs')
        .getPublicUrl(data.path);

      onFileUploaded({
        url: urlData.publicUrl,
        name: file.name
      });

      toast.success('PDF uploaded successfully!');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload PDF');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleRemoveFile = () => {
    onFileUploaded(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Card className="p-6 bg-gradient-to-br from-pink-500/10 to-purple-500/10 border-pink-500/30">
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="h-5 w-5 text-pink-500" />
          <h3 className="font-semibold">Upload Your Study Material</h3>
        </div>

        {!uploadedFile ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileSelect}
              disabled={disabled || isUploading}
              className="hidden"
            />
            <Button
              variant="outline"
              className="w-full h-32 border-2 border-dashed border-pink-500/50 hover:border-pink-500 hover:bg-pink-500/5 flex flex-col items-center justify-center gap-2"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
                  <span className="text-sm text-muted-foreground">
                    Uploading... {uploadProgress}%
                  </span>
                  <div className="w-48 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-pink-500 transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </>
              ) : (
                <>
                  <Upload className="h-8 w-8 text-pink-500" />
                  <span className="text-sm font-medium">Drop PDF here or tap to browse</span>
                  <span className="text-xs text-muted-foreground">Max 10MB</span>
                </>
              )}
            </Button>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between p-4 bg-background/50 rounded-lg border border-pink-500/30"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-pink-500/20 flex items-center justify-center">
                <FileText className="h-5 w-5 text-pink-500" />
              </div>
              <div>
                <p className="font-medium text-sm truncate max-w-[180px]">{uploadedFile.name}</p>
                <p className="text-xs text-muted-foreground">PDF uploaded</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRemoveFile}
              disabled={disabled}
              className="text-muted-foreground hover:text-destructive"
            >
              <X className="h-4 w-4" />
            </Button>
          </motion.div>
        )}

        <div className="grid grid-cols-2 gap-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Select value={subject} onValueChange={onSubjectChange} disabled={disabled}>
              <SelectTrigger id="subject">
                <SelectValue placeholder="Select subject" />
              </SelectTrigger>
              <SelectContent>
                {subjects.map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="grade">Grade</Label>
            <Select value={grade} onValueChange={onGradeChange} disabled={disabled}>
              <SelectTrigger id="grade">
                <SelectValue placeholder="Select grade" />
              </SelectTrigger>
              <SelectContent>
                {grades.map(g => (
                  <SelectItem key={g} value={g}>{g}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </Card>
  );
}