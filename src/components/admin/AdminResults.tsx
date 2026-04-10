import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, Loader2, TrendingUp, TrendingDown } from 'lucide-react';

interface Result {
  id: string;
  subject: string;
  score: number;
  total: number;
  percentage: number;
  passed: boolean;
  created_at: string;
}

interface SubjectStats {
  subject: string;
  count: number;
  avgScore: number;
  passRate: number;
}

export default function AdminResults() {
  const [results, setResults] = useState<Result[]>([]);
  const [subjectStats, setSubjectStats] = useState<SubjectStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResults = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('auto_quiz_results')
        .select('id, subject, score, total, percentage, passed, created_at')
        .order('created_at', { ascending: false })
        .limit(500);

      if (!error && data) {
        setResults(data as Result[]);

        // Calculate subject stats
        const bySubject: Record<string, Result[]> = {};
        data.forEach(r => {
          if (!bySubject[r.subject]) bySubject[r.subject] = [];
          bySubject[r.subject].push(r as Result);
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
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Performance by Subject
          </CardTitle>
        </CardHeader>
        <CardContent>
          {subjectStats.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No quiz results yet</p>
          ) : (
            <div className="space-y-3">
              {subjectStats.map(stat => (
                <div key={stat.subject} className="p-3 rounded-lg border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{stat.subject}</span>
                    <span className="text-xs text-muted-foreground">{stat.count} quizzes</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      {stat.avgScore >= 50 ? (
                        <TrendingUp className="w-3 h-3 text-green-500" />
                      ) : (
                        <TrendingDown className="w-3 h-3 text-red-500" />
                      )}
                      <span>Avg: {stat.avgScore}%</span>
                    </div>
                    <div className="text-muted-foreground">
                      Pass rate: {stat.passRate}%
                    </div>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 mt-2">
                    <div
                      className={`h-2 rounded-full ${stat.avgScore >= 50 ? 'bg-green-500' : 'bg-red-500'}`}
                      style={{ width: `${stat.avgScore}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
