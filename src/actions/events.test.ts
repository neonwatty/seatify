import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createEvent, updateEvent, deleteEvent } from './events';

// Mock the Rails server client
vi.mock('@/lib/rails/server', () => ({
  serverRailsApi: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
  isAuthenticated: vi.fn(),
}));

// Mock next/cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

import { serverRailsApi, isAuthenticated } from '@/lib/rails/server';
import { revalidatePath } from 'next/cache';

const mockedIsAuthenticated = vi.mocked(isAuthenticated);
const mockedServerRailsApi = vi.mocked(serverRailsApi);
const mockedRevalidatePath = vi.mocked(revalidatePath);

// Mock event data from Rails API
const mockEventResponse = {
  data: {
    id: 'test-event-id',
    type: 'event',
    attributes: {
      id: 'test-event-id',
      name: 'My Wedding',
      eventType: 'wedding',
      date: null,
      venueName: null,
      venueAddress: null,
      guestCapacityLimit: null,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
  },
};

describe('Event Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createEvent', () => {
    it('should create an event successfully', async () => {
      mockedIsAuthenticated.mockResolvedValue(true);
      mockedServerRailsApi.post.mockResolvedValue({ data: mockEventResponse });

      const result = await createEvent('My Wedding', 'wedding');

      expect(result.data).toEqual(mockEventResponse.data.attributes);
      expect(result.error).toBeUndefined();
      expect(mockedServerRailsApi.post).toHaveBeenCalledWith('/api/v1/events', {
        event: {
          name: 'My Wedding',
          event_type: 'wedding',
        },
      });
      expect(mockedRevalidatePath).toHaveBeenCalledWith('/dashboard');
    });

    it('should return error when not authenticated', async () => {
      mockedIsAuthenticated.mockResolvedValue(false);

      const result = await createEvent('My Wedding', 'wedding');

      expect(result.error).toBe('Not authenticated');
      expect(result.data).toBeUndefined();
      expect(mockedServerRailsApi.post).not.toHaveBeenCalled();
    });

    it('should return error on API failure', async () => {
      mockedIsAuthenticated.mockResolvedValue(true);
      mockedServerRailsApi.post.mockResolvedValue({ error: 'Database error' });

      const result = await createEvent('My Wedding', 'wedding');

      expect(result.error).toBe('Database error');
    });

    it('should trim event name', async () => {
      mockedIsAuthenticated.mockResolvedValue(true);
      mockedServerRailsApi.post.mockResolvedValue({ data: mockEventResponse });

      await createEvent('  My Wedding  ', 'wedding');

      expect(mockedServerRailsApi.post).toHaveBeenCalledWith('/api/v1/events', {
        event: {
          name: 'My Wedding',
          event_type: 'wedding',
        },
      });
    });
  });

  describe('updateEvent', () => {
    it('should update an event successfully', async () => {
      const updatedEventResponse = {
        data: {
          ...mockEventResponse.data,
          attributes: {
            ...mockEventResponse.data.attributes,
            name: 'Updated Event',
          },
        },
      };
      mockedIsAuthenticated.mockResolvedValue(true);
      mockedServerRailsApi.patch.mockResolvedValue({ data: updatedEventResponse });

      const result = await updateEvent('test-event-id', { name: 'Updated Event' });

      expect(result.data).toEqual(updatedEventResponse.data.attributes);
      expect(result.error).toBeUndefined();
      expect(mockedServerRailsApi.patch).toHaveBeenCalledWith(
        '/api/v1/events/test-event-id',
        expect.objectContaining({
          event: expect.objectContaining({ name: 'Updated Event' }),
        })
      );
      expect(mockedRevalidatePath).toHaveBeenCalledWith('/dashboard');
    });

    it('should return error when not authenticated', async () => {
      mockedIsAuthenticated.mockResolvedValue(false);

      const result = await updateEvent('test-event-id', { name: 'Updated Event' });

      expect(result.error).toBe('Not authenticated');
      expect(mockedServerRailsApi.patch).not.toHaveBeenCalled();
    });

    it('should handle partial updates', async () => {
      const updatedEventResponse = {
        data: {
          ...mockEventResponse.data,
          attributes: {
            ...mockEventResponse.data.attributes,
            date: '2026-12-25',
          },
        },
      };
      mockedIsAuthenticated.mockResolvedValue(true);
      mockedServerRailsApi.patch.mockResolvedValue({ data: updatedEventResponse });

      const result = await updateEvent('test-event-id', { date: '2026-12-25' });

      expect(result.data?.date).toBe('2026-12-25');
    });

    it('should return error on API failure', async () => {
      mockedIsAuthenticated.mockResolvedValue(true);
      mockedServerRailsApi.patch.mockResolvedValue({ error: 'Update failed' });

      const result = await updateEvent('test-event-id', { name: 'Updated Event' });

      expect(result.error).toBe('Update failed');
    });
  });

  describe('deleteEvent', () => {
    it('should delete an event successfully', async () => {
      mockedIsAuthenticated.mockResolvedValue(true);
      mockedServerRailsApi.delete.mockResolvedValue({ data: { message: 'Deleted' } });

      const result = await deleteEvent('test-event-id');

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(mockedServerRailsApi.delete).toHaveBeenCalledWith('/api/v1/events/test-event-id');
      expect(mockedRevalidatePath).toHaveBeenCalledWith('/dashboard');
    });

    it('should return error when not authenticated', async () => {
      mockedIsAuthenticated.mockResolvedValue(false);

      const result = await deleteEvent('test-event-id');

      expect(result.error).toBe('Not authenticated');
      expect(result.success).toBeUndefined();
      expect(mockedServerRailsApi.delete).not.toHaveBeenCalled();
    });

    it('should return error on API failure', async () => {
      mockedIsAuthenticated.mockResolvedValue(true);
      mockedServerRailsApi.delete.mockResolvedValue({ error: 'Foreign key constraint' });

      const result = await deleteEvent('test-event-id');

      expect(result.error).toBe('Foreign key constraint');
    });
  });
});
