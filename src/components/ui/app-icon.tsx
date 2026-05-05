import { iconMap, type IconName } from '@/lib/icon-map';
import { cn } from '@/lib/utils';
import type { LucideProps } from 'lucide-react';

interface AppIconProps extends Omit<LucideProps, 'ref'> {
  name: IconName;
  label?: string;
}

/**
 * Shared semantic icon. Replaces emoji literals across the app.
 * Example: <AppIcon name="trophy" size={20} />
 */
export function AppIcon({ name, label, className, strokeWidth = 1.75, ...rest }: AppIconProps) {
  const Cmp = iconMap[name];
  if (!Cmp) return null;
  return (
    <Cmp
      className={cn('inline-block', className)}
      strokeWidth={strokeWidth}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      role={label ? 'img' : undefined}
      {...rest}
    />
  );
}
