import { useState, useEffect, lazy, Suspense } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LogOut, Settings, Video, BookOpen, CheckSquare, Bot, FileText, Brain, MessageCircle, Mic } from 'lucide-react';
import { cn } from '@/lib/utils';
import TaskManager from './TaskManager';
import VideoViewer from './VideoViewer';
import PDFViewer from './PDFViewer';
import SettingsComponent from './Settings';
import NationalExams from './NationalExams';
import DailyChallenge from './DailyChallenge';
import ProfileCard from './ProfileCard';
import AboutUs from './AboutUs';
import BottomNav from './BottomNav';
import ProgressCharts from './ProgressCharts';
import AnimatedTagline from './AnimatedTagline';
import ChargingPoints from './ChargingPoints';
import SubjectProgressCards from './SubjectProgressCards';
import RecentLessons from './RecentLessons';
import DashboardTabs from './DashboardTabs';
import LoadingFallback from './LoadingFallback';
import { TabsContent } from '@/components/ui/tabs';
import { useLocation } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import logo from '@/assets/oro-logo.png';

// Lazy load heavy components for better performance
const AITeacher = lazy(() => import('./AITeacher'));
const LiveTeacher = lazy(() => import('./LiveTeacher'));
const VideoLessonsLibrary = lazy(() => import('./VideoLessonsLibrary'));
const DigitalBooksLibrary = lazy(() => import('./DigitalBooksLibrary'));
const Messenger = lazy(() => import('./Messenger'));
const QuizFeature = lazy(() => import('./QuizFeature'));

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

type ActiveView = 'dashboard' | 'ai-teacher' | 'live-teacher' | 'tasks' | 'videos' | 'books' | 'video' | 'pdf' | 'settings' | 'messenger' | 'quiz' | 'national-exam';

export default function Dashboard({ user, session, onSignOut }: DashboardProps) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userStats, setUserStats] = useState<UserStats>({ tasks_completed: 0, videos_watched: 0, materials_read: 0 });
  const [content, setContent] = useState<Content[]>([]);
  const [activeView, setActiveView] = useState<ActiveView>('dashboard');
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);
  const [activeTab, setActiveTab] = useState('all');
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
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (!data) {
        console.log('Creating new profile for user:', user.id);
        
        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert({
            user_id: user.id,
            email: user.email || '',
            full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Student',
            grade: 'Grade 8',
            role: 'student'
          })
          .select()
          .single();
        
        if (insertError) {
          console.error('Error creating profile:', insertError);
          toast({
            title: "Profile Creation Error",
            description: "Unable to create your profile. Please try refreshing the page.",
            variant: "destructive",
          });
          return;
        }
        
        setProfile(newProfile);
        toast({
          title: "Welcome!",
          description: "Your profile has been created successfully.",
        });
      } else {
        setProfile(data);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast({
        title: "Failed to Load Profile",
        description: "Please refresh the page or contact support if the issue persists.",
        variant: "destructive",
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
        return (
          <Suspense fallback={<LoadingFallback />}>
            <AITeacher user={user} onLogActivity={logActivity} />
          </Suspense>
        );
      case 'live-teacher':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <LiveTeacher user={user} onLogActivity={logActivity} />
          </Suspense>
        );
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
        return (
          <Suspense fallback={<LoadingFallback />}>
            <Messenger user={user} onBack={() => setActiveView('dashboard')} />
          </Suspense>
        );
      case 'quiz':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <QuizFeature user={user} onBack={() => setActiveView('dashboard')} />
          </Suspense>
        );
      case 'national-exam':
        if (selectedContent) {
          return <PDFViewer content={selectedContent} onBack={() => setActiveView('dashboard')} user={user} onLogActivity={logActivity} />;
        }
        return null;
      case 'books':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <DigitalBooksLibrary
              user={user}
              onBack={() => setActiveView('dashboard')}
              onBookClick={handleContentClick}
            />
          </Suspense>
        );
      case 'videos':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <VideoLessonsLibrary
              user={user}
              onBack={() => setActiveView('dashboard')}
              onVideoClick={handleContentClick}
            />
          </Suspense>
        );
      case 'video':
        return selectedContent ? (
          <VideoViewer 
            content={selectedContent}
            user={user}
            onBack={() => setActiveView('dashboard')}
            onLogActivity={logActivity}
            onVideoWatched={() => updateUserStats('videos_watched')}
          />
        ) : null;
      case 'pdf':
        return selectedContent ? (
          <PDFViewer 
            content={selectedContent}
            user={user}
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
    <div className="space-y-6 sm:space-y-8">
      {/* Hero Section with Logo and Animated Tagline */}
      <div className="relative overflow-hidden gradient-hero rounded-2xl p-6 sm:p-8 shadow-glow">
        <div className="relative z-10 text-center">
          <div className="flex justify-center mb-4">
            <img src={logo} alt="Oro Digital School" className="h-16 sm:h-20 w-auto" />
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 text-white">
            Welcome back, {profile?.full_name?.split(' ')[0] || 'Student'}! 👋
          </h1>
          <AnimatedTagline />
        </div>
      </div>

      {/* Tabs for navigation */}
      <DashboardTabs activeTab={activeTab} onTabChange={setActiveTab}>
        {/* All Tab - Overview */}
        <TabsContent value="all" className="space-y-6">
          <ChargingPoints userId={user.id} />
          <SubjectProgressCards userId={user.id} />
          <RecentLessons userId={user.id} />
        </TabsContent>

        {/* Lessons Tab - Embedded Videos and Books */}
        <TabsContent value="lessons" className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            <div>
              <h2 className="text-xl font-bold mb-4">Video Lessons</h2>
              <VideoLessonsLibrary 
                user={user} 
                onBack={() => {}} 
                onVideoClick={handleContentClick}
                embedded={true}
              />
            </div>
            <div>
              <h2 className="text-xl font-bold mb-4">Digital Books</h2>
              <DigitalBooksLibrary 
                user={user} 
                onBack={() => {}} 
                onBookClick={handleContentClick}
                embedded={true}
              />
            </div>
          </div>
        </TabsContent>

        {/* Score Tab - Charts and Achievements */}
        <TabsContent value="score" className="space-y-6">
          <ProgressCharts userId={user.id} stats={userStats} />
        </TabsContent>

        {/* Progress Tab - Detailed Analytics */}
        <TabsContent value="progress" className="space-y-6">
          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            <Card className="p-4 sm:p-6 text-center">
              <div className="text-2xl sm:text-3xl font-bold text-primary mb-1">
                {userStats.videos_watched}
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground">Videos Watched</div>
            </Card>
            <Card className="p-4 sm:p-6 text-center">
              <div className="text-2xl sm:text-3xl font-bold text-primary mb-1">
                {userStats.materials_read}
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground">Books Read</div>
            </Card>
            <Card className="p-4 sm:p-6 text-center">
              <div className="text-2xl sm:text-3xl font-bold text-primary mb-1">
                {userStats.tasks_completed}
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground">Tasks Done</div>
            </Card>
          </div>
          <ProgressCharts userId={user.id} stats={userStats} />
        </TabsContent>
      </DashboardTabs>

      {/* Quick Access Cards - Below tabs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 cursor-pointer hover:shadow-lg transition-all" onClick={() => setActiveView('ai-teacher')}>
          <div className="text-center">
            <Bot className="w-8 h-8 mx-auto mb-2 text-primary" />
            <p className="font-semibold text-sm">AI Teacher</p>
          </div>
        </Card>
        <Card className="p-4 cursor-pointer hover:shadow-lg transition-all" onClick={() => setActiveView('tasks')}>
          <div className="text-center">
            <CheckSquare className="w-8 h-8 mx-auto mb-2 text-primary" />
            <p className="font-semibold text-sm">Tasks</p>
          </div>
        </Card>
        <Card className="p-4 cursor-pointer hover:shadow-lg transition-all" onClick={() => setActiveView('messenger')}>
          <div className="text-center">
            <MessageCircle className="w-8 h-8 mx-auto mb-2 text-primary" />
            <p className="font-semibold text-sm">Chat</p>
          </div>
        </Card>
        <Card className="p-4 cursor-pointer hover:shadow-lg transition-all" onClick={() => setActiveView('quiz')}>
          <div className="text-center">
            <Brain className="w-8 h-8 mx-auto mb-2 text-primary" />
            <p className="font-semibold text-sm">Quiz</p>
          </div>
        </Card>
      </div>

      {/* National Exams Section */}
      <div className="mt-6">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <FileText className="w-6 h-6 text-primary" />
          National Exams
        </h2>
        <NationalExams user={user} onExamClick={(exam) => {
          setSelectedContent({
            id: exam.id,
            title: exam.title,
            description: exam.description || '',
            type: 'pdf',
            url: exam.pdf_url,
            grade_level: 'Grade 8',
            subject: exam.subject
          });
          setActiveView('national-exam');
        }} />
      </div>

      {/* Daily Challenge Widget */}
      <DailyChallenge user={user} />

      {activeView === 'dashboard' && <AboutUs />}
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
