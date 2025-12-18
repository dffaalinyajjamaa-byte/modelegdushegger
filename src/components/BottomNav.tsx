import { Home, Video, BookOpen, MessageCircle, Mic } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useScreenSize } from '@/hooks/use-screen-size';
import aiTeacherRobot from '@/assets/ai-teacher-robot.png';

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isMobile, isTablet, isDesktop } = useScreenSize();

  // Show on all devices now - desktop uses it as a floating nav
  const navItems = [
    { icon: Home, label: 'Home', path: '/', activeView: 'dashboard' },
    { icon: BookOpen, label: 'Books', path: '/', activeView: 'books' },
    { icon: Video, label: 'Videos', path: '/', activeView: 'videos' },
    { icon: null, label: 'AI', path: '/', activeView: 'ai-teacher', customIcon: true },
    { icon: Mic, label: 'Live', path: '/', activeView: 'live-teacher' },
    { icon: MessageCircle, label: 'Chat', path: '/', activeView: 'messenger' },
  ];

  const handleNavClick = (path: string, activeView: string) => {
    navigate(path, { state: { activeView } });
  };

  // Desktop: floating centered nav bar
  if (isDesktop) {
    return (
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <div className="glass-card border border-border/40 rounded-full px-2 py-2 shadow-lg backdrop-blur-xl">
          <div className="flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              return (
                <button
                  key={item.label}
                  onClick={() => handleNavClick(item.path, item.activeView)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2.5 rounded-full transition-all duration-300',
                    'hover:bg-accent/50 active:scale-95',
                    isActive
                      ? 'text-primary bg-primary/10'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                  title={item.label}
                >
                  {item.customIcon ? (
                    <img src={aiTeacherRobot} alt="AI Teacher" className={cn('w-5 h-5 rounded-full object-cover', isActive && 'drop-shadow-glow')} />
                  ) : (
                    <Icon className={cn('w-5 h-5', isActive && 'drop-shadow-glow')} />
                  )}
                  <span className={cn(
                    'text-sm font-medium hidden xl:inline',
                    isActive && 'text-primary'
                  )}>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>
    );
  }

  // Mobile/Tablet: bottom nav bar
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 pb-safe backdrop-blur-xl">
      <div className="glass-card border-t border-border/40 rounded-t-3xl mx-2 mb-2 shadow-lg">
        <div className="grid grid-cols-6 gap-1 h-16 px-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <button
                key={item.label}
                onClick={() => handleNavClick(item.path, item.activeView)}
                className={cn(
                  'ripple flex flex-col items-center justify-center gap-1 px-2 py-2 rounded-2xl transition-all duration-300',
                  'hover-scale active:scale-95 min-h-[44px] min-w-[44px]',
                  isActive
                    ? 'text-primary bg-gradient-to-br from-primary/20 to-secondary/20'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {item.customIcon ? (
                  <img 
                    src={aiTeacherRobot} 
                    alt="AI Teacher" 
                    className={cn(
                      'w-5 h-5 rounded-full object-cover transition-all duration-300',
                      isActive && 'drop-shadow-glow'
                    )} 
                  />
                ) : (
                  <Icon
                    className={cn(
                      'w-5 h-5 transition-all duration-300',
                      isActive && 'drop-shadow-glow'
                    )}
                    fill={isActive ? 'currentColor' : 'none'}
                  />
                )}
                <span className={cn(
                  "text-[10px] font-medium transition-all duration-300",
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