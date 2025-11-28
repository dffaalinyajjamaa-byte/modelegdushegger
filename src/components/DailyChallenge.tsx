import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trophy, CheckCircle, Clock, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface DailyChallengeProps {
  user: User;
}

interface Challenge {
  id: string;
  title: string;
  description: string;
  subject: string;
  challenge_type: string;
  points: number;
  active_date: string;
}

interface ChallengeProgress {
  challenge_id: string;
  completed: boolean;
  points_earned: number;
}

export default function DailyChallenge({ user }: DailyChallengeProps) {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [progress, setProgress] = useState<ChallengeProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchDailyChallenges();
    fetchProgress();
  }, []);

  const fetchDailyChallenges = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('daily_challenges')
        .select('*')
        .eq('active_date', today);

      if (error) throw error;
      setChallenges(data || []);
    } catch (error) {
      console.error('Error fetching daily challenges:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProgress = async () => {
    try {
      const { data, error } = await supabase
        .from('user_challenge_progress')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      setProgress(data || []);
    } catch (error) {
      console.error('Error fetching progress:', error);
    }
  };

  const completeChallenge = async (challenge: Challenge) => {
    try {
      const { error } = await supabase
        .from('user_challenge_progress')
        .upsert({
          user_id: user.id,
          challenge_id: challenge.id,
          completed: true,
          points_earned: challenge.points,
          completed_at: new Date().toISOString(),
        });

      if (error) throw error;

      // Award points
      await supabase.rpc('award_points', {
        p_user_id: user.id,
        p_points: challenge.points,
        p_activity_type: 'daily_challenge',
      });

      toast({
        title: 'Challenge Completed!',
        description: `You earned ${challenge.points} points!`,
      });

      fetchProgress();
    } catch (error) {
      console.error('Error completing challenge:', error);
      toast({
        title: 'Error',
        description: 'Failed to complete challenge',
        variant: 'destructive',
      });
    }
  };

  const isCompleted = (challengeId: string) => {
    return progress.some(p => p.challenge_id === challengeId && p.completed);
  };

  const totalPoints = progress.reduce((sum, p) => sum + (p.completed ? p.points_earned : 0), 0);

  if (loading) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            Daily Challenges
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (challenges.length === 0) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            Daily Challenges
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Clock className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No challenges available today</p>
            <p className="text-sm text-muted-foreground mt-2">Check back tomorrow!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Daily Challenges
          </CardTitle>
          <Badge variant="secondary" className="flex items-center gap-1">
            <Trophy className="w-4 h-4" />
            {totalPoints} pts
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {challenges.map((challenge) => {
            const completed = isCompleted(challenge.id);
            
            return (
              <Card
                key={challenge.id}
                className={`p-4 transition-all ${
                  completed
                    ? 'bg-primary/10 border-primary/50'
                    : 'glass-card hover:border-primary/30'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs">
                        {challenge.subject}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {challenge.points} pts
                      </Badge>
                    </div>
                    <h4 className="font-semibold text-sm mb-1">{challenge.title}</h4>
                    {challenge.description && (
                      <p className="text-xs text-muted-foreground">
                        {challenge.description}
                      </p>
                    )}
                  </div>
                  
                  {completed ? (
                    <CheckCircle className="w-6 h-6 text-primary flex-shrink-0" />
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => completeChallenge(challenge)}
                    >
                      Start
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
