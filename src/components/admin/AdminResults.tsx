import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingUp, TrendingDown, BarChart3, Target, Award } from 'lucide-react';

interface SubjectStats {
  subject: string;
  count: number;
  avgScore: number;
  passRate: number;
}

export default function AdminResults() {
  const [subjectStats, setSubjectStats] = useState<SubjectStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalQuizzes, setTotalQuizzes] = useState(0);
  const [overallAvg, setOverallAvg] = useState(0);
  const [overallPass, setOverallPass] = useState(0);

  useEffect(() => {
    const fetchResults = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('auto_quiz_results')
        .select('subject, score, total, percentage, passed')
        .limit(1000);

      if (!error && data) {
        setTotalQuizzes(data.length);

        if (data.length > 0) {
          setOverallAvg(Math.round(data.reduce((s, r) => s + Number(r.percentage), 0) / data.length));
          setOverallPass(Math.round((data.filter(r => r.passed).length / data.length) * 100));
        }

        const bySubject: Record<string, typeof data> = {};
        data.forEach(r => {
          if (!bySubject[r.subject]) bySubject[r.subject] = [];
          bySubject[r.subject].push(r);
        });

        const stats = Object.entries(bySubject).map(([subject, items]) => ({
          subject,
          count: items.length,
          avgScore: Math.round(items.reduce((s, i) => s + Number(i.percentage), 0) / items.length),
          passRate: Math.round((items.filter(i => i.passed).length / items.length) * 100),
        }));

        setSubjectStats(stats.sort((a, b) => b.count - a.count));
      }
      setLoading(false);
    };
    fetchResults();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-2">
        <Card>
          <CardContent className="p-3 text-center">
            <BarChart3 className="w-5 h-5 mx-auto text-primary mb-1" />
            <p className="text-lg font-bold">{totalQuizzes}</p>
            <p className="text-[10px] text-muted-foreground">Total Quizzes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <Target className="w-5 h-5 mx-auto text-orange-500 mb-1" />
            <p className="text-lg font-bold">{overallAvg}%</p>
            <p className="text-[10px] text-muted-foreground">Avg Score</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <Award className="w-5 h-5 mx-auto text-green-500 mb-1" />
            <p className="text-lg font-bold">{overallPass}%</p>
            <p className="text-[10px] text-muted-foreground">Pass Rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Subject Breakdown */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-1">
          By Subject
        </h3>
        {subjectStats.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-sm text-muted-foreground">No quiz data yet</p>
            </CardContent>
          </Card>
        ) : (
          subjectStats.map(stat => (
            <Card key={stat.subject}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {stat.avgScore >= 50 ? (
                      <TrendingUp className="w-4 h-4 text-green-500" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-500" />
                    )}
                    <span className="text-sm font-medium">{stat.subject}</span>
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    {stat.count} quizzes
                  </Badge>
                </div>
                <div className="flex gap-4 text-xs text-muted-foreground mb-2">
                  <span>Avg: <strong className={stat.avgScore >= 50 ? 'text-green-600' : 'text-red-500'}>{stat.avgScore}%</strong></span>
                  <span>Pass: <strong className={stat.passRate >= 50 ? 'text-green-600' : 'text-red-500'}>{stat.passRate}%</strong></span>
                </div>
                <div className="w-full rounded-full h-1.5" style={{ background: 'hsl(var(--muted))' }}>
                  <div
                    className="h-1.5 rounded-full transition-all"
                    style={{
                      width: `${stat.avgScore}%`,
                      background: stat.avgScore >= 50 ? '#22c55e' : '#ef4444',
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
