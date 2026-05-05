import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { safeStorage } from '@/lib/storage-utils';

const LS_KEY = 'appearance-prefs-v1';

export interface AppearancePrefs {
  reduceMotion: boolean;
  reduceTransparency: boolean;
}

const DEFAULTS: AppearancePrefs = {
  reduceMotion: false,
  reduceTransparency: false,
};

function readLocal(): AppearancePrefs {
  try {
    const raw = safeStorage.getItem(LS_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

function writeLocal(p: AppearancePrefs) {
  safeStorage.setItem(LS_KEY, JSON.stringify(p));
}

export function useAppearancePreferences() {
  const [prefs, setPrefs] = useState<AppearancePrefs>(() => readLocal());
  const [userId, setUserId] = useState<string | null>(null);

  // Apply to <html> whenever prefs change
  useEffect(() => {
    const html = document.documentElement;
    html.classList.toggle('lg-reduce-motion', prefs.reduceMotion);
    html.classList.toggle('lg-reduce-transparency', prefs.reduceTransparency);
  }, [prefs]);

  // Sync from DB on auth
  useEffect(() => {
    let active = true;
    const load = async (uid: string) => {
      const { data } = await supabase
        .from('user_preferences')
        .select('reduce_motion, reduce_transparency')
        .eq('user_id', uid)
        .maybeSingle();
      if (!active) return;
      if (data) {
        const next = {
          reduceMotion: !!data.reduce_motion,
          reduceTransparency: !!data.reduce_transparency,
        };
        setPrefs(next);
        writeLocal(next);
      }
    };
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserId(data.user.id);
        load(data.user.id);
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) {
        setUserId(session.user.id);
        load(session.user.id);
      } else {
        setUserId(null);
      }
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const update = useCallback(
    async (patch: Partial<AppearancePrefs>) => {
      const next = { ...prefs, ...patch };
      setPrefs(next);
      writeLocal(next);
      if (userId) {
        await supabase.from('user_preferences').upsert({
          user_id: userId,
          reduce_motion: next.reduceMotion,
          reduce_transparency: next.reduceTransparency,
        });
      }
    },
    [prefs, userId]
  );

  return { prefs, update };
}
