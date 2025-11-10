import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { User } from '@supabase/supabase-js';
import { CheckCircle, Video, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Profile {
  full_name: string;
  grade: string | null;
  avatar_url: string | null;
}

interface ProfileCardProps {
  user: User;
  profile: Profile;
  stats?: {
    tasks_completed?: number;
    videos_watched?: number;
    materials_read?: number;
  };
  compact?: boolean;
  onClick?: () => void;
  className?: string;
}

export default function ProfileCard({
  user,
  profile,
  stats,
  compact = false,
  onClick,
  className,
}: ProfileCardProps) {
  const initials = profile.full_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase() || 'U';

  if (compact) {
    return (
      <div
        className={cn(
          'flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity',
          className
        )}
        onClick={onClick}
      >
        <Avatar className="w-10 h-10 md:w-12 md:h-12 border-2 border-primary/30 shadow-neon">
          <AvatarImage src={profile.avatar_url || ''} alt={profile.full_name} />
          <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-primary-foreground font-bold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm md:text-base font-semibold text-foreground truncate">
            {profile.full_name}
          </h3>
          {profile.grade && (
            <p className="text-xs text-muted-foreground">{profile.grade}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <Card
      className={cn(
        'glass-card border border-border/40 shadow-glow overflow-hidden hover-scale cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex flex-col items-center gap-4">
          {/* Avatar */}
          <Avatar className="w-20 h-20 md:w-24 md:h-24 border-4 border-primary/30 shadow-neon">
            <AvatarImage src={profile.avatar_url || ''} alt={profile.full_name} />
            <AvatarFallback className="bg-gradient-to-br from-primary via-secondary to-accent text-white text-2xl font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>

          {/* User Info */}
          <div className="text-center w-full">
            <h2 className="text-xl md:text-2xl font-bold text-foreground mb-1">
              {profile.full_name}
            </h2>
            <p className="text-sm text-muted-foreground mb-2">{user.email}</p>
            {profile.grade && (
              <Badge className="bg-secondary/20 text-secondary border-secondary/30">
                {profile.grade}
              </Badge>
            )}
          </div>

          {/* Stats */}
          {stats && (
            <div className="w-full grid grid-cols-3 gap-3 mt-4">
              <div className="glass-card p-3 rounded-xl text-center">
                <div className="flex justify-center mb-1">
                  <CheckCircle className="w-5 h-5 text-accent" />
                </div>
                <p className="text-2xl font-bold text-accent">{stats.tasks_completed || 0}</p>
                <p className="text-xs text-muted-foreground">Tasks</p>
              </div>
              <div className="glass-card p-3 rounded-xl text-center">
                <div className="flex justify-center mb-1">
                  <Video className="w-5 h-5 text-primary" />
                </div>
                <p className="text-2xl font-bold text-primary">{stats.videos_watched || 0}</p>
                <p className="text-xs text-muted-foreground">Videos</p>
              </div>
              <div className="glass-card p-3 rounded-xl text-center">
                <div className="flex justify-center mb-1">
                  <BookOpen className="w-5 h-5 text-secondary" />
                </div>
                <p className="text-2xl font-bold text-secondary">{stats.materials_read || 0}</p>
                <p className="text-xs text-muted-foreground">Books</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
