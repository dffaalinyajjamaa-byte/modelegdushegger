import { Home, Bot, Video, BookOpen, MessageCircle } from 'lucide-react';
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
    { icon: BookOpen, label: 'Books', path: '/', activeView: 'books' },
    { icon: Video, label: 'Videos', path: '/', activeView: 'videos' },
    { icon: Bot, label: 'AI', path: '/', activeView: 'ai-teacher' },
    { icon: MessageCircle, label: 'Chat', path: '/', activeView: 'messenger' },
  ];

  const handleNavClick = (path: string, activeView: string) => {
    navigate(path, { state: { activeView } });
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 mobile-p pb-safe backdrop-blur-xl">
      <div className="glass-card border-t border-border/40 rounded-t-3xl mx-2 mb-2 shadow-lg">
        <div className="flex items-center justify-around h-16 px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <button
                key={item.label}
                onClick={() => handleNavClick(item.path, item.activeView)}
                className={cn(
                  'ripple flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-2xl transition-all duration-300',
                  'hover-scale active:scale-95 min-h-[44px] min-w-[44px]',
                  isActive
                    ? 'text-primary bg-gradient-to-br from-primary/20 to-secondary/20'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon
                  className={cn(
                    'w-6 h-6 transition-all duration-300',
                    isActive && 'drop-shadow-glow'
                  )}
                  fill={isActive ? 'currentColor' : 'none'}
                />
                <span className={cn(
                  "text-xs font-medium transition-all duration-300",
                  isActive && "font-bold"
                )}>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
