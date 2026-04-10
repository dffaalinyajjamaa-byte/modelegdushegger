import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, BookOpen, Users, Brain, BarChart3 } from 'lucide-react';
import AdminBookManager from './AdminBookManager';
import AdminUserManager from './AdminUserManager';
import AdminResults from './AdminResults';

interface AdminDashboardProps {
  user: User;
  onBack: () => void;
}

interface Stats {
  totalUsers: number;
  totalBooks: number;
  totalQuizzes: number;
  avgScore: number;
}

export default function AdminDashboard({ user, onBack }: AdminDashboardProps) {
  const [stats, setStats] = useState<Stats>({ totalUsers: 0, totalBooks: 0, totalQuizzes: 0, avgScore: 0 });
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const fetchStats = async () => {
      const [profilesRes, booksRes, resultsRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('auto_quiz_books').select('id', { count: 'exact', head: true }),
        supabase.from('auto_quiz_results').select('percentage'),
      ]);

      const results = resultsRes.data || [];
      const avg = results.length > 0
        ? Math.round(results.reduce((s, r) => s + Number(r.percentage), 0) / results.length)
        : 0;

      setStats({
        totalUsers: profilesRes.count || 0,
        totalBooks: booksRes.count || 0,
        totalQuizzes: results.length,
        avgScore: avg,
      });
    };
    fetchStats();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold">Admin Portal</h2>
          <p className="text-sm text-muted-foreground">Manage books, users, and quizzes</p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 text-center">
            <Users className="w-8 h-8 mx-auto text-blue-500 mb-2" />
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <div className="text-xs text-muted-foreground">Users</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <BookOpen className="w-8 h-8 mx-auto text-green-500 mb-2" />
            <div className="text-2xl font-bold">{stats.totalBooks}</div>
            <div className="text-xs text-muted-foreground">Books</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <Brain className="w-8 h-8 mx-auto text-purple-500 mb-2" />
            <div className="text-2xl font-bold">{stats.totalQuizzes}</div>
            <div className="text-xs text-muted-foreground">Quizzes Taken</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <BarChart3 className="w-8 h-8 mx-auto text-orange-500 mb-2" />
            <div className="text-2xl font-bold">{stats.avgScore}%</div>
            <div className="text-xs text-muted-foreground">Avg Score</div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="books">Books</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
        </TabsList>
        <TabsContent value="books">
          <AdminBookManager user={user} />
        </TabsContent>
        <TabsContent value="users">
          <AdminUserManager />
        </TabsContent>
        <TabsContent value="results">
          <AdminResults />
        </TabsContent>
      </Tabs>
    </div>
  );
}
