import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Search, ChevronDown, ChevronUp, Trash2, Pencil, Plus, X } from 'lucide-react';

interface AdminQuiz {
  id: string;
  title: string;
  subject: string;
  grade_level: string;
  questions: any[];
  time_limit_minutes: number | null;
  created_at: string;
}

interface QItem { question: string; options: string[]; correct: number; }

function normalize(qs: any[]): QItem[] {
  return (qs || []).map((q: any) => ({
    question: q.question || q.text || '',
    options: Array.isArray(q.options) ? q.options : [q.A, q.B, q.C, q.D].filter(Boolean),
    correct: typeof q.correct === 'number'
      ? q.correct
      : (q.answer === 'A' ? 0 : q.answer === 'B' ? 1 : q.answer === 'C' ? 2 : q.answer === 'D' ? 3 : 0),
  }));
}

export default function AdminQuizList() {
  const [quizzes, setQuizzes] = useState<AdminQuiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [grade, setGrade] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingQuiz, setEditingQuiz] = useState<AdminQuiz | null>(null);
  const [eTitle, setETitle] = useState('');
  const [eSubject, setESubject] = useState('');
  const [eGrade, setEGrade] = useState('Grade 8');
  const [eTime, setETime] = useState('30');
  const [eQuestions, setEQuestions] = useState<QItem[]>([]);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchAll();
    const channel = supabase
      .channel('admin-quiz-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'admin_quizzes' }, fetchAll)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchAll = async () => {
    const { data } = await supabase.from('admin_quizzes').select('*').order('created_at', { ascending: false });
    setQuizzes((data || []) as AdminQuiz[]);
    setLoading(false);
  };

  const openEdit = (q: AdminQuiz) => {
    setEditingQuiz(q);
    setETitle(q.title);
    setESubject(q.subject);
    setEGrade(q.grade_level);
    setETime(String(q.time_limit_minutes || 30));
    setEQuestions(normalize(q.questions));
  };

  const updateQuestion = (idx: number, patch: Partial<QItem>) => {
    setEQuestions(prev => prev.map((q, i) => i === idx ? { ...q, ...patch } : q));
  };
  const updateOption = (qIdx: number, oIdx: number, value: string) => {
    setEQuestions(prev => prev.map((q, i) => i === qIdx ? { ...q, options: q.options.map((o, j) => j === oIdx ? value : o) } : q));
  };
  const addQuestion = () => setEQuestions(prev => [...prev, { question: '', options: ['', '', '', ''], correct: 0 }]);
  const removeQuestion = (idx: number) => setEQuestions(prev => prev.filter((_, i) => i !== idx));

  const handleSave = async () => {
    if (!editingQuiz) return;
    if (!eTitle.trim() || !eSubject.trim() || eQuestions.some(q => !q.question.trim() || q.options.some(o => !o.trim()))) {
      toast({ title: 'Fill all fields', variant: 'destructive' }); return;
    }
    setSaving(true);
    const { error } = await supabase.from('admin_quizzes').update({
      title: eTitle, subject: eSubject, grade_level: eGrade,
      time_limit_minutes: parseInt(eTime) || 30,
      questions: eQuestions as any,
    }).eq('id', editingQuiz.id);
    if (error) toast({ title: 'Save failed', description: error.message, variant: 'destructive' });
    else { toast({ title: '✅ Quiz updated' }); setEditingQuiz(null); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this quiz? This will also remove it from students.')) return;
    const { error } = await supabase.from('admin_quizzes').delete().eq('id', id);
    if (error) toast({ title: 'Delete failed', description: error.message, variant: 'destructive' });
    else toast({ title: 'Quiz deleted' });
  };

  const filtered = quizzes.filter(q => {
    if (grade !== 'all' && q.grade_level !== grade) return false;
    const s = search.toLowerCase().trim();
    if (!s) return true;
    return q.title.toLowerCase().includes(s) || q.subject.toLowerCase().includes(s);
  });

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search title or subject..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
        </div>
        <Select value={grade} onValueChange={setGrade}>
          <SelectTrigger className="w-32 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All grades</SelectItem>
            <SelectItem value="Grade 6">Grade 6</SelectItem>
            <SelectItem value="Grade 8">Grade 8</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Badge variant="secondary">{filtered.length} quizzes</Badge>

      <div className="space-y-2">
        {filtered.map(q => {
          const items = normalize(q.questions);
          const open = expandedId === q.id;
          return (
            <Card key={q.id}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{q.title}</p>
                    <div className="flex gap-1 mt-1 flex-wrap">
                      <Badge variant="outline" className="text-[10px]">{q.grade_level}</Badge>
                      <Badge variant="outline" className="text-[10px]">{q.subject}</Badge>
                      <Badge variant="secondary" className="text-[10px]">{items.length} Q</Badge>
                      <Badge variant="secondary" className="text-[10px]">{q.time_limit_minutes || 30} min</Badge>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setExpandedId(open ? null : q.id)} title="Read">
                      {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(q)} title="Edit">
                      <Pencil className="w-3 h-3" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDelete(q.id)} title="Delete">
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>

                {open && (
                  <div className="mt-3 pt-3 border-t space-y-2 max-h-72 overflow-y-auto">
                    {items.map((it, i) => (
                      <div key={i} className="text-xs p-2 rounded bg-muted/50">
                        <p className="font-medium mb-1">Q{i + 1}. {it.question}</p>
                        <ol className="space-y-0.5 ml-3">
                          {it.options.map((o, j) => (
                            <li key={j} className={j === it.correct ? 'text-green-600 font-semibold' : ''}>
                              {String.fromCharCode(65 + j)}. {o} {j === it.correct && '✓'}
                            </li>
                          ))}
                        </ol>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
        {filtered.length === 0 && (
          <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No quizzes match.</CardContent></Card>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingQuiz} onOpenChange={(o) => !o && setEditingQuiz(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Quiz</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Title</Label><Input value={eTitle} onChange={e => setETitle(e.target.value)} /></div>
              <div><Label className="text-xs">Subject</Label><Input value={eSubject} onChange={e => setESubject(e.target.value)} /></div>
              <div>
                <Label className="text-xs">Grade</Label>
                <Select value={eGrade} onValueChange={setEGrade}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Grade 6">Grade 6</SelectItem>
                    <SelectItem value="Grade 8">Grade 8</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Time (min)</Label><Input type="number" value={eTime} onChange={e => setETime(e.target.value)} /></div>
            </div>

            {eQuestions.map((q, qIdx) => (
              <Card key={qIdx}>
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] text-muted-foreground">Question {qIdx + 1}</Label>
                    <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => removeQuestion(qIdx)}>
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                  <Input value={q.question} onChange={e => updateQuestion(qIdx, { question: e.target.value })} placeholder="Question text" />
                  {q.options.map((opt, oIdx) => (
                    <div key={oIdx} className="flex items-center gap-2">
                      <input type="radio" name={`eq${qIdx}`} checked={q.correct === oIdx} onChange={() => updateQuestion(qIdx, { correct: oIdx })} />
                      <Input value={opt} onChange={e => updateOption(qIdx, oIdx, e.target.value)} placeholder={`Option ${String.fromCharCode(65 + oIdx)}`} className="flex-1" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
            <Button variant="outline" size="sm" onClick={addQuestion} className="w-full">
              <Plus className="w-3 h-3 mr-1" /> Add Question
            </Button>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditingQuiz(null)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}Save Quiz
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
