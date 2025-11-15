import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Clock, Calendar, MoreHorizontal } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

interface RecentLesson {
  id: string;
  title: string;
  activity_type: string;
  subject: string | null;
  start_time: string | null;
  created_at: string;
  duration_minutes: number | null;
}

interface RecentLessonsProps {
  userId: string;
}

const RecentLessons = ({ userId }: RecentLessonsProps) => {
  const [lessons, setLessons] = useState<RecentLesson[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecentLessons();
  }, [userId]);

  const fetchRecentLessons = async () => {
    try {
      const { data, error } = await supabase
        .from('user_activity_log')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setLessons(data || []);
    } catch (error) {
      console.error('Error fetching recent lessons:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateString: string | null) => {
    if (!dateString) return '--:--';
    try {
      return format(new Date(dateString), 'hh:mm a');
    } catch {
      return '--:--';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd MMM');
    } catch {
      return 'Today';
    }
  };

  const formatTimeRange = (startTime: string | null, duration: number | null) => {
    if (!startTime || !duration) return '--:-- - --:--';
    try {
      const start = new Date(startTime);
      const end = new Date(start.getTime() + duration * 60000);
      return `${format(start, 'hh:mm')}-${format(end, 'hh:mm a')}`;
    } catch {
      return '--:-- - --:--';
    }
  };

  if (loading) {
    return (
      <Card className="bg-card rounded-2xl p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">Last Lessons</h3>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-4 p-3 bg-muted rounded-xl animate-pulse h-16" />
          ))}
        </div>
      </Card>
    );
  }

  if (lessons.length === 0) {
    return (
      <Card className="bg-card rounded-2xl p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">Last Lessons</h3>
        </div>
        <div className="text-center py-8 text-muted-foreground">
          <p>No recent lessons yet. Start learning!</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-card rounded-2xl p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-lg">Last Lessons</h3>
        <Button variant="ghost" size="icon">
          <MoreHorizontal className="w-5 h-5" />
        </Button>
      </div>

      <div className="space-y-3">
        {lessons.map((lesson) => (
          <div 
            key={lesson.id} 
            className="flex items-center gap-3 sm:gap-4 p-3 bg-muted/50 hover:bg-muted rounded-xl transition-colors cursor-pointer"
          >
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-background rounded-xl flex items-center justify-center flex-shrink-0">
              <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            </div>

            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-sm sm:text-base truncate">{lesson.title}</h4>
              <p className="text-xs text-muted-foreground">
                {lesson.subject || 'General'}
              </p>
            </div>

            <div className="text-right text-xs text-muted-foreground flex-shrink-0">
              <div className="flex items-center gap-1 justify-end">
                <Calendar className="w-3 h-3" />
                <span>{formatDate(lesson.created_at)}</span>
              </div>
              <div className="flex items-center gap-1 justify-end mt-1">
                <Clock className="w-3 h-3" />
                <span className="hidden sm:inline">
                  {formatTimeRange(lesson.start_time, lesson.duration_minutes)}
                </span>
                <span className="sm:hidden">
                  {formatTime(lesson.start_time)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default RecentLessons;
