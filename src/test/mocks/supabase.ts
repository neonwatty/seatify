import { vi } from 'vitest';

export const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  created_at: new Date().toISOString(),
};

export const mockEvent = {
  id: 'test-event-id',
  user_id: mockUser.id,
  name: 'Test Event',
  event_type: 'wedding',
  date: '2026-06-15',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export const createMockSupabaseClient = (overrides: {
  user?: typeof mockUser | null;
  selectResult?: { data: unknown; error: unknown };
  insertResult?: { data: unknown; error: unknown };
  updateResult?: { data: unknown; error: unknown };
  deleteResult?: { data: unknown; error: unknown };
} = {}) => {
  const {
    user = mockUser,
    selectResult = { data: [], error: null },
    insertResult = { data: mockEvent, error: null },
    updateResult = { data: mockEvent, error: null },
    deleteResult = { data: null, error: null },
  } = overrides;

  const chainableMethods = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(),
  };

  // Configure the final results based on what method was called
  chainableMethods.single.mockImplementation(() => {
    // Return based on the last operation
    return Promise.resolve(insertResult);
  });

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
    },
    from: vi.fn((_table: string) => {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(selectResult),
          }),
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
      };
    }),
  };
};
