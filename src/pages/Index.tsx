import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import AuthForm from '@/components/AuthForm';
import Dashboard from '@/components/Dashboard';
import LandingPage from '@/components/LandingPage';
import GlobalBackground from '@/components/GlobalBackground';

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLanding, setShowLanding] = useState(true);

  useEffect(() => {
    let subscription: { unsubscribe: () => void } | null = null;

    const initAuth = async () => {
      try {
        // Set up auth state listener FIRST
        const { data } = supabase.auth.onAuthStateChange(
          (event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
          }
        );
        subscription = data.subscription;

        // Then check for existing session with error handling
        const { data: sessionData, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Session retrieval error:', error);
          // Don't throw - just set loading to false and let user log in
        }
        
        setSession(sessionData?.session ?? null);
        setUser(sessionData?.session?.user ?? null);
        setLoading(false);
      } catch (error) {
        console.error('Auth initialization error:', error);
        setLoading(false);
      }
    };

    initAuth();

    return () => {
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
