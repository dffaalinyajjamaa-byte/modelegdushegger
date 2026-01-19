import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VerifiedBadgeProps {
  type: 'gold' | 'blue';
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

  return (
    <div 
      className={cn(
        'inline-flex items-center justify-center rounded-full',
        sizeClasses[size],
        type === 'gold' 
          ? 'bg-gradient-to-br from-yellow-400 to-amber-500 shadow-[0_0_8px_rgba(251,191,36,0.5)]' 
          : 'bg-gradient-to-br from-blue-400 to-blue-600 shadow-[0_0_8px_rgba(59,130,246,0.5)]',
        className
      )}
      title={type === 'gold' ? 'Verified Teacher' : 'Top Student'}
    >
      <Check className={cn('text-white', iconSizes[size])} strokeWidth={3} />
    </div>
  );
}
