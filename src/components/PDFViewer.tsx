import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, FileText, ExternalLink, Download, RefreshCw, AlertCircle } from 'lucide-react';
import { validateContentUrl, extractGoogleDriveFileId } from '@/lib/content-utils';

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
  const [readTime, setReadTime] = useState(0);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [iframeError, setIframeError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const handleMarkRead = () => {
    if (!marked && onMaterialRead) {
      onMaterialRead();
      setMarked(true);
      onLogActivity('pdf', `Marked as read: ${content.title}`, { content_id: content.id });
    }
  };

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

  // Get embed URL with fallback options
  const getEmbedUrl = () => {
    const baseUrl = validateContentUrl(content.url, 'pdf');
    
    // If retry, try alternative methods
    if (retryCount > 0) {
      const fileId = extractGoogleDriveFileId(content.url);
      if (fileId) {
        // Alternative embed methods based on retry count
        if (retryCount === 1) {
          return `https://drive.google.com/file/d/${fileId}/preview`;
        } else if (retryCount === 2) {
          return `https://docs.google.com/viewer?srcid=${fileId}&pid=explorer&efh=false&a=v&chrome=false&embedded=true`;
        }
      }
    }
    
    return baseUrl;
  };

  const embedUrl = getEmbedUrl();

  const handleRetry = () => {
    setIframeError(false);
    setIframeLoaded(false);
    setRetryCount(prev => prev + 1);
  };

  const handleOpenExternal = () => {
    window.open(content.url, '_blank');
  };

  const handleDownload = () => {
    const fileId = extractGoogleDriveFileId(content.url);
    if (fileId) {
      window.open(`https://drive.google.com/uc?export=download&id=${fileId}`, '_blank');
    } else {
      window.open(content.url.replace('/preview', '/export?format=pdf').replace('/view', '/export?format=pdf'), '_blank');
    }
  };

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
              {/* Loading State */}
              {!iframeLoaded && !iframeError && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted rounded-lg" style={{ height: '70vh' }}>
                  <div className="text-center">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-muted-foreground">Loading document...</p>
                  </div>
                </div>
              )}

              {/* Error State */}
              {iframeError && (
                <div className="flex items-center justify-center bg-muted rounded-lg" style={{ height: '70vh' }}>
                  <div className="text-center p-6">
                    <AlertCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Unable to load document</h3>
                    <p className="text-muted-foreground mb-4">
                      The document preview may not be available. Try opening it externally.
                    </p>
                    <div className="flex gap-2 justify-center">
                      <Button onClick={handleRetry} variant="outline">
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Retry
                      </Button>
                      <Button onClick={handleOpenExternal}>
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Open Externally
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Iframe */}
              <div 
                className={`bg-white rounded-lg overflow-hidden shadow-lg border ${iframeError ? 'hidden' : ''}`} 
                style={{ height: '70vh' }}
              >
                <iframe
                  key={retryCount} // Force re-render on retry
                  src={embedUrl}
                  title={content.title}
                  className="w-full h-full"
                  frameBorder="0"
                  onLoad={() => setIframeLoaded(true)}
                  onError={() => setIframeError(true)}
                  allow="autoplay"
                  sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
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
                      onClick={handleOpenExternal}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Open in Google Docs
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={handleDownload}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download PDF
                    </Button>
                    {!marked && (
                      <Button
                        className="w-full"
                        onClick={handleMarkRead}
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        Mark as Read (+5 points)
                      </Button>
                    )}
                    {marked && (
                      <div className="text-center text-sm text-green-600 font-medium">
                        ✓ Marked as Read
                      </div>
                    )}
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
