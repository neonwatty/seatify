import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  insertVenueElement,
  insertVenueElements,
  updateVenueElement,
  updateVenueElements,
  deleteVenueElement,
  deleteVenueElements,
} from './venueElements';

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

const mockVenueElementResponse = {
  data: {
    id: 'test-element-id',
    type: 'venue_element',
    attributes: {
      id: 'test-element-id',
      type: 'stage',
      label: 'Main Stage',
      x: 100,
      y: 100,
      width: 200,
      height: 100,
      rotation: 0,
    },
  },
};

describe('Venue Element Server Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('insertVenueElement', () => {
    it('should insert a venue element successfully', async () => {
      mockedIsAuthenticated.mockResolvedValue(true);
      mockedServerRailsApi.post.mockResolvedValue({ data: mockVenueElementResponse });

      const result = await insertVenueElement('test-event-id', {
        type: 'stage',
        label: 'Main Stage',
        x: 100,
        y: 100,
        width: 200,
        height: 100,
      });

      expect(result.error).toBeUndefined();
      expect(result.data).toBeDefined();
      expect(mockedServerRailsApi.post).toHaveBeenCalledWith(
        '/api/v1/events/test-event-id/venue_elements',
        expect.objectContaining({
          venue_element: expect.objectContaining({
            element_type: 'stage',
            label: 'Main Stage',
            x: 100,
            y: 100,
            width: 200,
            height: 100,
          }),
        })
      );
      expect(mockedRevalidatePath).toHaveBeenCalledWith('/dashboard/events/test-event-id/canvas');
    });

    it('should return error when not authenticated', async () => {
      mockedIsAuthenticated.mockResolvedValue(false);

      const result = await insertVenueElement('test-event-id', {
        type: 'stage',
        label: 'Main Stage',
        x: 100,
        y: 100,
        width: 200,
        height: 100,
      });

      expect(result.error).toBe('Not authenticated');
      expect(mockedServerRailsApi.post).not.toHaveBeenCalled();
    });

    it('should handle insertion failure', async () => {
      mockedIsAuthenticated.mockResolvedValue(true);
      mockedServerRailsApi.post.mockResolvedValue({ error: 'Database error' });

      const result = await insertVenueElement('test-event-id', {
        type: 'stage',
        label: 'Main Stage',
        x: 100,
        y: 100,
        width: 200,
        height: 100,
      });

      expect(result.error).toBe('Database error');
    });

    it('should use default rotation when not provided', async () => {
      mockedIsAuthenticated.mockResolvedValue(true);
      mockedServerRailsApi.post.mockResolvedValue({ data: mockVenueElementResponse });

      await insertVenueElement('test-event-id', {
        type: 'bar',
        label: 'Bar Area',
        x: 200,
        y: 200,
        width: 150,
        height: 50,
      });

      expect(mockedServerRailsApi.post).toHaveBeenCalledWith(
        '/api/v1/events/test-event-id/venue_elements',
        expect.objectContaining({
          venue_element: expect.objectContaining({
            rotation: 0,
          }),
        })
      );
    });

    it('should handle custom rotation value', async () => {
      mockedIsAuthenticated.mockResolvedValue(true);
      mockedServerRailsApi.post.mockResolvedValue({ data: mockVenueElementResponse });

      await insertVenueElement('test-event-id', {
        type: 'dance-floor',
        label: 'Dance Floor',
        x: 300,
        y: 300,
        width: 250,
        height: 250,
        rotation: 45,
      });

      expect(mockedServerRailsApi.post).toHaveBeenCalledWith(
        '/api/v1/events/test-event-id/venue_elements',
        expect.objectContaining({
          venue_element: expect.objectContaining({
            rotation: 45,
          }),
        })
      );
    });
  });

  describe('insertVenueElements', () => {
    it('should insert multiple venue elements successfully', async () => {
      mockedIsAuthenticated.mockResolvedValue(true);
      mockedServerRailsApi.post.mockResolvedValue({ data: mockVenueElementResponse });

      const result = await insertVenueElements('test-event-id', [
        { type: 'stage', label: 'Stage', x: 100, y: 100, width: 200, height: 100 },
        { type: 'bar', label: 'Bar', x: 300, y: 100, width: 100, height: 50 },
      ]);

      expect(result.error).toBeUndefined();
      expect(result.data).toBeDefined();
      expect(result.count).toBe(2);
      expect(mockedServerRailsApi.post).toHaveBeenCalledTimes(2);
    });

    it('should return error when not authenticated', async () => {
      mockedIsAuthenticated.mockResolvedValue(false);

      const result = await insertVenueElements('test-event-id', [
        { type: 'stage', label: 'Stage', x: 100, y: 100, width: 200, height: 100 },
      ]);

      expect(result.error).toBe('Not authenticated');
      expect(mockedServerRailsApi.post).not.toHaveBeenCalled();
    });

    it('should handle batch insertion failure', async () => {
      mockedIsAuthenticated.mockResolvedValue(true);
      mockedServerRailsApi.post.mockResolvedValue({ error: 'Batch insert error' });

      const result = await insertVenueElements('test-event-id', [
        { type: 'stage', label: 'Stage', x: 100, y: 100, width: 200, height: 100 },
      ]);

      expect(result.error).toContain('Failed to insert');
    });
  });

  describe('updateVenueElement', () => {
    it('should update a venue element successfully', async () => {
      mockedIsAuthenticated.mockResolvedValue(true);
      mockedServerRailsApi.patch.mockResolvedValue({ data: mockVenueElementResponse });

      const result = await updateVenueElement('test-event-id', {
        id: 'test-element-id',
        type: 'stage',
        label: 'Updated Stage',
        x: 150,
        y: 150,
        width: 250,
        height: 120,
      });

      expect(result.error).toBeUndefined();
      expect(result.data).toBeDefined();
      expect(mockedServerRailsApi.patch).toHaveBeenCalledWith(
        '/api/v1/events/test-event-id/venue_elements/test-element-id',
        expect.objectContaining({
          venue_element: expect.objectContaining({
            label: 'Updated Stage',
          }),
        })
      );
      expect(mockedRevalidatePath).toHaveBeenCalledWith('/dashboard/events/test-event-id/canvas');
    });

    it('should return error when not authenticated', async () => {
      mockedIsAuthenticated.mockResolvedValue(false);

      const result = await updateVenueElement('test-event-id', {
        id: 'test-element-id',
        type: 'stage',
        label: 'Stage',
        x: 100,
        y: 100,
        width: 200,
        height: 100,
      });

      expect(result.error).toBe('Not authenticated');
      expect(mockedServerRailsApi.patch).not.toHaveBeenCalled();
    });

    it('should return error when element ID not provided', async () => {
      mockedIsAuthenticated.mockResolvedValue(true);

      const result = await updateVenueElement('test-event-id', {
        type: 'stage',
        label: 'Stage',
        x: 100,
        y: 100,
        width: 200,
        height: 100,
      });

      expect(result.error).toBe('Venue element ID required for update');
      expect(mockedServerRailsApi.patch).not.toHaveBeenCalled();
    });

    it('should handle update failure', async () => {
      mockedIsAuthenticated.mockResolvedValue(true);
      mockedServerRailsApi.patch.mockResolvedValue({ error: 'Update failed' });

      const result = await updateVenueElement('test-event-id', {
        id: 'test-element-id',
        type: 'stage',
        label: 'Stage',
        x: 100,
        y: 100,
        width: 200,
        height: 100,
      });

      expect(result.error).toBe('Update failed');
    });
  });

  describe('updateVenueElements', () => {
    it('should update multiple venue elements successfully', async () => {
      mockedIsAuthenticated.mockResolvedValue(true);
      mockedServerRailsApi.patch.mockResolvedValue({ data: mockVenueElementResponse });

      const result = await updateVenueElements('test-event-id', [
        { id: 'element-1', type: 'stage', label: 'Stage', x: 100, y: 100, width: 200, height: 100 },
        { id: 'element-2', type: 'bar', label: 'Bar', x: 300, y: 100, width: 100, height: 50 },
      ]);

      expect(result.error).toBeUndefined();
      expect(result.count).toBe(2);
      expect(mockedServerRailsApi.patch).toHaveBeenCalledTimes(2);
    });

    it('should return error when not authenticated', async () => {
      mockedIsAuthenticated.mockResolvedValue(false);

      const result = await updateVenueElements('test-event-id', [
        { id: 'element-1', type: 'stage', label: 'Stage', x: 100, y: 100, width: 200, height: 100 },
      ]);

      expect(result.error).toBe('Not authenticated');
      expect(mockedServerRailsApi.patch).not.toHaveBeenCalled();
    });

    it('should report error when element missing ID', async () => {
      mockedIsAuthenticated.mockResolvedValue(true);

      const result = await updateVenueElements('test-event-id', [
        { type: 'stage', label: 'Stage', x: 100, y: 100, width: 200, height: 100 }, // Missing ID
      ]);

      expect(result.error).toContain('Failed to update');
    });
  });

  describe('deleteVenueElement', () => {
    it('should delete a venue element successfully', async () => {
      mockedIsAuthenticated.mockResolvedValue(true);
      mockedServerRailsApi.delete.mockResolvedValue({ data: { message: 'Deleted' } });

      const result = await deleteVenueElement('test-event-id', 'test-element-id');

      expect(result.error).toBeUndefined();
      expect(result.success).toBe(true);
      expect(mockedServerRailsApi.delete).toHaveBeenCalledWith(
        '/api/v1/events/test-event-id/venue_elements/test-element-id'
      );
      expect(mockedRevalidatePath).toHaveBeenCalledWith('/dashboard/events/test-event-id/canvas');
    });

    it('should return error when not authenticated', async () => {
      mockedIsAuthenticated.mockResolvedValue(false);

      const result = await deleteVenueElement('test-event-id', 'test-element-id');

      expect(result.error).toBe('Not authenticated');
      expect(mockedServerRailsApi.delete).not.toHaveBeenCalled();
    });

    it('should handle deletion failure', async () => {
      mockedIsAuthenticated.mockResolvedValue(true);
      mockedServerRailsApi.delete.mockResolvedValue({ error: 'Delete failed' });

      const result = await deleteVenueElement('test-event-id', 'test-element-id');

      expect(result.error).toBe('Delete failed');
    });
  });

  describe('deleteVenueElements', () => {
    it('should delete multiple venue elements successfully', async () => {
      mockedIsAuthenticated.mockResolvedValue(true);
      mockedServerRailsApi.delete.mockResolvedValue({ data: { message: 'Deleted' } });

      const result = await deleteVenueElements('test-event-id', ['element-1', 'element-2']);

      expect(result.error).toBeUndefined();
      expect(result.success).toBe(true);
      expect(result.count).toBe(2);
      expect(mockedServerRailsApi.delete).toHaveBeenCalledTimes(2);
    });

    it('should return error when not authenticated', async () => {
      mockedIsAuthenticated.mockResolvedValue(false);

      const result = await deleteVenueElements('test-event-id', ['element-1']);

      expect(result.error).toBe('Not authenticated');
      expect(mockedServerRailsApi.delete).not.toHaveBeenCalled();
    });

    it('should handle bulk deletion failure', async () => {
      mockedIsAuthenticated.mockResolvedValue(true);
      mockedServerRailsApi.delete.mockResolvedValue({ error: 'Bulk delete failed' });

      const result = await deleteVenueElements('test-event-id', ['element-1', 'element-2']);

      expect(result.error).toContain('Failed to delete');
    });

    it('should return correct count for empty array', async () => {
      mockedIsAuthenticated.mockResolvedValue(true);

      const result = await deleteVenueElements('test-event-id', []);

      expect(result.error).toBeUndefined();
      expect(result.count).toBe(0);
    });
  });
});
