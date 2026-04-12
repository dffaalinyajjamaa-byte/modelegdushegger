import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Search, ChevronDown, ChevronUp, Trash2, CheckCircle, XCircle } from 'lucide-react';

interface QuizResult {
  id: string;
  user_id: string;
  book_id: string;
  subject: string;
  score: number;
  total: number;
  percentage: number;
  passed: boolean;
  answers: any;
  time_taken: number | null;
  created_at: string;
  userName?: string;
}

export default function AdminQuizEditor() {
  const [results, setResults] = useState<QuizResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => { fetchResults(); }, []);

  const fetchResults = async () => {
    const { data } = await supabase.from('auto_quiz_results').select('*').order('created_at', { ascending: false }).limit(200);
    if (data) {
      // Fetch user names
      const userIds = [...new Set(data.map(r => r.user_id))];
      const { data: profiles } = await supabase.from('profiles').select('user_id, full_name').in('user_id', userIds);
      const nameMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);
      setResults(data.map(r => ({ ...r, userName: nameMap.get(r.user_id) || 'Unknown' })));
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('auto_quiz_results').delete().eq('id', id);
    if (error) toast({ title: 'Delete failed', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Result deleted' }); fetchResults(); }
  };

  const filtered = results.filter(r =>
    r.userName?.toLowerCase().includes(search.toLowerCase()) ||
    r.subject.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search by name or subject..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <Badge variant="secondary">{filtered.length} results</Badge>

      <div className="space-y-2">
        {filtered.map(result => (
          <Card key={result.id}>
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {result.passed ? <CheckCircle className="w-4 h-4 text-green-500 shrink-0" /> : <XCircle className="w-4 h-4 text-red-500 shrink-0" />}
                    <span className="text-sm font-medium truncate">{result.userName}</span>
                  </div>
                  <div className="flex gap-1 mt-1 flex-wrap">
                    <Badge variant="outline" className="text-[10px]">{result.subject}</Badge>
                    <Badge variant={result.passed ? 'default' : 'destructive'} className="text-[10px]">
                      {result.score}/{result.total} ({Math.round(result.percentage)}%)
                    </Badge>
                    {result.time_taken && (
                      <Badge variant="secondary" className="text-[10px]">{Math.round(result.time_taken / 60)}min</Badge>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setExpandedId(expandedId === result.id ? null : result.id)}>
                    {expandedId === result.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDelete(result.id)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>

              {expandedId === result.id && result.answers && (
                <div className="mt-3 pt-3 border-t space-y-2 max-h-60 overflow-y-auto">
                  <p className="text-[10px] text-muted-foreground uppercase">Answer Details</p>
                  {Array.isArray(result.answers) ? (
                    result.answers.map((a: any, i: number) => (
                      <div key={i} className="text-xs p-2 rounded bg-muted/50">
                        <p className="font-medium">Q{i + 1}: {a.question?.substring(0, 80)}...</p>
                        <p className={a.isCorrect ? 'text-green-600' : 'text-red-600'}>
                          Selected: {a.selected} | Correct: {a.correct}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground">Raw data: {JSON.stringify(result.answers).substring(0, 200)}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
