import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  ArrowLeft, BookOpen, Users, Brain, BarChart3, Upload,
  Shield, Settings, LogOut, ChevronRight, Award
} from 'lucide-react';
import AdminBookManager from './AdminBookManager';
import AdminUserManager from './AdminUserManager';
import AdminResults from './AdminResults';

interface AdminDashboardProps {
  user: User;
  onBack: () => void;
}

type AdminSection = 'overview' | 'books' | 'users' | 'results';

interface Stats {
  totalUsers: number;
  totalBooks: number;
  totalQuizzes: number;
  avgScore: number;
  passRate: number;
  certificates: number;
}

export default function AdminDashboard({ user, onBack }: AdminDashboardProps) {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0, totalBooks: 0, totalQuizzes: 0, avgScore: 0, passRate: 0, certificates: 0
  });
  const [activeSection, setActiveSection] = useState<AdminSection>('overview');

  useEffect(() => {
    const fetchStats = async () => {
      const [profilesRes, booksRes, resultsRes, certsRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('auto_quiz_books').select('id', { count: 'exact', head: true }),
        supabase.from('auto_quiz_results').select('percentage, passed'),
        supabase.from('certificates').select('id', { count: 'exact', head: true }),
      ]);

      const results = resultsRes.data || [];
      const avg = results.length > 0
        ? Math.round(results.reduce((s, r) => s + Number(r.percentage), 0) / results.length)
        : 0;
      const passRate = results.length > 0
        ? Math.round((results.filter(r => r.passed).length / results.length) * 100)
        : 0;

      setStats({
        totalUsers: profilesRes.count || 0,
        totalBooks: booksRes.count || 0,
        totalQuizzes: results.length,
        avgScore: avg,
        passRate,
        certificates: certsRes.count || 0,
      });
    };
    fetchStats();
  }, []);

  const navItems = [
    { id: 'overview' as AdminSection, label: 'Overview', icon: BarChart3 },
    { id: 'books' as AdminSection, label: 'Book Manager', icon: BookOpen },
    { id: 'users' as AdminSection, label: 'Users', icon: Users },
    { id: 'results' as AdminSection, label: 'Analytics', icon: Brain },
  ];

  const statCards = [
    { label: 'Total Users', value: stats.totalUsers, icon: Users, color: 'hsl(var(--primary))' },
    { label: 'Books Uploaded', value: stats.totalBooks, icon: BookOpen, color: '#22c55e' },
    { label: 'Quizzes Taken', value: stats.totalQuizzes, icon: Brain, color: '#a855f7' },
    { label: 'Avg Score', value: `${stats.avgScore}%`, icon: BarChart3, color: '#f97316' },
    { label: 'Pass Rate', value: `${stats.passRate}%`, icon: Award, color: '#eab308' },
    { label: 'Certificates', value: stats.certificates, icon: Award, color: '#06b6d4' },
  ];

  return (
    <div className="min-h-screen" style={{ background: 'hsl(var(--background))' }}>
      {/* Admin Top Bar */}
      <div
        className="sticky top-0 z-50 border-b px-4 py-3 flex items-center gap-3"
        style={{
          background: 'linear-gradient(135deg, hsl(var(--card)) 0%, hsl(var(--muted)) 100%)',
          borderColor: 'hsl(var(--border))',
        }}
      >
        <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-2 flex-1">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}
          >
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold leading-tight">Admin Control Panel</h1>
            <p className="text-[10px] text-muted-foreground">Model Egdu Management</p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs - Horizontal on mobile */}
      <div className="border-b overflow-x-auto" style={{ borderColor: 'hsl(var(--border))' }}>
        <div className="flex px-2">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content Area */}
      <div className="p-4 pb-24">
        {activeSection === 'overview' && (
          <div className="space-y-4">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              {statCards.map(card => {
                const Icon = card.icon;
                return (
                  <Card key={card.label} className="overflow-hidden">
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{card.label}</p>
                          <p className="text-xl font-bold mt-1">{card.value}</p>
                        </div>
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                          style={{ background: `${card.color}15`, color: card.color }}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Quick Actions */}
            <Card>
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Quick Actions</h3>
                <div className="space-y-2">
                  {[
                    { label: 'Upload New Book', desc: 'Add textbook for quiz generation', icon: Upload, section: 'books' as AdminSection },
                    { label: 'View Users', desc: 'Manage student & teacher accounts', icon: Users, section: 'users' as AdminSection },
                    { label: 'Quiz Analytics', desc: 'Performance reports & insights', icon: BarChart3, section: 'results' as AdminSection },
                  ].map(action => {
                    const Icon = action.icon;
                    return (
                      <button
                        key={action.label}
                        onClick={() => setActiveSection(action.section)}
                        className="w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-colors hover:bg-muted/50"
                        style={{ borderColor: 'hsl(var(--border))' }}
                      >
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                          style={{ background: 'hsl(var(--primary) / 0.1)', color: 'hsl(var(--primary))' }}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{action.label}</p>
                          <p className="text-xs text-muted-foreground">{action.desc}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeSection === 'books' && <AdminBookManager user={user} />}
        {activeSection === 'users' && <AdminUserManager />}
        {activeSection === 'results' && <AdminResults />}
      </div>
    </div>
  );
}
