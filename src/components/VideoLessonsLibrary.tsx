import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Play, FolderOpen, Video, ArrowLeft, Award, Clock } from 'lucide-react';
import { validateContentUrl } from '@/lib/content-utils';
import { getYouTubeThumbnail } from '@/lib/youtube-utils';
import { useAllVideoProgress } from '@/hooks/use-video-progress';
import { useContentPoints } from '@/hooks/use-content-points';

interface VideoLessonsLibraryProps {
  user: User;
  onBack: () => void;
  onVideoClick: (video: any) => void;
  embedded?: boolean;
}

interface VideoLesson {
  id: string;
  title: string;
  description: string;
  subject: string;
  grade_level: string;
  url: string;
}

const VideoLessonsLibrary = ({ user, onBack, onVideoClick, embedded = false }: VideoLessonsLibraryProps) => {
  const [videos, setVideos] = useState<VideoLesson[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [thumbnailErrors, setThumbnailErrors] = useState<Set<string>>(new Set());
  const { progressMap, loading: progressLoading } = useAllVideoProgress(user.id);
  const { awardPointsForContent } = useContentPoints();

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

  // Sort videos: in-progress first, then unwatched, then completed
  const sortedVideos = [...filteredVideos].sort((a, b) => {
    const progressA = progressMap[a.id];
    const progressB = progressMap[b.id];
    
    const scoreA = progressA 
      ? (progressA.completed ? 0 : (progressA.percentage_watched > 0 ? 2 : 1))
      : 1;
    const scoreB = progressB 
      ? (progressB.completed ? 0 : (progressB.percentage_watched > 0 ? 2 : 1))
      : 1;
    
    return scoreB - scoreA;
  });

  const displayVideos = embedded && !selectedSubject ? sortedVideos.slice(0, 6) : sortedVideos;

  // Get continue watching videos
  const continueWatching = sortedVideos.filter(v => {
    const prog = progressMap[v.id];
    return prog && prog.percentage_watched > 0 && !prog.completed;
  }).slice(0, 3);

  return (
    <div className={embedded ? "" : "min-h-screen mobile-p"}>
      <div className="max-w-7xl mx-auto">
        {!embedded && (
          <Button onClick={onBack} variant="outline" className="mb-4 glass-card hover:neon-glow-cyan tap-scale">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        )}

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

            {/* Continue Watching Section */}
            {continueWatching.length > 0 && (
              <div className="mb-8">
                <h2 className="text-lg md:text-xl font-bold mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  Continue Watching
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                  {continueWatching.map((video) => {
                    const videoUrl = validateContentUrl(video.url, 'video');
                    const videoProgress = progressMap[video.id];
                    return (
                      <Card
                        key={video.id}
                        className="cursor-pointer hover-scale tap-scale glass-card hover:neon-glow-cyan border-primary/20"
                        onClick={() => {
                          awardPointsForContent(user.id, 'video', video.id);
                          onVideoClick({ ...video, url: videoUrl });
                        }}
                      >
                        <CardContent className="p-0">
                          <div className="relative w-full h-40 md:h-48 bg-black/10 overflow-hidden rounded-t-lg">
                            {!thumbnailErrors.has(video.id) ? (
                              <img 
                                src={getYouTubeThumbnail(videoUrl, 'hq')}
                                alt={video.title}
                                className="w-full h-full object-cover"
                                loading="lazy"
                                crossOrigin="anonymous"
                                onError={(e) => {
                                  const currentSrc = e.currentTarget.src;
                                  if (currentSrc.includes('hqdefault')) {
                                    e.currentTarget.src = getYouTubeThumbnail(videoUrl, 'mq');
                                  } else if (currentSrc.includes('mqdefault')) {
                                    e.currentTarget.src = getYouTubeThumbnail(videoUrl, 'default');
                                  } else {
                                    setThumbnailErrors(prev => new Set(prev).add(video.id));
                                  }
                                }}
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center">
                                <div className="text-center text-white">
                                  <Play className="w-12 h-12 mx-auto mb-2" />
                                  <p className="text-sm font-medium">Video Preview</p>
                                </div>
                              </div>
                            )}
                            
                            <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                              <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center">
                                <Play className="w-8 h-8 text-red-600 ml-1" />
                              </div>
                            </div>

                            {/* Progress indicator overlay */}
                            {videoProgress && (
                              <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/40">
                                <div 
                                  className="h-full bg-red-600 transition-all"
                                  style={{ width: `${videoProgress.percentage_watched}%` }}
                                />
                              </div>
                            )}
                          </div>
                          
                          <div className="p-4">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <h3 className="text-sm md:text-base font-semibold line-clamp-2 flex-1">
                                {video.title}
                              </h3>
                              {videoProgress && (
                                <Badge 
                                  variant="secondary" 
                                  className={
                                    videoProgress.percentage_watched < 30 
                                      ? 'bg-muted' 
                                      : videoProgress.percentage_watched < 90 
                                      ? 'bg-blue-500 text-white' 
                                      : 'bg-green-500 text-white'
                                  }
                                >
                                  {videoProgress.percentage_watched}%
                                </Badge>
                              )}
                            </div>
                            {video.description && (
                              <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                                {video.description}
                              </p>
                            )}
                            {videoProgress && (
                              <Progress value={videoProgress.percentage_watched} className="h-1 mb-2" />
                            )}
                            {video.grade_level && (
                              <p className="text-xs text-primary">
                                {video.grade_level}
                              </p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            <h2 className="text-xl md:text-2xl font-bold mb-4">{selectedSubject}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              {displayVideos.map((video) => {
                const videoUrl = validateContentUrl(video.url, 'video');
                const videoProgress = progressMap[video.id];
                return (
                  <Card
                    key={video.id}
                    className="cursor-pointer hover-scale tap-scale glass-card hover:neon-glow-cyan border-primary/20"
                    onClick={() => {
                      awardPointsForContent(user.id, 'video', video.id);
                      onVideoClick({ ...video, url: videoUrl });
                    }}
                  >
                    <CardContent className="p-0">
                      <div className="relative w-full h-40 md:h-48 bg-black/10 overflow-hidden rounded-t-lg">
                        {!thumbnailErrors.has(video.id) ? (
                          <img 
                            src={getYouTubeThumbnail(videoUrl, 'hq')}
                            alt={video.title}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            crossOrigin="anonymous"
                            onError={(e) => {
                              const currentSrc = e.currentTarget.src;
                              if (currentSrc.includes('hqdefault')) {
                                e.currentTarget.src = getYouTubeThumbnail(videoUrl, 'mq');
                              } else if (currentSrc.includes('mqdefault')) {
                                e.currentTarget.src = getYouTubeThumbnail(videoUrl, 'default');
                              } else {
                                setThumbnailErrors(prev => new Set(prev).add(video.id));
                              }
                            }}
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center">
                            <div className="text-center text-white">
                              <Play className="w-12 h-12 mx-auto mb-2" />
                              <p className="text-sm font-medium">Video Preview</p>
                            </div>
                          </div>
                        )}
                        
                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                          <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center">
                            <Play className="w-8 h-8 text-red-600 ml-1" />
                          </div>
                        </div>

                        {/* Progress indicator overlay */}
                        {videoProgress && (
                          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/40">
                            <div 
                              className="h-full bg-red-600 transition-all"
                              style={{ width: `${videoProgress.percentage_watched}%` }}
                            />
                          </div>
                        )}
                      </div>
                      
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h3 className="text-sm md:text-base font-semibold line-clamp-2 flex-1">
                            {video.title}
                          </h3>
                          {videoProgress && (
                            <Badge 
                              variant="secondary" 
                              className={
                                videoProgress.completed
                                  ? 'bg-green-500 text-white gap-1'
                                  : videoProgress.percentage_watched < 30 
                                  ? 'bg-muted' 
                                  : 'bg-blue-500 text-white'
                              }
                            >
                              {videoProgress.completed && <Award className="w-3 h-3" />}
                              {videoProgress.percentage_watched}%
                            </Badge>
                          )}
                        </div>
                        {video.description && (
                          <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                            {video.description}
                          </p>
                        )}
                        {videoProgress && videoProgress.percentage_watched > 0 && (
                          <Progress value={videoProgress.percentage_watched} className="h-1 mb-2" />
                        )}
                        {video.grade_level && (
                          <p className="text-xs text-primary">
                            {video.grade_level}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            {embedded && !selectedSubject && videos.length > 6 && (
              <div className="mt-6 text-center">
                <Button onClick={() => setSelectedSubject(subjects[0] || null)} variant="outline">
                  View All Videos
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoLessonsLibrary;
