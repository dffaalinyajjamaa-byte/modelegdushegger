import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import AuthForm from '@/components/AuthForm';
import Dashboard from '@/components/Dashboard';
import LandingPage from '@/components/LandingPage';
import GlobalBackground from '@/components/GlobalBackground';
import { Button } from '@/components/ui/button';
import { WifiOff, RefreshCw } from 'lucide-react';

// Timeout wrapper for promises
const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error('TIMEOUT')), ms)
    )
  ]);
};

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLanding, setShowLanding] = useState(true);
  const [authError, setAuthError] = useState(false);

  useEffect(() => {
    let subscription: { unsubscribe: () => void } | null = null;
    let fallbackTimer: NodeJS.Timeout;

    const initAuth = async () => {
      try {
        // Set up auth state listener FIRST
        const { data } = supabase.auth.onAuthStateChange(
          (event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
            setAuthError(false);
          }
        );
        subscription = data.subscription;

        // Wrap getSession with timeout (8 seconds max)
        try {
          const { data: sessionData, error } = await withTimeout(
            supabase.auth.getSession(),
            8000
          );
          
          if (!error) {
            setSession(sessionData?.session ?? null);
            setUser(sessionData?.session?.user ?? null);
          }
        } catch (timeoutError) {
          console.error('Session check timed out:', timeoutError);
          // Don't set error - just continue to auth form
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Auth initialization error:', error);
        setAuthError(true);
        setLoading(false);
      }
    };

    initAuth();

    // Absolute fallback - ensure loading never exceeds 10 seconds
    fallbackTimer = setTimeout(() => {
      if (loading) {
        console.warn('Fallback timeout triggered');
        setLoading(false);
      }
    }, 10000);

    return () => {
      clearTimeout(fallbackTimer);
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

  const handleRetryAuth = () => {
    setLoading(true);
    setAuthError(false);
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="min-h-screen gradient-hero flex items-center justify-center">
        <div className="text-center text-white">
          <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-xl">Loading Model Egdu...</p>
          <p className="text-sm opacity-70 mt-2">Connecting to server...</p>
        </div>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="min-h-screen gradient-hero flex items-center justify-center p-4">
        <div className="text-center text-white max-w-md">
          <WifiOff className="w-16 h-16 mx-auto mb-4 text-amber-400" />
          <h2 className="text-2xl font-bold mb-2">Connection Issue</h2>
          <p className="text-white/80 mb-6">
            Unable to connect to the server. This might be due to your network connection.
          </p>
          <Button onClick={handleRetryAuth} variant="secondary" size="lg">
            <RefreshCw className="mr-2 h-5 w-5" />
            Try Again
          </Button>
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
