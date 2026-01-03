import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';

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

interface DailyStats {
  date: string;
  tasks_completed: number;
  videos_watched: number;
  materials_read: number;
}

const COLORS = {
  tasks: 'hsl(25 95% 53%)',
  videos: 'hsl(0 84% 60%)',
  materials: 'hsl(217 91% 60%)',
  exams: 'hsl(142 76% 36%)',
};

export default function ProgressCharts({ userId, stats, compact = false }: ProgressChartsProps) {
  const [weeklyData, setWeeklyData] = useState<DailyStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWeeklyStats();
  }, [userId]);

  const fetchWeeklyStats = async () => {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data, error } = await supabase
        .from('daily_stats')
        .select('*')
        .eq('user_id', userId)
        .gte('date', sevenDaysAgo.toISOString().split('T')[0])
        .order('date', { ascending: true });

      if (error) throw error;

      // Format data for charts
      const formattedData = data?.map(stat => ({
        date: new Date(stat.date).toLocaleDateString('en-US', { weekday: 'short' }),
        tasks_completed: stat.tasks_completed,
        videos_watched: stat.videos_watched,
        materials_read: stat.materials_read,
      })) || [];

      setWeeklyData(formattedData);
    } catch (error) {
      console.error('Error fetching weekly stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const pieData = [
    { name: 'Tasks', value: stats.tasks_completed, color: COLORS.tasks },
    { name: 'Videos', value: stats.videos_watched, color: COLORS.videos },
    { name: 'Materials', value: stats.materials_read, color: COLORS.materials },
  ];

  const barData = [
    { name: 'Tasks', value: stats.tasks_completed, fill: COLORS.tasks },
    { name: 'Videos', value: stats.videos_watched, fill: COLORS.videos },
    { name: 'Materials', value: stats.materials_read, fill: COLORS.materials },
  ];

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-64 w-full" />
        {!compact && <Skeleton className="h-64 w-full" />}
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${compact ? 'animate-fade-slide-up' : ''}`}>
      {/* Weekly Activity Line Chart */}
      <Card className="glass-card border-2 border-primary/20">
        <CardHeader>
          <CardTitle className="text-lg md:text-xl">Weekly Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={compact ? 200 : 300}>
            <LineChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" stroke="hsl(var(--foreground))" />
              <YAxis stroke="hsl(var(--foreground))" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="tasks_completed"
                stroke={COLORS.tasks}
                strokeWidth={2}
                name="Tasks"
                dot={{ fill: COLORS.tasks }}
              />
              <Line
                type="monotone"
                dataKey="videos_watched"
                stroke={COLORS.videos}
                strokeWidth={2}
                name="Videos"
                dot={{ fill: COLORS.videos }}
              />
              <Line
                type="monotone"
                dataKey="materials_read"
                stroke={COLORS.materials}
                strokeWidth={2}
                name="Materials"
                dot={{ fill: COLORS.materials }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {!compact && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Stats Overview Bar Chart */}
          <Card className="glass-card border-2 border-secondary/20">
            <CardHeader>
              <CardTitle className="text-lg">Total Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--foreground))" />
                  <YAxis stroke="hsl(var(--foreground))" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                    {barData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Learning Distribution Pie Chart */}
          <Card className="glass-card border-2 border-accent/20">
            <CardHeader>
              <CardTitle className="text-lg">Activity Distribution</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
