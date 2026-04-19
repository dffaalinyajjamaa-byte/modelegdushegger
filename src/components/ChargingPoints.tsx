import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Zap, Filter, ArrowUpDown, Clock } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface ChargingPointsProps {
  userId: string;
}

const ChargingPoints = ({ userId }: ChargingPointsProps) => {
  const [totalPoints, setTotalPoints] = useState(0);
  const [todayMinutes, setTodayMinutes] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTotalPoints();

    // Real-time refresh when daily_stats or rankings change
    const channel = supabase
      .channel(`charging-points-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_rankings', filter: `user_id=eq.${userId}` }, fetchTotalPoints)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_stats', filter: `user_id=eq.${userId}` }, fetchTotalPoints)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const fetchTotalPoints = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];

      const [{ data: ranking }, { data: todayStat }] = await Promise.all([
        supabase.from('user_rankings').select('total_points').eq('user_id', userId).maybeSingle(),
        supabase.from('daily_stats').select('learning_time_minutes').eq('user_id', userId).eq('date', today).maybeSingle(),
      ]);

      // Total points = ranking points + 1pt per minute watched today (real-time)
      const base = ranking?.total_points || 0;
      const mins = todayStat?.learning_time_minutes || 0;

      setTodayMinutes(mins);
      setTotalPoints(base + mins);
    } catch (error) {
      console.error('Error fetching charging points:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-background rounded-2xl p-6 sm:p-8 border-primary/20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 sm:w-16 sm:h-16 bg-primary/20 rounded-2xl flex items-center justify-center">
            <Zap className="w-8 h-8 sm:w-10 sm:h-10 text-primary fill-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground font-medium">Charging Points</p>
            <h2 className="text-4xl sm:text-5xl font-bold mt-1">
              {loading ? <span className="animate-pulse">...</span> : totalPoints}
            </h2>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <Clock className="w-3 h-3" /> {todayMinutes} min studied today
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="ghost" size="icon" className="hidden sm:flex">
            <Filter className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="hidden sm:flex">
            <ArrowUpDown className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default ChargingPoints;
