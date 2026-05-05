import { cn } from '@/lib/utils';

interface BaseProps extends React.HTMLAttributes<HTMLDivElement> {}

export function SkeletonGlass({ className, ...rest }: BaseProps) {
  return <div className={cn('lg-skeleton rounded-2xl', className)} {...rest} />;
}

export function SkeletonChatBubble({ side = 'left' }: { side?: 'left' | 'right' }) {
  return (
    <div className={cn('flex w-full', side === 'right' ? 'justify-end' : 'justify-start')}>
      <div className="flex flex-col gap-1.5 max-w-[78%]">
        <SkeletonGlass className="h-3 w-32 rounded-full" />
        <SkeletonGlass className="h-3 w-48 rounded-full" />
        <SkeletonGlass className="h-3 w-24 rounded-full" />
      </div>
    </div>
  );
}

export function SkeletonViewer({ ratio = '16/9' }: { ratio?: '16/9' | '4/3' | 'a4' }) {
  const aspect =
    ratio === '16/9' ? 'aspect-video' : ratio === '4/3' ? 'aspect-[4/3]' : 'aspect-[1/1.414]';
  return <SkeletonGlass className={cn('w-full rounded-3xl', aspect)} />;
}

export function SkeletonChartCard() {
  return (
    <div className="lg-glass rounded-3xl p-4 space-y-3">
      <SkeletonGlass className="h-4 w-32 rounded-full" />
      <SkeletonGlass className="h-40 w-full rounded-2xl" />
      <div className="flex gap-2">
        <SkeletonGlass className="h-3 w-16 rounded-full" />
        <SkeletonGlass className="h-3 w-20 rounded-full" />
        <SkeletonGlass className="h-3 w-12 rounded-full" />
      </div>
    </div>
  );
}

export function SkeletonListCell() {
  return (
    <div className="lg-glass rounded-2xl p-3 flex items-center gap-3">
      <SkeletonGlass className="h-11 w-11 rounded-full shrink-0" />
      <div className="flex-1 space-y-2">
        <SkeletonGlass className="h-3 w-2/3 rounded-full" />
        <SkeletonGlass className="h-3 w-1/3 rounded-full" />
      </div>
    </div>
  );
}

/** Three dots that pulse, for AI typing inside a glass bubble. */
export function GlassTypingDots({ className }: { className?: string }) {
  return (
    <div className={cn('lg-glass rounded-2xl px-4 py-3 inline-flex items-center gap-1.5', className)}>
      <span className="h-2 w-2 rounded-full bg-foreground/60 animate-pulse [animation-delay:0ms]" />
      <span className="h-2 w-2 rounded-full bg-foreground/60 animate-pulse [animation-delay:150ms]" />
      <span className="h-2 w-2 rounded-full bg-foreground/60 animate-pulse [animation-delay:300ms]" />
    </div>
  );
}
