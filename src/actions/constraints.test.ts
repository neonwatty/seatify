import { describe, it, expect, vi, beforeEach } from 'vitest';
import { insertConstraint, updateConstraint, deleteConstraint, deleteConstraints } from './constraints';

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

const mockConstraintResponse = {
  data: {
    id: 'test-constraint-id',
    type: 'constraint',
    attributes: {
      id: 'test-constraint-id',
      constraintType: 'same_table',
      priority: 'required',
      guestIds: ['guest-1', 'guest-2'],
      description: null,
    },
  },
};

describe('Constraint Server Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('insertConstraint', () => {
    it('should insert a constraint successfully', async () => {
      mockedIsAuthenticated.mockResolvedValue(true);
      mockedServerRailsApi.post.mockResolvedValue({ data: mockConstraintResponse });

      const result = await insertConstraint('test-event-id', {
        type: 'same_table',
        priority: 'required',
        guestIds: ['guest-1', 'guest-2'],
      });

      expect(result.error).toBeUndefined();
      expect(result.data).toBeDefined();
      expect(result.data?.type).toBe('same_table');
      expect(result.data?.guestIds).toEqual(['guest-1', 'guest-2']);
      expect(mockedServerRailsApi.post).toHaveBeenCalledWith(
        '/api/v1/events/test-event-id/constraints',
        expect.objectContaining({
          constraint: expect.objectContaining({
            constraint_type: 'same_table',
            priority: 'required',
            guest_ids: ['guest-1', 'guest-2'],
          }),
        })
      );
      expect(mockedRevalidatePath).toHaveBeenCalledWith('/dashboard/events/test-event-id/canvas');
    });

    it('should return error when not authenticated', async () => {
      mockedIsAuthenticated.mockResolvedValue(false);

      const result = await insertConstraint('test-event-id', {
        type: 'same_table',
        priority: 'required',
        guestIds: [],
      });

      expect(result.error).toBe('Not authenticated');
      expect(result.data).toBeUndefined();
      expect(mockedServerRailsApi.post).not.toHaveBeenCalled();
    });

    it('should handle API failure', async () => {
      mockedIsAuthenticated.mockResolvedValue(true);
      mockedServerRailsApi.post.mockResolvedValue({ error: 'Database error' });

      const result = await insertConstraint('test-event-id', {
        type: 'same_table',
        priority: 'required',
        guestIds: [],
      });

      expect(result.error).toBe('Database error');
    });

    it('should handle constraint without guest IDs', async () => {
      const responseWithNoGuests = {
        data: {
          ...mockConstraintResponse.data,
          attributes: {
            ...mockConstraintResponse.data.attributes,
            guestIds: [],
          },
        },
      };
      mockedIsAuthenticated.mockResolvedValue(true);
      mockedServerRailsApi.post.mockResolvedValue({ data: responseWithNoGuests });

      const result = await insertConstraint('test-event-id', {
        type: 'near_front',
        priority: 'preferred',
        guestIds: [],
      });

      expect(result.error).toBeUndefined();
      expect(result.data).toBeDefined();
    });

    it('should include description when provided', async () => {
      const responseWithDescription = {
        data: {
          ...mockConstraintResponse.data,
          attributes: {
            ...mockConstraintResponse.data.attributes,
            description: 'These are the bridesmaids',
          },
        },
      };
      mockedIsAuthenticated.mockResolvedValue(true);
      mockedServerRailsApi.post.mockResolvedValue({ data: responseWithDescription });

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
      mockedIsAuthenticated.mockResolvedValue(true);
      mockedServerRailsApi.patch.mockResolvedValue({ data: mockConstraintResponse });

      const result = await updateConstraint('test-event-id', 'test-constraint-id', {
        type: 'different_table',
        priority: 'preferred',
      });

      expect(result.error).toBeUndefined();
      expect(result.success).toBe(true);
      expect(mockedServerRailsApi.patch).toHaveBeenCalledWith(
        '/api/v1/events/test-event-id/constraints/test-constraint-id',
        expect.objectContaining({
          constraint: expect.objectContaining({
            constraint_type: 'different_table',
            priority: 'preferred',
          }),
        })
      );
      expect(mockedRevalidatePath).toHaveBeenCalledWith('/dashboard/events/test-event-id/canvas');
    });

    it('should return error when not authenticated', async () => {
      mockedIsAuthenticated.mockResolvedValue(false);

      const result = await updateConstraint('test-event-id', 'test-constraint-id', {
        priority: 'preferred',
      });

      expect(result.error).toBe('Not authenticated');
      expect(mockedServerRailsApi.patch).not.toHaveBeenCalled();
    });

    it('should handle update failure', async () => {
      mockedIsAuthenticated.mockResolvedValue(true);
      mockedServerRailsApi.patch.mockResolvedValue({ error: 'Update failed' });

      const result = await updateConstraint('test-event-id', 'test-constraint-id', {
        type: 'different_table',
      });

      expect(result.error).toBe('Update failed');
    });

    it('should update guest IDs when provided', async () => {
      mockedIsAuthenticated.mockResolvedValue(true);
      mockedServerRailsApi.patch.mockResolvedValue({ data: mockConstraintResponse });

      const result = await updateConstraint('test-event-id', 'test-constraint-id', {
        guestIds: ['guest-3', 'guest-4'],
      });

      expect(result.error).toBeUndefined();
      expect(result.success).toBe(true);
      expect(mockedServerRailsApi.patch).toHaveBeenCalledWith(
        '/api/v1/events/test-event-id/constraints/test-constraint-id',
        expect.objectContaining({
          constraint: expect.objectContaining({
            guest_ids: ['guest-3', 'guest-4'],
          }),
        })
      );
    });

    it('should allow updating description to empty', async () => {
      mockedIsAuthenticated.mockResolvedValue(true);
      mockedServerRailsApi.patch.mockResolvedValue({ data: mockConstraintResponse });

      const result = await updateConstraint('test-event-id', 'test-constraint-id', {
        description: '',
      });

      expect(result.error).toBeUndefined();
      expect(result.success).toBe(true);
    });
  });

  describe('deleteConstraint', () => {
    it('should delete a constraint successfully', async () => {
      mockedIsAuthenticated.mockResolvedValue(true);
      mockedServerRailsApi.delete.mockResolvedValue({ data: { message: 'Deleted' } });

      const result = await deleteConstraint('test-event-id', 'test-constraint-id');

      expect(result.error).toBeUndefined();
      expect(result.success).toBe(true);
      expect(mockedServerRailsApi.delete).toHaveBeenCalledWith(
        '/api/v1/events/test-event-id/constraints/test-constraint-id'
      );
      expect(mockedRevalidatePath).toHaveBeenCalledWith('/dashboard/events/test-event-id/canvas');
    });

    it('should return error when not authenticated', async () => {
      mockedIsAuthenticated.mockResolvedValue(false);

      const result = await deleteConstraint('test-event-id', 'test-constraint-id');

      expect(result.error).toBe('Not authenticated');
      expect(mockedServerRailsApi.delete).not.toHaveBeenCalled();
    });

    it('should handle constraint deletion failure', async () => {
      mockedIsAuthenticated.mockResolvedValue(true);
      mockedServerRailsApi.delete.mockResolvedValue({ error: 'Constraint delete failed' });

      const result = await deleteConstraint('test-event-id', 'test-constraint-id');

      expect(result.error).toBe('Constraint delete failed');
    });
  });

  describe('deleteConstraints', () => {
    it('should delete multiple constraints successfully', async () => {
      mockedIsAuthenticated.mockResolvedValue(true);
      mockedServerRailsApi.delete.mockResolvedValue({ data: { message: 'Deleted' } });

      const result = await deleteConstraints('test-event-id', ['constraint-1', 'constraint-2']);

      expect(result.error).toBeUndefined();
      expect(result.success).toBe(true);
      expect(result.count).toBe(2);
      expect(mockedServerRailsApi.delete).toHaveBeenCalledTimes(2);
    });

    it('should return error when not authenticated', async () => {
      mockedIsAuthenticated.mockResolvedValue(false);

      const result = await deleteConstraints('test-event-id', ['constraint-1']);

      expect(result.error).toBe('Not authenticated');
      expect(mockedServerRailsApi.delete).not.toHaveBeenCalled();
    });

    it('should handle bulk deletion failure', async () => {
      mockedIsAuthenticated.mockResolvedValue(true);
      mockedServerRailsApi.delete.mockResolvedValue({ error: 'Bulk delete failed' });

      const result = await deleteConstraints('test-event-id', ['constraint-1', 'constraint-2']);

      expect(result.error).toContain('Failed to delete');
    });

    it('should return correct count for empty array', async () => {
      mockedIsAuthenticated.mockResolvedValue(true);

      const result = await deleteConstraints('test-event-id', []);

      expect(result.error).toBeUndefined();
      expect(result.count).toBe(0);
    });
  });
});
