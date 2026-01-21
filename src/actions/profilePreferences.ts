'use server';

import { serverRailsApi, isAuthenticated } from '@/lib/rails/server';
import type { UserPreferences } from './types';

// Default preferences
const defaultPreferences: UserPreferences = {
  theme: 'system',
  eventListViewMode: 'cards',
  hasCompletedOnboarding: false,
  completedTours: [],
  hasUsedOptimizeButton: false,
  optimizeAnimationEnabled: true,
};

// Load user preferences from Rails API
export async function loadUserPreferences(): Promise<{ data?: UserPreferences; error?: string }> {
  if (!await isAuthenticated()) {
    return { error: 'Not authenticated' };
  }

  const response = await serverRailsApi.get<{
    data: {
      attributes: {
        theme: string;
        eventListViewMode: string;
        hasCompletedOnboarding: boolean;
        completedTours: string[];
        hasUsedOptimizeButton: boolean;
        optimizeAnimationEnabled: boolean;
      };
    };
  }>('/api/v1/me');

  if (response.error) {
    console.error('Error loading preferences:', response.error);
    return { error: response.error };
  }

  if (!response.data) {
    return { data: defaultPreferences };
  }

  const attrs = response.data.data.attributes;

  // Transform API response to frontend format
  const preferences: UserPreferences = {
    theme: (attrs.theme as UserPreferences['theme']) || 'system',
    eventListViewMode: (attrs.eventListViewMode as UserPreferences['eventListViewMode']) || 'cards',
    hasCompletedOnboarding: attrs.hasCompletedOnboarding ?? false,
    completedTours: attrs.completedTours || [],
    hasUsedOptimizeButton: attrs.hasUsedOptimizeButton ?? false,
    optimizeAnimationEnabled: attrs.optimizeAnimationEnabled ?? true,
  };

  return { data: preferences };
}

// Update a single preference
export async function updateUserPreference<K extends keyof UserPreferences>(
  key: K,
  value: UserPreferences[K]
): Promise<{ success?: boolean; error?: string }> {
  if (!await isAuthenticated()) {
    return { error: 'Not authenticated' };
  }

  // Map frontend keys to Rails API keys
  const keyMap: Record<keyof UserPreferences, string> = {
    theme: 'theme',
    eventListViewMode: 'event_list_view_mode',
    hasCompletedOnboarding: 'has_completed_onboarding',
    completedTours: 'completed_tours',
    hasUsedOptimizeButton: 'has_used_optimize_button',
    optimizeAnimationEnabled: 'optimize_animation_enabled',
  };

  const railsKey = keyMap[key];
  const updateData = { [railsKey]: value };

  const response = await serverRailsApi.patch<{
    data: { attributes: Record<string, unknown> };
  }>('/api/v1/me', { user: updateData });

  if (response.error) {
    console.error(`Error updating preference ${key}:`, response.error);
    return { error: response.error };
  }

  return { success: true };
}

// Update multiple preferences at once
export async function updateUserPreferences(
  preferences: Partial<UserPreferences>
): Promise<{ success?: boolean; error?: string }> {
  if (!await isAuthenticated()) {
    return { error: 'Not authenticated' };
  }

  // Transform frontend keys to Rails API keys
  const updateData: Record<string, unknown> = {};

  if (preferences.theme !== undefined) {
    updateData.theme = preferences.theme;
  }
  if (preferences.eventListViewMode !== undefined) {
    updateData.event_list_view_mode = preferences.eventListViewMode;
  }
  if (preferences.hasCompletedOnboarding !== undefined) {
    updateData.has_completed_onboarding = preferences.hasCompletedOnboarding;
  }
  if (preferences.completedTours !== undefined) {
    updateData.completed_tours = preferences.completedTours;
  }
  if (preferences.hasUsedOptimizeButton !== undefined) {
    updateData.has_used_optimize_button = preferences.hasUsedOptimizeButton;
  }
  if (preferences.optimizeAnimationEnabled !== undefined) {
    updateData.optimize_animation_enabled = preferences.optimizeAnimationEnabled;
  }

  if (Object.keys(updateData).length === 0) {
    return { success: true }; // Nothing to update
  }

  const response = await serverRailsApi.patch<{
    data: { attributes: Record<string, unknown> };
  }>('/api/v1/me', { user: updateData });

  if (response.error) {
    console.error('Error updating preferences:', response.error);
    return { error: response.error };
  }

  return { success: true };
}
