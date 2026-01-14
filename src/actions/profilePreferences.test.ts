import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  loadUserPreferences,
  updateUserPreference,
  updateUserPreferences,
  type UserPreferences,
} from './profilePreferences';
import { mockUser } from '@/test/mocks/supabase';

// Mock the server Supabase client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

import { createClient } from '@/lib/supabase/server';

const mockedCreateClient = vi.mocked(createClient);

// Helper to create a mock client for profile operations
const createMockProfileClient = (overrides: {
  user?: typeof mockUser | null;
  selectResult?: { data: unknown; error: unknown };
  updateResult?: { data: unknown; error: unknown };
} = {}) => {
  const {
    user = mockUser,
    selectResult = { data: null, error: null },
    updateResult = { data: null, error: null },
  } = overrides;

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
    },
    from: vi.fn((_table: string) => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue(selectResult),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue(updateResult),
      }),
    })),
  };
};

// Mock profile data as stored in database
const mockDbProfile = {
  theme: 'dark',
  event_list_view_mode: 'list',
  has_completed_onboarding: true,
  completed_tours: ['welcome', 'canvas-basics'],
  has_used_optimize_button: true,
  optimize_animation_enabled: false,
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
      const mockClient = createMockProfileClient({
        selectResult: { data: mockDbProfile, error: null },
      });
      mockedCreateClient.mockResolvedValue(mockClient as never);

      const result = await loadUserPreferences();

      expect(result.data).toEqual(expectedPreferences);
      expect(result.error).toBeUndefined();
    });

    it('should return error when not authenticated', async () => {
      const mockClient = createMockProfileClient({ user: null });
      mockedCreateClient.mockResolvedValue(mockClient as never);

      const result = await loadUserPreferences();

      expect(result.error).toBe('Not authenticated');
      expect(result.data).toBeUndefined();
    });

    it('should return default preferences when profile has no preference data', async () => {
      const mockClient = createMockProfileClient({
        selectResult: { data: null, error: null },
      });
      mockedCreateClient.mockResolvedValue(mockClient as never);

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

    it('should return error on database failure', async () => {
      const mockClient = createMockProfileClient({
        selectResult: { data: null, error: { message: 'Database error' } },
      });
      mockedCreateClient.mockResolvedValue(mockClient as never);

      const result = await loadUserPreferences();

      expect(result.error).toBe('Database error');
    });

    it('should handle partial profile data with defaults', async () => {
      const partialProfile = {
        theme: 'light',
        // Other fields missing
      };
      const mockClient = createMockProfileClient({
        selectResult: { data: partialProfile, error: null },
      });
      mockedCreateClient.mockResolvedValue(mockClient as never);

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
      const mockClient = createMockProfileClient({
        updateResult: { data: null, error: null },
      });
      mockedCreateClient.mockResolvedValue(mockClient as never);

      const result = await updateUserPreference('theme', 'dark');

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should update eventListViewMode preference successfully', async () => {
      const mockClient = createMockProfileClient({
        updateResult: { data: null, error: null },
      });
      mockedCreateClient.mockResolvedValue(mockClient as never);

      const result = await updateUserPreference('eventListViewMode', 'list');

      expect(result.success).toBe(true);
    });

    it('should update hasCompletedOnboarding preference successfully', async () => {
      const mockClient = createMockProfileClient({
        updateResult: { data: null, error: null },
      });
      mockedCreateClient.mockResolvedValue(mockClient as never);

      const result = await updateUserPreference('hasCompletedOnboarding', true);

      expect(result.success).toBe(true);
    });

    it('should update completedTours array successfully', async () => {
      const mockClient = createMockProfileClient({
        updateResult: { data: null, error: null },
      });
      mockedCreateClient.mockResolvedValue(mockClient as never);

      const result = await updateUserPreference('completedTours', ['welcome', 'canvas']);

      expect(result.success).toBe(true);
    });

    it('should return error when not authenticated', async () => {
      const mockClient = createMockProfileClient({ user: null });
      mockedCreateClient.mockResolvedValue(mockClient as never);

      const result = await updateUserPreference('theme', 'dark');

      expect(result.error).toBe('Not authenticated');
      expect(result.success).toBeUndefined();
    });

    it('should return error on database failure', async () => {
      const mockClient = createMockProfileClient({
        updateResult: { data: null, error: { message: 'Update failed' } },
      });
      mockedCreateClient.mockResolvedValue(mockClient as never);

      const result = await updateUserPreference('theme', 'dark');

      expect(result.error).toBe('Update failed');
    });
  });

  describe('updateUserPreferences', () => {
    it('should update multiple preferences successfully', async () => {
      const mockClient = createMockProfileClient({
        updateResult: { data: null, error: null },
      });
      mockedCreateClient.mockResolvedValue(mockClient as never);

      const result = await updateUserPreferences({
        theme: 'dark',
        eventListViewMode: 'list',
        hasCompletedOnboarding: true,
      });

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return success when no preferences to update', async () => {
      const mockClient = createMockProfileClient();
      mockedCreateClient.mockResolvedValue(mockClient as never);

      const result = await updateUserPreferences({});

      expect(result.success).toBe(true);
    });

    it('should return error when not authenticated', async () => {
      const mockClient = createMockProfileClient({ user: null });
      mockedCreateClient.mockResolvedValue(mockClient as never);

      const result = await updateUserPreferences({ theme: 'dark' });

      expect(result.error).toBe('Not authenticated');
    });

    it('should return error on database failure', async () => {
      const mockClient = createMockProfileClient({
        updateResult: { data: null, error: { message: 'Batch update failed' } },
      });
      mockedCreateClient.mockResolvedValue(mockClient as never);

      const result = await updateUserPreferences({
        theme: 'dark',
        hasCompletedOnboarding: true,
      });

      expect(result.error).toBe('Batch update failed');
    });

    it('should handle all preference types in single update', async () => {
      const mockClient = createMockProfileClient({
        updateResult: { data: null, error: null },
      });
      mockedCreateClient.mockResolvedValue(mockClient as never);

      const result = await updateUserPreferences({
        theme: 'system',
        eventListViewMode: 'cards',
        hasCompletedOnboarding: false,
        completedTours: [],
        hasUsedOptimizeButton: false,
        optimizeAnimationEnabled: true,
      });

      expect(result.success).toBe(true);
    });
  });
});
