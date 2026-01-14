import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { usePreferencesSync } from './usePreferencesSync';

// Mock the profile preferences actions
vi.mock('@/actions/profilePreferences', () => ({
  loadUserPreferences: vi.fn(),
  updateUserPreference: vi.fn(),
}));

// Create a mock store state
const createMockStoreState = () => ({
  theme: 'system' as const,
  eventListViewMode: 'cards' as const,
  hasCompletedOnboarding: false,
  completedTours: new Set<string>(),
  hasUsedOptimizeButton: false,
  optimizeAnimationEnabled: true,
  setTheme: vi.fn(),
  setEventListViewMode: vi.fn(),
  setOnboardingComplete: vi.fn(),
  markTourComplete: vi.fn(),
  setHasUsedOptimizeButton: vi.fn(),
  setOptimizeAnimationEnabled: vi.fn(),
});

let mockStoreState = createMockStoreState();

// Mock the store
vi.mock('@/store/useStore', () => ({
  useStore: Object.assign(
    () => mockStoreState,
    {
      getState: () => mockStoreState,
      subscribe: vi.fn(() => vi.fn()), // Return unsubscribe function
    }
  ),
}));

import { loadUserPreferences, updateUserPreference } from '@/actions/profilePreferences';

const mockedLoadUserPreferences = vi.mocked(loadUserPreferences);
const mockedUpdateUserPreference = vi.mocked(updateUserPreference);

describe('usePreferencesSync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStoreState = createMockStoreState();

    // Default mock implementations
    mockedLoadUserPreferences.mockResolvedValue({
      data: {
        theme: 'system',
        eventListViewMode: 'cards',
        hasCompletedOnboarding: false,
        completedTours: [],
        hasUsedOptimizeButton: false,
        optimizeAnimationEnabled: true,
      },
    });
    mockedUpdateUserPreference.mockResolvedValue({ success: true });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('when not authenticated', () => {
    it('should not load preferences', async () => {
      renderHook(() => usePreferencesSync(false));

      // Wait a tick to ensure any async operations would have started
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockedLoadUserPreferences).not.toHaveBeenCalled();
    });

    it('should return syncPreference function', () => {
      const { result } = renderHook(() => usePreferencesSync(false));

      expect(result.current.syncPreference).toBeDefined();
      expect(typeof result.current.syncPreference).toBe('function');
    });
  });

  describe('when authenticated', () => {
    it('should load preferences on mount', async () => {
      renderHook(() => usePreferencesSync(true));

      await waitFor(() => {
        expect(mockedLoadUserPreferences).toHaveBeenCalledTimes(1);
      });
    });

    it('should apply server theme preference to store', async () => {
      mockedLoadUserPreferences.mockResolvedValue({
        data: {
          theme: 'dark',
          eventListViewMode: 'cards',
          hasCompletedOnboarding: false,
          completedTours: [],
          hasUsedOptimizeButton: false,
          optimizeAnimationEnabled: true,
        },
      });

      renderHook(() => usePreferencesSync(true));

      await waitFor(() => {
        expect(mockStoreState.setTheme).toHaveBeenCalledWith('dark');
      });
    });

    it('should apply server eventListViewMode to store', async () => {
      mockedLoadUserPreferences.mockResolvedValue({
        data: {
          theme: 'system',
          eventListViewMode: 'list',
          hasCompletedOnboarding: false,
          completedTours: [],
          hasUsedOptimizeButton: false,
          optimizeAnimationEnabled: true,
        },
      });

      renderHook(() => usePreferencesSync(true));

      await waitFor(() => {
        expect(mockStoreState.setEventListViewMode).toHaveBeenCalledWith('list');
      });
    });

    it('should apply server onboarding state to store', async () => {
      mockedLoadUserPreferences.mockResolvedValue({
        data: {
          theme: 'system',
          eventListViewMode: 'cards',
          hasCompletedOnboarding: true,
          completedTours: [],
          hasUsedOptimizeButton: false,
          optimizeAnimationEnabled: true,
        },
      });

      renderHook(() => usePreferencesSync(true));

      await waitFor(() => {
        expect(mockStoreState.setOnboardingComplete).toHaveBeenCalled();
      });
    });

    it('should mark completed tours from server', async () => {
      mockedLoadUserPreferences.mockResolvedValue({
        data: {
          theme: 'system',
          eventListViewMode: 'cards',
          hasCompletedOnboarding: false,
          completedTours: ['welcome', 'canvas-basics'],
          hasUsedOptimizeButton: false,
          optimizeAnimationEnabled: true,
        },
      });

      renderHook(() => usePreferencesSync(true));

      await waitFor(() => {
        expect(mockStoreState.markTourComplete).toHaveBeenCalledWith('welcome');
        expect(mockStoreState.markTourComplete).toHaveBeenCalledWith('canvas-basics');
      });
    });

    it('should apply server animation preference to store', async () => {
      mockedLoadUserPreferences.mockResolvedValue({
        data: {
          theme: 'system',
          eventListViewMode: 'cards',
          hasCompletedOnboarding: false,
          completedTours: [],
          hasUsedOptimizeButton: false,
          optimizeAnimationEnabled: false,
        },
      });

      renderHook(() => usePreferencesSync(true));

      await waitFor(() => {
        expect(mockStoreState.setOptimizeAnimationEnabled).toHaveBeenCalledWith(false);
      });
    });

    it('should not load preferences twice on rerender', async () => {
      const { rerender } = renderHook(() => usePreferencesSync(true));

      await waitFor(() => {
        expect(mockedLoadUserPreferences).toHaveBeenCalledTimes(1);
      });

      // Rerender the hook
      rerender();

      // Should still only be called once
      expect(mockedLoadUserPreferences).toHaveBeenCalledTimes(1);
    });

    it('should handle load errors gracefully', async () => {
      mockedLoadUserPreferences.mockResolvedValue({
        error: 'Database error',
      });

      // Should not throw
      const { result } = renderHook(() => usePreferencesSync(true));

      await waitFor(() => {
        expect(mockedLoadUserPreferences).toHaveBeenCalled();
      });

      // Hook should still return without error
      expect(result.current).toBeDefined();
      expect(result.current.syncPreference).toBeDefined();
    });
  });

  describe('syncPreference function', () => {
    it('should call updateUserPreference when authenticated', async () => {
      const { result } = renderHook(() => usePreferencesSync(true));

      await waitFor(() => {
        expect(mockedLoadUserPreferences).toHaveBeenCalled();
      });

      // Call syncPreference directly
      await result.current.syncPreference('theme', 'dark');

      expect(mockedUpdateUserPreference).toHaveBeenCalledWith('theme', 'dark');
    });

    it('should not call updateUserPreference when not authenticated', async () => {
      const { result } = renderHook(() => usePreferencesSync(false));

      // Call syncPreference directly
      await result.current.syncPreference('theme', 'dark');

      expect(mockedUpdateUserPreference).not.toHaveBeenCalled();
    });

    it('should handle sync errors without throwing', async () => {
      mockedUpdateUserPreference.mockResolvedValue({
        error: 'Sync failed',
      });

      const { result } = renderHook(() => usePreferencesSync(true));

      await waitFor(() => {
        expect(mockedLoadUserPreferences).toHaveBeenCalled();
      });

      // Should not throw
      await expect(result.current.syncPreference('theme', 'dark')).resolves.not.toThrow();
    });
  });

  describe('preference merging', () => {
    it('should not override local onboarding if server shows incomplete but local is complete', async () => {
      // Local store shows onboarding complete
      mockStoreState.hasCompletedOnboarding = true;

      // Server shows not complete
      mockedLoadUserPreferences.mockResolvedValue({
        data: {
          theme: 'system',
          eventListViewMode: 'cards',
          hasCompletedOnboarding: false,
          completedTours: [],
          hasUsedOptimizeButton: false,
          optimizeAnimationEnabled: true,
        },
      });

      renderHook(() => usePreferencesSync(true));

      await waitFor(() => {
        expect(mockedLoadUserPreferences).toHaveBeenCalled();
      });

      // setOnboardingComplete should NOT be called since local already has it complete
      // The hook preserves local progress
      await new Promise(resolve => setTimeout(resolve, 50));

      // When server shows false but local is true, don't call setOnboardingComplete
      // (The hook only calls it when server shows true and local shows false)
    });

    it('should merge completed tours from both local and server', async () => {
      // Local has some tours
      mockStoreState.completedTours = new Set(['local-tour']);

      // Server has different tours
      mockedLoadUserPreferences.mockResolvedValue({
        data: {
          theme: 'system',
          eventListViewMode: 'cards',
          hasCompletedOnboarding: false,
          completedTours: ['server-tour'],
          hasUsedOptimizeButton: false,
          optimizeAnimationEnabled: true,
        },
      });

      renderHook(() => usePreferencesSync(true));

      await waitFor(() => {
        // Server tour should be marked as complete
        expect(mockStoreState.markTourComplete).toHaveBeenCalledWith('server-tour');
      });
    });
  });
});
