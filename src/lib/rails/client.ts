/**
 * Rails API client with JWT token management.
 * Handles all HTTP requests to the Rails backend.
 */

// Get API URL from environment or use default for development
const API_BASE_URL = process.env.NEXT_PUBLIC_RAILS_API_URL || 'http://localhost:3001';

// Token storage keys
const TOKEN_KEY = 'rails_jwt_token';
const USER_KEY = 'rails_user';

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

// Token management functions
export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getStoredUser(): User | null {
  if (typeof window === 'undefined') return null;
  const userData = localStorage.getItem(USER_KEY);
  if (!userData) return null;
  try {
    return JSON.parse(userData);
  } catch {
    return null;
  }
}

export function setStoredUser(user: User): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

// Generic fetch wrapper with auth header
async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = getToken();

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

// API methods
export const railsApi = {
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

// Auth-specific API functions
export const authApi = {
  async signUp(email: string, password: string, displayName?: string) {
    const response = await railsApi.post<{
      message: string;
      user: User;
      token: string;
    }>('/api/v1/auth/sign_up', {
      user: { email, password, password_confirmation: password, display_name: displayName },
    });

    if (response.data) {
      setToken(response.data.token);
      setStoredUser(response.data.user);
    }

    return response;
  },

  async signIn(email: string, password: string) {
    const response = await railsApi.post<{
      message: string;
      user: User;
      token: string;
    }>('/api/v1/auth/sign_in', {
      user: { email, password },
    });

    if (response.data) {
      setToken(response.data.token);
      setStoredUser(response.data.user);
    }

    return response;
  },

  async signOut() {
    const response = await railsApi.delete<{ message: string }>('/api/v1/auth/sign_out');
    clearToken();
    return response;
  },

  async getCurrentUser() {
    // First check if we have a cached user
    const cachedUser = getStoredUser();

    // Verify with server if we have a token
    const token = getToken();
    if (!token) {
      return { data: null };
    }

    const response = await railsApi.get<{ data: { attributes: User } }>('/api/v1/me');

    if (response.data) {
      const user = response.data.data.attributes;
      setStoredUser(user);
      return { data: user };
    }

    // If request fails, clear token and return cached user or null
    if (response.error) {
      clearToken();
    }

    return { data: cachedUser };
  },

  async updateCurrentUser(updates: Partial<User>) {
    const response = await railsApi.patch<{ data: { attributes: User } }>('/api/v1/me', {
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

    if (response.data) {
      setStoredUser(response.data.data.attributes);
    }

    return response;
  },

  isAuthenticated(): boolean {
    return !!getToken();
  },
};
