import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * useLearningTime
 * Heartbeat hook: while the screen is active and the tab is visible,
 * increments daily_stats.learning_time_minutes by 1 every 60s and awards 1 point.
 * This is what powers streak progression, Charging Points, and weekly charts.
 */
export function useLearningTime(userId: string | undefined, active: boolean = true) {
  const lastTickRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!userId || !active) return;

    let cancelled = false;

    const tick = async () => {
      if (cancelled) return;
      if (document.visibilityState !== 'visible') return;

      const now = Date.now();
      // Guard against very fast re-fires
      if (now - lastTickRef.current < 55_000) return;
      lastTickRef.current = now;

      try {
        await supabase.rpc('increment_daily_stat', {
          p_user_id: userId,
          p_stat_type: 'learning_minutes',
          p_increment: 1,
        });
        await supabase.rpc('award_points', {
          p_user_id: userId,
          p_points: 1,
          p_activity_type: 'study_minute',
        });
      } catch (e) {
        // silent
      }
    };

    const interval = window.setInterval(tick, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [userId, active]);
}
