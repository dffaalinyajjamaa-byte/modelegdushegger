import { Home, Video, BookOpen, MessageCircle, ShoppingBag } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useScreenSize } from '@/hooks/use-screen-size';
import aiTeacherRobot from '@/assets/ai-teacher-robot.png';

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isMobile, isTablet, isDesktop } = useScreenSize();

  const navItems = [
    { icon: Home, label: 'Home', path: '/', activeView: 'dashboard' },
    { icon: BookOpen, label: 'Books', path: '/', activeView: 'books' },
    { icon: null, label: 'AI', path: '/', activeView: 'ai-teacher', customIcon: true },
    { icon: ShoppingBag, label: 'Market', path: '/', activeView: 'marketplace' },
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
                    <img src={aiTeacherRobot} alt="AI Teacher" className={cn('w-6 h-6 rounded-full object-cover', isActive && 'drop-shadow-glow')} />
                  ) : Icon ? (
                    <Icon className={cn('w-5 h-5', isActive && 'drop-shadow-glow')} />
                  ) : null}
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

  // Mobile/Tablet: liquid glassmorphism bottom nav
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 pb-safe">
      <div className="relative mx-2 mb-2">
        {/* Liquid glass background */}
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-white/[0.08] via-white/[0.12] to-white/[0.08] dark:from-black/[0.3] dark:via-black/[0.4] dark:to-black/[0.3] backdrop-blur-2xl border border-white/[0.15] dark:border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.1)]" />
        
        <div className="relative grid grid-cols-5 gap-1 h-16 px-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.state && (location.state as any).activeView === item.activeView;
            
            return (
              <button
                key={item.label}
                onClick={() => handleNavClick(item.path, item.activeView)}
                className={cn(
                  'relative flex flex-col items-center justify-center gap-1 px-2 py-2 rounded-2xl transition-all duration-300',
                  'active:scale-90 min-h-[44px] min-w-[44px]',
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {/* Active indicator blob */}
                {isActive && (
                  <div className="absolute inset-1 rounded-2xl bg-primary/15 backdrop-blur-sm animate-pulse" 
                       style={{ animationDuration: '3s' }} />
                )}
                
                <div className="relative z-10">
                  {item.customIcon ? (
                    <img 
                      src={aiTeacherRobot} 
                      alt="AI Teacher" 
                      className={cn(
                        'w-6 h-6 rounded-full object-cover transition-all duration-300',
                        isActive && 'drop-shadow-glow scale-110'
                      )} 
                    />
                  ) : Icon ? (
                    <Icon
                      className={cn(
                        'w-5 h-5 transition-all duration-300',
                        isActive && 'drop-shadow-glow scale-110'
                      )}
                      fill={isActive ? 'currentColor' : 'none'}
                    />
                  ) : null}
                </div>
                <span className={cn(
                  "relative z-10 text-[10px] font-medium transition-all duration-300",
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
