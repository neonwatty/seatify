import { describe, it, expect, vi, beforeEach } from 'vitest';
import { insertConstraint, updateConstraint, deleteConstraint, deleteConstraints } from './constraints';

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

const mockConstraint = {
  id: 'test-constraint-id',
  event_id: 'test-event-id',
  constraint_type: 'same_table',
  priority: 'required',
  description: null,
};

// Helper to create a flexible mock Supabase client
const createConstraintMockClient = (overrides: {
  user?: typeof mockUser | null;
  eventFound?: boolean;
  insertConstraintResult?: { data: unknown; error: unknown };
  insertGuestsResult?: { error: unknown };
  updateConstraintResult?: { error: unknown };
  deleteGuestsResult?: { error: unknown };
  deleteConstraintResult?: { error: unknown };
} = {}) => {
  const {
    user = mockUser,
    eventFound = true,
    insertConstraintResult = { data: mockConstraint, error: null },
    insertGuestsResult = { error: null },
    updateConstraintResult = { error: null },
    deleteGuestsResult = { error: null },
    deleteConstraintResult = { error: null },
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

    if (table === 'constraints') {
      return {
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(insertConstraintResult),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue(updateConstraintResult),
          }),
        }),
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue(deleteConstraintResult),
          }),
          in: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue(deleteConstraintResult),
          }),
        }),
      };
    }

    if (table === 'constraint_guests') {
      return {
        insert: vi.fn().mockResolvedValue(insertGuestsResult),
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue(deleteGuestsResult),
          in: vi.fn().mockResolvedValue(deleteGuestsResult),
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

describe('Constraint Server Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('insertConstraint', () => {
    it('should insert a constraint successfully', async () => {
      const mockClient = createConstraintMockClient();
      mockedCreateClient.mockResolvedValue(mockClient as never);

      const result = await insertConstraint('test-event-id', {
        type: 'same_table',
        priority: 'required',
        guestIds: ['guest-1', 'guest-2'],
      });

      expect(result.error).toBeUndefined();
      expect(result.data).toBeDefined();
      expect(result.data?.type).toBe('same_table');
      expect(result.data?.guestIds).toEqual(['guest-1', 'guest-2']);
      expect(mockedRevalidatePath).toHaveBeenCalledWith('/dashboard/events/test-event-id/canvas');
    });

    it('should return error when not authenticated', async () => {
      const mockClient = createConstraintMockClient({ user: null });
      mockedCreateClient.mockResolvedValue(mockClient as never);

      const result = await insertConstraint('test-event-id', {
        type: 'same_table',
        priority: 'required',
        guestIds: [],
      });

      expect(result.error).toBe('Not authenticated');
      expect(result.data).toBeUndefined();
    });

    it('should return error when event not found', async () => {
      const mockClient = createConstraintMockClient({ eventFound: false });
      mockedCreateClient.mockResolvedValue(mockClient as never);

      const result = await insertConstraint('nonexistent-event', {
        type: 'same_table',
        priority: 'required',
        guestIds: [],
      });

      expect(result.error).toBe('Event not found or access denied');
    });

    it('should handle constraint insertion failure', async () => {
      const mockClient = createConstraintMockClient({
        insertConstraintResult: { data: null, error: { message: 'Database error' } },
      });
      mockedCreateClient.mockResolvedValue(mockClient as never);

      const result = await insertConstraint('test-event-id', {
        type: 'same_table',
        priority: 'required',
        guestIds: [],
      });

      expect(result.error).toBe('Database error');
    });

    it('should handle guest association insertion failure', async () => {
      const mockClient = createConstraintMockClient({
        insertGuestsResult: { error: { message: 'Guest insert error' } },
      });
      mockedCreateClient.mockResolvedValue(mockClient as never);

      const result = await insertConstraint('test-event-id', {
        type: 'same_table',
        priority: 'required',
        guestIds: ['guest-1'],
      });

      expect(result.error).toBe('Guest insert error');
    });

    it('should handle constraint without guest IDs', async () => {
      const mockClient = createConstraintMockClient();
      mockedCreateClient.mockResolvedValue(mockClient as never);

      const result = await insertConstraint('test-event-id', {
        type: 'near_front',
        priority: 'preferred',
        guestIds: [],
      });

      expect(result.error).toBeUndefined();
      expect(result.data).toBeDefined();
    });

    it('should include description when provided', async () => {
      const mockClient = createConstraintMockClient();
      mockedCreateClient.mockResolvedValue(mockClient as never);

      const result = await insertConstraint('test-event-id', {
        type: 'same_table',
        priority: 'required',
        guestIds: ['guest-1'],
        description: 'These are the bridesmaids',
      });

      expect(result.error).toBeUndefined();
      expect(result.data?.description).toBe('These are the bridesmaids');
    });
  });

  describe('updateConstraint', () => {
    it('should update a constraint successfully', async () => {
      const mockClient = createConstraintMockClient();
      mockedCreateClient.mockResolvedValue(mockClient as never);

      const result = await updateConstraint('test-event-id', 'test-constraint-id', {
        type: 'different_table',
        priority: 'preferred',
      });

      expect(result.error).toBeUndefined();
      expect(result.success).toBe(true);
      expect(mockedRevalidatePath).toHaveBeenCalledWith('/dashboard/events/test-event-id/canvas');
    });

    it('should return error when not authenticated', async () => {
      const mockClient = createConstraintMockClient({ user: null });
      mockedCreateClient.mockResolvedValue(mockClient as never);

      const result = await updateConstraint('test-event-id', 'test-constraint-id', {
        priority: 'preferred',
      });

      expect(result.error).toBe('Not authenticated');
    });

    it('should return error when event not found', async () => {
      const mockClient = createConstraintMockClient({ eventFound: false });
      mockedCreateClient.mockResolvedValue(mockClient as never);

      const result = await updateConstraint('test-event-id', 'test-constraint-id', {
        priority: 'preferred',
      });

      expect(result.error).toBe('Event not found or access denied');
    });

    it('should handle update failure', async () => {
      const mockClient = createConstraintMockClient({
        updateConstraintResult: { error: { message: 'Update failed' } },
      });
      mockedCreateClient.mockResolvedValue(mockClient as never);

      const result = await updateConstraint('test-event-id', 'test-constraint-id', {
        type: 'different_table',
      });

      expect(result.error).toBe('Update failed');
    });

    it('should update guest IDs when provided', async () => {
      const mockClient = createConstraintMockClient();
      mockedCreateClient.mockResolvedValue(mockClient as never);

      const result = await updateConstraint('test-event-id', 'test-constraint-id', {
        guestIds: ['guest-3', 'guest-4'],
      });

      expect(result.error).toBeUndefined();
      expect(result.success).toBe(true);
    });

    it('should handle guest reassociation failure on delete', async () => {
      const mockClient = createConstraintMockClient({
        deleteGuestsResult: { error: { message: 'Delete guests failed' } },
      });
      mockedCreateClient.mockResolvedValue(mockClient as never);

      const result = await updateConstraint('test-event-id', 'test-constraint-id', {
        guestIds: ['guest-new'],
      });

      expect(result.error).toBe('Delete guests failed');
    });

    it('should allow updating description to empty', async () => {
      const mockClient = createConstraintMockClient();
      mockedCreateClient.mockResolvedValue(mockClient as never);

      const result = await updateConstraint('test-event-id', 'test-constraint-id', {
        description: '',
      });

      expect(result.error).toBeUndefined();
      expect(result.success).toBe(true);
    });
  });

  describe('deleteConstraint', () => {
    it('should delete a constraint successfully', async () => {
      const mockClient = createConstraintMockClient();
      mockedCreateClient.mockResolvedValue(mockClient as never);

      const result = await deleteConstraint('test-event-id', 'test-constraint-id');

      expect(result.error).toBeUndefined();
      expect(result.success).toBe(true);
      expect(mockedRevalidatePath).toHaveBeenCalledWith('/dashboard/events/test-event-id/canvas');
    });

    it('should return error when not authenticated', async () => {
      const mockClient = createConstraintMockClient({ user: null });
      mockedCreateClient.mockResolvedValue(mockClient as never);

      const result = await deleteConstraint('test-event-id', 'test-constraint-id');

      expect(result.error).toBe('Not authenticated');
    });

    it('should return error when event not found', async () => {
      const mockClient = createConstraintMockClient({ eventFound: false });
      mockedCreateClient.mockResolvedValue(mockClient as never);

      const result = await deleteConstraint('test-event-id', 'test-constraint-id');

      expect(result.error).toBe('Event not found or access denied');
    });

    it('should handle guest deletion failure', async () => {
      const mockClient = createConstraintMockClient({
        deleteGuestsResult: { error: { message: 'Failed to delete guest associations' } },
      });
      mockedCreateClient.mockResolvedValue(mockClient as never);

      const result = await deleteConstraint('test-event-id', 'test-constraint-id');

      expect(result.error).toBe('Failed to delete guest associations');
    });

    it('should handle constraint deletion failure', async () => {
      const mockClient = createConstraintMockClient({
        deleteConstraintResult: { error: { message: 'Constraint delete failed' } },
      });
      mockedCreateClient.mockResolvedValue(mockClient as never);

      const result = await deleteConstraint('test-event-id', 'test-constraint-id');

      expect(result.error).toBe('Constraint delete failed');
    });
  });

  describe('deleteConstraints', () => {
    it('should delete multiple constraints successfully', async () => {
      const mockClient = createConstraintMockClient();
      mockedCreateClient.mockResolvedValue(mockClient as never);

      const result = await deleteConstraints('test-event-id', ['constraint-1', 'constraint-2']);

      expect(result.error).toBeUndefined();
      expect(result.success).toBe(true);
      expect(result.count).toBe(2);
      expect(mockedRevalidatePath).toHaveBeenCalledWith('/dashboard/events/test-event-id/canvas');
    });

    it('should return error when not authenticated', async () => {
      const mockClient = createConstraintMockClient({ user: null });
      mockedCreateClient.mockResolvedValue(mockClient as never);

      const result = await deleteConstraints('test-event-id', ['constraint-1']);

      expect(result.error).toBe('Not authenticated');
    });

    it('should return error when event not found', async () => {
      const mockClient = createConstraintMockClient({ eventFound: false });
      mockedCreateClient.mockResolvedValue(mockClient as never);

      const result = await deleteConstraints('test-event-id', ['constraint-1']);

      expect(result.error).toBe('Event not found or access denied');
    });

    it('should handle guest deletion failure for bulk delete', async () => {
      const mockClient = createConstraintMockClient({
        deleteGuestsResult: { error: { message: 'Bulk guest delete failed' } },
      });
      mockedCreateClient.mockResolvedValue(mockClient as never);

      const result = await deleteConstraints('test-event-id', ['constraint-1', 'constraint-2']);

      expect(result.error).toBe('Bulk guest delete failed');
    });

    it('should handle constraint deletion failure for bulk delete', async () => {
      const mockClient = createConstraintMockClient({
        deleteConstraintResult: { error: { message: 'Bulk constraint delete failed' } },
      });
      mockedCreateClient.mockResolvedValue(mockClient as never);

      const result = await deleteConstraints('test-event-id', ['constraint-1']);

      expect(result.error).toBe('Bulk constraint delete failed');
    });

    it('should return correct count for empty array', async () => {
      const mockClient = createConstraintMockClient();
      mockedCreateClient.mockResolvedValue(mockClient as never);

      const result = await deleteConstraints('test-event-id', []);

      expect(result.error).toBeUndefined();
      expect(result.count).toBe(0);
    });
  });
});
