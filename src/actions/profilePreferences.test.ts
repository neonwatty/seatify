import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  loadUserPreferences,
  updateUserPreference,
  updateUserPreferences,
} from './profilePreferences';
import type { UserPreferences } from './types';

// Mock the Rails server client
vi.mock('@/lib/rails/server', () => ({
  serverRailsApi: {
    get: vi.fn(),
    patch: vi.fn(),
  },
  isAuthenticated: vi.fn(),
}));

import { serverRailsApi, isAuthenticated } from '@/lib/rails/server';

const mockedIsAuthenticated = vi.mocked(isAuthenticated);
const mockedServerRailsApi = vi.mocked(serverRailsApi);

// Mock API response for user preferences
const mockUserResponse = {
  data: {
    attributes: {
      theme: 'dark',
      eventListViewMode: 'list',
      hasCompletedOnboarding: true,
      completedTours: ['welcome', 'canvas-basics'],
      hasUsedOptimizeButton: true,
      optimizeAnimationEnabled: false,
    },
  },
};

// Expected transformed preferences
const expectedPreferences: UserPreferences = {
  theme: 'dark',
  eventListViewMode: 'list',
  hasCompletedOnboarding: true,
  completedTours: ['welcome', 'canvas-basics'],
  hasUsedOptimizeButton: true,
  optimizeAnimationEnabled: false,
};

describe('Profile Preferences Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('loadUserPreferences', () => {
    it('should load preferences successfully', async () => {
      mockedIsAuthenticated.mockResolvedValue(true);
      mockedServerRailsApi.get.mockResolvedValue({ data: mockUserResponse });

      const result = await loadUserPreferences();

      expect(result.data).toEqual(expectedPreferences);
      expect(result.error).toBeUndefined();
      expect(mockedServerRailsApi.get).toHaveBeenCalledWith('/api/v1/me');
    });

    it('should return error when not authenticated', async () => {
      mockedIsAuthenticated.mockResolvedValue(false);

      const result = await loadUserPreferences();

      expect(result.error).toBe('Not authenticated');
      expect(result.data).toBeUndefined();
      expect(mockedServerRailsApi.get).not.toHaveBeenCalled();
    });

    it('should return default preferences when API returns no data', async () => {
      mockedIsAuthenticated.mockResolvedValue(true);
      mockedServerRailsApi.get.mockResolvedValue({ data: undefined });

      const result = await loadUserPreferences();

      expect(result.data).toEqual({
        theme: 'system',
        eventListViewMode: 'cards',
        hasCompletedOnboarding: false,
        completedTours: [],
        hasUsedOptimizeButton: false,
        optimizeAnimationEnabled: true,
      });
    });

    it('should return error on API failure', async () => {
      mockedIsAuthenticated.mockResolvedValue(true);
      mockedServerRailsApi.get.mockResolvedValue({ error: 'API error' });

      const result = await loadUserPreferences();

      expect(result.error).toBe('API error');
    });

    it('should handle partial profile data with defaults', async () => {
      mockedIsAuthenticated.mockResolvedValue(true);
      mockedServerRailsApi.get.mockResolvedValue({
        data: {
          data: {
            attributes: {
              theme: 'light',
              // Other fields missing/undefined
            },
          },
        },
      });

      const result = await loadUserPreferences();

      expect(result.data).toEqual({
        theme: 'light',
        eventListViewMode: 'cards', // default
        hasCompletedOnboarding: false, // default
        completedTours: [], // default
        hasUsedOptimizeButton: false, // default
        optimizeAnimationEnabled: true, // default
      });
    });
  });

  describe('updateUserPreference', () => {
    it('should update theme preference successfully', async () => {
      mockedIsAuthenticated.mockResolvedValue(true);
      mockedServerRailsApi.patch.mockResolvedValue({
        data: { data: { attributes: {} } },
      });

      const result = await updateUserPreference('theme', 'dark');

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(mockedServerRailsApi.patch).toHaveBeenCalledWith('/api/v1/me', {
        user: { theme: 'dark' },
      });
    });

    it('should update eventListViewMode preference successfully', async () => {
      mockedIsAuthenticated.mockResolvedValue(true);
      mockedServerRailsApi.patch.mockResolvedValue({
        data: { data: { attributes: {} } },
      });

      const result = await updateUserPreference('eventListViewMode', 'list');

      expect(result.success).toBe(true);
      expect(mockedServerRailsApi.patch).toHaveBeenCalledWith('/api/v1/me', {
        user: { event_list_view_mode: 'list' },
      });
    });

    it('should update hasCompletedOnboarding preference successfully', async () => {
      mockedIsAuthenticated.mockResolvedValue(true);
      mockedServerRailsApi.patch.mockResolvedValue({
        data: { data: { attributes: {} } },
      });

      const result = await updateUserPreference('hasCompletedOnboarding', true);

      expect(result.success).toBe(true);
      expect(mockedServerRailsApi.patch).toHaveBeenCalledWith('/api/v1/me', {
        user: { has_completed_onboarding: true },
      });
    });

    it('should update completedTours array successfully', async () => {
      mockedIsAuthenticated.mockResolvedValue(true);
      mockedServerRailsApi.patch.mockResolvedValue({
        data: { data: { attributes: {} } },
      });

      const result = await updateUserPreference('completedTours', ['welcome', 'canvas']);

      expect(result.success).toBe(true);
      expect(mockedServerRailsApi.patch).toHaveBeenCalledWith('/api/v1/me', {
        user: { completed_tours: ['welcome', 'canvas'] },
      });
    });

    it('should return error when not authenticated', async () => {
      mockedIsAuthenticated.mockResolvedValue(false);

      const result = await updateUserPreference('theme', 'dark');

      expect(result.error).toBe('Not authenticated');
      expect(result.success).toBeUndefined();
      expect(mockedServerRailsApi.patch).not.toHaveBeenCalled();
    });

    it('should return error on API failure', async () => {
      mockedIsAuthenticated.mockResolvedValue(true);
      mockedServerRailsApi.patch.mockResolvedValue({ error: 'Update failed' });

      const result = await updateUserPreference('theme', 'dark');

      expect(result.error).toBe('Update failed');
    });
  });

  describe('updateUserPreferences', () => {
    it('should update multiple preferences successfully', async () => {
      mockedIsAuthenticated.mockResolvedValue(true);
      mockedServerRailsApi.patch.mockResolvedValue({
        data: { data: { attributes: {} } },
      });

      const result = await updateUserPreferences({
        theme: 'dark',
        eventListViewMode: 'list',
        hasCompletedOnboarding: true,
      });

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(mockedServerRailsApi.patch).toHaveBeenCalledWith('/api/v1/me', {
        user: {
          theme: 'dark',
          event_list_view_mode: 'list',
          has_completed_onboarding: true,
        },
      });
    });

    it('should return success when no preferences to update', async () => {
      mockedIsAuthenticated.mockResolvedValue(true);

      const result = await updateUserPreferences({});

      expect(result.success).toBe(true);
      expect(mockedServerRailsApi.patch).not.toHaveBeenCalled();
    });

    it('should return error when not authenticated', async () => {
      mockedIsAuthenticated.mockResolvedValue(false);

      const result = await updateUserPreferences({ theme: 'dark' });

      expect(result.error).toBe('Not authenticated');
      expect(mockedServerRailsApi.patch).not.toHaveBeenCalled();
    });

    it('should return error on API failure', async () => {
      mockedIsAuthenticated.mockResolvedValue(true);
      mockedServerRailsApi.patch.mockResolvedValue({ error: 'Batch update failed' });

      const result = await updateUserPreferences({
        theme: 'dark',
        hasCompletedOnboarding: true,
      });

      expect(result.error).toBe('Batch update failed');
    });

    it('should handle all preference types in single update', async () => {
      mockedIsAuthenticated.mockResolvedValue(true);
      mockedServerRailsApi.patch.mockResolvedValue({
        data: { data: { attributes: {} } },
      });

      const result = await updateUserPreferences({
        theme: 'system',
        eventListViewMode: 'cards',
        hasCompletedOnboarding: false,
        completedTours: [],
        hasUsedOptimizeButton: false,
        optimizeAnimationEnabled: true,
      });

      expect(result.success).toBe(true);
      expect(mockedServerRailsApi.patch).toHaveBeenCalledWith('/api/v1/me', {
        user: {
          theme: 'system',
          event_list_view_mode: 'cards',
          has_completed_onboarding: false,
          completed_tours: [],
          has_used_optimize_button: false,
          optimize_animation_enabled: true,
        },
      });
    });
  });
});
