import { Home, Bot, Video, BookOpen, MessageCircle, Mic, CheckSquare, Brain, FileText } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface SidebarNavProps {
  activeView?: string;
  onNavigate?: (view: string) => void;
}

export default function SidebarNav({ activeView, onNavigate }: SidebarNavProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { icon: Home, label: 'Dashboard', activeView: 'dashboard' },
    { icon: BookOpen, label: 'Books', activeView: 'books' },
    { icon: Video, label: 'Videos', activeView: 'videos' },
    { icon: Bot, label: 'AI Teacher', activeView: 'ai-teacher' },
    { icon: Mic, label: 'Live Teacher', activeView: 'live-teacher' },
    { icon: MessageCircle, label: 'Chat', activeView: 'messenger' },
    { icon: CheckSquare, label: 'Tasks', activeView: 'tasks' },
    { icon: Brain, label: 'Quiz', activeView: 'quiz' },
  ];

  const handleNavClick = (view: string) => {
    if (onNavigate) {
      onNavigate(view);
    } else {
      navigate('/', { state: { activeView: view } });
    }
  };

  return (
    <aside className="hidden lg:flex flex-col w-64 border-r border-border/50 bg-card/50 backdrop-blur-sm h-full">
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.activeView;
          
          return (
            <button
              key={item.label}
              onClick={() => handleNavClick(item.activeView)}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200',
                'hover:bg-accent/50 active:scale-[0.98]',
                isActive
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className={cn('w-5 h-5', isActive && 'text-primary')} />
              <span className="font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
