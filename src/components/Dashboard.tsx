import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, Session } from '@supabase/supabase-js';
import { BookOpen, MessageCircle, CheckSquare, Video, FileText, LogOut, Sparkles, Settings as SettingsIcon } from 'lucide-react';
import logo from '@/assets/oro-logo.png';
import { useToast } from '@/hooks/use-toast';
import AITeacher from './AITeacher';
import TaskManager from './TaskManager';
import VideoViewer from './VideoViewer';
import PDFViewer from './PDFViewer';
import Settings from './Settings';
import DigitalBooksLibrary from './DigitalBooksLibrary';
import VideoLessonsLibrary from './VideoLessonsLibrary';
import Hyperspeed from './Hyperspeed';
import Messenger from './Messenger';
import ExtraExam from './ExtraExam';
import AboutUs from './AboutUs';

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
  avatar_url: string | null;
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

type ActiveView = 'dashboard' | 'ai-teacher' | 'tasks' | 'video' | 'pdf' | 'settings' | 'books' | 'videos' | 'messenger' | 'exams';

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
      toast({
        title: 'Error',
        description: 'Failed to load profile data',
        variant: 'destructive',
      });
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
      case 'settings':
        return <Settings user={user} onBack={() => setActiveView('dashboard')} />;
      case 'messenger':
        return <Messenger user={user} onBack={() => setActiveView('dashboard')} />;
      case 'exams':
        return <ExtraExam user={user} onBack={() => setActiveView('dashboard')} />;
      case 'books':
        return (
          <DigitalBooksLibrary
            user={user}
            onBack={() => setActiveView('dashboard')}
            onBookClick={handleContentClick}
          />
        );
      case 'videos':
        return (
          <VideoLessonsLibrary
            user={user}
            onBack={() => setActiveView('dashboard')}
            onVideoClick={handleContentClick}
          />
        );
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
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card 
          className="cursor-pointer hover-glow transition-smooth hover-scale"
          onClick={() => setActiveView('ai-teacher')}
        >
          <CardHeader className="text-center pb-4 p-4">
            <div className="mx-auto w-12 h-12 gradient-primary rounded-full flex items-center justify-center mb-2">
              <MessageCircle className="w-6 h-6 text-white" />
            </div>
            <CardTitle className="text-sm">AI Teacher</CardTitle>
          </CardHeader>
        </Card>

        <Card 
          className="cursor-pointer hover-glow transition-smooth hover-scale"
          onClick={() => setActiveView('tasks')}
        >
          <CardHeader className="text-center pb-4 p-4">
            <div className="mx-auto w-12 h-12 gradient-secondary rounded-full flex items-center justify-center mb-2">
              <CheckSquare className="w-6 h-6 text-white" />
            </div>
            <CardTitle className="text-sm">Tasks</CardTitle>
          </CardHeader>
        </Card>

        <Card 
          className="cursor-pointer hover-glow transition-smooth hover-scale"
          onClick={() => setActiveView('books')}
        >
          <CardHeader className="text-center pb-4 p-4">
            <div className="mx-auto w-12 h-12 gradient-hero rounded-full flex items-center justify-center mb-2">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <CardTitle className="text-sm">Books</CardTitle>
          </CardHeader>
        </Card>

        <Card 
          className="cursor-pointer hover-glow transition-smooth hover-scale"
          onClick={() => setActiveView('exams')}
        >
          <CardHeader className="text-center pb-4 p-4">
            <div className="mx-auto w-12 h-12 gradient-accent rounded-full flex items-center justify-center mb-2">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <CardTitle className="text-sm">Exams</CardTitle>
          </CardHeader>
        </Card>

        <Card 
          className="cursor-pointer hover-glow transition-smooth hover-scale"
          onClick={() => setActiveView('messenger')}
        >
          <CardHeader className="text-center pb-4 p-4">
            <div className="mx-auto w-12 h-12 gradient-secondary rounded-full flex items-center justify-center mb-2">
              <MessageCircle className="w-6 h-6 text-white" />
            </div>
            <CardTitle className="text-sm">Chat</CardTitle>
          </CardHeader>
        </Card>

        <Card 
          className="cursor-pointer hover-glow transition-smooth hover-scale"
          onClick={() => setActiveView('videos')}
        >
          <CardHeader className="text-center pb-4 p-4">
            <div className="mx-auto w-12 h-12 gradient-primary rounded-full flex items-center justify-center mb-2">
              <Video className="w-6 h-6 text-white" />
            </div>
            <CardTitle className="text-sm">Videos</CardTitle>
          </CardHeader>
        </Card>
      </div>

    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 relative flex flex-col">
      {/* Animated Background */}
      <Hyperspeed />
      
      {/* Header */}
      <header className="bg-white/80 dark:bg-background/80 backdrop-blur-md border-b shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 md:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-3">
            <Avatar 
              className="w-10 h-10 md:w-12 md:h-12 border-2 border-primary/20 cursor-pointer hover:border-primary/40 transition-all"
              onClick={() => setActiveView('settings')}
            >
              <AvatarImage src={profile?.avatar_url || ''} alt={profile?.full_name || 'User'} />
              <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-primary-foreground font-bold">
                {profile?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex items-center gap-2">
              <img src={logo} alt="Oro Digital School" className="w-6 h-6 md:w-8 md:h-8 rounded-full" />
              <div>
                <h1 className="text-sm md:text-base font-bold gradient-primary bg-clip-text text-transparent">
                  Oro Digital School
                </h1>
                <p className="text-xs text-muted-foreground hidden sm:block">
                  {profile?.full_name || 'Welcome'}
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {activeView !== 'dashboard' && (
              <Button 
                variant="outline"
                size="sm"
                onClick={() => setActiveView('dashboard')}
                className="hidden sm:flex"
              >
                Dashboard
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveView('settings')}
            >
              <SettingsIcon className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-4 md:py-8">
        {renderActiveView()}
      </main>

      {/* About Us Footer */}
      {activeView === 'dashboard' && <AboutUs />}
    </div>
  );
}