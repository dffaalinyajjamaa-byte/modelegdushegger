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

  // Mobile/Tablet: Liquid Glass floating island tab bar
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 pb-[max(0.5rem,env(safe-area-inset-bottom))] pointer-events-none">
      <div className="mx-3 pointer-events-auto lg-island lg-glass-strong lg-glow-border">
        <div className="grid grid-cols-5 h-[64px] px-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.state && (location.state as any).activeView === item.activeView;

            return (
              <button
                key={item.label}
                onClick={() => handleNavClick(item.path, item.activeView)}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'relative flex flex-col items-center justify-center gap-0.5 rounded-2xl mx-0.5 my-1.5 lg-press min-h-[44px]',
                  isActive
                    ? 'text-[hsl(var(--ios-blue))]'
                    : 'text-muted-foreground'
                )}
              >
                {isActive && (
                  <span className="absolute inset-x-2 inset-y-1 rounded-2xl bg-[hsl(var(--ios-blue))]/12" />
                )}
                <span className="relative z-10">
                  {item.customIcon ? (
                    <img
                      src={aiTeacherRobot}
                      alt=""
                      className={cn('w-6 h-6 rounded-full object-cover', isActive && 'ring-2 ring-[hsl(var(--ios-blue))]/40')}
                    />
                  ) : Icon ? (
                    <Icon
                      className="w-[22px] h-[22px]"
                      strokeWidth={isActive ? 2.25 : 1.75}
                      fill={isActive ? 'currentColor' : 'none'}
                    />
                  ) : null}
                </span>
                <span className={cn(
                  'relative z-10 text-[10px] tracking-tight',
                  isActive ? 'font-semibold' : 'font-medium'
                )}>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
