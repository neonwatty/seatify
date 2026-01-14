import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  insertVenueElement,
  insertVenueElements,
  updateVenueElement,
  updateVenueElements,
  deleteVenueElement,
  deleteVenueElements,
} from './venueElements';

// Mock the server Supabase client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

// Mock next/cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

const mockedCreateClient = vi.mocked(createClient);
const mockedRevalidatePath = vi.mocked(revalidatePath);

const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
};

const mockEvent = {
  id: 'test-event-id',
};

const mockVenueElement = {
  id: 'test-element-id',
  event_id: 'test-event-id',
  type: 'stage',
  label: 'Main Stage',
  x: 100,
  y: 100,
  width: 200,
  height: 100,
  rotation: 0,
};

// Helper to create a flexible mock Supabase client
const createVenueElementMockClient = (overrides: {
  user?: typeof mockUser | null;
  eventFound?: boolean;
  insertResult?: { data: unknown; error: unknown };
  insertMultipleResult?: { data: unknown[]; error: unknown };
  updateResult?: { data: unknown; error: unknown };
  deleteResult?: { error: unknown };
} = {}) => {
  const {
    user = mockUser,
    eventFound = true,
    insertResult = { data: mockVenueElement, error: null },
    insertMultipleResult: _insertMultipleResult = { data: [mockVenueElement], error: null },
    updateResult = { data: mockVenueElement, error: null },
    deleteResult = { error: null },
  } = overrides;

  const mockFrom = vi.fn((table: string) => {
    if (table === 'events') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: eventFound ? mockEvent : null,
                error: eventFound ? null : { message: 'Not found' },
              }),
            }),
          }),
        }),
      };
    }

    if (table === 'venue_elements') {
      return {
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(insertResult),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue(updateResult),
              }),
            }),
          }),
        }),
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue(deleteResult),
          }),
          in: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue(deleteResult),
          }),
        }),
      };
    }

    return {
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
  });

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
    },
    from: mockFrom,
  };
};

// Create a client specifically for batch operations
const createBatchMockClient = (overrides: {
  user?: typeof mockUser | null;
  eventFound?: boolean;
  insertBatchResult?: { data: unknown[]; error: unknown };
} = {}) => {
  const {
    user = mockUser,
    eventFound = true,
    insertBatchResult = { data: [mockVenueElement], error: null },
  } = overrides;

  const mockFrom = vi.fn((table: string) => {
    if (table === 'events') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: eventFound ? mockEvent : null,
                error: eventFound ? null : { message: 'Not found' },
              }),
            }),
          }),
        }),
      };
    }

    if (table === 'venue_elements') {
      return {
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue(insertBatchResult),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: mockVenueElement, error: null }),
              }),
            }),
          }),
        }),
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
          in: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        }),
      };
    }

    return {};
  });

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
    },
    from: mockFrom,
  };
};

describe('Venue Element Server Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('insertVenueElement', () => {
    it('should insert a venue element successfully', async () => {
      const mockClient = createVenueElementMockClient();
      mockedCreateClient.mockResolvedValue(mockClient as never);

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
      expect(mockedRevalidatePath).toHaveBeenCalledWith('/dashboard/events/test-event-id/canvas');
    });

    it('should return error when not authenticated', async () => {
      const mockClient = createVenueElementMockClient({ user: null });
      mockedCreateClient.mockResolvedValue(mockClient as never);

      const result = await insertVenueElement('test-event-id', {
        type: 'stage',
        label: 'Main Stage',
        x: 100,
        y: 100,
        width: 200,
        height: 100,
      });

      expect(result.error).toBe('Not authenticated');
    });

    it('should return error when event not found', async () => {
      const mockClient = createVenueElementMockClient({ eventFound: false });
      mockedCreateClient.mockResolvedValue(mockClient as never);

      const result = await insertVenueElement('nonexistent-event', {
        type: 'stage',
        label: 'Main Stage',
        x: 100,
        y: 100,
        width: 200,
        height: 100,
      });

      expect(result.error).toBe('Event not found or access denied');
    });

    it('should handle insertion failure', async () => {
      const mockClient = createVenueElementMockClient({
        insertResult: { data: null, error: { message: 'Database error' } },
      });
      mockedCreateClient.mockResolvedValue(mockClient as never);

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
      const mockClient = createVenueElementMockClient();
      mockedCreateClient.mockResolvedValue(mockClient as never);

      const result = await insertVenueElement('test-event-id', {
        type: 'bar',
        label: 'Bar Area',
        x: 200,
        y: 200,
        width: 150,
        height: 50,
      });

      expect(result.error).toBeUndefined();
      expect(result.data).toBeDefined();
    });

    it('should handle custom rotation value', async () => {
      const mockClient = createVenueElementMockClient();
      mockedCreateClient.mockResolvedValue(mockClient as never);

      const result = await insertVenueElement('test-event-id', {
        type: 'dance-floor',
        label: 'Dance Floor',
        x: 300,
        y: 300,
        width: 250,
        height: 250,
        rotation: 45,
      });

      expect(result.error).toBeUndefined();
      expect(result.data).toBeDefined();
    });
  });

  describe('insertVenueElements', () => {
    it('should insert multiple venue elements successfully', async () => {
      const mockClient = createBatchMockClient({
        insertBatchResult: { data: [mockVenueElement, { ...mockVenueElement, id: 'element-2' }], error: null },
      });
      mockedCreateClient.mockResolvedValue(mockClient as never);

      const result = await insertVenueElements('test-event-id', [
        { type: 'stage', label: 'Stage', x: 100, y: 100, width: 200, height: 100 },
        { type: 'bar', label: 'Bar', x: 300, y: 100, width: 100, height: 50 },
      ]);

      expect(result.error).toBeUndefined();
      expect(result.data).toBeDefined();
      expect(result.count).toBe(2);
      expect(mockedRevalidatePath).toHaveBeenCalledWith('/dashboard/events/test-event-id/canvas');
    });

    it('should return error when not authenticated', async () => {
      const mockClient = createBatchMockClient({ user: null });
      mockedCreateClient.mockResolvedValue(mockClient as never);

      const result = await insertVenueElements('test-event-id', [
        { type: 'stage', label: 'Stage', x: 100, y: 100, width: 200, height: 100 },
      ]);

      expect(result.error).toBe('Not authenticated');
    });

    it('should return error when event not found', async () => {
      const mockClient = createBatchMockClient({ eventFound: false });
      mockedCreateClient.mockResolvedValue(mockClient as never);

      const result = await insertVenueElements('test-event-id', []);

      expect(result.error).toBe('Event not found or access denied');
    });

    it('should handle batch insertion failure', async () => {
      const mockClient = createBatchMockClient({
        insertBatchResult: { data: [] as unknown[], error: { message: 'Batch insert error' } },
      });
      mockedCreateClient.mockResolvedValue(mockClient as never);

      const result = await insertVenueElements('test-event-id', [
        { type: 'stage', label: 'Stage', x: 100, y: 100, width: 200, height: 100 },
      ]);

      expect(result.error).toBe('Batch insert error');
    });
  });

  describe('updateVenueElement', () => {
    it('should update a venue element successfully', async () => {
      const mockClient = createVenueElementMockClient();
      mockedCreateClient.mockResolvedValue(mockClient as never);

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
      expect(mockedRevalidatePath).toHaveBeenCalledWith('/dashboard/events/test-event-id/canvas');
    });

    it('should return error when not authenticated', async () => {
      const mockClient = createVenueElementMockClient({ user: null });
      mockedCreateClient.mockResolvedValue(mockClient as never);

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
    });

    it('should return error when element ID not provided', async () => {
      const mockClient = createVenueElementMockClient();
      mockedCreateClient.mockResolvedValue(mockClient as never);

      const result = await updateVenueElement('test-event-id', {
        type: 'stage',
        label: 'Stage',
        x: 100,
        y: 100,
        width: 200,
        height: 100,
      });

      expect(result.error).toBe('Venue element ID required for update');
    });

    it('should return error when event not found', async () => {
      const mockClient = createVenueElementMockClient({ eventFound: false });
      mockedCreateClient.mockResolvedValue(mockClient as never);

      const result = await updateVenueElement('test-event-id', {
        id: 'test-element-id',
        type: 'stage',
        label: 'Stage',
        x: 100,
        y: 100,
        width: 200,
        height: 100,
      });

      expect(result.error).toBe('Event not found or access denied');
    });

    it('should handle update failure', async () => {
      const mockClient = createVenueElementMockClient({
        updateResult: { data: null, error: { message: 'Update failed' } },
      });
      mockedCreateClient.mockResolvedValue(mockClient as never);

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
      const mockClient = createBatchMockClient();
      mockedCreateClient.mockResolvedValue(mockClient as never);

      const result = await updateVenueElements('test-event-id', [
        { id: 'element-1', type: 'stage', label: 'Stage', x: 100, y: 100, width: 200, height: 100 },
        { id: 'element-2', type: 'bar', label: 'Bar', x: 300, y: 100, width: 100, height: 50 },
      ]);

      expect(result.error).toBeUndefined();
      expect(result.count).toBe(2);
      expect(mockedRevalidatePath).toHaveBeenCalledWith('/dashboard/events/test-event-id/canvas');
    });

    it('should return error when not authenticated', async () => {
      const mockClient = createBatchMockClient({ user: null });
      mockedCreateClient.mockResolvedValue(mockClient as never);

      const result = await updateVenueElements('test-event-id', [
        { id: 'element-1', type: 'stage', label: 'Stage', x: 100, y: 100, width: 200, height: 100 },
      ]);

      expect(result.error).toBe('Not authenticated');
    });

    it('should return error when event not found', async () => {
      const mockClient = createBatchMockClient({ eventFound: false });
      mockedCreateClient.mockResolvedValue(mockClient as never);

      const result = await updateVenueElements('test-event-id', []);

      expect(result.error).toBe('Event not found or access denied');
    });

    it('should report error when element missing ID', async () => {
      const mockClient = createBatchMockClient();
      mockedCreateClient.mockResolvedValue(mockClient as never);

      const result = await updateVenueElements('test-event-id', [
        { type: 'stage', label: 'Stage', x: 100, y: 100, width: 200, height: 100 }, // Missing ID
      ]);

      expect(result.error).toContain('Failed to update');
    });
  });

  describe('deleteVenueElement', () => {
    it('should delete a venue element successfully', async () => {
      const mockClient = createVenueElementMockClient();
      mockedCreateClient.mockResolvedValue(mockClient as never);

      const result = await deleteVenueElement('test-event-id', 'test-element-id');

      expect(result.error).toBeUndefined();
      expect(result.success).toBe(true);
      expect(mockedRevalidatePath).toHaveBeenCalledWith('/dashboard/events/test-event-id/canvas');
    });

    it('should return error when not authenticated', async () => {
      const mockClient = createVenueElementMockClient({ user: null });
      mockedCreateClient.mockResolvedValue(mockClient as never);

      const result = await deleteVenueElement('test-event-id', 'test-element-id');

      expect(result.error).toBe('Not authenticated');
    });

    it('should return error when event not found', async () => {
      const mockClient = createVenueElementMockClient({ eventFound: false });
      mockedCreateClient.mockResolvedValue(mockClient as never);

      const result = await deleteVenueElement('test-event-id', 'test-element-id');

      expect(result.error).toBe('Event not found or access denied');
    });

    it('should handle deletion failure', async () => {
      const mockClient = createVenueElementMockClient({
        deleteResult: { error: { message: 'Delete failed' } },
      });
      mockedCreateClient.mockResolvedValue(mockClient as never);

      const result = await deleteVenueElement('test-event-id', 'test-element-id');

      expect(result.error).toBe('Delete failed');
    });
  });

  describe('deleteVenueElements', () => {
    it('should delete multiple venue elements successfully', async () => {
      const mockClient = createVenueElementMockClient();
      mockedCreateClient.mockResolvedValue(mockClient as never);

      const result = await deleteVenueElements('test-event-id', ['element-1', 'element-2']);

      expect(result.error).toBeUndefined();
      expect(result.success).toBe(true);
      expect(result.count).toBe(2);
      expect(mockedRevalidatePath).toHaveBeenCalledWith('/dashboard/events/test-event-id/canvas');
    });

    it('should return error when not authenticated', async () => {
      const mockClient = createVenueElementMockClient({ user: null });
      mockedCreateClient.mockResolvedValue(mockClient as never);

      const result = await deleteVenueElements('test-event-id', ['element-1']);

      expect(result.error).toBe('Not authenticated');
    });

    it('should return error when event not found', async () => {
      const mockClient = createVenueElementMockClient({ eventFound: false });
      mockedCreateClient.mockResolvedValue(mockClient as never);

      const result = await deleteVenueElements('test-event-id', ['element-1']);

      expect(result.error).toBe('Event not found or access denied');
    });

    it('should handle bulk deletion failure', async () => {
      const mockClient = createVenueElementMockClient({
        deleteResult: { error: { message: 'Bulk delete failed' } },
      });
      mockedCreateClient.mockResolvedValue(mockClient as never);

      const result = await deleteVenueElements('test-event-id', ['element-1', 'element-2']);

      expect(result.error).toBe('Bulk delete failed');
    });

    it('should return correct count for empty array', async () => {
      const mockClient = createVenueElementMockClient();
      mockedCreateClient.mockResolvedValue(mockClient as never);

      const result = await deleteVenueElements('test-event-id', []);

      expect(result.error).toBeUndefined();
      expect(result.count).toBe(0);
    });
  });
});
