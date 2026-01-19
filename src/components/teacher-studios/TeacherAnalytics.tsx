import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, Users, Eye, BookOpen, ClipboardList, TrendingUp, Crown, BarChart3 } from 'lucide-react';
import VerifiedBadge from '@/components/VerifiedBadge';

interface TeacherAnalyticsProps {
  user: User;
  onBack: () => void;
}

interface AnalyticsData {
  totalUploads: number;
  totalViews: number;
  quizzesCreated: number;
  studentsReached: number;
  teacherPoints: number;
  postsCount: number;
}

interface ContentStat {
  id: string;
  title: string;
  type: string;
  views_count: number;
  created_at: string;
}

export default function TeacherAnalytics({ user, onBack }: TeacherAnalyticsProps) {
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalUploads: 0,
    totalViews: 0,
    quizzesCreated: 0,
    studentsReached: 0,
    teacherPoints: 0,
    postsCount: 0,
  });
  const [contentStats, setContentStats] = useState<ContentStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [user.id]);

  const fetchAnalytics = async () => {
    try {
      // Fetch teacher uploads
      const { data: uploads } = await supabase
        .from('teacher_uploads')
        .select('*')
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false });

      // Fetch teacher ranking data
      const { data: ranking } = await supabase
        .from('user_rankings')
        .select('teacher_points, posts_count')
        .eq('user_id', user.id)
        .maybeSingle();

      if (uploads) {
        const totalViews = uploads.reduce((sum, u) => sum + (u.views_count || 0), 0);
        const quizzes = uploads.filter(u => u.type === 'quiz').length;
        
        setAnalytics({
          totalUploads: uploads.length,
          totalViews,
          quizzesCreated: quizzes,
          studentsReached: Math.floor(totalViews / 3), // Estimate unique students
          teacherPoints: ranking?.teacher_points || 0,
          postsCount: ranking?.posts_count || 0,
        });

        setContentStats(uploads.slice(0, 10).map(u => ({
          id: u.id,
          title: u.title,
          type: u.type,
          views_count: u.views_count || 0,
          created_at: u.created_at,
        })));
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold">Teacher Analytics</h1>
        </div>
        <VerifiedBadge type="gold" size="sm" />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-yellow-500/30">
          <CardContent className="p-4 text-center">
            <Crown className="w-8 h-8 mx-auto mb-2 text-yellow-500" />
            <p className="text-2xl font-bold">{analytics.teacherPoints}</p>
            <p className="text-sm text-muted-foreground">Teacher Points</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border-blue-500/30">
          <CardContent className="p-4 text-center">
            <BookOpen className="w-8 h-8 mx-auto mb-2 text-blue-500" />
            <p className="text-2xl font-bold">{analytics.totalUploads}</p>
            <p className="text-sm text-muted-foreground">Total Uploads</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-green-500/30">
          <CardContent className="p-4 text-center">
            <Eye className="w-8 h-8 mx-auto mb-2 text-green-500" />
            <p className="text-2xl font-bold">{analytics.totalViews}</p>
            <p className="text-sm text-muted-foreground">Total Views</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-purple-500/30">
          <CardContent className="p-4 text-center">
            <ClipboardList className="w-8 h-8 mx-auto mb-2 text-purple-500" />
            <p className="text-2xl font-bold">{analytics.quizzesCreated}</p>
            <p className="text-sm text-muted-foreground">Quizzes Created</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border-indigo-500/30">
          <CardContent className="p-4 text-center">
            <Users className="w-8 h-8 mx-auto mb-2 text-indigo-500" />
            <p className="text-2xl font-bold">{analytics.studentsReached}</p>
            <p className="text-sm text-muted-foreground">Students Reached</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-rose-500/20 to-red-500/20 border-rose-500/30">
          <CardContent className="p-4 text-center">
            <TrendingUp className="w-8 h-8 mx-auto mb-2 text-rose-500" />
            <p className="text-2xl font-bold">{analytics.postsCount}</p>
            <p className="text-sm text-muted-foreground">Posts This Month</p>
          </CardContent>
        </Card>
      </div>

      {/* Content Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Content Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-64">
            {contentStats.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No content uploaded yet. Start sharing!
              </p>
            ) : (
              <div className="space-y-3">
                {contentStats.map(content => (
                  <div key={content.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{content.title}</p>
                      <Badge variant="outline" className="text-xs mt-1">
                        {content.type}
                      </Badge>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{content.views_count}</p>
                      <p className="text-xs text-muted-foreground">views</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
