import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { 
  Users, BookOpen, MessageCircle, BarChart3, Settings, 
  LogOut, FileText, Megaphone, Shield, Activity
} from 'lucide-react';
import logo from '@/assets/logo.png';
import AdminUsers from '@/components/admin/AdminUsers';
import AdminContent from '@/components/admin/AdminContent';
import AdminAnalytics from '@/components/admin/AdminAnalytics';
import AdminAnnouncements from '@/components/admin/AdminAnnouncements';
import AdminChats from '@/components/admin/AdminChats';

type AdminView = 'overview' | 'users' | 'content' | 'chats' | 'announcements' | 'analytics' | 'settings';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeView, setActiveView] = useState<AdminView>('overview');
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalLessons: 0,
    totalChats: 0,
    activeToday: 0,
  });

  useEffect(() => {
    checkAdminAccess();
    fetchStats();
  }, []);

  const checkAdminAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate('/admin-login');
      return;
    }

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!roleData) {
      toast({
        title: 'Access Denied',
        description: 'Admin privileges required',
        variant: 'destructive',
      });
      await supabase.auth.signOut();
      navigate('/admin-login');
    }
  };

  const fetchStats = async () => {
    const [usersRes, contentRes, chatsRes] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('content').select('id', { count: 'exact', head: true }),
      supabase.from('chats').select('id', { count: 'exact', head: true }),
    ]);

    setStats({
      totalUsers: usersRes.count || 0,
      totalLessons: contentRes.count || 0,
      totalChats: chatsRes.count || 0,
      activeToday: 0, // Can be calculated from activities table
    });
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/admin-login');
  };

  const renderView = () => {
    switch (activeView) {
      case 'users':
        return <AdminUsers />;
      case 'content':
        return <AdminContent />;
      case 'chats':
        return <AdminChats />;
      case 'announcements':
        return <AdminAnnouncements />;
      case 'analytics':
        return <AdminAnalytics />;
      default:
        return renderOverview();
    }
  };

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalUsers}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-pink-500 to-pink-600 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Lessons</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalLessons}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Chats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalChats}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.activeToday}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common administrative tasks</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Button
            variant="outline"
            className="h-20 flex-col gap-2"
            onClick={() => setActiveView('users')}
          >
            <Users className="w-6 h-6" />
            Manage Users
          </Button>
          <Button
            variant="outline"
            className="h-20 flex-col gap-2"
            onClick={() => setActiveView('content')}
          >
            <BookOpen className="w-6 h-6" />
            Content
          </Button>
          <Button
            variant="outline"
            className="h-20 flex-col gap-2"
            onClick={() => setActiveView('announcements')}
          >
            <Megaphone className="w-6 h-6" />
            Announce
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Model Egdu" className="w-10 h-10 rounded-full" />
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-orange-500 to-purple-500 bg-clip-text text-transparent">
                Admin Panel
              </h1>
              <p className="text-xs text-muted-foreground">Model Egdu</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleSignOut}>
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      {/* Navigation */}
      <div className="bg-white/90 backdrop-blur-md border-b overflow-x-auto">
        <div className="max-w-7xl mx-auto px-4">
          <nav className="flex gap-1 py-2">
            {[
              { id: 'overview', label: 'Overview', icon: Activity },
              { id: 'users', label: 'Users', icon: Users },
              { id: 'content', label: 'Content', icon: BookOpen },
              { id: 'chats', label: 'Chats', icon: MessageCircle },
              { id: 'announcements', label: 'Announcements', icon: Megaphone },
              { id: 'analytics', label: 'Analytics', icon: BarChart3 },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <Button
                  key={item.id}
                  variant={activeView === item.id ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveView(item.id as AdminView)}
                  className={activeView === item.id ? 'bg-gradient-to-r from-orange-500 to-purple-500' : ''}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {item.label}
                </Button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {renderView()}
      </main>
    </div>
  );
}
