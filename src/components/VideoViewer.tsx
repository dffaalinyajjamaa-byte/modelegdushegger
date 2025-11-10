import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Play, ExternalLink } from 'lucide-react';
import { validateContentUrl } from '@/lib/content-utils';

interface Content {
  id: string;
  title: string;
  description: string;
  type: string;
  url: string;
  grade_level: string;
  subject: string;
}

interface VideoViewerProps {
  content: Content;
  onBack: () => void;
  onLogActivity: (type: string, description: string, metadata?: any) => void;
}

export default function VideoViewer({ content, onBack, onLogActivity }: VideoViewerProps) {
  const [watchTime, setWatchTime] = useState(0);

  useEffect(() => {
    // Log activity when component mounts
    onLogActivity('video_opened', `Opened video: ${content.title}`, {
      video_id: content.id,
      subject: content.subject,
      grade_level: content.grade_level
    });

    // Track watch time
    const interval = setInterval(() => {
      setWatchTime(prev => prev + 1);
    }, 1000);

    return () => {
      clearInterval(interval);
      // Log watch time when leaving
      if (watchTime > 0) {
        onLogActivity('video_watch_time', `Watched ${content.title} for ${Math.floor(watchTime / 60)} minutes`, {
          video_id: content.id,
          watch_time_seconds: watchTime
        });
      }
    };
  }, []);

  const embedUrl = validateContentUrl(content.url, 'video');

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
            <Play className="w-6 h-6 text-primary" />
            {content.title}
          </CardTitle>
          {content.description && (
            <p className="text-muted-foreground">{content.description}</p>
          )}
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Video Player */}
            <div className="relative w-full">
              <div className="aspect-video bg-black rounded-lg overflow-hidden shadow-lg">
                <iframe
                  src={embedUrl}
                  title={content.title}
                  className="w-full h-full"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  style={{
                    border: 'none'
                  }}
                />
              </div>
            </div>

            {/* Video Controls and Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Video Information</CardTitle>
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
                    <span className="font-medium">Watch Time:</span>
                    <span className="ml-2">
                      {Math.floor(watchTime / 60)}:{(watchTime % 60).toString().padStart(2, '0')}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full mt-4"
                    onClick={() => window.open(content.url, '_blank')}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Open in YouTube
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Learning Tips</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2 text-sm">
                    <p>📝 <strong>Take Notes:</strong> Write down key concepts as you watch</p>
                    <p>⏯️ <strong>Pause & Replay:</strong> Don't hesitate to pause and rewatch difficult sections</p>
                    <p>❓ <strong>Ask Questions:</strong> Use the AI Teacher to clarify concepts after watching</p>
                    <p>📚 <strong>Practice:</strong> Apply what you learned through exercises and tasks</p>
                    <p>🔁 <strong>Review:</strong> Watch the video again before exams for better retention</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Motivational Message */}
            <Card className="gradient-secondary text-center text-white">
              <CardContent className="pt-6">
                <h3 className="text-xl font-bold mb-2">Keep Learning! 🌟</h3>
                <p>
                  Every minute you spend learning brings you closer to your goals. 
                  You're doing amazing work by engaging with this content!
                </p>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}