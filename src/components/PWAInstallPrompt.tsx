import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X } from 'lucide-react';

const APP_ICON =
  'https://storage.googleapis.com/gpt-engineer-file-uploads/3KyTLoeZyDZ10cTkVR2q621g95q1/uploads/1768838377177-model-egdu-logo-DY_KJLZh.png';

const DISMISS_KEY = 'pwa_install_dismissed_at';
const DISMISS_HOURS = 24 * 7;

interface BIPEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PWAInstallPrompt() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Skip if standalone (already installed) or recently dismissed
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    if (isStandalone) return;

    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
    if (Date.now() - dismissedAt < DISMISS_HOURS * 3600 * 1000) return;

    const onBIP = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
      setShow(true);
      // Auto-dismiss after 10s
      setTimeout(() => setShow(false), 10000);
    };
    window.addEventListener('beforeinstallprompt', onBIP);

    // iOS fallback (no BIP support) — show manual hint
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    if (isIOS && !isStandalone) {
      setShow(true);
      setTimeout(() => setShow(false), 10000);
    }

    return () => window.removeEventListener('beforeinstallprompt', onBIP);
  }, []);

  const handleInstall = async () => {
    if (!deferred) {
      setShow(false);
      return;
    }
    await deferred.prompt();
    await deferred.userChoice;
    setShow(false);
    setDeferred(null);
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setShow(false);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 80 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 80 }}
          transition={{ type: 'spring', stiffness: 280, damping: 28 }}
          className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-[9999] w-[92%] max-w-sm"
        >
          <div className="relative flex items-center gap-3 rounded-2xl p-3 pr-10 backdrop-blur-2xl bg-background/70 border border-border/50 shadow-2xl">
            <img
              src={APP_ICON}
              alt="Model Egdu"
              className="w-12 h-12 rounded-xl shrink-0 object-cover ring-1 ring-border/40"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold leading-tight">Install Model Egdu</p>
              <p className="text-xs text-muted-foreground leading-tight mt-0.5">
                Add to home screen for the full app experience
              </p>
            </div>
            <button
              onClick={handleInstall}
              className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold px-3 py-2 rounded-full bg-primary text-primary-foreground hover:opacity-90 active:scale-95 transition"
            >
              <Download className="w-3.5 h-3.5" />
              Install
            </button>
            <button
              onClick={handleDismiss}
              aria-label="Dismiss"
              className="absolute top-1.5 right-1.5 p-1 text-muted-foreground hover:text-foreground rounded-full"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
