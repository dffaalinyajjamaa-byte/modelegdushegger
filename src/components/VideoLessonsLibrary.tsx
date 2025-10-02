import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, FolderOpen, Video } from 'lucide-react';

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
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <Button onClick={onBack} variant="ghost" className="mb-6">
          ← Back
        </Button>

        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2 flex items-center gap-3">
            <Video className="w-8 h-8 md:w-10 md:h-10 text-primary" />
            Video Lessons
          </h1>
          <p className="text-muted-foreground">Browse lessons by subject</p>
        </div>

        {!selectedSubject ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {subjects.map((subject) => (
              <Card
                key={subject}
                className="cursor-pointer hover-scale bg-gradient-to-br from-accent/10 to-primary/10 border-primary/20 backdrop-blur-sm"
                onClick={() => setSelectedSubject(subject)}
              >
                <CardContent className="p-6 md:p-8 text-center">
                  <FolderOpen className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-4 text-accent" />
                  <h3 className="text-xl md:text-2xl font-bold">{subject}</h3>
                  <p className="text-sm text-muted-foreground mt-2">
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
              className="mb-6"
            >
              ← All Subjects
            </Button>
            <h2 className="text-2xl font-bold mb-6">{selectedSubject}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {filteredVideos.map((video) => (
                <Card
                  key={video.id}
                  className="cursor-pointer hover-scale bg-card/80 backdrop-blur-sm border-primary/20"
                  onClick={() => onVideoClick(video)}
                >
                  <CardContent className="p-6">
                    <div className="relative mb-4 bg-primary/10 rounded-lg aspect-video flex items-center justify-center">
                      <Play className="w-16 h-16 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{video.title}</h3>
                    {video.description && (
                      <p className="text-sm text-muted-foreground mb-2">
                        {video.description}
                      </p>
                    )}
                    {video.grade_level && (
                      <p className="text-xs text-muted-foreground">
                        Grade: {video.grade_level}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoLessonsLibrary;
