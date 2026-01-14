'use client';

import { usePreferencesSync } from '@/hooks/usePreferencesSync';

interface PreferencesSyncProviderProps {
  children: React.ReactNode;
  isAuthenticated: boolean;
}

/**
 * Provider component that syncs user preferences between Zustand and Supabase.
 * Should be placed inside the dashboard layout to sync preferences for authenticated users.
 */
export function PreferencesSyncProvider({
  children,
  isAuthenticated,
}: PreferencesSyncProviderProps) {
  // Initialize preference sync
  usePreferencesSync(isAuthenticated);

  return <>{children}</>;
}
