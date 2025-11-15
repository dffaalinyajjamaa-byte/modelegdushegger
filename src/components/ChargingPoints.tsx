import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Zap, Filter, ArrowUpDown } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface ChargingPointsProps {
  userId: string;
}

const ChargingPoints = ({ userId }: ChargingPointsProps) => {
  const [totalPoints, setTotalPoints] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTotalPoints();
  }, [userId]);

  const fetchTotalPoints = async () => {
    try {
      // Fetch user stats
      const { data: stats, error: statsError } = await supabase
        .from('user_stats')
        .select('tasks_completed, videos_watched, materials_read')
        .eq('user_id', userId)
        .single();

      if (statsError && statsError.code !== 'PGRST116') throw statsError;

      // Fetch daily stats for current month
      const { data: dailyStats, error: dailyError } = await supabase
        .from('daily_stats')
        .select('tasks_completed, videos_watched, materials_read, ai_interactions, exams_taken')
        .eq('user_id', userId);

      if (dailyError) throw dailyError;

      // Calculate total points
      const userStatsPoints = stats 
        ? (stats.tasks_completed || 0) + (stats.videos_watched || 0) + (stats.materials_read || 0)
        : 0;

      const dailyTotalPoints = dailyStats?.reduce((total, day) => {
        return total + 
          (day.tasks_completed || 0) + 
          (day.videos_watched || 0) + 
          (day.materials_read || 0) + 
          (day.ai_interactions || 0) + 
          (day.exams_taken || 0);
      }, 0) || 0;

      setTotalPoints(userStatsPoints + dailyTotalPoints);
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
              {loading ? (
                <span className="animate-pulse">...</span>
              ) : (
                totalPoints
              )}
            </h2>
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
