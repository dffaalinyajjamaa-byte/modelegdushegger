import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  ArrowLeft, BookOpen, Users, Brain, BarChart3,
  Shield, Award, FileText, Video, Edit3, ClipboardList,
  ShoppingBag, BadgeCheck, Flag, Settings as SettingsIcon,
  AlertTriangle, Loader2
} from 'lucide-react';
import AdminBookManager from './AdminBookManager';
import AdminUserManager from './AdminUserManager';
import AdminResults from './AdminResults';
import AdminNationalExams from './AdminNationalExams';
import AdminContentManager from './AdminContentManager';
import AdminQuizEditor from './AdminQuizEditor';
import AdminQuizList from './AdminQuizList';
import AdminWorksheetManager from './AdminWorksheetManager';
import AdminBadgeVerification from './AdminBadgeVerification';
import AdminMarketplace from './AdminMarketplace';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

interface AdminDashboardProps {
  user: User;
  onBack: () => void;
}

type AdminSection = 'overview' | 'national-exams' | 'books' | 'content' | 'quiz-editor' | 'users' | 'analytics' | 'worksheets' | 'badges' | 'marketplace' | 'reports' | 'settings';

interface Stats {
  totalUsers: number;
  totalBooks: number;
  totalQuizzes: number;
  avgScore: number;
  passRate: number;
  certificates: number;
  nationalExams: number;
  contentItems: number;
  worksheets: number;
  marketplaceProducts: number;
  pendingReports: number;
}

// Reports Tab Component
function AdminReports() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from('reported_messages').select('*').order('created_at', { ascending: false }).limit(100);
      setReports(data || []);
      setLoading(false);
    };
    fetch();
  }, []);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from('reported_messages').update({ status }).eq('id', id);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else {
      toast({ title: `Report ${status}` });
      setReports(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    }
  };

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-bold">Reported Messages ({reports.length})</h3>
      {reports.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No reports yet</CardContent></Card>
      ) : reports.map(r => (
        <Card key={r.id}>
          <CardContent className="p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{r.reason}</p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Message ID: {r.message_id?.slice(0, 8)}... • {new Date(r.created_at).toLocaleDateString()}
                </p>
                <Badge variant={r.status === 'pending' ? 'destructive' : r.status === 'resolved' ? 'default' : 'secondary'} className="text-[10px] mt-1">
                  {r.status}
                </Badge>
              </div>
              {r.status === 'pending' && (
                <div className="flex gap-1 shrink-0">
                  <Button size="sm" variant="outline" className="text-[10px] h-7" onClick={() => updateStatus(r.id, 'resolved')}>Resolve</Button>
                  <Button size="sm" variant="destructive" className="text-[10px] h-7" onClick={() => updateStatus(r.id, 'dismissed')}>Dismiss</Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Settings Tab Component
function AdminSettings() {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold">Platform Settings</h3>
      <Card>
        <CardContent className="p-4 space-y-4">
          <div>
            <Label className="text-xs">Announcement Banner</Label>
            <Textarea placeholder="Write an announcement to display to all users..." rows={3} className="mt-1" />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Maintenance Mode</p>
              <p className="text-[10px] text-muted-foreground">Disable app access for non-admins</p>
            </div>
            <Button variant="outline" size="sm">Off</Button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Auto-Approve Marketplace</p>
              <p className="text-[10px] text-muted-foreground">Skip admin review for new listings</p>
            </div>
            <Button variant="outline" size="sm">Off</Button>
          </div>
          <Button className="w-full" size="sm">Save Settings</Button>
        </CardContent>
      </Card>
    </div>
  );
}

// Quiz Creator Component
function AdminQuizCreator({ user }: { user: User }) {
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [grade, setGrade] = useState('Grade 8');
  const [questions, setQuestions] = useState<any[]>([{ question: '', options: ['', '', '', ''], correct: 0 }]);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const addQuestion = () => setQuestions(prev => [...prev, { question: '', options: ['', '', '', ''], correct: 0 }]);

  const updateQuestion = (idx: number, field: string, value: any) => {
    setQuestions(prev => prev.map((q, i) => i === idx ? { ...q, [field]: value } : q));
  };

  const updateOption = (qIdx: number, oIdx: number, value: string) => {
    setQuestions(prev => prev.map((q, i) => i === qIdx ? { ...q, options: q.options.map((o: string, j: number) => j === oIdx ? value : o) } : q));
  };

  const handleSave = async () => {
    if (!title || !subject || questions.some(q => !q.question || q.options.some((o: string) => !o))) {
      toast({ title: 'Fill all fields', variant: 'destructive' }); return;
    }
    setSaving(true);
    const { error } = await supabase.from('admin_quizzes' as any).insert({
      title, subject, grade_level: grade, questions, created_by: user.id
    });
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else {
      toast({ title: '✅ Quiz created!' });
      setTitle(''); setSubject(''); setQuestions([{ question: '', options: ['', '', '', ''], correct: 0 }]);
    }
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold">Create New Quiz</h3>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Title</Label>
          <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Quiz title" />
        </div>
        <div>
          <Label className="text-xs">Subject</Label>
          <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. Math" />
        </div>
      </div>
      <div>
        <Label className="text-xs">Grade</Label>
        <Select value={grade} onValueChange={setGrade}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Grade 6">Grade 6</SelectItem>
            <SelectItem value="Grade 8">Grade 8</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {questions.map((q, qIdx) => (
        <Card key={qIdx}>
          <CardContent className="p-3 space-y-2">
            <Label className="text-[10px] text-muted-foreground">Question {qIdx + 1}</Label>
            <Input value={q.question} onChange={e => updateQuestion(qIdx, 'question', e.target.value)} placeholder="Question text" />
            {q.options.map((opt: string, oIdx: number) => (
              <div key={oIdx} className="flex items-center gap-2">
                <input type="radio" name={`q${qIdx}`} checked={q.correct === oIdx} onChange={() => updateQuestion(qIdx, 'correct', oIdx)} />
                <Input value={opt} onChange={e => updateOption(qIdx, oIdx, e.target.value)} placeholder={`Option ${oIdx + 1}`} className="flex-1" />
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={addQuestion} className="flex-1">+ Add Question</Button>
        <Button size="sm" onClick={handleSave} disabled={saving} className="flex-1">
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}Save Quiz
        </Button>
      </div>
    </div>
  );
}

export default function AdminDashboard({ user, onBack }: AdminDashboardProps) {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0, totalBooks: 0, totalQuizzes: 0, avgScore: 0, passRate: 0,
    certificates: 0, nationalExams: 0, contentItems: 0, worksheets: 0, marketplaceProducts: 0, pendingReports: 0
  });
  const [activeSection, setActiveSection] = useState<AdminSection>('overview');

  useEffect(() => {
    const fetchStats = async () => {
      const [profilesRes, booksRes, resultsRes, certsRes, examsRes, contentRes, worksheetsRes, productsRes, reportsRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('auto_quiz_books').select('id', { count: 'exact', head: true }),
        supabase.from('auto_quiz_results').select('percentage, passed'),
        supabase.from('certificates').select('id', { count: 'exact', head: true }),
        supabase.from('national_exams').select('id', { count: 'exact', head: true }),
        supabase.from('content').select('id', { count: 'exact', head: true }),
        supabase.from('worksheets').select('id', { count: 'exact', head: true }),
        supabase.from('marketplace_products').select('id', { count: 'exact', head: true }),
        supabase.from('reported_messages').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      ]);
      const results = resultsRes.data || [];
      const avg = results.length ? Math.round(results.reduce((s, r) => s + Number(r.percentage), 0) / results.length) : 0;
      const passRate = results.length ? Math.round((results.filter(r => r.passed).length / results.length) * 100) : 0;
      setStats({
        totalUsers: profilesRes.count || 0,
        totalBooks: booksRes.count || 0,
        totalQuizzes: results.length,
        avgScore: avg,
        passRate,
        certificates: certsRes.count || 0,
        nationalExams: examsRes.count || 0,
        contentItems: contentRes.count || 0,
        worksheets: worksheetsRes.count || 0,
        marketplaceProducts: productsRes.count || 0,
        pendingReports: reportsRes.count || 0,
      });
    };
    fetchStats();
  }, []);

  const tabs: { id: AdminSection; label: string; icon: any; badge?: number }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'national-exams', label: 'Exams', icon: FileText },
    { id: 'books', label: 'Quiz Books', icon: BookOpen },
    { id: 'worksheets', label: 'Worksheets', icon: ClipboardList },
    { id: 'content', label: 'Content', icon: Video },
    { id: 'marketplace', label: 'Market', icon: ShoppingBag },
    { id: 'badges', label: 'Badges', icon: BadgeCheck },
    { id: 'quiz-editor', label: 'Results', icon: Edit3 },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'reports', label: 'Reports', icon: Flag, badge: stats.pendingReports },
    { id: 'analytics', label: 'Analytics', icon: Brain },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  const statCards = [
    { label: 'Users', value: stats.totalUsers, icon: Users, color: 'hsl(var(--primary))' },
    { label: 'Quiz Books', value: stats.totalBooks, icon: BookOpen, color: '#22c55e' },
    { label: 'Quizzes Taken', value: stats.totalQuizzes, icon: Brain, color: '#a855f7' },
    { label: 'Avg Score', value: `${stats.avgScore}%`, icon: BarChart3, color: '#f97316' },
    { label: 'Pass Rate', value: `${stats.passRate}%`, icon: Award, color: '#eab308' },
    { label: 'Certificates', value: stats.certificates, icon: Award, color: '#06b6d4' },
    { label: 'National Exams', value: stats.nationalExams, icon: FileText, color: '#ec4899' },
    { label: 'Content', value: stats.contentItems, icon: Video, color: '#8b5cf6' },
    { label: 'Worksheets', value: stats.worksheets, icon: ClipboardList, color: '#14b8a6' },
    { label: 'Marketplace', value: stats.marketplaceProducts, icon: ShoppingBag, color: '#f43f5e' },
    { label: 'Reports', value: stats.pendingReports, icon: AlertTriangle, color: '#ef4444' },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Top Bar */}
      <div className="sticky top-0 z-50 border-b px-3 py-2.5 flex items-center gap-2 bg-card">
        {onBack && (
          <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0 h-8 w-8">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        )}
        <div className="w-7 h-7 rounded-md flex items-center justify-center bg-primary text-primary-foreground">
          <Shield className="w-3.5 h-3.5" />
        </div>
        <div>
          <h1 className="text-xs font-bold leading-tight">Admin Control Panel</h1>
          <p className="text-[9px] text-muted-foreground">Model Egdu Management</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b overflow-x-auto scrollbar-hide">
        <div className="flex px-1">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const active = activeSection === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSection(tab.id)}
                className={`relative flex items-center gap-1 px-2.5 py-2 text-[11px] font-medium whitespace-nowrap border-b-2 transition-colors ${
                  active ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="w-3 h-3" />
                {tab.label}
                {tab.badge && tab.badge > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-destructive text-destructive-foreground text-[8px] rounded-full flex items-center justify-center">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="p-3 pb-24">
        {activeSection === 'overview' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {statCards.map(card => {
                const Icon = card.icon;
                return (
                  <Card key={card.label}>
                    <CardContent className="p-2.5">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-[9px] text-muted-foreground uppercase tracking-wider">{card.label}</p>
                          <p className="text-lg font-bold mt-0.5">{card.value}</p>
                        </div>
                        <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0" style={{ background: `${card.color}15`, color: card.color }}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            <AdminQuizCreator user={user} />
          </div>
        )}
        {activeSection === 'national-exams' && <AdminNationalExams user={user} />}
        {activeSection === 'books' && <AdminBookManager user={user} />}
        {activeSection === 'worksheets' && <AdminWorksheetManager user={user} />}
        {activeSection === 'content' && <AdminContentManager user={user} />}
        {activeSection === 'marketplace' && <AdminMarketplace />}
        {activeSection === 'badges' && <AdminBadgeVerification />}
        {activeSection === 'quiz-editor' && <AdminQuizEditor />}
        {activeSection === 'users' && <AdminUserManager />}
        {activeSection === 'reports' && <AdminReports />}
        {activeSection === 'analytics' && <AdminResults />}
        {activeSection === 'settings' && <AdminSettings />}
      </div>
    </div>
  );
}
