import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trophy, Flame, Medal } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Ranking {
  user_id: string;
  total_points: number;
  current_streak: number;
  rank: number;
  full_name: string;
  avatar_url?: string;
}

interface LeaderboardProps {
  currentUserId: string;
}

export default function Leaderboard({ currentUserId }: LeaderboardProps) {
  const [rankings, setRankings] = useState<Ranking[]>([]);
  const [timeframe, setTimeframe] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRankings();
    
    // Subscribe to real-time updates
    const channel = supabase
      .channel('leaderboard-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_rankings'
        },
        () => fetchRankings()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [timeframe]);

  const fetchRankings = async () => {
    try {
      const { data: rankingsData, error } = await supabase
        .from('user_rankings')
        .select(`
          user_id,
          total_points,
          current_streak,
          rank
        `)
        .order('total_points', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Fetch user profiles
      const userIds = rankingsData?.map(r => r.user_id) || [];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', userIds);

      const enrichedRankings = rankingsData?.map((ranking, index) => {
        const profile = profiles?.find(p => p.user_id === ranking.user_id);
        return {
          ...ranking,
          rank: index + 1,
          full_name: profile?.full_name || 'Unknown',
          avatar_url: profile?.avatar_url
        };
      }) || [];

      setRankings(enrichedRankings);
    } catch (error) {
      console.error('Error fetching rankings:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMedalIcon = (index: number) => {
    if (index === 0) return <span className="text-2xl">🥇</span>;
    if (index === 1) return <span className="text-2xl">🥈</span>;
    if (index === 2) return <span className="text-2xl">🥉</span>;
    return <span className="text-lg font-bold text-muted-foreground">{index + 1}</span>;
  };

  return (
    <Card className="shadow-glow">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-6 h-6 text-primary" />
            <CardTitle className="text-2xl">Leaderboard</CardTitle>
          </div>
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <div className="min-w-[350px]">
        <ScrollArea className="h-[calc(100vh-280px)] min-h-[300px] max-h-[500px] pr-4">
          <div className="space-y-3">
            {loading ? (
              <p className="text-center text-muted-foreground py-8">Loading...</p>
            ) : rankings.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No rankings yet</p>
            ) : (
              rankings.map((ranking, index) => (
                <div
                  key={ranking.user_id}
                  className={cn(
                    "flex items-center gap-4 p-4 rounded-xl transition-all hover:bg-muted/50",
                    ranking.user_id === currentUserId && "bg-primary/10 border-2 border-primary"
                  )}
                >
                  {/* Rank/Medal */}
                  <div className="w-12 flex items-center justify-center">
                    {getMedalIcon(index)}
                  </div>

                  {/* Avatar */}
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={ranking.avatar_url} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {ranking.full_name[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  {/* User Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">
                      {ranking.full_name}
                      {ranking.user_id === currentUserId && (
                        <Badge className="ml-2" variant="secondary">You</Badge>
                      )}
                    </p>
                    {ranking.current_streak > 0 && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Flame className="w-4 h-4 text-orange-500" />
                        {ranking.current_streak} day streak
                      </p>
                    )}
                  </div>

                  {/* Points */}
                  <div className="text-right">
                    <p className="text-lg font-bold text-primary">
                      {ranking.total_points}
                    </p>
                    <p className="text-xs text-muted-foreground">points</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}
