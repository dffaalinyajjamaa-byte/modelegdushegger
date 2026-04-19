import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Heartbeat presence: updates profiles.last_seen + messaging_users.status
 * every 30s while the tab is visible. Marks 'offline' on unload.
 */
export function usePresence(userId: string | undefined) {
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    const update = async (status: 'online' | 'offline') => {
      if (cancelled) return;
      try {
        await Promise.all([
          supabase.from('profiles').update({ last_seen: new Date().toISOString() }).eq('user_id', userId),
          supabase.from('messaging_users').update({ status, updated_at: new Date().toISOString() }).eq('user_id', userId),
        ]);
      } catch (e) {
        // silent
      }
    };

    update('online');
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') update('online');
    }, 30000);

    const onVisibility = () => update(document.visibilityState === 'visible' ? 'online' : 'offline');
    const onUnload = () => {
      // best-effort sync write
      navigator.sendBeacon?.(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/messaging_users?user_id=eq.${userId}`,
        new Blob([JSON.stringify({ status: 'offline' })], { type: 'application/json' })
      );
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('beforeunload', onUnload);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('beforeunload', onUnload);
      update('offline');
    };
  }, [userId]);
}

/** Format "online" / "5 min ago" / "2 hours ago" / date */
export function formatLastSeen(lastSeen: string | null | undefined, status?: string | null): string {
  if (!lastSeen) return status === 'online' ? 'Online' : 'Offline';
  const diff = Date.now() - new Date(lastSeen).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return 'Online';
  if (mins < 60) return `${mins} min ago`;
  if (mins < 1440) return `${Math.floor(mins / 60)} h ago`;
  const d = new Date(lastSeen);
  return d.toLocaleDateString();
}
