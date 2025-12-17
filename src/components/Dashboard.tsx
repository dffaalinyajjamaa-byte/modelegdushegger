import { useState, useEffect, lazy, Suspense } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LogOut, Settings, Video, BookOpen, CheckSquare, Bot, FileText, Brain, MessageCircle, Mic, ArrowLeft, MoreVertical, User as UserIcon, Info, Coffee } from 'lucide-react';
import { cn } from '@/lib/utils';
import TaskManager from './TaskManager';
import VideoViewer from './VideoViewer';
import PDFViewer from './PDFViewer';
import SettingsComponent from './Settings';
import NationalExams from './NationalExams';
import DailyChallenge from './DailyChallenge';
import ProfileCard from './ProfileCard';
import AboutUs from './AboutUs';
import StudentProfile from './StudentProfile';
import BottomNav from './BottomNav';
import ProgressCharts from './ProgressCharts';
import AnimatedTagline from './AnimatedTagline';
import ChargingPoints from './ChargingPoints';
import SubjectProgressCards from './SubjectProgressCards';
import RecentLessons from './RecentLessons';
import DashboardTabs from './DashboardTabs';
import LoadingFallback from './LoadingFallback';
import StreakBadge from './StreakBadge';
import Leaderboard from './Leaderboard';
import { TabsContent } from '@/components/ui/tabs';
import { useLocation } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useStreak } from '@/hooks/use-streak';
import { usePoints } from '@/hooks/use-points';
import logo from '@/assets/model-egdu-logo.png';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

// Lazy load heavy components for better performance
const AITeacher = lazy(() => import('./AITeacher'));
const LiveTeacher = lazy(() => import('./LiveTeacher'));
const VideoLessonsLibrary = lazy(() => import('./VideoLessonsLibrary'));
const DigitalBooksLibrary = lazy(() => import('./DigitalBooksLibrary'));
const Messenger = lazy(() => import('./Messenger'));
const QuizFeature = lazy(() => import('./QuizFeature'));
const RelaxTime = lazy(() => import('./RelaxTime'));

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

type ActiveView = 'dashboard' | 'ai-teacher' | 'live-teacher' | 'tasks' | 'videos' | 'books' | 'video' | 'pdf' | 'settings' | 'messenger' | 'quiz' | 'national-exam' | 'profile' | 'about' | 'relax-time';

export default function Dashboard({ user, session, onSignOut }: DashboardProps) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userStats, setUserStats] = useState<UserStats>({ tasks_completed: 0, videos_watched: 0, materials_read: 0 });
  const [content, setContent] = useState<Content[]>([]);
  const [activeView, setActiveView] = useState<ActiveView>('dashboard');
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  const { toast } = useToast();
  const location = useLocation();
  const streak = useStreak(user?.id);
  const { getUserRanking } = usePoints();
  const [userRanking, setUserRanking] = useState<any>(null);

  useEffect(() => {
    fetchProfile();
    fetchUserStats();
    fetchContent();
    fetchUserRanking();
  }, [user]);

  const fetchUserRanking = async () => {
    if (!user?.id) return;
    const ranking = await getUserRanking(user.id);
    setUserRanking(ranking);
  };

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
      case 'profile':
        return <StudentProfile user={user} onBack={() => setActiveView('dashboard')} />;
      case 'about':
        return <AboutUs />;
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
      case 'relax-time':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <RelaxTime user={user} onBack={() => setActiveView('dashboard')} />
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
      {/* Hero Section - Simplified */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary/90 to-accent p-6 text-primary-foreground shadow-glow">
        <div className="relative z-10 flex flex-col items-center text-center">
          <img 
            src={logo} 
            alt="Model Egdu" 
            className="w-20 h-20 mb-3 rounded-full shadow-glow"
          />
          <h1 className="text-2xl font-bold mb-2">
            Welcome, {profile?.full_name?.split(' ')[0] || 'Student'}! 👋
          </h1>
          <AnimatedTagline />
        </div>
      </section>

      {/* Streak Badge - Prominent Display */}
      {!streak.loading && (
        <StreakBadge 
          currentStreak={streak.streak.current}
          longestStreak={streak.streak.longest}
          totalPoints={userRanking?.total_points || 0}
          className="shadow-lg"
        />
      )}

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

        {/* Score Tab - Leaderboard and Charts */}
        <TabsContent value="score" className="space-y-6">
          <Leaderboard currentUserId={user.id} />
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

      {/* Enhanced Quick Access Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button
          onClick={() => setActiveView('ai-teacher')}
          className="group relative quick-access-card bg-gradient-to-br from-blue-500/20 to-purple-500/20 border-2 border-blue-500/30 hover:border-blue-500/60 p-8 rounded-2xl transition-all duration-300 hover:scale-110 hover:shadow-glow overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-purple-500/0 group-hover:from-blue-500/10 group-hover:to-purple-500/10 transition-all duration-300" />
          <Bot className="relative w-12 h-12 mb-3 mx-auto text-blue-500 group-hover:scale-110 transition-transform duration-300" />
          <h3 className="relative font-semibold text-center">AI Teacher</h3>
        </button>

        <button
          onClick={() => setActiveView('tasks')}
          className="group relative quick-access-card bg-gradient-to-br from-green-500/20 to-teal-500/20 border-2 border-green-500/30 hover:border-green-500/60 p-8 rounded-2xl transition-all duration-300 hover:scale-110 hover:shadow-glow overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/0 to-teal-500/0 group-hover:from-green-500/10 group-hover:to-teal-500/10 transition-all duration-300" />
          <CheckSquare className="relative w-12 h-12 mb-3 mx-auto text-green-500 group-hover:scale-110 transition-transform duration-300" />
          <h3 className="relative font-semibold text-center">My Tasks</h3>
        </button>

        <button
          onClick={() => setActiveView('relax-time')}
          className="group relative quick-access-card bg-gradient-to-br from-purple-500/20 to-violet-500/20 border-2 border-purple-500/30 hover:border-purple-500/60 p-8 rounded-2xl transition-all duration-300 hover:scale-110 hover:shadow-glow overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/0 to-violet-500/0 group-hover:from-purple-500/10 group-hover:to-violet-500/10 transition-all duration-300" />
          <Coffee className="relative w-12 h-12 mb-3 mx-auto text-purple-500 group-hover:scale-110 transition-transform duration-300" />
          <h3 className="relative font-semibold text-center">Relax Time</h3>
        </button>

        <button
          onClick={() => setActiveView('messenger')}
          className="group relative quick-access-card bg-gradient-to-br from-pink-500/20 to-rose-500/20 border-2 border-pink-500/30 hover:border-pink-500/60 p-8 rounded-2xl transition-all duration-300 hover:scale-110 hover:shadow-glow overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-pink-500/0 to-rose-500/0 group-hover:from-pink-500/10 group-hover:to-rose-500/10 transition-all duration-300" />
          <MessageCircle className="relative w-12 h-12 mb-3 mx-auto text-pink-500 group-hover:scale-110 transition-transform duration-300" />
          <h3 className="relative font-semibold text-center">Chat</h3>
        </button>

        <button
          onClick={() => setActiveView('quiz')}
          className="group relative quick-access-card bg-gradient-to-br from-orange-500/20 to-yellow-500/20 border-2 border-orange-500/30 hover:border-orange-500/60 p-8 rounded-2xl transition-all duration-300 hover:scale-110 hover:shadow-glow overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/0 to-yellow-500/0 group-hover:from-orange-500/10 group-hover:to-yellow-500/10 transition-all duration-300" />
          <Brain className="relative w-12 h-12 mb-3 mx-auto text-orange-500 group-hover:scale-110 transition-transform duration-300" />
          <h3 className="relative font-semibold text-center">Quiz</h3>
        </button>
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
    </div>
  );

  const getViewTitle = () => {
    if (activeView === 'dashboard') return 'Dashboard';
    if (activeView === 'ai-teacher') return 'AI Teacher';
    if (activeView === 'live-teacher') return 'Live Teacher';
    if (activeView === 'videos') return 'Video Lessons';
    if (activeView === 'books') return 'Digital Books';
    if (activeView === 'messenger') return 'Messenger';
    if (activeView === 'quiz') return 'Quiz';
    if (activeView === 'tasks') return 'My Tasks';
    if (activeView === 'settings') return 'Settings';
    if (activeView === 'profile') return 'My Profile';
    if (activeView === 'about') return 'About Us';
    if (activeView === 'video') return 'Video Player';
    if (activeView === 'pdf') return 'PDF Viewer';
    if (activeView === 'national-exam') return 'National Exam';
    return 'Dashboard';
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-6">
      {/* Analytics-Style Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border/50 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          {/* Left: Back Button */}
          {activeView !== 'dashboard' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveView('dashboard')}
              className="gap-2 hover:bg-muted"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back</span>
            </Button>
          )}
          
          {/* Center: Title */}
          <h2 className="flex-1 text-center text-xl font-bold text-foreground">
            {getViewTitle()}
          </h2>
          
          {/* Right: Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="hover:bg-muted">
                <MoreVertical className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => setActiveView('profile')}>
                <UserIcon className="w-4 h-4 mr-2" />
                My Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActiveView('settings')}>
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActiveView('about')}>
                <Info className="w-4 h-4 mr-2" />
                About Us
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={handleSignOut}
                className="text-destructive focus:text-destructive"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-4 md:py-8">
        {renderActiveView()}
      </main>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
