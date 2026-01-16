import { useState, useEffect, ReactNode } from 'react';
import { Lock, ShieldAlert, KeyRound } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface ShutdownGateProps {
  children: ReactNode;
}

const ADMIN_PASSCODE = 'hopeceo the goat';
const ADMIN_KEY = 'mdl_adm_session';

const ShutdownGate = ({ children }: ShutdownGateProps) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if already authenticated in this session
    const session = sessionStorage.getItem(ADMIN_KEY);
    if (session === btoa(ADMIN_PASSCODE)) {
      setIsAuthenticated(true);
    }
    setIsLoading(false);

    // Disable right-click
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    // Disable some keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      // Disable F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i')) ||
        (e.ctrlKey && e.shiftKey && (e.key === 'J' || e.key === 'j')) ||
        (e.ctrlKey && (e.key === 'U' || e.key === 'u'))
      ) {
        e.preventDefault();
        return false;
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);

    // Add noindex meta tag
    const metaRobots = document.createElement('meta');
    metaRobots.name = 'robots';
    metaRobots.content = 'noindex, nofollow';
    document.head.appendChild(metaRobots);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
      document.head.removeChild(metaRobots);
    };
  }, []);

  const handleAdminAccess = () => {
    if (passcode === ADMIN_PASSCODE) {
      sessionStorage.setItem(ADMIN_KEY, btoa(ADMIN_PASSCODE));
      setIsAuthenticated(true);
      setError('');
    } else {
      setError('Unauthorized access');
      setPasscode('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAdminAccess();
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center z-[9999]">
        <div className="animate-pulse">
          <ShieldAlert className="w-16 h-16 text-slate-500" />
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div 
      className="fixed inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center z-[9999] p-4 select-none"
      onDragStart={(e) => e.preventDefault()}
    >
      {/* Shutdown Screen */}
      <div className="text-center max-w-lg mx-auto mb-12">
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-red-500/20 blur-3xl rounded-full" />
          <Lock className="w-24 h-24 text-red-400 mx-auto relative animate-pulse" />
        </div>
        
        <div className="space-y-4 mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-white leading-relaxed">
            This site is officially shutdown by CEO & Manager.
          </h1>
          <p className="text-xl md:text-2xl text-slate-300">
            Thanks for all of your supports, thank you 🙏
          </p>
        </div>

        <div className="flex items-center justify-center gap-3 text-slate-500 text-sm">
          <ShieldAlert className="w-5 h-5" />
          <span>Site access restricted</span>
        </div>
      </div>

      {/* Admin Access Section - Subtle */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-full max-w-xs px-4">
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700/50">
          <div className="flex items-center gap-2 mb-3 text-slate-400 text-xs">
            <KeyRound className="w-3 h-3" />
            <span>Admin Access</span>
          </div>
          
          <div className="space-y-3">
            <Input
              type="password"
              placeholder="Enter passcode"
              value={passcode}
              onChange={(e) => {
                setPasscode(e.target.value);
                setError('');
              }}
              onKeyPress={handleKeyPress}
              className="bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500 text-sm"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
            />
            
            <Button
              onClick={handleAdminAccess}
              className="w-full bg-slate-700 hover:bg-slate-600 text-white text-sm"
              size="sm"
            >
              Admin Access
            </Button>

            {error && (
              <p className="text-red-400 text-xs text-center animate-in fade-in duration-300">
                {error}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Hidden anti-inspect message */}
      <div className="hidden" aria-hidden="true">
        {/* This site is protected. Unauthorized access is prohibited. */}
      </div>
    </div>
  );
};

export default ShutdownGate;
