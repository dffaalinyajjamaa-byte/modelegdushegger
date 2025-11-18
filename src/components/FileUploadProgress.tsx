import { Progress } from '@/components/ui/progress';
import { X, FileText, Image, Mic } from 'lucide-react';
import { Button } from './ui/button';

interface FileUploadProgressProps {
  fileName: string;
  fileType: 'image' | 'pdf' | 'audio';
  progress: number;
  onCancel: () => void;
}

export default function FileUploadProgress({ 
  fileName, 
  fileType, 
  progress, 
  onCancel 
}: FileUploadProgressProps) {
  const getIcon = () => {
    switch (fileType) {
      case 'image':
        return <Image className="w-5 h-5 text-primary" />;
      case 'pdf':
        return <FileText className="w-5 h-5 text-red-500" />;
      case 'audio':
        return <Mic className="w-5 h-5 text-primary" />;
    }
  };

  return (
    <div className="bg-muted/50 backdrop-blur-sm p-3 rounded-lg space-y-2 border border-border/50">
      <div className="flex items-center gap-3">
        {getIcon()}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{fileName}</p>
          <p className="text-xs text-muted-foreground">{progress}% uploaded</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 flex-shrink-0"
          onClick={onCancel}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
      <Progress value={progress} className="h-1.5" />
    </div>
  );
}
