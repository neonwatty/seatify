/**
 * Server-side Rails API client.
 * Uses cookies for JWT token storage to work with Server Actions.
 * This file is consumed by Server Action files - it should NOT have "use server" directive.
 */

import { cookies } from 'next/headers';

const API_BASE_URL = process.env.RAILS_API_URL || process.env.NEXT_PUBLIC_RAILS_API_URL || 'http://localhost:3001';
const TOKEN_COOKIE_NAME = 'rails_jwt_token';
const USER_COOKIE_NAME = 'rails_user';

export interface User {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  theme: string;
  eventListViewMode: string;
  hasCompletedOnboarding: boolean;
  hasUsedOptimizeButton: boolean;
  optimizeAnimationEnabled: boolean;
  completedTours: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  details?: string[];
}

// Get token from cookies
export async function getServerToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(TOKEN_COOKIE_NAME)?.value || null;
}

// Set token in cookies
export async function setServerToken(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(TOKEN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 1 week
    path: '/',
  });
}

// Clear token from cookies
export async function clearServerToken(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(TOKEN_COOKIE_NAME);
  cookieStore.delete(USER_COOKIE_NAME);
}

// Get user from cookies
export async function getServerUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const userData = cookieStore.get(USER_COOKIE_NAME)?.value;
  if (!userData) return null;
  try {
    return JSON.parse(userData);
  } catch {
    return null;
  }
}

// Set user in cookies
export async function setServerUser(user: User): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(USER_COOKIE_NAME, JSON.stringify(user), {
    httpOnly: false, // Allow client-side access for UI
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 1 week
    path: '/',
  });
}

// Generic fetch wrapper with auth header
async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = await getServerToken();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
      // Don't cache API requests
      cache: 'no-store',
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        error: data.error || `Request failed with status ${response.status}`,
        details: data.details,
      };
    }

    return { data };
  } catch (error) {
    console.error('API request failed:', error);
    return {
      error: error instanceof Error ? error.message : 'Network request failed',
    };
  }
}

// Server-side API methods
export const serverRailsApi = {
  // GET request
  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return fetchApi<T>(endpoint, { method: 'GET' });
  },

  // POST request
  async post<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return fetchApi<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  // PUT request
  async put<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return fetchApi<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  // PATCH request
  async patch<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return fetchApi<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  // DELETE request
  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return fetchApi<T>(endpoint, { method: 'DELETE' });
  },
};

// Server-side auth check
export async function isAuthenticated(): Promise<boolean> {
  const token = await getServerToken();
  return !!token;
}

// Verify token is still valid by calling /me endpoint
export async function verifyAuth(): Promise<{ authenticated: boolean; user?: User }> {
  const token = await getServerToken();
  if (!token) {
    return { authenticated: false };
  }

  const response = await serverRailsApi.get<{ data: { attributes: User } }>('/api/v1/me');

  if (response.error) {
    await clearServerToken();
    return { authenticated: false };
  }

  if (response.data) {
    const user = response.data.data.attributes;
    await setServerUser(user);
    return { authenticated: true, user };
  }

  return { authenticated: false };
}
