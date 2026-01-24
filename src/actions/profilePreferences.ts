'use server';

import { createClient } from '@/lib/supabase/server';

// Types matching the Zustand store
export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  eventListViewMode: 'cards' | 'list';
  hasCompletedOnboarding: boolean;
  completedTours: string[];
  hasUsedOptimizeButton: boolean;
  optimizeAnimationEnabled: boolean;
}

// Default preferences
const defaultPreferences: UserPreferences = {
  theme: 'system',
  eventListViewMode: 'cards',
  hasCompletedOnboarding: false,
  completedTours: [],
  hasUsedOptimizeButton: false,
  optimizeAnimationEnabled: true,
};

// Load user preferences from Supabase
export async function loadUserPreferences(): Promise<{ data?: UserPreferences; error?: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Not authenticated' };
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select(`
      theme,
      event_list_view_mode,
      has_completed_onboarding,
      completed_tours,
      has_used_optimize_button,
      optimize_animation_enabled
    `)
    .eq('id', user.id)
    .single();

  if (error) {
    console.error('Error loading preferences:', error);
    return { error: error.message };
  }

  if (!profile) {
    return { data: defaultPreferences };
  }

  // Transform database format to frontend format
  const preferences: UserPreferences = {
    theme: (profile.theme as UserPreferences['theme']) || 'system',
    eventListViewMode: (profile.event_list_view_mode as UserPreferences['eventListViewMode']) || 'cards',
    hasCompletedOnboarding: profile.has_completed_onboarding ?? false,
    completedTours: profile.completed_tours || [],
    hasUsedOptimizeButton: profile.has_used_optimize_button ?? false,
    optimizeAnimationEnabled: profile.optimize_animation_enabled ?? true,
  };

  return { data: preferences };
}

// Update a single preference
export async function updateUserPreference<K extends keyof UserPreferences>(
  key: K,
  value: UserPreferences[K]
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Not authenticated' };
  }

  // Map frontend keys to database column names
  const keyMap: Record<keyof UserPreferences, string> = {
    theme: 'theme',
    eventListViewMode: 'event_list_view_mode',
    hasCompletedOnboarding: 'has_completed_onboarding',
    completedTours: 'completed_tours',
    hasUsedOptimizeButton: 'has_used_optimize_button',
    optimizeAnimationEnabled: 'optimize_animation_enabled',
  };

  const dbKey = keyMap[key];
  const updateData = { [dbKey]: value };

  const { error } = await supabase
    .from('profiles')
    .update(updateData)
    .eq('id', user.id);

  if (error) {
    console.error(`Error updating preference ${key}:`, error);
    return { error: error.message };
  }

  return { success: true };
}

// Update multiple preferences at once
export async function updateUserPreferences(
  preferences: Partial<UserPreferences>
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Not authenticated' };
  }

  // Transform frontend keys to database column names
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

  const { error } = await supabase
    .from('profiles')
    .update(updateData)
    .eq('id', user.id);

  if (error) {
    console.error('Error updating preferences:', error);
    return { error: error.message };
  }

  return { success: true };
}

// Load custom logo URL from user profile
export async function loadCustomLogo(): Promise<{ data?: string | null; error?: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Not authenticated' };
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('custom_logo_url')
    .eq('id', user.id)
    .single();

  if (error) {
    console.error('Error loading custom logo:', error);
    return { error: error.message };
  }

  return { data: profile?.custom_logo_url || null };
}

// Update custom logo URL in user profile
export async function updateCustomLogo(
  logoDataUrl: string | null
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Not authenticated' };
  }

  const { error } = await supabase
    .from('profiles')
    .update({ custom_logo_url: logoDataUrl })
    .eq('id', user.id);

  if (error) {
    console.error('Error updating custom logo:', error);
    return { error: error.message };
  }

  return { success: true };
}
