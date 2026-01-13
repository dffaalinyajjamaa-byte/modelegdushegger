import { Flame, Award } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface StreakBadgeProps {
  currentStreak: number;
  longestStreak: number;
  totalPoints: number;
  className?: string;
}

export default function StreakBadge({ currentStreak, longestStreak, totalPoints, className }: StreakBadgeProps) {
  const getStreakMilestone = (streak: number) => {
    if (streak >= 90) return { icon: '🥇', name: 'Gold', color: 'text-yellow-500' };
    if (streak >= 50) return { icon: '💚', name: 'Metal Green', color: 'text-emerald-500' };
    if (streak >= 20) return { icon: '🥈', name: 'Silver', color: 'text-gray-400' };
    if (streak >= 10) return { icon: '🥉', name: 'Bronze', color: 'text-amber-700' };
    return { icon: '🔥', name: 'Beginner', color: 'text-orange-500' };
  };

  const milestone = getStreakMilestone(currentStreak);

  return (
    <Card className={cn("p-6", className)}>
      <div className="flex items-center justify-between">
        {/* Current Streak */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center">
              <Flame className="w-8 h-8 text-white" />
            </div>
            {currentStreak > 0 && (
              <Badge className="absolute -top-1 -right-1 h-6 w-6 rounded-full p-0 flex items-center justify-center bg-primary">
                {currentStreak}
              </Badge>
            )}
          </div>
          
          <div>
            <p className="text-3xl font-bold">{currentStreak}</p>
            <p className="text-sm text-muted-foreground">Day Streak</p>
            <div className="flex items-center gap-1 mt-1">
              <span className="text-xl">{milestone.icon}</span>
              <span className={cn("text-sm font-semibold", milestone.color)}>
                {milestone.name}
              </span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="text-right space-y-2">
          <div>
            <p className="text-2xl font-bold text-primary">{totalPoints}</p>
            <p className="text-xs text-muted-foreground">Total Points</p>
          </div>
          
          <div className="flex items-center gap-1 text-muted-foreground">
            <Award className="w-4 h-4" />
            <span className="text-xs">Best: {longestStreak} days</span>
          </div>
        </div>
      </div>

      {/* Progress to next milestone */}
      <div className="mt-4 pt-4 border-t">
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>Next: {currentStreak < 10 ? 'Bronze (10)' : currentStreak < 20 ? 'Silver (20)' : currentStreak < 50 ? 'Metal Green (50)' : currentStreak < 90 ? 'Gold (90)' : 'Max level!'}</span>
          <span>
            {currentStreak < 10 && `${10 - currentStreak} days`}
            {currentStreak >= 10 && currentStreak < 20 && `${20 - currentStreak} days`}
            {currentStreak >= 20 && currentStreak < 50 && `${50 - currentStreak} days`}
            {currentStreak >= 50 && currentStreak < 90 && `${90 - currentStreak} days`}
            {currentStreak >= 90 && 'Max level!'}
          </span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-orange-400 to-red-500 transition-all"
            style={{ 
              width: `${currentStreak < 10 ? (currentStreak / 10) * 100 : 
                       currentStreak < 20 ? ((currentStreak - 10) / 10) * 100 :
                       currentStreak < 50 ? ((currentStreak - 20) / 30) * 100 :
                       currentStreak < 90 ? ((currentStreak - 50) / 40) * 100 : 100}%` 
            }}
          />
        </div>
      </div>
    </Card>
  );
}
