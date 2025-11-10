import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, FolderOpen, Video, ArrowLeft } from 'lucide-react';
import { validateContentUrl } from '@/lib/content-utils';

interface VideoLessonsLibraryProps {
  user: User;
  onBack: () => void;
  onVideoClick: (video: any) => void;
}

interface VideoLesson {
  id: string;
  title: string;
  description: string;
  subject: string;
  grade_level: string;
  url: string;
}

const VideoLessonsLibrary = ({ user, onBack, onVideoClick }: VideoLessonsLibraryProps) => {
  const [videos, setVideos] = useState<VideoLesson[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    const { data, error } = await supabase
      .from('content')
      .select('*')
      .eq('type', 'video')
      .order('subject', { ascending: true });

    if (data && !error) {
      setVideos(data);
    }
    setLoading(false);
  };

  const subjects = Array.from(new Set(videos.map(video => video.subject))).filter(Boolean);

  const filteredVideos = selectedSubject
    ? videos.filter(video => video.subject === selectedSubject)
    : videos;

  return (
    <div className="min-h-screen mobile-p">
      <div className="max-w-7xl mx-auto">
        <Button onClick={onBack} variant="outline" className="mb-4 glass-card hover:neon-glow-cyan tap-scale">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold mb-2 flex items-center gap-3 motivational-text">
            <Video className="w-7 h-7 md:w-8 md:h-8" />
            Video Lessons
          </h1>
          <p className="text-sm md:text-base text-muted-foreground">Browse by subject</p>
        </div>

        {!selectedSubject ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {subjects.map((subject) => (
              <Card
                key={subject}
                className="cursor-pointer hover-scale tap-scale glass-card hover:neon-glow-purple border-secondary/30"
                onClick={() => setSelectedSubject(subject)}
              >
                <CardContent className="p-4 md:p-6 text-center">
                  <FolderOpen className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-3 text-secondary" />
                  <h3 className="text-base md:text-lg font-bold">{subject}</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {videos.filter(v => v.subject === subject).length} lessons
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div>
            <Button
              onClick={() => setSelectedSubject(null)}
              variant="outline"
              className="mb-4 glass-card hover:neon-glow-purple tap-scale"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              All Subjects
            </Button>
            <h2 className="text-xl md:text-2xl font-bold mb-4">{selectedSubject}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              {filteredVideos.map((video) => {
                // Validate and fix video URL
                const videoUrl = validateContentUrl(video.url, 'video');
                return (
                  <Card
                    key={video.id}
                    className="cursor-pointer hover-scale tap-scale glass-card hover:neon-glow-cyan border-primary/20"
                    onClick={() => onVideoClick({ ...video, url: videoUrl })}
                  >
                    <CardContent className="p-4">
                      <div className="relative mb-3 glass-card rounded-xl aspect-video flex items-center justify-center shadow-neon">
                        <Play className="w-12 h-12 md:w-14 md:h-14 text-primary" />
                      </div>
                      <h3 className="text-sm md:text-base font-semibold mb-1 line-clamp-2">{video.title}</h3>
                      {video.description && (
                        <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                          {video.description}
                        </p>
                      )}
                      {video.grade_level && (
                        <p className="text-xs text-primary">
                          {video.grade_level}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoLessonsLibrary;
