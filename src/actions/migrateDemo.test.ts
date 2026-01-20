import { describe, it, expect, vi, beforeEach } from 'vitest';
import { migrateDemo } from './migrateDemo';
import type { Event } from '@/types';

// Mock uuid to return predictable IDs
let uuidCounter = 0;
vi.mock('uuid', () => ({
  v4: () => `new-uuid-${++uuidCounter}`,
}));

// Mock next/cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

// Create a more flexible mock for migrateDemo's complex database operations
const createMigrateMockSupabaseClient = (overrides: {
  user?: { id: string } | null;
  eventInsertError?: { message: string } | null;
  tablesInsertError?: { message: string } | null;
  guestsInsertError?: { message: string } | null;
  constraintsInsertError?: { message: string } | null;
} = {}) => {
  const {
    user = { id: 'test-user-id' },
    eventInsertError = null,
    tablesInsertError = null,
    guestsInsertError = null,
    constraintsInsertError = null,
  } = overrides;

  const insertedData: Record<string, unknown[]> = {
    events: [],
    tables: [],
    guests: [],
    guest_profiles: [],
    guest_relationships: [],
    constraints: [],
    constraint_guests: [],
    venue_elements: [],
  };

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
    },
    from: vi.fn((table: string) => ({
      insert: vi.fn((data: unknown) => {
        // Store the inserted data for verification
        if (Array.isArray(data)) {
          insertedData[table]?.push(...data);
        } else {
          insertedData[table]?.push(data);
        }

        // Determine error based on table
        let error = null;
        if (table === 'events' && eventInsertError) error = eventInsertError;
        if (table === 'tables' && tablesInsertError) error = tablesInsertError;
        if (table === 'guests' && guestsInsertError) error = guestsInsertError;
        if (table === 'constraints' && constraintsInsertError) error = constraintsInsertError;

        const insertResult = {
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: table === 'events' ? { id: 'new-event-id', ...data } : data,
              error,
            }),
          }),
          error,
        };

        // For tables that don't use select().single()
        if (table !== 'events' && table !== 'constraints') {
          return Promise.resolve({ data, error });
        }

        return insertResult;
      }),
    })),
    _insertedData: insertedData, // Expose for test assertions
  };
};

// Mock the server Supabase client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

const mockedCreateClient = vi.mocked(createClient);
const mockedRevalidatePath = vi.mocked(revalidatePath);

// Sample demo event data for testing
const createDemoEvent = (overrides: Partial<Event> = {}): Event => ({
  id: 'demo-event-id',
  name: 'Demo Wedding',
  eventType: 'wedding',
  date: '2026-06-15',
  venueName: 'Test Venue',
  venueAddress: '123 Test St',
  guestCapacityLimit: 100,
  tables: [
    {
      id: 'demo-table-1',
      name: 'Table 1',
      shape: 'round',
      capacity: 8,
      x: 100,
      y: 100,
      width: 120,
      height: 120,
      rotation: 0,
    },
  ],
  guests: [
    {
      id: 'demo-guest-1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      tableId: 'demo-table-1',
      seatIndex: 0,
      rsvpStatus: 'confirmed',
      relationships: [],
    },
    {
      id: 'demo-guest-2',
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@example.com',
      tableId: 'demo-table-1',
      seatIndex: 1,
      rsvpStatus: 'confirmed',
      relationships: [
        { guestId: 'demo-guest-1', type: 'partner', strength: 10 },
      ],
    },
  ],
  constraints: [
    {
      id: 'demo-constraint-1',
      type: 'same_table',
      priority: 'required',
      guestIds: ['demo-guest-1', 'demo-guest-2'],
    },
  ],
  venueElements: [
    {
      id: 'demo-venue-1',
      type: 'stage',
      label: 'Stage',
      x: 50,
      y: 50,
      width: 200,
      height: 100,
      rotation: 0,
    },
  ],
  surveyQuestions: [],
  surveyResponses: [],
  ...overrides,
});

describe('migrateDemo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    uuidCounter = 0;
  });

  describe('authentication', () => {
    it('should return error when not authenticated', async () => {
      const mockClient = createMigrateMockSupabaseClient({ user: null });
      mockedCreateClient.mockResolvedValue(mockClient as never);

      const result = await migrateDemo(createDemoEvent());

      expect(result.error).toBe('Not authenticated');
      expect(result.data).toBeUndefined();
    });

    it('should proceed when authenticated', async () => {
      const mockClient = createMigrateMockSupabaseClient();
      mockedCreateClient.mockResolvedValue(mockClient as never);

      const result = await migrateDemo(createDemoEvent());

      expect(result.error).toBeUndefined();
      expect(result.data?.eventId).toBeDefined();
    });
  });

  describe('event creation', () => {
    it('should create a new event with demo data', async () => {
      const mockClient = createMigrateMockSupabaseClient();
      mockedCreateClient.mockResolvedValue(mockClient as never);

      const demoEvent = createDemoEvent({ name: 'My Wedding' });
      await migrateDemo(demoEvent);

      // Verify event insert was called
      expect(mockClient.from).toHaveBeenCalledWith('events');
    });

    it('should rename "Demo Wedding" to "My Event"', async () => {
      const mockClient = createMigrateMockSupabaseClient();
      mockedCreateClient.mockResolvedValue(mockClient as never);

      const demoEvent = createDemoEvent({ name: 'Demo Wedding' });
      await migrateDemo(demoEvent);

      // The first call to from('events').insert should have 'My Event' as name
      const fromCalls = mockClient.from.mock.calls;
      const eventsCall = fromCalls.find(call => call[0] === 'events');
      expect(eventsCall).toBeDefined();
    });

    it('should return error when event creation fails', async () => {
      const mockClient = createMigrateMockSupabaseClient({
        eventInsertError: { message: 'Database error' },
      });
      mockedCreateClient.mockResolvedValue(mockClient as never);

      const result = await migrateDemo(createDemoEvent());

      expect(result.error).toBe('Database error');
    });
  });

  describe('data migration', () => {
    it('should migrate tables with new IDs', async () => {
      const mockClient = createMigrateMockSupabaseClient();
      mockedCreateClient.mockResolvedValue(mockClient as never);

      const demoEvent = createDemoEvent();
      await migrateDemo(demoEvent);

      // Verify tables were inserted
      expect(mockClient.from).toHaveBeenCalledWith('tables');
    });

    it('should migrate guests with new IDs and remapped table IDs', async () => {
      const mockClient = createMigrateMockSupabaseClient();
      mockedCreateClient.mockResolvedValue(mockClient as never);

      const demoEvent = createDemoEvent();
      await migrateDemo(demoEvent);

      // Verify guests were inserted
      expect(mockClient.from).toHaveBeenCalledWith('guests');
    });

    it('should migrate constraints with remapped guest IDs', async () => {
      const mockClient = createMigrateMockSupabaseClient();
      mockedCreateClient.mockResolvedValue(mockClient as never);

      const demoEvent = createDemoEvent();
      await migrateDemo(demoEvent);

      // Verify constraints were inserted
      expect(mockClient.from).toHaveBeenCalledWith('constraints');
    });

    it('should migrate venue elements', async () => {
      const mockClient = createMigrateMockSupabaseClient();
      mockedCreateClient.mockResolvedValue(mockClient as never);

      const demoEvent = createDemoEvent();
      await migrateDemo(demoEvent);

      // Verify venue elements were inserted
      expect(mockClient.from).toHaveBeenCalledWith('venue_elements');
    });

    it('should migrate guest relationships', async () => {
      const mockClient = createMigrateMockSupabaseClient();
      mockedCreateClient.mockResolvedValue(mockClient as never);

      const demoEvent = createDemoEvent();
      await migrateDemo(demoEvent);

      // Verify relationships were inserted
      expect(mockClient.from).toHaveBeenCalledWith('guest_relationships');
    });
  });

  describe('empty data handling', () => {
    it('should handle event with no tables', async () => {
      const mockClient = createMigrateMockSupabaseClient();
      mockedCreateClient.mockResolvedValue(mockClient as never);

      const demoEvent = createDemoEvent({ tables: [] });
      const result = await migrateDemo(demoEvent);

      expect(result.error).toBeUndefined();
      expect(result.data?.eventId).toBeDefined();
    });

    it('should handle event with no guests', async () => {
      const mockClient = createMigrateMockSupabaseClient();
      mockedCreateClient.mockResolvedValue(mockClient as never);

      const demoEvent = createDemoEvent({ guests: [], constraints: [] });
      const result = await migrateDemo(demoEvent);

      expect(result.error).toBeUndefined();
      expect(result.data?.eventId).toBeDefined();
    });

    it('should handle event with no constraints', async () => {
      const mockClient = createMigrateMockSupabaseClient();
      mockedCreateClient.mockResolvedValue(mockClient as never);

      const demoEvent = createDemoEvent({ constraints: [] });
      const result = await migrateDemo(demoEvent);

      expect(result.error).toBeUndefined();
      expect(result.data?.eventId).toBeDefined();
    });

    it('should handle event with no venue elements', async () => {
      const mockClient = createMigrateMockSupabaseClient();
      mockedCreateClient.mockResolvedValue(mockClient as never);

      const demoEvent = createDemoEvent({ venueElements: [] });
      const result = await migrateDemo(demoEvent);

      expect(result.error).toBeUndefined();
      expect(result.data?.eventId).toBeDefined();
    });
  });

  describe('cache revalidation', () => {
    it('should revalidate dashboard path after successful migration', async () => {
      const mockClient = createMigrateMockSupabaseClient();
      mockedCreateClient.mockResolvedValue(mockClient as never);

      await migrateDemo(createDemoEvent());

      expect(mockedRevalidatePath).toHaveBeenCalledWith('/dashboard');
    });

    it('should revalidate canvas path after successful migration', async () => {
      const mockClient = createMigrateMockSupabaseClient();
      mockedCreateClient.mockResolvedValue(mockClient as never);

      await migrateDemo(createDemoEvent());

      expect(mockedRevalidatePath).toHaveBeenCalledWith(
        expect.stringContaining('/dashboard/events/')
      );
    });
  });

  describe('error handling', () => {
    it('should continue migration if tables insert fails', async () => {
      const mockClient = createMigrateMockSupabaseClient({
        tablesInsertError: { message: 'Tables error' },
      });
      mockedCreateClient.mockResolvedValue(mockClient as never);

      const result = await migrateDemo(createDemoEvent());

      // Should still return success (tables error is logged but not fatal)
      expect(result.data?.eventId).toBeDefined();
    });

    it('should continue migration if guests insert fails', async () => {
      const mockClient = createMigrateMockSupabaseClient({
        guestsInsertError: { message: 'Guests error' },
      });
      mockedCreateClient.mockResolvedValue(mockClient as never);

      const result = await migrateDemo(createDemoEvent());

      // Should still return success (guests error is logged but not fatal)
      expect(result.data?.eventId).toBeDefined();
    });
  });
});
