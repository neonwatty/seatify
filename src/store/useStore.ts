import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type { Guest, Table, Constraint, Event, CanvasState, TableShape } from '../types';

interface AppState {
  // Current event
  event: Event;
  canvas: CanvasState;

  // View state
  activeView: 'canvas' | 'guests' | 'survey' | 'optimize';
  sidebarOpen: boolean;

  // Actions - Event
  setEventName: (name: string) => void;
  setEventType: (type: Event['type']) => void;

  // Actions - Tables
  addTable: (shape: TableShape, x: number, y: number) => void;
  updateTable: (id: string, updates: Partial<Table>) => void;
  removeTable: (id: string) => void;
  moveTable: (id: string, x: number, y: number) => void;

  // Actions - Guests
  addGuest: (guest: Omit<Guest, 'id' | 'relationships' | 'rsvpStatus'>) => void;
  updateGuest: (id: string, updates: Partial<Guest>) => void;
  removeGuest: (id: string) => void;
  assignGuestToTable: (guestId: string, tableId: string | undefined, seatIndex?: number) => void;
  addRelationship: (guestId: string, targetGuestId: string, type: Guest['relationships'][0]['type'], strength: number) => void;
  removeRelationship: (guestId: string, targetGuestId: string) => void;
  importGuests: (guests: Partial<Guest>[]) => void;

  // Actions - Constraints
  addConstraint: (constraint: Omit<Constraint, 'id'>) => void;
  removeConstraint: (id: string) => void;

  // Actions - Canvas
  setZoom: (zoom: number) => void;
  setPan: (x: number, y: number) => void;
  selectTable: (id: string | null) => void;
  selectGuest: (id: string | null) => void;

  // Actions - View
  setActiveView: (view: AppState['activeView']) => void;
  toggleSidebar: () => void;

  // Actions - Persistence
  resetEvent: () => void;
  exportEvent: () => string;
  importEvent: (json: string) => void;
}

const createDefaultEvent = (): Event => ({
  id: uuidv4(),
  name: 'My Event',
  type: 'wedding',
  tables: [],
  guests: [],
  constraints: [],
  surveyQuestions: [
    {
      id: uuidv4(),
      question: 'What are your interests or hobbies?',
      type: 'text',
      required: false,
    },
    {
      id: uuidv4(),
      question: 'Do you know anyone else attending? If so, who?',
      type: 'text',
      required: false,
    },
    {
      id: uuidv4(),
      question: 'Any dietary restrictions?',
      type: 'multiselect',
      options: ['Vegetarian', 'Vegan', 'Gluten-free', 'Kosher', 'Halal', 'Nut allergy', 'None'],
      required: false,
    },
  ],
  surveyResponses: [],
});

const getTableDefaults = (shape: TableShape): { width: number; height: number; capacity: number } => {
  switch (shape) {
    case 'round':
      return { width: 120, height: 120, capacity: 8 };
    case 'rectangle':
      return { width: 200, height: 80, capacity: 10 };
    case 'square':
      return { width: 100, height: 100, capacity: 8 };
  }
};

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      event: createDefaultEvent(),
      canvas: {
        zoom: 1,
        panX: 0,
        panY: 0,
        selectedTableId: null,
        selectedGuestId: null,
      },
      activeView: 'canvas',
      sidebarOpen: true,

      // Event actions
      setEventName: (name) =>
        set((state) => ({
          event: { ...state.event, name },
        })),

      setEventType: (type) =>
        set((state) => ({
          event: { ...state.event, type },
        })),

      // Table actions
      addTable: (shape, x, y) => {
        const defaults = getTableDefaults(shape);
        const tableCount = get().event.tables.length;
        const newTable: Table = {
          id: uuidv4(),
          name: `Table ${tableCount + 1}`,
          shape,
          x,
          y,
          ...defaults,
        };
        set((state) => ({
          event: {
            ...state.event,
            tables: [...state.event.tables, newTable],
          },
        }));
      },

      updateTable: (id, updates) =>
        set((state) => ({
          event: {
            ...state.event,
            tables: state.event.tables.map((t) =>
              t.id === id ? { ...t, ...updates } : t
            ),
          },
        })),

      removeTable: (id) =>
        set((state) => ({
          event: {
            ...state.event,
            tables: state.event.tables.filter((t) => t.id !== id),
            guests: state.event.guests.map((g) =>
              g.tableId === id ? { ...g, tableId: undefined, seatIndex: undefined } : g
            ),
          },
          canvas: {
            ...state.canvas,
            selectedTableId: state.canvas.selectedTableId === id ? null : state.canvas.selectedTableId,
          },
        })),

      moveTable: (id, x, y) =>
        set((state) => ({
          event: {
            ...state.event,
            tables: state.event.tables.map((t) =>
              t.id === id ? { ...t, x, y } : t
            ),
          },
        })),

      // Guest actions
      addGuest: (guestData) => {
        const newGuest: Guest = {
          id: uuidv4(),
          relationships: [],
          rsvpStatus: 'pending',
          ...guestData,
        };
        set((state) => ({
          event: {
            ...state.event,
            guests: [...state.event.guests, newGuest],
          },
        }));
      },

      updateGuest: (id, updates) =>
        set((state) => ({
          event: {
            ...state.event,
            guests: state.event.guests.map((g) =>
              g.id === id ? { ...g, ...updates } : g
            ),
          },
        })),

      removeGuest: (id) =>
        set((state) => ({
          event: {
            ...state.event,
            guests: state.event.guests.filter((g) => g.id !== id).map((g) => ({
              ...g,
              relationships: g.relationships.filter((r) => r.guestId !== id),
            })),
          },
          canvas: {
            ...state.canvas,
            selectedGuestId: state.canvas.selectedGuestId === id ? null : state.canvas.selectedGuestId,
          },
        })),

      assignGuestToTable: (guestId, tableId, seatIndex) =>
        set((state) => ({
          event: {
            ...state.event,
            guests: state.event.guests.map((g) =>
              g.id === guestId ? { ...g, tableId, seatIndex } : g
            ),
          },
        })),

      addRelationship: (guestId, targetGuestId, type, strength) =>
        set((state) => ({
          event: {
            ...state.event,
            guests: state.event.guests.map((g) => {
              if (g.id === guestId) {
                const existingIdx = g.relationships.findIndex((r) => r.guestId === targetGuestId);
                if (existingIdx >= 0) {
                  const updated = [...g.relationships];
                  updated[existingIdx] = { guestId: targetGuestId, type, strength };
                  return { ...g, relationships: updated };
                }
                return {
                  ...g,
                  relationships: [...g.relationships, { guestId: targetGuestId, type, strength }],
                };
              }
              return g;
            }),
          },
        })),

      removeRelationship: (guestId, targetGuestId) =>
        set((state) => ({
          event: {
            ...state.event,
            guests: state.event.guests.map((g) =>
              g.id === guestId
                ? { ...g, relationships: g.relationships.filter((r) => r.guestId !== targetGuestId) }
                : g
            ),
          },
        })),

      importGuests: (guests) =>
        set((state) => ({
          event: {
            ...state.event,
            guests: [
              ...state.event.guests,
              ...guests.map((g) => ({
                id: uuidv4(),
                name: g.name || 'Unknown',
                relationships: [],
                rsvpStatus: 'pending' as const,
                ...g,
              })),
            ],
          },
        })),

      // Constraint actions
      addConstraint: (constraint) =>
        set((state) => ({
          event: {
            ...state.event,
            constraints: [...state.event.constraints, { ...constraint, id: uuidv4() }],
          },
        })),

      removeConstraint: (id) =>
        set((state) => ({
          event: {
            ...state.event,
            constraints: state.event.constraints.filter((c) => c.id !== id),
          },
        })),

      // Canvas actions
      setZoom: (zoom) =>
        set((state) => ({
          canvas: { ...state.canvas, zoom: Math.max(0.25, Math.min(2, zoom)) },
        })),

      setPan: (panX, panY) =>
        set((state) => ({
          canvas: { ...state.canvas, panX, panY },
        })),

      selectTable: (id) =>
        set((state) => ({
          canvas: { ...state.canvas, selectedTableId: id, selectedGuestId: null },
        })),

      selectGuest: (id) =>
        set((state) => ({
          canvas: { ...state.canvas, selectedGuestId: id, selectedTableId: null },
        })),

      // View actions
      setActiveView: (activeView) => set({ activeView }),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

      // Persistence
      resetEvent: () => set({ event: createDefaultEvent() }),

      exportEvent: () => JSON.stringify(get().event, null, 2),

      importEvent: (json) => {
        try {
          const event = JSON.parse(json) as Event;
          set({ event });
        } catch (e) {
          console.error('Failed to import event:', e);
        }
      },
    }),
    {
      name: 'seating-arrangement-storage',
      partialize: (state) => ({ event: state.event }),
    }
  )
);
