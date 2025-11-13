import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, FileText, ExternalLink, Download, Sparkles, Bookmark } from 'lucide-react';
import { validateContentUrl } from '@/lib/content-utils';
import { supabase } from '@/integrations/supabase/client';
import BookAIChat from './BookAIChat';

interface Content {
  id: string;
  title: string;
  description: string;
  type: string;
  url: string;
  grade_level: string;
  subject: string;
}

interface PDFViewerProps {
  content: Content;
  user: User;
  onBack: () => void;
  onLogActivity: (type: string, description: string, metadata?: any) => void;
  onMaterialRead?: () => void;
}

export default function PDFViewer({ content, user, onBack, onLogActivity, onMaterialRead }: PDFViewerProps) {
  const [marked, setMarked] = useState(false);

  const handleMarkRead = () => {
    if (!marked && onMaterialRead) {
      onMaterialRead();
      setMarked(true);
      onLogActivity('pdf', `Marked as read: ${content.title}`, { content_id: content.id });
    }
  };
  const [readTime, setReadTime] = useState(0);

  useEffect(() => {
    // Log activity when component mounts
    onLogActivity('pdf_opened', `Opened document: ${content.title}`, {
      pdf_id: content.id,
      subject: content.subject,
      grade_level: content.grade_level
    });

    // Track read time
    const interval = setInterval(() => {
      setReadTime(prev => prev + 1);
    }, 1000);

    return () => {
      clearInterval(interval);
      // Log read time when leaving
      if (readTime > 0) {
        onLogActivity('pdf_read_time', `Read ${content.title} for ${Math.floor(readTime / 60)} minutes`, {
          pdf_id: content.id,
          read_time_seconds: readTime
        });
      }
    };
  }, []);

  const embedUrl = validateContentUrl(content.url, 'pdf');

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={onBack} className="flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Button>
        <div className="flex gap-2">
          <Badge variant="secondary">{content.subject}</Badge>
          <Badge variant="outline">{content.grade_level}</Badge>
        </div>
      </div>

      <Card className="shadow-glow">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary" />
            {content.title}
          </CardTitle>
          {content.description && (
            <p className="text-muted-foreground">{content.description}</p>
          )}
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* PDF Viewer */}
            <div className="relative w-full">
              <div className="bg-white rounded-lg overflow-hidden shadow-lg border" style={{ height: '70vh' }}>
                <iframe
                  src={embedUrl}
                  title={content.title}
                  className="w-full h-full"
                  frameBorder="0"
                  style={{
                    border: 'none'
                  }}
                />
              </div>
            </div>

            {/* Document Controls and Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Document Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <span className="font-medium">Subject:</span>
                    <span className="ml-2">{content.subject}</span>
                  </div>
                  <div>
                    <span className="font-medium">Grade Level:</span>
                    <span className="ml-2">{content.grade_level}</span>
                  </div>
                  <div>
                    <span className="font-medium">Read Time:</span>
                    <span className="ml-2">
                      {Math.floor(readTime / 60)}:{(readTime % 60).toString().padStart(2, '0')}
                    </span>
                  </div>
                  <div className="space-y-2 pt-4">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => window.open(content.url, '_blank')}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Open in Google Docs
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        const downloadUrl = content.url.replace('/edit', '/export?format=pdf');
                        window.open(downloadUrl, '_blank');
                      }}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download PDF
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Study Tips</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2 text-sm">
                    <p>📖 <strong>Active Reading:</strong> Read with purpose and take notes</p>
                    <p>🔍 <strong>Key Concepts:</strong> Highlight important terms and definitions</p>
                    <p>📝 <strong>Summarize:</strong> Write brief summaries of each section</p>
                    <p>❓ <strong>Questions:</strong> Ask yourself questions as you read</p>
                    <p>🔄 <strong>Review:</strong> Go back and review highlighted sections</p>
                    <p>💭 <strong>AI Help:</strong> Use the AI Teacher to clarify difficult concepts</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Navigation Tips */}
            <Card className="bg-muted/50">
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-3">Document Navigation Tips:</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p><strong>Zoom:</strong> Use Ctrl + mouse wheel to zoom in/out</p>
                    <p><strong>Search:</strong> Use Ctrl + F to find specific terms</p>
                  </div>
                  <div>
                    <p><strong>Download:</strong> Click download button for offline reading</p>
                    <p><strong>Print:</strong> Use Ctrl + P to print sections you need</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Motivational Message */}
            <Card className="gradient-accent text-center text-white">
              <CardContent className="pt-6">
                <h3 className="text-xl font-bold mb-2">Excellence in Learning! 📚</h3>
                <p>
                  Reading and understanding documents is a crucial skill for academic success. 
                  Take your time, read carefully, and don't hesitate to revisit sections as needed!
                </p>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}