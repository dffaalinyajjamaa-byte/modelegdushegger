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
    if (streak >= 365) return { icon: '💎', name: 'Diamond', color: 'text-cyan-500' };
    if (streak >= 90) return { icon: '🥇', name: 'Gold', color: 'text-yellow-500' };
    if (streak >= 30) return { icon: '🥈', name: 'Silver', color: 'text-gray-400' };
    if (streak >= 7) return { icon: '🥉', name: 'Bronze', color: 'text-amber-700' };
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
          <span>Next: {currentStreak < 7 ? 'Bronze (7)' : currentStreak < 30 ? 'Silver (30)' : currentStreak < 90 ? 'Gold (90)' : 'Diamond (365)'}</span>
          <span>
            {currentStreak < 7 && `${7 - currentStreak} days`}
            {currentStreak >= 7 && currentStreak < 30 && `${30 - currentStreak} days`}
            {currentStreak >= 30 && currentStreak < 90 && `${90 - currentStreak} days`}
            {currentStreak >= 90 && currentStreak < 365 && `${365 - currentStreak} days`}
            {currentStreak >= 365 && 'Max level!'}
          </span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-orange-400 to-red-500 transition-all"
            style={{ 
              width: `${currentStreak < 7 ? (currentStreak / 7) * 100 : 
                       currentStreak < 30 ? ((currentStreak - 7) / 23) * 100 :
                       currentStreak < 90 ? ((currentStreak - 30) / 60) * 100 :
                       currentStreak < 365 ? ((currentStreak - 90) / 275) * 100 : 100}%` 
            }}
          />
        </div>
      </div>
    </Card>
  );
}
