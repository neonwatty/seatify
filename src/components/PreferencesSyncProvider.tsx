'use client';

import { Suspense } from 'react';
import { usePreferencesSync } from '@/hooks/usePreferencesSync';
import { DemoMigrationHandler } from './DemoMigrationHandler';

interface PreferencesSyncProviderProps {
  children: React.ReactNode;
  isAuthenticated: boolean;
}

/**
 * Provider component that syncs user preferences between Zustand and Supabase.
 * Also handles demo-to-account migration after signup.
 * Should be placed inside the dashboard layout to sync preferences for authenticated users.
 */
export function PreferencesSyncProvider({
  children,
  isAuthenticated,
}: PreferencesSyncProviderProps) {
  // Initialize preference sync
  usePreferencesSync(isAuthenticated);

  return (
    <>
      {/* Handle demo migration after signup - wrapped in Suspense for useSearchParams */}
      <Suspense fallback={null}>
        <DemoMigrationHandler />
      </Suspense>
      {children}
    </>
  );
}
