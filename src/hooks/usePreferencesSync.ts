'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useStore } from '@/store/useStore';
import {
  loadUserPreferences,
  updateUserPreference,
  type UserPreferences,
} from '@/actions/profilePreferences';
import type { TourId } from '@/data/tourRegistry';

/**
 * Hook that syncs user preferences between Zustand store and Supabase.
 * - On mount: loads preferences from Supabase and merges with localStorage
 * - On change: syncs preference changes to Supabase
 *
 * @param isAuthenticated - Whether the user is authenticated
 */
export function usePreferencesSync(isAuthenticated: boolean) {
  const store = useStore();
  const [hasLoaded, setHasLoaded] = useState(false);
  const previousPrefsRef = useRef<Partial<UserPreferences>>({});

  // Load preferences from Supabase on mount
  useEffect(() => {
    if (!isAuthenticated || hasLoaded) return;

    const loadPreferences = async () => {
      const result = await loadUserPreferences();

      if (result.data) {
        // Get current local preferences
        const localPrefs = {
          theme: store.theme,
          eventListViewMode: store.eventListViewMode,
          hasCompletedOnboarding: store.hasCompletedOnboarding,
          completedTours: Array.from(store.completedTours),
          hasUsedOptimizeButton: store.hasUsedOptimizeButton,
          optimizeAnimationEnabled: store.optimizeAnimationEnabled,
        };

        // Merge strategy: Use Supabase data, but keep local data if it's more "complete"
        // (e.g., if user completed onboarding locally but it wasn't synced yet)
        const serverPrefs = result.data;

        // Theme: prefer server if not default, otherwise keep local
        if (serverPrefs.theme !== 'system' || localPrefs.theme === 'system') {
          store.setTheme(serverPrefs.theme);
        }

        // Event list view mode: prefer server
        store.setEventListViewMode(serverPrefs.eventListViewMode);

        // Onboarding: use whichever is true (most progress)
        if (serverPrefs.hasCompletedOnboarding && !localPrefs.hasCompletedOnboarding) {
          store.setOnboardingComplete();
        }

        // Completed tours: merge both sets
        const mergedTours = new Set([
          ...localPrefs.completedTours,
          ...serverPrefs.completedTours,
        ]);
        mergedTours.forEach(tourId => {
          if (!store.completedTours.has(tourId as TourId)) {
            store.markTourComplete(tourId as TourId);
          }
        });

        // Feature usage: use whichever is true
        if (serverPrefs.hasUsedOptimizeButton && !localPrefs.hasUsedOptimizeButton) {
          store.setHasUsedOptimizeButton();
        }

        // Animation preference: prefer server
        store.setOptimizeAnimationEnabled(serverPrefs.optimizeAnimationEnabled);

        // Store the initial preferences for change detection
        previousPrefsRef.current = {
          theme: store.theme,
          eventListViewMode: store.eventListViewMode,
          hasCompletedOnboarding: store.hasCompletedOnboarding,
          completedTours: Array.from(store.completedTours),
          hasUsedOptimizeButton: store.hasUsedOptimizeButton,
          optimizeAnimationEnabled: store.optimizeAnimationEnabled,
        };
      }

      setHasLoaded(true);
    };

    loadPreferences();
  }, [isAuthenticated, hasLoaded, store]);

  // Sync individual preference changes to Supabase
  const syncPreference = useCallback(async <K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ) => {
    if (!isAuthenticated) return;

    const result = await updateUserPreference(key, value);
    if (result.error) {
      console.error(`Failed to sync preference ${key}:`, result.error);
    }
  }, [isAuthenticated]);

  // Subscribe to store changes and sync to Supabase
  useEffect(() => {
    if (!isAuthenticated || !hasLoaded) return;

    const unsubscribe = useStore.subscribe((state, prevState) => {
      // Check for theme change
      if (state.theme !== prevState.theme) {
        syncPreference('theme', state.theme);
      }

      // Check for event list view mode change
      if (state.eventListViewMode !== prevState.eventListViewMode) {
        syncPreference('eventListViewMode', state.eventListViewMode);
      }

      // Check for onboarding completion change
      if (state.hasCompletedOnboarding !== prevState.hasCompletedOnboarding) {
        syncPreference('hasCompletedOnboarding', state.hasCompletedOnboarding);
      }

      // Check for completed tours change
      if (state.completedTours !== prevState.completedTours) {
        syncPreference('completedTours', Array.from(state.completedTours));
      }

      // Check for optimize button usage change
      if (state.hasUsedOptimizeButton !== prevState.hasUsedOptimizeButton) {
        syncPreference('hasUsedOptimizeButton', state.hasUsedOptimizeButton);
      }

      // Check for animation preference change
      if (state.optimizeAnimationEnabled !== prevState.optimizeAnimationEnabled) {
        syncPreference('optimizeAnimationEnabled', state.optimizeAnimationEnabled);
      }
    });

    return unsubscribe;
  }, [isAuthenticated, syncPreference, hasLoaded]);

  return {
    hasLoaded,
    syncPreference,
  };
}
