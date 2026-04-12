import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  ArrowLeft, BookOpen, Users, Brain, BarChart3,
  Shield, Award, FileText, Video, Edit3
} from 'lucide-react';
import AdminBookManager from './AdminBookManager';
import AdminUserManager from './AdminUserManager';
import AdminResults from './AdminResults';
import AdminNationalExams from './AdminNationalExams';
import AdminContentManager from './AdminContentManager';
import AdminQuizEditor from './AdminQuizEditor';

interface AdminDashboardProps {
  user: User;
  onBack: () => void;
}

type AdminSection = 'overview' | 'national-exams' | 'books' | 'content' | 'quiz-editor' | 'users' | 'analytics';

interface Stats {
  totalUsers: number;
  totalBooks: number;
  totalQuizzes: number;
  avgScore: number;
  passRate: number;
  certificates: number;
  nationalExams: number;
  contentItems: number;
}

export default function AdminDashboard({ user, onBack }: AdminDashboardProps) {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0, totalBooks: 0, totalQuizzes: 0, avgScore: 0, passRate: 0,
    certificates: 0, nationalExams: 0, contentItems: 0
  });
  const [activeSection, setActiveSection] = useState<AdminSection>('overview');

  useEffect(() => {
    const fetchStats = async () => {
      const [profilesRes, booksRes, resultsRes, certsRes, examsRes, contentRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('auto_quiz_books').select('id', { count: 'exact', head: true }),
        supabase.from('auto_quiz_results').select('percentage, passed'),
        supabase.from('certificates').select('id', { count: 'exact', head: true }),
        supabase.from('national_exams').select('id', { count: 'exact', head: true }),
        supabase.from('content').select('id', { count: 'exact', head: true }),
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
      });
    };
    fetchStats();
  }, []);

  const tabs: { id: AdminSection; label: string; icon: any }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'national-exams', label: 'Exams', icon: FileText },
    { id: 'books', label: 'Quiz Books', icon: BookOpen },
    { id: 'content', label: 'Content', icon: Video },
    { id: 'quiz-editor', label: 'Quiz Results', icon: Edit3 },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'analytics', label: 'Analytics', icon: Brain },
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
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Top Bar */}
      <div className="sticky top-0 z-50 border-b px-3 py-2.5 flex items-center gap-2 bg-card">
        <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0 h-8 w-8">
          <ArrowLeft className="w-4 h-4" />
        </Button>
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
                className={`flex items-center gap-1 px-2.5 py-2 text-[11px] font-medium whitespace-nowrap border-b-2 transition-colors ${
                  active ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="w-3 h-3" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="p-3 pb-24">
        {activeSection === 'overview' && (
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
        )}
        {activeSection === 'national-exams' && <AdminNationalExams user={user} />}
        {activeSection === 'books' && <AdminBookManager user={user} />}
        {activeSection === 'content' && <AdminContentManager user={user} />}
        {activeSection === 'quiz-editor' && <AdminQuizEditor />}
        {activeSection === 'users' && <AdminUserManager />}
        {activeSection === 'analytics' && <AdminResults />}
      </div>
    </div>
  );
}
