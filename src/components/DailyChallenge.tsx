import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trophy, CheckCircle, Clock, Sparkles, BookOpen, Video, Brain, FileText, Coffee, ClipboardList } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface DailyChallengeProps {
  user: User;
  onNavigate?: (view: string) => void;
}

interface Challenge {
  id: string;
  title: string;
  description: string;
  subject: string;
  challenge_type: string;
  points: number;
  active_date: string;
  content_data: any;
}

interface ChallengeProgress {
  challenge_id: string;
  completed: boolean;
  points_earned: number;
}

const challengeTypeIcons: { [key: string]: any } = {
  reading: BookOpen,
  video: Video,
  quiz: Brain,
  worksheet: ClipboardList,
  exam: FileText,
  relax: Coffee,
  practice: Brain,
};

const challengeTypeColors: { [key: string]: string } = {
  reading: 'from-blue-500/20 to-blue-900/30 border-blue-500/30',
  video: 'from-red-500/20 to-red-900/30 border-red-500/30',
  quiz: 'from-orange-500/20 to-orange-900/30 border-orange-500/30',
  worksheet: 'from-indigo-500/20 to-indigo-900/30 border-indigo-500/30',
  exam: 'from-purple-500/20 to-purple-900/30 border-purple-500/30',
  relax: 'from-pink-500/20 to-pink-900/30 border-pink-500/30',
  practice: 'from-green-500/20 to-green-900/30 border-green-500/30',
};

export default function DailyChallenge({ user, onNavigate }: DailyChallengeProps) {
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

  const startChallenge = (challenge: Challenge) => {
    // Navigate to the appropriate feature based on challenge type
    const navigationMap: { [key: string]: string } = {
      reading: 'books',
      video: 'videos',
      quiz: 'quiz',
      worksheet: 'worksheets',
      exam: 'national-exams',
      relax: 'relax-time',
      practice: 'quiz',
    };

    const targetView = navigationMap[challenge.challenge_type] || 'dashboard';
    
    if (onNavigate) {
      onNavigate(targetView);
    }
    
    toast({
      title: `Starting: ${challenge.title}`,
      description: `Complete this challenge to earn ${challenge.points} points!`,
    });
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
  const completedCount = challenges.filter(c => isCompleted(c.id)).length;

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
              <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />
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
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {completedCount}/{challenges.length} Done
            </Badge>
            <Badge variant="secondary" className="flex items-center gap-1">
              <Trophy className="w-4 h-4" />
              {totalPoints} pts
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {challenges.map((challenge) => {
            const completed = isCompleted(challenge.id);
            const IconComponent = challengeTypeIcons[challenge.challenge_type] || Sparkles;
            const colorClass = challengeTypeColors[challenge.challenge_type] || 'from-gray-500/20 to-gray-900/30 border-gray-500/30';
            
            return (
              <Card
                key={challenge.id}
                className={`overflow-hidden transition-all border-2 ${
                  completed
                    ? 'bg-primary/10 border-primary/50'
                    : `bg-gradient-to-br ${colorClass}`
                }`}
              >
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      completed ? 'bg-primary/20' : 'bg-background/50'
                    }`}>
                      <IconComponent className={`w-5 h-5 ${completed ? 'text-primary' : 'text-foreground'}`} />
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge variant="outline" className="text-xs">
                          {challenge.subject}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          +{challenge.points} pts
                        </Badge>
                        <Badge variant="outline" className="text-xs capitalize">
                          {challenge.challenge_type}
                        </Badge>
                      </div>
                      <h4 className="font-semibold text-sm mb-1">{challenge.title}</h4>
                      {challenge.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {challenge.description}
                        </p>
                      )}
                    </div>
                    
                    {/* Action */}
                    <div className="flex-shrink-0">
                      {completed ? (
                        <div className="relative">
                          <div className="absolute inset-0 bg-primary/30 rounded-full animate-ping" />
                          <CheckCircle className="w-8 h-8 text-primary animate-scale-in drop-shadow-lg" />
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => startChallenge(challenge)}
                        >
                          Start
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}