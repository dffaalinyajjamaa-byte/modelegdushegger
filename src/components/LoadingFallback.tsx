import { Loader2 } from 'lucide-react';

export default function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center space-y-4">
        <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary" />
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}
