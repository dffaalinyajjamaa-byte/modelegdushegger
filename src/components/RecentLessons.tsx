import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Clock, Calendar, Play, Video } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { format, formatDistanceToNow } from 'date-fns';
interface VideoProgress {
  content_id: string;
  playback_time: number;
  total_duration: number;
  percentage_watched: number;
  last_watched_at: string;
  completed: boolean;
}
interface Content {
  id: string;
  title: string;
  subject: string | null;
  type: string;
  url: string;
  description: string | null;
  grade_level: string | null;
}
interface RecentVideoLesson {
  progress: VideoProgress;
  content: Content;
}
interface RecentLessonsProps {
  userId: string;
  onLessonClick?: (content: Content, playbackTime: number) => void;
}
const RecentLessons = ({
  userId,
  onLessonClick
}: RecentLessonsProps) => {
  const [recentVideos, setRecentVideos] = useState<RecentVideoLesson[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchRecentVideos();
  }, [userId]);
  const fetchRecentVideos = async () => {
    try {
      // Fetch recent video progress with content details
      const {
        data: progressData,
        error: progressError
      } = await supabase.from('video_progress').select('*').eq('user_id', userId).eq('completed', false) // Only show incomplete videos
      .order('last_watched_at', {
        ascending: false
      }).limit(10); // Fetch more to account for deduplication

      if (progressError) throw progressError;
      if (!progressData || progressData.length === 0) {
        setRecentVideos([]);
        setLoading(false);
        return;
      }

      // Deduplicate by content_id - keep only the most recent entry for each video
      const seenContentIds = new Set<string>();
      const uniqueProgressData = progressData.filter(p => {
        if (seenContentIds.has(p.content_id)) {
          return false;
        }
        seenContentIds.add(p.content_id);
        return true;
      }).slice(0, 5); // Limit to 5 after deduplication

      // Fetch content for each video progress
      const contentIds = uniqueProgressData.map(p => p.content_id);
      const {
        data: contentData,
        error: contentError
      } = await supabase.from('content').select('*').in('id', contentIds);
      if (contentError) throw contentError;

      // Combine progress with content
      const combined: RecentVideoLesson[] = uniqueProgressData.map(progress => {
        const content = contentData?.find(c => c.id === progress.content_id);
        return {
          progress: {
            content_id: progress.content_id,
            playback_time: Number(progress.playback_time) || 0,
            total_duration: Number(progress.total_duration) || 0,
            percentage_watched: progress.percentage_watched || 0,
            last_watched_at: progress.last_watched_at || '',
            completed: progress.completed || false
          },
          content: content || {
            id: progress.content_id,
            title: 'Unknown Video',
            subject: null,
            type: 'video',
            url: '',
            description: null,
            grade_level: null
          }
        };
      }).filter(item => item.content.title !== 'Unknown Video');
      setRecentVideos(combined);
    } catch (error) {
      console.error('Error fetching recent videos:', error);
    } finally {
      setLoading(false);
    }
  };
  const formatDuration = (seconds: number): string => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  const formatWatchedTime = (dateString: string | null) => {
    if (!dateString) return 'Recently';
    try {
      return formatDistanceToNow(new Date(dateString), {
        addSuffix: true
      });
    } catch {
      return 'Recently';
    }
  };
  if (loading) {
    return <Card className="bg-card rounded-2xl p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">Continue Watching</h3>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="flex items-center gap-4 p-3 bg-muted rounded-xl animate-pulse h-20" />)}
        </div>
      </Card>;
  }
  if (recentVideos.length === 0) {
    return;
  }
  return <Card className="bg-card rounded-2xl p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-lg flex items-center gap-2">
          <Play className="w-5 h-5 text-primary" />
          Continue Watching
        </h3>
      </div>

      <div className="space-y-3">
        {recentVideos.map(item => <div key={item.progress.content_id} className="flex items-center gap-3 sm:gap-4 p-3 bg-muted/50 hover:bg-muted rounded-xl transition-colors cursor-pointer group" onClick={() => onLessonClick?.(item.content, item.progress.playback_time)}>
            {/* Video thumbnail/icon */}
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-primary/20 to-primary/40 rounded-xl flex items-center justify-center flex-shrink-0 relative overflow-hidden">
              <Video className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
              {/* Play overlay on hover */}
              <div className="absolute inset-0 bg-primary/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Play className="w-6 h-6 text-primary-foreground fill-current" />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-sm sm:text-base truncate mb-1">{item.content.title}</h4>
              <p className="text-xs text-muted-foreground mb-2">
                {item.content.subject || 'General'}
              </p>
              
              {/* Progress bar */}
              <div className="flex items-center gap-2">
                <Progress value={item.progress.percentage_watched} className="h-1.5 flex-1" />
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {item.progress.percentage_watched}%
                </span>
              </div>
            </div>

            <div className="text-right text-xs text-muted-foreground flex-shrink-0 space-y-1">
              {/* Time position */}
              <div className="flex items-center gap-1 justify-end">
                <Clock className="w-3 h-3" />
                <span>
                  {formatDuration(item.progress.playback_time)} / {formatDuration(item.progress.total_duration)}
                </span>
              </div>
              {/* Last watched */}
              <div className="flex items-center gap-1 justify-end">
                <Calendar className="w-3 h-3" />
                <span>{formatWatchedTime(item.progress.last_watched_at)}</span>
              </div>
              {/* Resume button */}
              <Button size="sm" variant="secondary" className="mt-1 h-6 text-xs px-2 opacity-0 group-hover:opacity-100 transition-opacity">
                Resume
              </Button>
            </div>
          </div>)}
      </div>
    </Card>;
};
export default RecentLessons;