'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import {
  serverRailsApi,
  setServerToken,
  setServerUser,
  clearServerToken,
  getServerUser,
  verifyAuth,
  type User,
} from '@/lib/rails/server';

interface AuthResponse {
  message: string;
  user: User;
  token: string;
}

export async function signUp(email: string, password: string, displayName?: string) {
  const response = await serverRailsApi.post<AuthResponse>('/api/v1/auth/sign_up', {
    user: {
      email,
      password,
      password_confirmation: password,
      display_name: displayName,
    },
  });

  if (response.error) {
    return { error: response.error, details: response.details };
  }

  if (response.data) {
    await setServerToken(response.data.token);
    await setServerUser(response.data.user);
    return { data: response.data.user };
  }

  return { error: 'Sign up failed' };
}

export async function signIn(email: string, password: string) {
  const response = await serverRailsApi.post<AuthResponse>('/api/v1/auth/sign_in', {
    user: { email, password },
  });

  if (response.error) {
    return { error: response.error, details: response.details };
  }

  if (response.data) {
    await setServerToken(response.data.token);
    await setServerUser(response.data.user);
    return { data: response.data.user };
  }

  return { error: 'Sign in failed' };
}

export async function signOut() {
  await serverRailsApi.delete<{ message: string }>('/api/v1/auth/sign_out');
  await clearServerToken();
  revalidatePath('/');
  redirect('/');
}

export async function getCurrentUser(): Promise<{ data?: User; error?: string }> {
  const result = await verifyAuth();

  if (result.authenticated && result.user) {
    return { data: result.user };
  }

  return { error: 'Not authenticated' };
}

export async function getCachedUser(): Promise<User | null> {
  return await getServerUser();
}

export async function updateCurrentUser(updates: Partial<{
  displayName: string | null;
  avatarUrl: string | null;
  theme: string;
  eventListViewMode: string;
  hasCompletedOnboarding: boolean;
  hasUsedOptimizeButton: boolean;
  optimizeAnimationEnabled: boolean;
  completedTours: string[];
}>) {
  const response = await serverRailsApi.patch<{ data: { attributes: User } }>('/api/v1/me', {
    user: {
      display_name: updates.displayName,
      avatar_url: updates.avatarUrl,
      theme: updates.theme,
      event_list_view_mode: updates.eventListViewMode,
      has_completed_onboarding: updates.hasCompletedOnboarding,
      has_used_optimize_button: updates.hasUsedOptimizeButton,
      optimize_animation_enabled: updates.optimizeAnimationEnabled,
      completed_tours: updates.completedTours,
    },
  });

  if (response.error) {
    return { error: response.error, details: response.details };
  }

  if (response.data) {
    await setServerUser(response.data.data.attributes);
    return { data: response.data.data.attributes };
  }

  return { error: 'Update failed' };
}

export async function isAuthenticated(): Promise<boolean> {
  const result = await verifyAuth();
  return result.authenticated;
}
