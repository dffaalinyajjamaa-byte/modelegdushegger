import { Home, Video, CheckSquare, User } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useScreenSize } from '@/hooks/use-screen-size';

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isMobile, isTablet } = useScreenSize();

  // Only show on mobile and tablet
  if (!isMobile && !isTablet) return null;

  const navItems = [
    { icon: Home, label: 'Home', path: '/', activeView: 'dashboard' },
    { icon: Video, label: 'Videos', path: '/', activeView: 'videos' },
    { icon: CheckSquare, label: 'Tasks', path: '/', activeView: 'tasks' },
    { icon: User, label: 'Profile', path: '/', activeView: 'settings' },
  ];

  const handleNavClick = (path: string, activeView: string) => {
    navigate(path, { state: { activeView } });
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 mobile-p pb-safe">
      <div className="glass-card border-t border-border/40 rounded-t-3xl mx-2 mb-2">
        <div className="flex items-center justify-around h-16 px-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <button
                key={item.label}
                onClick={() => handleNavClick(item.path, item.activeView)}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-2xl transition-all',
                  'hover-scale active:scale-95',
                  isActive
                    ? 'text-accent shadow-neon-lime'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon
                  className={cn(
                    'w-6 h-6 transition-all',
                    isActive && 'drop-shadow-[0_0_8px_rgba(0,230,118,0.6)]'
                  )}
                  fill={isActive ? 'currentColor' : 'none'}
                />
                <span className="text-xs font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
