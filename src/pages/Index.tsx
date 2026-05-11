import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import AuthForm from '@/components/AuthForm';
import Dashboard from '@/components/Dashboard';
import LandingPage from '@/components/LandingPage';
import GlobalBackground from '@/components/GlobalBackground';
import { usePresence } from '@/hooks/use-presence';

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLanding, setShowLanding] = useState(true);

  // Track real-time online/last-seen presence
  usePresence(user?.id);

  // Daily streak: bump streak once per session when user is logged in
  useEffect(() => {
    if (!user?.id) return;
    const key = `streak-bumped-${user.id}-${new Date().toISOString().slice(0, 10)}`;
    if (localStorage.getItem(key)) return;
    supabase.rpc('update_user_streak', { p_user_id: user.id })
      .then(() => localStorage.setItem(key, '1'))
      .catch(() => {});
  }, [user?.id]);

  useEffect(() => {
    let subscription: { unsubscribe: () => void } | null = null;
    let mounted = true;

    // Set up auth state listener FIRST (no debouncing - was causing redirect issues)
    const { data } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;
        setSession(session);
        setUser(session?.user ?? null);
        // Only set loading false after we have a definitive auth state
        if (event !== 'INITIAL_SESSION') {
          setLoading(false);
        }
      }
    );
    subscription = data.subscription;

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: sessionData, error }) => {
      if (error) {
        console.error('Session retrieval error:', error);
      }
      if (mounted) {
        setSession(sessionData?.session ?? null);
        setUser(sessionData?.session?.user ?? null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  const handleAuthChange = () => {
    // This will trigger the auth state listener
  };

  const handleSignOut = () => {
    setUser(null);
    setSession(null);
  };

  const handleGetStarted = () => {
    setShowLanding(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen gradient-hero flex items-center justify-center">
        <div className="text-center text-white">
          <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-xl">Loading Model Egdu...</p>
        </div>
      </div>
    );
  }

  if (showLanding && !user) {
    return <LandingPage onGetStarted={handleGetStarted} />;
  }

  if (!user || !session) {
    return (
      <GlobalBackground>
        <AuthForm onAuthChange={handleAuthChange} />
      </GlobalBackground>
    );
  }

  return (
    <GlobalBackground>
      <Dashboard user={user} session={session} onSignOut={handleSignOut} />
    </GlobalBackground>
  );
};

export default Index;
