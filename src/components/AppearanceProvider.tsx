import { createContext, useContext, ReactNode } from 'react';
import { useAppearancePreferences, AppearancePrefs } from '@/hooks/use-appearance-preferences';

interface Ctx {
  prefs: AppearancePrefs;
  update: (p: Partial<AppearancePrefs>) => Promise<void>;
}

const AppearanceContext = createContext<Ctx | null>(null);

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const value = useAppearancePreferences();
  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>;
}

export function useAppearance() {
  const ctx = useContext(AppearanceContext);
  if (!ctx) throw new Error('useAppearance must be used inside AppearanceProvider');
  return ctx;
}
