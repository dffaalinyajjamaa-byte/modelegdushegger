import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Brain, Flame, TrendingUp, BookOpen, Sparkles, Trophy, Calendar, Target } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';

interface StudyCoachProps {
  user: User;
  onLogActivity: (type: string, description: string, metadata?: any) => void;
}

interface StudyStreak {
  current_streak: number;
  longest_streak: number;
  last_study_date: string | null;
  total_study_days: number;
}

interface DailyTip {
  id: string;
  tip_content: string;
  tip_type: string;
  subject: string | null;
  is_read: boolean;
  created_at: string;
}

interface StudySession {
  subject: string;
  duration_minutes: number;
  completed_at: string;
}

export default function StudyCoach({ user, onLogActivity }: StudyCoachProps) {
  const [streak, setStreak] = useState<StudyStreak | null>(null);
  const [dailyTips, setDailyTips] = useState<DailyTip[]>([]);
  const [recentSessions, setRecentSessions] = useState<StudySession[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    initializeStudyCoach();
    fetchStreak();
    fetchDailyTips();
    fetchRecentSessions();
  }, [user]);

  const initializeStudyCoach = async () => {
    const { data: existingStreak } = await supabase
      .from('study_streaks')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!existingStreak) {
      await supabase
        .from('study_streaks')
        .insert({ user_id: user.id });
    }
  };

  const fetchStreak = async () => {
    const { data, error } = await supabase
      .from('study_streaks')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (data && !error) {
      setStreak(data);
    }
  };

  const fetchDailyTips = async () => {
    const { data } = await supabase
      .from('daily_study_tips')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);

    setDailyTips(data || []);
  };

  const fetchRecentSessions = async () => {
    const { data } = await supabase
      .from('study_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('completed_at', { ascending: false })
      .limit(5);

    setRecentSessions(data || []);
  };

  const generateDailyTips = async () => {
    setLoading(true);
    try {
      // Analyze recent study sessions to generate personalized tips
      const subjects = recentSessions.map(s => s.subject);
      const totalTime = recentSessions.reduce((acc, s) => acc + s.duration_minutes, 0);
      
      const tips = [];
      
      // Motivational tip
      tips.push({
        user_id: user.id,
        tip_content: `You've studied for ${totalTime} minutes recently! Keep up the great work! 🌟`,
        tip_type: 'motivation',
        subject: null
      });

      // Subject recommendation based on what they haven't studied
      const allSubjects = ['Math', 'Science', 'English', 'History'];
      const unstudiedSubjects = allSubjects.filter(s => !subjects.includes(s));
      
      if (unstudiedSubjects.length > 0) {
        tips.push({
          user_id: user.id,
          tip_content: `Try reviewing ${unstudiedSubjects[0]} today to maintain a balanced study routine.`,
          tip_type: 'subject_recommendation',
          subject: unstudiedSubjects[0]
        });
      }

      // Quiz suggestion
      if (subjects.length > 0) {
        tips.push({
          user_id: user.id,
          tip_content: `Ready to test your knowledge? Take a quick quiz on ${subjects[0]}!`,
          tip_type: 'quiz_suggestion',
          subject: subjects[0]
        });
      }

      await supabase.from('daily_study_tips').insert(tips);
      
      toast({
        title: 'Tips Generated!',
        description: 'Check out your personalized study recommendations.',
      });

      fetchDailyTips();
      onLogActivity('study_tips_generated', 'Generated daily study tips');
    } catch (error) {
      console.error('Error generating tips:', error);
    } finally {
      setLoading(false);
    }
  };

  const logStudySession = async (subject: string, minutes: number) => {
    try {
      await supabase
        .from('study_sessions')
        .insert({
          user_id: user.id,
          subject,
          duration_minutes: minutes,
        });

      // Update streak
      const today = new Date().toISOString().split('T')[0];
      const lastStudyDate = streak?.last_study_date;
      
      let newStreak = streak?.current_streak || 0;
      
      if (lastStudyDate) {
        const daysDiff = Math.floor((new Date(today).getTime() - new Date(lastStudyDate).getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysDiff === 0) {
          // Same day, don't increment
        } else if (daysDiff === 1) {
          newStreak += 1;
        } else {
          newStreak = 1; // Reset streak
        }
      } else {
        newStreak = 1;
      }

      await supabase
        .from('study_streaks')
        .update({
          current_streak: newStreak,
          longest_streak: Math.max(newStreak, streak?.longest_streak || 0),
          last_study_date: today,
          total_study_days: (streak?.total_study_days || 0) + (lastStudyDate === today ? 0 : 1)
        })
        .eq('user_id', user.id);

      fetchStreak();
      fetchRecentSessions();
      
      toast({
        title: 'Study Session Logged!',
        description: `Great job studying ${subject} for ${minutes} minutes!`,
      });

      onLogActivity('study_session', `Studied ${subject} for ${minutes} minutes`);
    } catch (error) {
      console.error('Error logging session:', error);
    }
  };

  const markTipRead = async (tipId: string) => {
    await supabase
      .from('daily_study_tips')
      .update({ is_read: true })
      .eq('id', tipId);
    
    fetchDailyTips();
  };

  const getStreakColor = () => {
    if (!streak) return 'text-muted-foreground';
    if (streak.current_streak >= 7) return 'text-primary';
    if (streak.current_streak >= 3) return 'text-orange-500';
    return 'text-muted-foreground';
  };

  return (
    <div className="max-w-6xl mx-auto space-y-4 p-4">
      {/* Streak Card */}
      <Card className="shadow-glow animate-fade-in mobile-card">
        <CardHeader className="mobile-header">
          <CardTitle className="flex items-center gap-2">
            <Flame className={`w-6 h-6 ${getStreakColor()}`} />
            Study Streak
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold gradient-primary bg-clip-text text-transparent">
                {streak?.current_streak || 0}
              </div>
              <div className="text-sm text-muted-foreground">Current Streak</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-500">
                {streak?.longest_streak || 0}
              </div>
              <div className="text-sm text-muted-foreground">Longest Streak</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-500">
                {streak?.total_study_days || 0}
              </div>
              <div className="text-sm text-muted-foreground">Total Days</div>
            </div>
            <div className="text-center flex flex-col items-center justify-center">
              <Trophy className="w-8 h-8 text-yellow-500 mb-1" />
              <div className="text-xs text-muted-foreground">Keep Going!</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Daily Tips */}
      <Card className="shadow-glow animate-fade-in mobile-card">
        <CardHeader className="mobile-header">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-6 h-6 text-primary" />
              Daily Study Coach
            </CardTitle>
            <Button
              onClick={generateDailyTips}
              disabled={loading}
              size="sm"
              className="gradient-primary text-white hover-scale"
            >
              <Sparkles className="w-4 h-4 mr-1" />
              Get Tips
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <ScrollArea className="h-64">
            <div className="space-y-3">
              {dailyTips.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Target className="w-12 h-12 mx-auto mb-2 text-primary animate-float" />
                  <p>Click "Get Tips" to receive personalized study recommendations!</p>
                </div>
              ) : (
                dailyTips.map((tip) => (
                  <div
                    key={tip.id}
                    className={`p-4 rounded-2xl transition-smooth ${
                      tip.is_read ? 'bg-muted/50' : 'bg-muted hover-scale'
                    }`}
                    onClick={() => !tip.is_read && markTipRead(tip.id)}
                  >
                    <div className="flex items-start gap-3">
                      {tip.tip_type === 'motivation' && <Sparkles className="w-5 h-5 text-yellow-500 flex-shrink-0" />}
                      {tip.tip_type === 'subject_recommendation' && <BookOpen className="w-5 h-5 text-blue-500 flex-shrink-0" />}
                      {tip.tip_type === 'quiz_suggestion' && <TrendingUp className="w-5 h-5 text-green-500 flex-shrink-0" />}
                      <div className="flex-1">
                        <p className="text-sm md:text-base">{tip.tip_content}</p>
                        {tip.subject && (
                          <Badge variant="outline" className="mt-2">
                            {tip.subject}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Quick Log Session */}
      <Card className="shadow-glow animate-fade-in mobile-card">
        <CardHeader className="mobile-header">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-6 h-6 text-primary" />
            Log Study Session
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {['Math', 'Science', 'English', 'History'].map((subject) => (
              <Button
                key={subject}
                onClick={() => logStudySession(subject, 30)}
                variant="outline"
                className="hover-scale"
              >
                {subject} (30 min)
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card className="shadow-glow animate-fade-in mobile-card">
        <CardHeader className="mobile-header">
          <CardTitle>Recent Study Sessions</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <ScrollArea className="h-48">
            <div className="space-y-2">
              {recentSessions.map((session, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-muted rounded-xl">
                  <div className="flex items-center gap-3">
                    <BookOpen className="w-4 h-4 text-primary" />
                    <div>
                      <p className="font-medium text-sm">{session.subject}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(session.completed_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary">{session.duration_minutes} min</Badge>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}