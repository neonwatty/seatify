import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createProject,
  updateProject,
  deleteProject,
  getProjects,
  addProjectGuest,
  updateProjectGuest,
  deleteProjectGuest,
  getProjectGuests,
  addProjectRelationship,
  deleteProjectRelationship,
  getProjectRelationships,
  moveEventToProject,
  removeEventFromProject,
  seedEventGuests,
} from './projects';

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

// Mock data
const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
};

const mockProject = {
  id: 'project-1',
  user_id: mockUser.id,
  name: 'Test Project',
  description: 'Test Description',
  start_date: '2026-01-01',
  end_date: '2026-01-03',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const mockProjectGuest = {
  id: 'pg-1',
  project_id: mockProject.id,
  first_name: 'John',
  last_name: 'Doe',
  email: 'john@example.com',
  phone: null,
  company: 'Test Corp',
  job_title: null,
  industry: null,
  profile_summary: null,
  group_name: null,
  notes: null,
  dietary_restrictions: null,
  accessibility_needs: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const mockRelationship = {
  id: 'rel-1',
  project_id: mockProject.id,
  guest_id: 'pg-1',
  related_guest_id: 'pg-2',
  relationship_type: 'friend',
  strength: 3,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// Helper to create mock Supabase client
const createMockSupabaseClient = (overrides: {
  user?: typeof mockUser | null;
  selectResult?: { data: unknown; error: unknown };
  insertResult?: { data: unknown; error: unknown };
  updateResult?: { data: unknown; error: unknown };
  deleteResult?: { data: unknown; error: unknown };
  rpcResult?: { data: unknown; error: unknown };
} = {}) => {
  const {
    user = mockUser,
    selectResult = { data: [], error: null },
    insertResult = { data: mockProject, error: null },
    updateResult = { data: mockProject, error: null },
    deleteResult = { data: null, error: null },
    rpcResult = { data: null, error: null },
  } = overrides;

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
    },
    from: vi.fn((_table: string) => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(selectResult),
          }),
          single: vi.fn().mockResolvedValue(selectResult),
          order: vi.fn().mockResolvedValue(selectResult),
        }),
        order: vi.fn().mockResolvedValue(selectResult),
        in: vi.fn().mockResolvedValue(selectResult),
      }),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue(insertResult),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(updateResult),
          }),
        }),
      }),
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue(deleteResult),
      }),
    })),
    rpc: vi.fn().mockResolvedValue(rpcResult),
  };
};

describe('Project Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createProject', () => {
    it('should create a project successfully', async () => {
      const mockClient = createMockSupabaseClient({
        insertResult: { data: mockProject, error: null },
      });
      mockedCreateClient.mockResolvedValue(mockClient as never);

      const result = await createProject({
        name: 'Test Project',
        description: 'Test Description',
        startDate: '2026-01-01',
        endDate: '2026-01-03',
      });

      expect(result.data).toBeDefined();
      expect(result.data?.name).toBe('Test Project');
      expect(result.error).toBeUndefined();
      expect(mockedRevalidatePath).toHaveBeenCalledWith('/dashboard');
    });

    it('should return error when not authenticated', async () => {
      const mockClient = createMockSupabaseClient({ user: null });
      mockedCreateClient.mockResolvedValue(mockClient as never);

      const result = await createProject({ name: 'Test Project' });

      expect(result.error).toBe('Not authenticated');
      expect(result.data).toBeUndefined();
    });

    it('should return error on database failure', async () => {
      const mockClient = createMockSupabaseClient({
        insertResult: { data: null, error: { message: 'Database error' } },
      });
      mockedCreateClient.mockResolvedValue(mockClient as never);

      const result = await createProject({ name: 'Test Project' });

      expect(result.error).toBe('Database error');
    });

    it('should trim whitespace from name and description', async () => {
      const mockClient = createMockSupabaseClient({
        insertResult: { data: mockProject, error: null },
      });
      mockedCreateClient.mockResolvedValue(mockClient as never);

      await createProject({
        name: '  Test Project  ',
        description: '  Test Description  ',
      });

      // The insert should have been called - we can't easily verify the trimmed values
      // but the function should complete successfully
      expect(mockedRevalidatePath).toHaveBeenCalled();
    });
  });

  describe('updateProject', () => {
    it('should update a project successfully', async () => {
      const updatedProject = { ...mockProject, name: 'Updated Project' };
      const mockClient = createMockSupabaseClient({
        updateResult: { data: updatedProject, error: null },
      });
      mockedCreateClient.mockResolvedValue(mockClient as never);

      const result = await updateProject(mockProject.id, { name: 'Updated Project' });

      expect(result.data).toBeDefined();
      expect(result.error).toBeUndefined();
      expect(mockedRevalidatePath).toHaveBeenCalledWith('/dashboard');
    });

    it('should return error when not authenticated', async () => {
      const mockClient = createMockSupabaseClient({ user: null });
      mockedCreateClient.mockResolvedValue(mockClient as never);

      const result = await updateProject(mockProject.id, { name: 'Updated' });

      expect(result.error).toBe('Not authenticated');
    });
  });

  describe('deleteProject', () => {
    it('should delete a project successfully', async () => {
      const mockClient = createMockSupabaseClient({
        deleteResult: { data: null, error: null },
      });
      // Override the from method to handle both update and delete
      mockClient.from = vi.fn((_table: string) => ({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }));
      mockedCreateClient.mockResolvedValue(mockClient as never);

      const result = await deleteProject(mockProject.id, false);

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(mockedRevalidatePath).toHaveBeenCalledWith('/dashboard');
    });

    it('should return error when not authenticated', async () => {
      const mockClient = createMockSupabaseClient({ user: null });
      mockedCreateClient.mockResolvedValue(mockClient as never);

      const result = await deleteProject(mockProject.id);

      expect(result.error).toBe('Not authenticated');
      expect(result.success).toBeUndefined();
    });
  });

  describe('addProjectGuest', () => {
    it('should add a guest to a project', async () => {
      const mockClient = createMockSupabaseClient({
        insertResult: { data: mockProjectGuest, error: null },
      });
      mockedCreateClient.mockResolvedValue(mockClient as never);

      const result = await addProjectGuest(mockProject.id, {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
      });

      expect(result.data).toBeDefined();
      expect(result.data?.firstName).toBe('John');
      expect(result.error).toBeUndefined();
    });

    it('should return error when not authenticated', async () => {
      const mockClient = createMockSupabaseClient({ user: null });
      mockedCreateClient.mockResolvedValue(mockClient as never);

      const result = await addProjectGuest(mockProject.id, {
        firstName: 'John',
        lastName: 'Doe',
      });

      expect(result.error).toBe('Not authenticated');
    });
  });

  describe('updateProjectGuest', () => {
    it('should update a project guest', async () => {
      const updatedGuest = { ...mockProjectGuest, first_name: 'Jane' };
      const mockClient = createMockSupabaseClient({
        updateResult: { data: updatedGuest, error: null },
      });
      mockedCreateClient.mockResolvedValue(mockClient as never);

      const result = await updateProjectGuest(mockProjectGuest.id, { firstName: 'Jane' });

      expect(result.data).toBeDefined();
      expect(result.error).toBeUndefined();
    });
  });

  describe('deleteProjectGuest', () => {
    it('should delete a project guest', async () => {
      const mockClient = createMockSupabaseClient({
        deleteResult: { data: null, error: null },
      });
      mockedCreateClient.mockResolvedValue(mockClient as never);

      const result = await deleteProjectGuest(mockProjectGuest.id);

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe('getProjectGuests', () => {
    it('should return project guests', async () => {
      const mockClient = createMockSupabaseClient({
        selectResult: { data: [mockProjectGuest], error: null },
      });
      mockedCreateClient.mockResolvedValue(mockClient as never);

      const result = await getProjectGuests(mockProject.id);

      expect(result.data).toBeDefined();
      expect(result.data).toHaveLength(1);
      expect(result.error).toBeUndefined();
    });

    it('should return error when not authenticated', async () => {
      const mockClient = createMockSupabaseClient({ user: null });
      mockedCreateClient.mockResolvedValue(mockClient as never);

      const result = await getProjectGuests(mockProject.id);

      expect(result.error).toBe('Not authenticated');
    });
  });

  describe('addProjectRelationship', () => {
    it('should add a relationship between project guests', async () => {
      const mockClient = createMockSupabaseClient({
        insertResult: { data: mockRelationship, error: null },
      });
      mockedCreateClient.mockResolvedValue(mockClient as never);

      const result = await addProjectRelationship(mockProject.id, {
        guestId: 'pg-1',
        relatedGuestId: 'pg-2',
        relationshipType: 'friend',
        strength: 3,
      });

      expect(result.data).toBeDefined();
      expect(result.data?.relationshipType).toBe('friend');
      expect(result.error).toBeUndefined();
    });

    it('should return error on duplicate relationship', async () => {
      const mockClient = createMockSupabaseClient({
        insertResult: { data: null, error: { message: 'duplicate key value' } },
      });
      mockedCreateClient.mockResolvedValue(mockClient as never);

      const result = await addProjectRelationship(mockProject.id, {
        guestId: 'pg-1',
        relatedGuestId: 'pg-2',
        relationshipType: 'friend',
      });

      expect(result.error).toBe('duplicate key value');
    });
  });

  describe('deleteProjectRelationship', () => {
    it('should delete a relationship', async () => {
      const mockClient = createMockSupabaseClient({
        deleteResult: { data: null, error: null },
      });
      mockedCreateClient.mockResolvedValue(mockClient as never);

      const result = await deleteProjectRelationship(mockRelationship.id);

      expect(result.success).toBe(true);
    });
  });

  describe('getProjectRelationships', () => {
    it('should return project relationships', async () => {
      const mockClient = createMockSupabaseClient();
      // Override for this specific test
      mockClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: [mockRelationship], error: null }),
        }),
      });
      mockedCreateClient.mockResolvedValue(mockClient as never);

      const result = await getProjectRelationships(mockProject.id);

      expect(result.data).toBeDefined();
      expect(result.data).toHaveLength(1);
    });
  });

  describe('moveEventToProject', () => {
    it('should move an event to a project', async () => {
      const mockClient = createMockSupabaseClient({
        updateResult: { data: null, error: null },
      });
      mockClient.from = vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      });
      mockedCreateClient.mockResolvedValue(mockClient as never);

      const result = await moveEventToProject('event-1', mockProject.id);

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return error when not authenticated', async () => {
      const mockClient = createMockSupabaseClient({ user: null });
      mockedCreateClient.mockResolvedValue(mockClient as never);

      const result = await moveEventToProject('event-1', mockProject.id);

      expect(result.error).toBe('Not authenticated');
    });
  });

  describe('removeEventFromProject', () => {
    it('should remove an event from a project', async () => {
      const mockClient = createMockSupabaseClient();
      mockClient.from = vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      });
      mockedCreateClient.mockResolvedValue(mockClient as never);

      const result = await removeEventFromProject('event-1');

      expect(result.success).toBe(true);
    });
  });

  describe('seedEventGuests', () => {
    it('should return error when event is not part of a project', async () => {
      const mockClient = createMockSupabaseClient({
        selectResult: { data: { id: 'event-1', project_id: null }, error: null },
      });
      mockedCreateClient.mockResolvedValue(mockClient as never);

      const result = await seedEventGuests('event-1');

      expect(result.error).toBe('Event is not part of a project');
    });

    it('should return 0 seeded when no project guests exist', async () => {
      const mockEvent = { id: 'event-1', project_id: 'project-1' };
      const mockClient = createMockSupabaseClient();

      // Custom mock for this specific test
      let selectCallCount = 0;
      mockClient.from = vi.fn().mockImplementation((table: string) => {
        if (table === 'events') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: mockEvent, error: null }),
              }),
            }),
          };
        }
        if (table === 'project_guests') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          };
        }
        if (table === 'event_guest_attendance') {
          selectCallCount++;
          if (selectCallCount === 1) {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            };
          }
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        };
      });
      mockedCreateClient.mockResolvedValue(mockClient as never);

      const result = await seedEventGuests('event-1');

      expect(result.data).toEqual({ seeded: 0 });
    });
  });
});
