import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Video, BookOpen, ClipboardList } from 'lucide-react';

interface Props { userId: string; }

interface Totals {
  videosToday: number; videosAll: number;
  booksToday: number; booksAll: number;
  tasksToday: number; tasksAll: number;
}

export default function OverallProgressCards({ userId }: Props) {
  const [t, setT] = useState<Totals>({
    videosToday: 0, videosAll: 0, booksToday: 0, booksAll: 0, tasksToday: 0, tasksAll: 0,
  });

  useEffect(() => {
    const fetchAll = async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data } = await supabase
        .from('daily_stats')
        .select('date, videos_watched, materials_read, tasks_completed')
        .eq('user_id', userId);
      if (!data) return;
      let videosAll = 0, booksAll = 0, tasksAll = 0;
      let videosToday = 0, booksToday = 0, tasksToday = 0;
      for (const r of data as any[]) {
        videosAll += r.videos_watched || 0;
        booksAll += r.materials_read || 0;
        tasksAll += r.tasks_completed || 0;
        if (r.date === today) {
          videosToday = r.videos_watched || 0;
          booksToday = r.materials_read || 0;
          tasksToday = r.tasks_completed || 0;
        }
      }
      setT({ videosToday, videosAll, booksToday, booksAll, tasksToday, tasksAll });
    };
    fetchAll();
    const channel = supabase
      .channel(`overall-progress-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_stats', filter: `user_id=eq.${userId}` }, fetchAll)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  const cards = [
    { label: 'Videos Watched', icon: Video, today: t.videosToday, all: t.videosAll, color: 'text-red-500' },
    { label: 'Books Read', icon: BookOpen, today: t.booksToday, all: t.booksAll, color: 'text-blue-500' },
    { label: 'Tasks Done', icon: ClipboardList, today: t.tasksToday, all: t.tasksAll, color: 'text-orange-500' },
  ];

  return (
    <div className="flex gap-3">
      {cards.map(c => {
        const Icon = c.icon;
        return (
          <Card key={c.label} className="flex-1 rounded-lg border bg-card px-3 py-3 sm:px-4 sm:py-4">
            <div className="flex items-center gap-2 mb-1">
              <Icon className={`w-4 h-4 ${c.color}`} />
              <p className="text-[10px] sm:text-xs font-medium text-muted-foreground truncate">{c.label}</p>
            </div>
            <p className="text-xl sm:text-2xl font-semibold">{c.today}</p>
            <p className="text-[10px] text-muted-foreground mt-1">All time: <span className="font-semibold text-foreground">{c.all}</span></p>
          </Card>
        );
      })}
    </div>
  );
}
