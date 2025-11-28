import { useState, useEffect, useRef } from 'react';
import { User } from '@supabase/supabase-js';
import YouTube, { YouTubeProps } from 'react-youtube';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Play, ExternalLink, Award } from 'lucide-react';
import { getYouTubeVideoId } from '@/lib/youtube-utils';
import { useVideoProgress } from '@/hooks/use-video-progress';

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
  user: User;
  onBack: () => void;
  onLogActivity: (type: string, description: string, metadata?: any) => void;
  onVideoWatched?: () => void;
}

export default function VideoViewer({ content, user, onBack, onLogActivity, onVideoWatched }: VideoViewerProps) {
  const [watchTime, setWatchTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const playerRef = useRef<any>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const { progress, loading: progressLoading, updateProgress } = useVideoProgress(
    user.id,
    content.id
  );

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
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      // Save final progress before unmounting
      saveCurrentProgress();
      
      // Log watch time when leaving
      if (watchTime > 0) {
        onLogActivity('video_watch_time', `Watched ${content.title} for ${Math.floor(watchTime / 60)} minutes`, {
          video_id: content.id,
          watch_time_seconds: watchTime
        });
      }
    };
  }, []);

  const videoId = getYouTubeVideoId(content.url);

  const saveCurrentProgress = async () => {
    if (playerRef.current && isPlaying) {
      const currentTime = await playerRef.current.getCurrentTime();
      const duration = await playerRef.current.getDuration();
      if (currentTime && duration) {
        updateProgress(currentTime, duration);
      }
    }
  };

  const onPlayerReady: YouTubeProps['onReady'] = async (event) => {
    playerRef.current = event.target;
    
    // Resume from saved position
    if (progress && progress.playback_time > 0 && !progress.completed) {
      await event.target.seekTo(progress.playback_time, true);
    }
  };

  const onPlayerStateChange: YouTubeProps['onStateChange'] = (event) => {
    // State: 1 = playing, 2 = paused
    if (event.data === 1) {
      setIsPlaying(true);
      // Start tracking progress every 5 seconds
      if (!progressIntervalRef.current) {
        progressIntervalRef.current = setInterval(saveCurrentProgress, 5000);
      }
    } else if (event.data === 2) {
      setIsPlaying(false);
      // Save progress when paused
      saveCurrentProgress();
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    }
  };

  const opts: YouTubeProps['opts'] = {
    height: '100%',
    width: '100%',
    playerVars: {
      autoplay: 0,
      modestbranding: 1,
      rel: 0,
    },
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
                {videoId ? (
                  <YouTube
                    videoId={videoId}
                    opts={opts}
                    onReady={onPlayerReady}
                    onStateChange={onPlayerStateChange}
                    className="w-full h-full"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white">
                    <p>Invalid video URL</p>
                  </div>
                )}
              </div>
              
              {/* Progress Bar */}
              {progress && progress.percentage_watched > 0 && (
                <div className="mt-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">
                      {progress.percentage_watched}% watched
                    </span>
                    {progress.completed && (
                      <Badge variant="default" className="gap-1">
                        <Award className="w-3 h-3" />
                        Completed
                      </Badge>
                    )}
                  </div>
                  <Progress value={progress.percentage_watched} className="h-2" />
                </div>
              )}
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