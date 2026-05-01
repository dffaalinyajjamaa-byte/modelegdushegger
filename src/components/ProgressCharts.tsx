import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

interface ProgressChartsProps {
  userId: string;
  stats: {
    tasks_completed: number;
    videos_watched: number;
    materials_read: number;
    exams_taken?: number;
  };
  compact?: boolean;
}

interface DailyStat {
  date: string;
  tasks_completed: number;
  videos_watched: number;
  materials_read: number;
}

const COLORS = {
  tasks: 'hsl(25 95% 53%)',
  videos: 'hsl(0 84% 60%)',
  materials: 'hsl(217 91% 60%)',
};

type Filter = 'tasks' | 'videos' | 'materials';

const FILTER_KEY: Record<Filter, keyof DailyStat> = {
  tasks: 'tasks_completed',
  videos: 'videos_watched',
  materials: 'materials_read',
};

export default function ProgressCharts({ userId, stats, compact = false }: ProgressChartsProps) {
  const [weeklyData, setWeeklyData] = useState<DailyStat[]>([]);
  const [monthlyData, setMonthlyData] = useState<DailyStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('videos');

  useEffect(() => {
    fetchStats();
    const channel = supabase
      .channel(`progress-charts-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_stats', filter: `user_id=eq.${userId}` }, fetchStats)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const fetchStats = async () => {
    try {
      const thirtyAgo = new Date();
      thirtyAgo.setDate(thirtyAgo.getDate() - 30);

      const { data } = await supabase
        .from('daily_stats')
        .select('*')
        .eq('user_id', userId)
        .gte('date', thirtyAgo.toISOString().split('T')[0])
        .order('date', { ascending: true });

      const all = (data || []).map((s: any) => ({
        date: s.date,
        tasks_completed: s.tasks_completed || 0,
        videos_watched: s.videos_watched || 0,
        materials_read: s.materials_read || 0,
      }));

      // Build last-7-day series with zero-fill so chart always shows Mon..Sun shape
      const seven: DailyStat[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const iso = d.toISOString().split('T')[0];
        const found = all.find(x => x.date === iso);
        seven.push({
          date: d.toLocaleDateString('en-US', { weekday: 'short' }),
          tasks_completed: found?.tasks_completed || 0,
          videos_watched: found?.videos_watched || 0,
          materials_read: found?.materials_read || 0,
        });
      }

      setWeeklyData(seven);
      setMonthlyData(all);
    } catch (e) {
      console.error('Error fetching progress stats:', e);
    } finally {
      setLoading(false);
    }
  };

  // 30-day distribution
  const distribution = useMemo(() => {
    const totals = monthlyData.reduce(
      (acc, d) => ({
        tasks: acc.tasks + d.tasks_completed,
        videos: acc.videos + d.videos_watched,
        materials: acc.materials + d.materials_read,
      }),
      { tasks: 0, videos: 0, materials: 0 }
    );
    return [
      { name: 'Tasks', value: totals.tasks, color: COLORS.tasks },
      { name: 'Videos', value: totals.videos, color: COLORS.videos },
      { name: 'Materials', value: totals.materials, color: COLORS.materials },
    ];
  }, [monthlyData]);

  const totalsBar = useMemo(() => ([
    { name: 'Tasks', value: stats.tasks_completed, fill: COLORS.tasks },
    { name: 'Videos', value: stats.videos_watched, fill: COLORS.videos },
    { name: 'Materials', value: stats.materials_read, fill: COLORS.materials },
  ]), [stats]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-64 w-full" />
        {!compact && <Skeleton className="h-64 w-full" />}
      </div>
    );
  }

  const filterKey = FILTER_KEY[filter];
  const filterColor = COLORS[filter];

  return (
    <div className={`space-y-4 ${compact ? 'animate-fade-slide-up' : ''}`}>
      {/* Weekly Activity */}
      <Card className="glass-card border-2 border-primary/20">
        <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-base md:text-lg">Weekly Activity</CardTitle>
          <div className="flex gap-1">
            {(['tasks', 'videos', 'materials'] as Filter[]).map(f => (
              <Button
                key={f}
                size="sm"
                variant={filter === f ? 'default' : 'outline'}
                className="h-7 px-2 text-[11px] capitalize"
                onClick={() => setFilter(f)}
              >
                {f}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={compact ? 200 : 260}>
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" stroke="hsl(var(--foreground))" fontSize={11} />
              <YAxis stroke="hsl(var(--foreground))" fontSize={11} allowDecimals={false} />
              <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
              <Bar dataKey={filterKey} fill={filterColor} radius={[6, 6, 0, 0]} name={filter} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {!compact && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Total Stats - auto-scaled */}
          <Card className="glass-card border-2 border-secondary/20">
            <CardHeader className="pb-2"><CardTitle className="text-base">Total Stats</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={totalsBar}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--foreground))" fontSize={11} />
                  <YAxis stroke="hsl(var(--foreground))" fontSize={11} allowDecimals={false} />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                    {totalsBar.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Activity Distribution donut (last 30 days) */}
          <Card className="glass-card border-2 border-accent/20">
            <CardHeader className="pb-2"><CardTitle className="text-base">Activity Distribution</CardTitle></CardHeader>
            <CardContent className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={distribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) => percent ? `${name} ${(percent * 100).toFixed(0)}%` : ''}
                    labelLine={false}
                  >
                    {distribution.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
