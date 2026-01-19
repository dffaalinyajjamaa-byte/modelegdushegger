import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VerifiedBadgeProps {
  type: 'gold' | 'blue' | 'black';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function VerifiedBadge({ type, size = 'md', className }: VerifiedBadgeProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  const iconSizes = {
    sm: 'w-2.5 h-2.5',
    md: 'w-3 h-3',
    lg: 'w-4 h-4'
  };

  const badgeStyles = {
    gold: 'bg-gradient-to-br from-yellow-400 to-amber-500 shadow-[0_0_8px_rgba(251,191,36,0.5)]',
    blue: 'bg-gradient-to-br from-blue-400 to-blue-600 shadow-[0_0_8px_rgba(59,130,246,0.5)]',
    black: 'bg-gradient-to-br from-gray-700 to-gray-900 shadow-[0_0_8px_rgba(0,0,0,0.3)]'
  };

  const titles = {
    gold: 'Verified Teacher',
    blue: 'Top Student',
    black: 'Verified Student'
  };

  return (
    <div 
      className={cn(
        'inline-flex items-center justify-center rounded-full',
        sizeClasses[size],
        badgeStyles[type],
        className
      )}
      title={titles[type]}
    >
      <Check className={cn('text-white', iconSizes[size])} strokeWidth={3} />
    </div>
  );
}