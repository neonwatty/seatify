import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from './useStore';
import type { Guest, Table, Event } from '@/types';

// Helper to create mock guest
const createGuest = (overrides: Partial<Guest> = {}): Guest => ({
  id: `guest-${Math.random().toString(36).substr(2, 9)}`,
  firstName: 'Test',
  lastName: 'Guest',
  rsvpStatus: 'confirmed',
  relationships: [],
  interests: [],
  dietaryRestrictions: [],
  accessibilityNeeds: [],
  ...overrides,
});

// Helper to create mock table
const createTable = (overrides: Partial<Table> = {}): Table => ({
  id: `table-${Math.random().toString(36).substr(2, 9)}`,
  name: 'Table 1',
  shape: 'round',
  capacity: 8,
  x: 100,
  y: 100,
  width: 100,
  height: 100,
  rotation: 0,
  ...overrides,
});

// Helper to create a test event
const createTestEvent = (overrides: Partial<Event> = {}): Event => ({
  id: 'event-1',
  name: 'Test Event',
  eventType: 'wedding',
  tables: [],
  guests: [],
  venueElements: [],
  constraints: [],
  surveyQuestions: [],
  surveyResponses: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

// Helper to set up store with an event
const setupStore = (eventOverrides: Partial<Event> = {}) => {
  const event = createTestEvent(eventOverrides);
  useStore.setState({
    events: [event],
    currentEventId: event.id,
    event: event,
  });
  return event;
};

describe('optimizeSeating', () => {
  beforeEach(() => {
    // Reset store state before each test
    const emptyEvent = createTestEvent();
    useStore.setState({
      events: [],
      currentEventId: null,
      event: emptyEvent,
    });
  });

  describe('Partner Relationships', () => {
    it('should seat partners together at the same table', () => {
      // Setup: Two guests who are partners
      const guestA = createGuest({
        id: 'guest-a',
        firstName: 'Alice',
        relationships: [{ guestId: 'guest-b', type: 'partner', strength: 5 }]
      });
      const guestB = createGuest({
        id: 'guest-b',
        firstName: 'Bob',
        relationships: [{ guestId: 'guest-a', type: 'partner', strength: 5 }]
      });
      const table = createTable({ id: 'table-1', capacity: 8 });

      setupStore({
        tables: [table],
        guests: [guestA, guestB],
      });

      // Run optimization
      useStore.getState().optimizeSeating();

      // Verify: Both partners should be at the same table
      const event = useStore.getState().event;
      const seatedA = event.guests.find(g => g.id === 'guest-a');
      const seatedB = event.guests.find(g => g.id === 'guest-b');

      expect(seatedA?.tableId).toBeDefined();
      expect(seatedB?.tableId).toBeDefined();
      expect(seatedA?.tableId).toBe(seatedB?.tableId);
    });

    it('should handle partner when one declines RSVP', () => {
      const guestA = createGuest({
        id: 'guest-a',
        rsvpStatus: 'confirmed',
        relationships: [{ guestId: 'guest-b', type: 'partner', strength: 5 }]
      });
      const guestB = createGuest({
        id: 'guest-b',
        rsvpStatus: 'declined',
        relationships: [{ guestId: 'guest-a', type: 'partner', strength: 5 }]
      });
      const table = createTable({ capacity: 8 });

      setupStore({
        tables: [table],
        guests: [guestA, guestB],
      });

      useStore.getState().optimizeSeating();

      const event = useStore.getState().event;
      const seatedA = event.guests.find(g => g.id === 'guest-a');
      const seatedB = event.guests.find(g => g.id === 'guest-b');

      // A should be seated, B should NOT be seated (declined)
      expect(seatedA?.tableId).toBeDefined();
      expect(seatedB?.tableId).toBeUndefined();
    });
  });

  describe('Family Relationships', () => {
    it('should seat family members together', () => {
      const guests = [
        createGuest({
          id: 'guest-1',
          firstName: 'Parent',
          relationships: [
            { guestId: 'guest-2', type: 'family', strength: 4 },
            { guestId: 'guest-3', type: 'family', strength: 4 },
          ]
        }),
        createGuest({
          id: 'guest-2',
          firstName: 'Child1',
          relationships: [{ guestId: 'guest-1', type: 'family', strength: 4 }]
        }),
        createGuest({
          id: 'guest-3',
          firstName: 'Child2',
          relationships: [{ guestId: 'guest-1', type: 'family', strength: 4 }]
        }),
      ];
      const table = createTable({ capacity: 10 });

      setupStore({
        tables: [table],
        guests,
      });

      useStore.getState().optimizeSeating();

      const event = useStore.getState().event;
      const tableIds = event.guests.map(g => g.tableId);

      // All family members should be at the same table
      expect(new Set(tableIds).size).toBe(1);
    });
  });

  describe('Avoid Relationships', () => {
    it('should separate guests who should avoid each other', () => {
      const guestA = createGuest({
        id: 'guest-a',
        relationships: [{ guestId: 'guest-b', type: 'avoid', strength: 5 }]
      });
      const guestB = createGuest({
        id: 'guest-b',
        relationships: [{ guestId: 'guest-a', type: 'avoid', strength: 5 }]
      });
      const guestC = createGuest({ id: 'guest-c' });

      const table1 = createTable({ id: 'table-1', capacity: 4 });
      const table2 = createTable({ id: 'table-2', capacity: 4 });

      setupStore({
        tables: [table1, table2],
        guests: [guestA, guestB, guestC],
      });

      useStore.getState().optimizeSeating();

      const event = useStore.getState().event;
      const seatedA = event.guests.find(g => g.id === 'guest-a');
      const seatedB = event.guests.find(g => g.id === 'guest-b');

      // A and B should be at DIFFERENT tables
      expect(seatedA?.tableId).toBeDefined();
      expect(seatedB?.tableId).toBeDefined();
      expect(seatedA?.tableId).not.toBe(seatedB?.tableId);
    });
  });

  describe('Constraints', () => {
    // Note: The optimizer currently uses relationships for seating decisions,
    // not the explicit constraints array. These tests verify the relationship-based
    // behavior that achieves similar outcomes.

    it('should seat guests together when they have partner relationship (like seat_together)', () => {
      // Use partner relationship to achieve seat_together behavior
      const guests = [
        createGuest({
          id: 'guest-a',
          firstName: 'Alice',
          relationships: [{ guestId: 'guest-b', type: 'partner', strength: 5 }]
        }),
        createGuest({
          id: 'guest-b',
          firstName: 'Bob',
          relationships: [{ guestId: 'guest-a', type: 'partner', strength: 5 }]
        }),
        createGuest({ id: 'guest-c', firstName: 'Charlie' }),
      ];
      const table1 = createTable({ id: 'table-1', capacity: 4 });
      const table2 = createTable({ id: 'table-2', capacity: 4 });

      setupStore({
        tables: [table1, table2],
        guests,
      });

      useStore.getState().optimizeSeating();

      const event = useStore.getState().event;
      const seatedA = event.guests.find(g => g.id === 'guest-a');
      const seatedB = event.guests.find(g => g.id === 'guest-b');

      // Partners should be seated together
      expect(seatedA?.tableId).toBe(seatedB?.tableId);
    });

    it('should separate guests with avoid relationship (like keep_apart)', () => {
      // Use avoid relationship to achieve keep_apart behavior
      const guests = [
        createGuest({
          id: 'guest-a',
          firstName: 'Alice',
          relationships: [{ guestId: 'guest-b', type: 'avoid', strength: 5 }]
        }),
        createGuest({
          id: 'guest-b',
          firstName: 'Bob',
          relationships: [{ guestId: 'guest-a', type: 'avoid', strength: 5 }]
        }),
      ];
      const table1 = createTable({ id: 'table-1', capacity: 4 });
      const table2 = createTable({ id: 'table-2', capacity: 4 });

      setupStore({
        tables: [table1, table2],
        guests,
      });

      useStore.getState().optimizeSeating();

      const event = useStore.getState().event;
      const seatedA = event.guests.find(g => g.id === 'guest-a');
      const seatedB = event.guests.find(g => g.id === 'guest-b');

      // Guests with avoid relationship should be at different tables
      expect(seatedA?.tableId).not.toBe(seatedB?.tableId);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero confirmed guests', () => {
      const guests = [
        createGuest({ rsvpStatus: 'declined' }),
        createGuest({ rsvpStatus: 'pending' }),
      ];
      const table = createTable({ capacity: 8 });

      setupStore({
        tables: [table],
        guests,
      });

      // Should not throw
      expect(() => useStore.getState().optimizeSeating()).not.toThrow();

      // No guests should be seated (pending guests might be seated depending on impl)
      const event = useStore.getState().event;
      const _seatedGuests = event.guests.filter(g => g.tableId !== undefined);
      // At minimum, declined guests should not be seated
      const declinedSeated = event.guests.filter(g => g.rsvpStatus === 'declined' && g.tableId);
      expect(declinedSeated.length).toBe(0);
    });

    it('should handle single guest', () => {
      const guest = createGuest({ id: 'guest-1', rsvpStatus: 'confirmed' });
      const table = createTable({ id: 'table-1', capacity: 8 });

      setupStore({
        tables: [table],
        guests: [guest],
      });

      useStore.getState().optimizeSeating();

      const event = useStore.getState().event;
      expect(event.guests[0].tableId).toBe(table.id);
    });

    it('should handle more guests than total capacity', () => {
      const guests = Array.from({ length: 20 }, (_, i) =>
        createGuest({ id: `guest-${i}`, rsvpStatus: 'confirmed' })
      );
      const table = createTable({ id: 'table-1', capacity: 8 });

      setupStore({
        tables: [table],
        guests,
      });

      useStore.getState().optimizeSeating();

      const event = useStore.getState().event;
      const seatedCount = event.guests.filter(g => g.tableId).length;
      const unseatedCount = event.guests.filter(g => !g.tableId).length;

      // Only 8 should be seated
      expect(seatedCount).toBe(8);
      expect(unseatedCount).toBe(12);
    });

    it('should handle no tables', () => {
      const guest = createGuest({ rsvpStatus: 'confirmed' });

      setupStore({
        tables: [],
        guests: [guest],
      });

      // Should not throw
      expect(() => useStore.getState().optimizeSeating()).not.toThrow();

      // Guest should remain unseated
      const event = useStore.getState().event;
      expect(event.guests[0].tableId).toBeUndefined();
    });

    it('should handle empty event', () => {
      setupStore({
        tables: [],
        guests: [],
      });

      // Should not throw
      expect(() => useStore.getState().optimizeSeating()).not.toThrow();
    });

    it('should handle no current event', () => {
      useStore.setState({
        events: [],
        currentEventId: null,
      });

      // Should not throw
      expect(() => useStore.getState().optimizeSeating()).not.toThrow();
    });
  });

  describe('Optimization Result', () => {
    it('should return optimization statistics', () => {
      const guests = [
        createGuest({ id: 'guest-1', rsvpStatus: 'confirmed' }),
        createGuest({ id: 'guest-2', rsvpStatus: 'confirmed' }),
      ];
      const table = createTable({ capacity: 8 });

      setupStore({
        tables: [table],
        guests,
      });

      const result = useStore.getState().optimizeSeating();

      expect(result).toBeDefined();
      expect(typeof result.beforeScore).toBe('number');
      expect(typeof result.afterScore).toBe('number');
      expect(Array.isArray(result.movedGuests)).toBe(true);
      expect(typeof result.newlySeated).toBe('number');
    });

    it('should report newly seated count correctly', () => {
      const guests = [
        createGuest({ id: 'guest-1', rsvpStatus: 'confirmed' }),
        createGuest({ id: 'guest-2', rsvpStatus: 'confirmed' }),
        createGuest({ id: 'guest-3', rsvpStatus: 'confirmed' }),
      ];
      const table = createTable({ capacity: 8 });

      setupStore({
        tables: [table],
        guests,
      });

      const result = useStore.getState().optimizeSeating();

      // All 3 guests should be newly seated
      expect(result.newlySeated).toBe(3);
    });
  });

  describe('Score Calculation', () => {
    it('should improve score when seating partners together', () => {
      const guestA = createGuest({
        id: 'guest-a',
        relationships: [{ guestId: 'guest-b', type: 'partner', strength: 5 }]
      });
      const guestB = createGuest({
        id: 'guest-b',
        relationships: [{ guestId: 'guest-a', type: 'partner', strength: 5 }]
      });
      const table = createTable({ capacity: 8 });

      setupStore({
        tables: [table],
        guests: [guestA, guestB],
      });

      const result = useStore.getState().optimizeSeating();

      // After seating partners together, score should be positive
      expect(result.afterScore).toBeGreaterThan(0);
    });
  });

  describe('Multiple Tables', () => {
    it('should distribute guests across multiple tables', () => {
      const guests = Array.from({ length: 16 }, (_, i) =>
        createGuest({ id: `guest-${i}`, rsvpStatus: 'confirmed' })
      );
      const table1 = createTable({ id: 'table-1', capacity: 8 });
      const table2 = createTable({ id: 'table-2', capacity: 8 });

      setupStore({
        tables: [table1, table2],
        guests,
      });

      useStore.getState().optimizeSeating();

      const event = useStore.getState().event;
      const table1Guests = event.guests.filter(g => g.tableId === 'table-1');
      const table2Guests = event.guests.filter(g => g.tableId === 'table-2');

      // Both tables should have guests
      expect(table1Guests.length).toBe(8);
      expect(table2Guests.length).toBe(8);
    });

    it('should not exceed table capacity', () => {
      const guests = Array.from({ length: 10 }, (_, i) =>
        createGuest({ id: `guest-${i}`, rsvpStatus: 'confirmed' })
      );
      const table = createTable({ id: 'table-1', capacity: 4 });

      setupStore({
        tables: [table],
        guests,
      });

      useStore.getState().optimizeSeating();

      const event = useStore.getState().event;
      const tableGuests = event.guests.filter(g => g.tableId === 'table-1');

      // Should not exceed capacity
      expect(tableGuests.length).toBeLessThanOrEqual(4);
    });
  });
});
