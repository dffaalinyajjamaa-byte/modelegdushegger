import { BackgroundPaths } from '@/components/ui/background-paths';
import { ReactNode } from 'react';

export default function GlobalBackground({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen w-full">
      {/* Fixed background paths */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <BackgroundPaths 
          title="" 
          showButton={false}
        />
      </div>
      
      {/* Content overlay */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
