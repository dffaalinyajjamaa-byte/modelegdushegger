import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Session } from '@supabase/supabase-js';
import { BookOpen, MessageCircle, CheckSquare, Video, FileText, LogOut, Sparkles } from 'lucide-react';
import logo from '@/assets/logo.png';
import { useToast } from '@/hooks/use-toast';
import AITeacher from './AITeacher';
import TaskManager from './TaskManager';
import VideoViewer from './VideoViewer';
import PDFViewer from './PDFViewer';

interface DashboardProps {
  user: User;
  session: Session;
  onSignOut: () => void;
}

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  role: string;
}

interface Content {
  id: string;
  title: string;
  description: string;
  type: string;
  url: string;
  grade_level: string;
  subject: string;
}

type ActiveView = 'dashboard' | 'ai-teacher' | 'tasks' | 'video' | 'pdf';

export default function Dashboard({ user, session, onSignOut }: DashboardProps) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [content, setContent] = useState<Content[]>([]);
  const [activeView, setActiveView] = useState<ActiveView>('dashboard');
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchProfile();
    fetchContent();
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const fetchContent = async () => {
    try {
      const { data, error } = await supabase
        .from('content')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContent(data || []);
    } catch (error) {
      console.error('Error fetching content:', error);
    }
  };

  const logActivity = async (activityType: string, description: string, metadata?: any) => {
    try {
      await supabase
        .from('activities')
        .insert({
          user_id: user.id,
          activity_type: activityType,
          description,
          metadata
        });
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  };

  const handleSignOut = async () => {
    await logActivity('auth', 'User signed out');
    await supabase.auth.signOut();
    onSignOut();
  };

  const handleContentClick = (item: Content) => {
    setSelectedContent(item);
    if (item.type === 'video') {
      setActiveView('video');
      logActivity('video', `Started watching: ${item.title}`, { content_id: item.id });
    } else if (item.type === 'pdf') {
      setActiveView('pdf');
      logActivity('pdf', `Opened document: ${item.title}`, { content_id: item.id });
    }
  };

  const renderActiveView = () => {
    switch (activeView) {
      case 'ai-teacher':
        return <AITeacher user={user} onLogActivity={logActivity} />;
      case 'tasks':
        return <TaskManager user={user} onLogActivity={logActivity} />;
      case 'video':
        return selectedContent ? (
          <VideoViewer 
            content={selectedContent} 
            onBack={() => setActiveView('dashboard')}
            onLogActivity={logActivity}
          />
        ) : null;
      case 'pdf':
        return selectedContent ? (
          <PDFViewer 
            content={selectedContent} 
            onBack={() => setActiveView('dashboard')}
            onLogActivity={logActivity}
          />
        ) : null;
      default:
        return renderDashboard();
    }
  };

  const renderDashboard = () => (
    <div className="space-y-8">
      {/* Motivational Header */}
      <div className="text-center py-8">
        <h1 className="text-4xl font-bold motivational-text mb-4">
          Baga Nagaan Gara Moodela Eegduutti Dhuftan
        </h1>
        <p className="text-xl text-muted-foreground mb-2">
          Welcome back, {profile?.full_name || 'Student'}!
        </p>
        <div className="flex items-center justify-center gap-2 text-lg font-medium gradient-secondary bg-clip-text text-transparent">
          <Sparkles className="w-5 h-5 text-secondary" />
          Keep going, you're doing great!
          <Sparkles className="w-5 h-5 text-secondary" />
        </div>
      </div>

      {/* Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card 
          className="cursor-pointer hover-glow transition-smooth hover-scale"
          onClick={() => setActiveView('ai-teacher')}
        >
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-16 h-16 gradient-primary rounded-full flex items-center justify-center mb-4">
              <MessageCircle className="w-8 h-8 text-white" />
            </div>
            <CardTitle>AI Teacher</CardTitle>
            <CardDescription>Chat with your AI learning assistant</CardDescription>
          </CardHeader>
        </Card>

        <Card 
          className="cursor-pointer hover-glow transition-smooth hover-scale"
          onClick={() => setActiveView('tasks')}
        >
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-16 h-16 gradient-secondary rounded-full flex items-center justify-center mb-4">
              <CheckSquare className="w-8 h-8 text-white" />
            </div>
            <CardTitle>My Tasks</CardTitle>
            <CardDescription>Manage your study tasks and progress</CardDescription>
          </CardHeader>
        </Card>

        <Card className="cursor-pointer hover-glow transition-smooth hover-scale">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-16 h-16 gradient-accent rounded-full flex items-center justify-center mb-4">
              <Video className="w-8 h-8 text-white" />
            </div>
            <CardTitle>Video Lessons</CardTitle>
            <CardDescription>Watch educational videos</CardDescription>
          </CardHeader>
        </Card>

        <Card className="cursor-pointer hover-glow transition-smooth hover-scale">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-16 h-16 gradient-hero rounded-full flex items-center justify-center mb-4">
              <FileText className="w-8 h-8 text-white" />
            </div>
            <CardTitle>PDF Documents</CardTitle>
            <CardDescription>Access study materials</CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* Content Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Video Lessons */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="w-5 h-5 text-primary" />
              Video Lessons
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {content.filter(item => item.type === 'video').map((item) => (
              <div 
                key={item.id}
                className="flex items-center justify-between p-3 bg-muted rounded-lg cursor-pointer hover:bg-muted/80 transition-smooth"
                onClick={() => handleContentClick(item)}
              >
                <div>
                  <h4 className="font-medium">{item.title}</h4>
                  <div className="flex gap-2 mt-1">
                    <Badge variant="secondary">{item.subject}</Badge>
                    <Badge variant="outline">{item.grade_level}</Badge>
                  </div>
                </div>
                <Button variant="ghost" size="sm">
                  Watch
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* PDF Documents */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              PDF Documents
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {content.filter(item => item.type === 'pdf').map((item) => (
              <div 
                key={item.id}
                className="flex items-center justify-between p-3 bg-muted rounded-lg cursor-pointer hover:bg-muted/80 transition-smooth"
                onClick={() => handleContentClick(item)}
              >
                <div>
                  <h4 className="font-medium">{item.title}</h4>
                  <div className="flex gap-2 mt-1">
                    <Badge variant="secondary">{item.subject}</Badge>
                    <Badge variant="outline">{item.grade_level}</Badge>
                  </div>
                </div>
                <Button variant="ghost" size="sm">
                  Read
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Model Egdu" className="w-10 h-10 rounded-full" />
            <div>
              <h1 className="text-xl font-bold gradient-primary bg-clip-text text-transparent">
                Model Egdu
              </h1>
              <p className="text-sm text-muted-foreground">AI-Powered Learning</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {activeView !== 'dashboard' && (
              <Button 
                variant="outline" 
                onClick={() => setActiveView('dashboard')}
              >
                Dashboard
              </Button>
            )}
            <Button
              variant="outline"
              onClick={handleSignOut}
              className="flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {renderActiveView()}
      </main>
    </div>
  );
}