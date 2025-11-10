import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LogOut, Settings, Video, BookOpen, CheckSquare, Bot, FileText, Brain, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import AITeacher from './AITeacher';
import TaskManager from './TaskManager';
import VideoLessonsLibrary from './VideoLessonsLibrary';
import DigitalBooksLibrary from './DigitalBooksLibrary';
import VideoViewer from './VideoViewer';
import PDFViewer from './PDFViewer';
import SettingsComponent from './Settings';
import ExtraExam from './ExtraExam';
import ProfileCard from './ProfileCard';
import AboutUs from './AboutUs';
import BottomNav from './BottomNav';
import ProgressCharts from './ProgressCharts';
import Messenger from './Messenger';
import { useLocation } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import logo from '@/assets/oro-logo.png';

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
  grade: string | null;
  avatar_url: string | null;
}

interface UserStats {
  tasks_completed: number;
  videos_watched: number;
  materials_read: number;
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

type ActiveView = 'dashboard' | 'ai-teacher' | 'tasks' | 'videos' | 'books' | 'video' | 'pdf' | 'settings' | 'messenger' | 'exam';

export default function Dashboard({ user, session, onSignOut }: DashboardProps) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userStats, setUserStats] = useState<UserStats>({ tasks_completed: 0, videos_watched: 0, materials_read: 0 });
  const [content, setContent] = useState<Content[]>([]);
  const [activeView, setActiveView] = useState<ActiveView>('dashboard');
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);
  const { toast } = useToast();
  const location = useLocation();

  useEffect(() => {
    fetchProfile();
    fetchUserStats();
    fetchContent();
  }, [user]);

  useEffect(() => {
    // Handle navigation from BottomNav
    const state = location.state as { activeView?: ActiveView } | undefined;
    if (state?.activeView) {
      setActiveView(state.activeView);
    }
  }, [location]);

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

  const fetchUserStats = async () => {
    try {
      const { data, error } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        // If no stats exist, create them
        if (error.code === 'PGRST116') {
          const { data: newStats, error: insertError } = await supabase
            .from('user_stats')
            .insert({ user_id: user.id })
            .select()
            .single();
          
          if (insertError) throw insertError;
          setUserStats({
            tasks_completed: newStats.tasks_completed,
            videos_watched: newStats.videos_watched,
            materials_read: newStats.materials_read,
          });
        } else {
          throw error;
        }
      } else {
        setUserStats({
          tasks_completed: data.tasks_completed,
          videos_watched: data.videos_watched,
          materials_read: data.materials_read,
        });
      }
    } catch (error) {
      console.error('Error fetching user stats:', error);
    }
  };

  const updateUserStats = async (field: keyof UserStats, increment: number = 1) => {
    try {
      const newValue = userStats[field] + increment;
      const { error } = await supabase
        .from('user_stats')
        .update({ [field]: newValue })
        .eq('user_id', user.id);

      if (error) throw error;
      
      setUserStats(prev => ({
        ...prev,
        [field]: newValue,
      }));
    } catch (error) {
      console.error('Error updating user stats:', error);
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
        return (
          <TaskManager 
            user={user} 
            onLogActivity={logActivity}
            onTaskComplete={() => updateUserStats('tasks_completed')}
          />
        );
      case 'settings':
        return <SettingsComponent user={user} onBack={() => setActiveView('dashboard')} />;
      case 'messenger':
        return <Messenger user={user} onBack={() => setActiveView('dashboard')} />;
      case 'exam':
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
            onVideoWatched={() => updateUserStats('videos_watched')}
          />
        ) : null;
      case 'pdf':
        return selectedContent ? (
          <PDFViewer 
            content={selectedContent} 
            onBack={() => setActiveView('dashboard')}
            onLogActivity={logActivity}
            onMaterialRead={() => updateUserStats('materials_read')}
          />
        ) : null;
      default:
        return renderDashboard();
    }
  };

  const renderDashboard = () => (
    <div className="space-y-8 animate-fade-slide-up">
      {/* Hero Section with Oromo Greeting */}
      <section className="hero-section relative overflow-hidden rounded-3xl">
        <div className="absolute inset-0 hero-gradient" />
        
        <div className="relative z-10 glass-card rounded-3xl p-6 md:p-8 backdrop-blur-xl border-2 border-primary/20">
          {/* Animated Logo */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <img 
                src={logo} 
                alt="Oro Digital School"
                className="w-20 h-20 md:w-24 md:h-24 rounded-full animate-logo-pulse border-4 border-white/20"
              />
              <div className="absolute inset-0 rounded-full border-2 border-primary/30 animate-spin-slow" />
              <div className="absolute inset-0 rounded-full border-2 border-secondary/30 animate-spin-reverse" />
            </div>
          </div>
          
          {/* Oromo Greeting */}
          <h1 className="text-3xl md:text-4xl font-bold text-center mb-3 gradient-text">
            Baga Nagaan Gara Oro Digital School Dhuftan
          </h1>
          
          {/* English Translation */}
          <p className="text-xl text-center text-foreground/80 mb-6">
            Welcome to Oro Digital School, <span className="font-bold text-primary">{profile?.full_name}</span>!
          </p>
          
          {/* Quick Stats Cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="glass-card rounded-2xl p-4 text-center border-2 border-primary/30 hover-scale">
              <div className="text-3xl md:text-4xl font-bold text-primary neon-glow-orange">{userStats.tasks_completed}</div>
              <div className="text-sm text-foreground/70 mt-1">Tasks Done</div>
            </div>
            <div className="glass-card rounded-2xl p-4 text-center border-2 border-secondary/30 hover-scale">
              <div className="text-3xl md:text-4xl font-bold text-secondary neon-glow-red">{userStats.videos_watched}</div>
              <div className="text-sm text-foreground/70 mt-1">Videos</div>
            </div>
            <div className="glass-card rounded-2xl p-4 text-center border-2 border-accent/30 hover-scale">
              <div className="text-3xl md:text-4xl font-bold text-accent neon-glow-blue">{userStats.materials_read}</div>
              <div className="text-sm text-foreground/70 mt-1">Books</div>
            </div>
          </div>
        </div>
      </section>

      {/* Progress Charts */}
      <ProgressCharts userId={user.id} stats={userStats} compact={true} />

      {/* Navigation Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
        {/* AI Teacher */}
        <Card
          className={cn(
            "glass-card p-6 cursor-pointer transition-all duration-300 hover-scale hover:neon-glow-orange border-2 border-primary/20",
            "flex flex-col items-center text-center gap-4"
          )}
          onClick={() => setActiveView('ai-teacher')}
        >
          <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center neon-glow-orange">
            <Bot className="w-8 h-8 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-lg mb-1">AI Teacher</h3>
            <p className="text-sm text-muted-foreground">Learn with AI</p>
          </div>
        </Card>

        {/* Video Lessons */}
        <Card
          className={cn(
            "glass-card p-6 cursor-pointer transition-all duration-300 hover-scale hover:neon-glow-red border-2 border-secondary/20",
            "flex flex-col items-center text-center gap-4"
          )}
          onClick={() => setActiveView('videos')}
        >
          <div className="w-16 h-16 rounded-2xl gradient-secondary flex items-center justify-center neon-glow-red">
            <Video className="w-8 h-8 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-lg mb-1">Video Lessons</h3>
            <p className="text-sm text-muted-foreground">Watch & Learn</p>
          </div>
        </Card>

        {/* Digital Books */}
        <Card
          className={cn(
            "glass-card p-6 cursor-pointer transition-all duration-300 hover-scale hover:neon-glow-blue border-2 border-accent/20",
            "flex flex-col items-center text-center gap-4"
          )}
          onClick={() => setActiveView('books')}
        >
          <div className="w-16 h-16 rounded-2xl gradient-accent flex items-center justify-center neon-glow-blue">
            <BookOpen className="w-8 h-8 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-lg mb-1">Digital Books</h3>
            <p className="text-sm text-muted-foreground">Read Materials</p>
          </div>
        </Card>

        {/* Task Manager */}
        <Card
          className={cn(
            "glass-card p-6 cursor-pointer transition-all duration-300 hover-scale hover:neon-glow-orange border-2 border-primary/20",
            "flex flex-col items-center text-center gap-4"
          )}
          onClick={() => setActiveView('tasks')}
        >
          <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center neon-glow-orange">
            <CheckSquare className="w-8 h-8 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-lg mb-1">Tasks</h3>
            <p className="text-sm text-muted-foreground">Your Assignments</p>
          </div>
        </Card>

        {/* Chat/Messenger */}
        <Card
          className={cn(
            "glass-card p-6 cursor-pointer transition-all duration-300 hover-scale hover:neon-glow-blue border-2 border-accent/20",
            "flex flex-col items-center text-center gap-4"
          )}
          onClick={() => setActiveView('messenger')}
        >
          <div className="w-16 h-16 rounded-2xl gradient-accent flex items-center justify-center neon-glow-blue">
            <MessageCircle className="w-8 h-8 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-lg mb-1">Chat</h3>
            <p className="text-sm text-muted-foreground">Connect</p>
          </div>
        </Card>

        {/* Materials Upload */}
        <Card
          className={cn(
            "glass-card p-6 cursor-pointer transition-all duration-300 hover-scale hover:neon-glow-red border-2 border-secondary/20",
            "flex flex-col items-center text-center gap-4"
          )}
          onClick={() => setActiveView('exam')}
        >
          <div className="w-16 h-16 rounded-2xl gradient-secondary flex items-center justify-center neon-glow-red">
            <FileText className="w-8 h-8 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-lg mb-1">Materials</h3>
            <p className="text-sm text-muted-foreground">Upload Files</p>
          </div>
        </Card>

        {/* Quizzes */}
        <Card
          className={cn(
            "glass-card p-6 cursor-pointer transition-all duration-300 hover-scale hover:neon-glow-orange border-2 border-primary/20",
            "flex flex-col items-center text-center gap-4"
          )}
          onClick={() => setActiveView('exam')}
        >
          <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center neon-glow-orange">
            <Brain className="w-8 h-8 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-lg mb-1">Quizzes</h3>
            <p className="text-sm text-muted-foreground">Test Yourself</p>
          </div>
        </Card>

        {/* Settings */}
        <Card
          className={cn(
            "glass-card p-6 cursor-pointer transition-all duration-300 hover-scale hover:neon-glow-blue border-2 border-accent/20",
            "flex flex-col items-center text-center gap-4"
          )}
          onClick={() => setActiveView('settings')}
        >
          <div className="w-16 h-16 rounded-2xl gradient-accent flex items-center justify-center neon-glow-blue">
            <Settings className="w-8 h-8 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-lg mb-1">Settings</h3>
            <p className="text-sm text-muted-foreground">Your Profile</p>
          </div>
        </Card>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 relative flex flex-col pb-20 md:pb-0">
      {/* Header - Mobile Native Style */}
      <header className="glass-card border-b border-border/40 sticky top-0 z-50 mobile-p">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ProfileCard
              user={user}
              profile={profile || { full_name: 'User', grade: null, avatar_url: null }}
              stats={userStats}
              compact
              onClick={() => setActiveView('settings')}
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setActiveView('settings')}
              className="hover:bg-primary/20 transition-all"
            >
              <Settings className="w-5 h-5 text-primary" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSignOut}
              className="hover:bg-destructive/20 transition-all"
            >
              <LogOut className="w-5 h-5 text-destructive" />
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

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
