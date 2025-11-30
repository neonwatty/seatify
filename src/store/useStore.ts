import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type { Guest, Table, Constraint, Event, CanvasState, TableShape, SurveyQuestion, SurveyResponse, CanvasPreferences, AlignmentGuide, ConstraintViolation, VenueElement, VenueElementType } from '../types';
import { demoTables, demoGuests, demoConstraints, demoSurveyQuestions, demoEventMetadata } from '../data/demoData';

// Helper function to detect constraint violations
function detectConstraintViolations(event: Event): ConstraintViolation[] {
  const violations: ConstraintViolation[] = [];
  const guestMap = new Map(event.guests.map(g => [g.id, g]));

  for (const constraint of event.constraints) {
    const guests = constraint.guestIds.map(id => guestMap.get(id)).filter(Boolean) as Guest[];
    if (guests.length < 2) continue;

    const tableIds = [...new Set(guests.map(g => g.tableId).filter(Boolean))] as string[];

    switch (constraint.type) {
      case 'same_table':
      case 'must_sit_together': {
        // All guests must be at the same table
        const assignedGuests = guests.filter(g => g.tableId);
        if (assignedGuests.length >= 2) {
          const tables = new Set(assignedGuests.map(g => g.tableId));
          if (tables.size > 1) {
            violations.push({
              constraintId: constraint.id,
              constraintType: constraint.type,
              priority: constraint.priority,
              description: constraint.description || `${guests.map(g => g.name).join(', ')} should be seated together`,
              guestIds: constraint.guestIds,
              tableIds,
            });
          }
        }
        break;
      }

      case 'different_table':
      case 'must_not_sit_together': {
        // Guests must be at different tables
        const assignedGuests = guests.filter(g => g.tableId);
        if (assignedGuests.length >= 2) {
          const tableGroups = new Map<string, Guest[]>();
          for (const guest of assignedGuests) {
            if (!guest.tableId) continue;
            const group = tableGroups.get(guest.tableId) || [];
            group.push(guest);
            tableGroups.set(guest.tableId, group);
          }
          // Check if any table has more than one of the constrained guests
          for (const [tableId, guestsAtTable] of tableGroups) {
            if (guestsAtTable.length > 1) {
              violations.push({
                constraintId: constraint.id,
                constraintType: constraint.type,
                priority: constraint.priority,
                description: constraint.description || `${guestsAtTable.map(g => g.name).join(' and ')} should not be seated together`,
                guestIds: guestsAtTable.map(g => g.id),
                tableIds: [tableId],
              });
            }
          }
        }
        break;
      }

      // Note: 'near_front' and 'accessibility' constraints would need spatial logic
      // which depends on table positions - those can be added later
    }
  }

  return violations;
}

// History for undo/redo
interface HistoryEntry {
  event: Event;
  description: string;
}

const MAX_HISTORY_SIZE = 50;

interface AppState {
  // Current event
  event: Event;
  canvas: CanvasState;
  canvasPrefs: CanvasPreferences;

  // Undo/Redo history
  history: HistoryEntry[];
  historyIndex: number;

  // Alignment guides (computed during drag)
  alignmentGuides: AlignmentGuide[];

  // View state
  activeView: 'dashboard' | 'canvas' | 'guests';
  sidebarOpen: boolean;

  // Context menu state
  contextMenu: {
    isOpen: boolean;
    x: number;
    y: number;
    targetType: 'table' | 'guest' | 'canvas' | null;
    targetId: string | null;
  };

  // Actions - Event
  setEventName: (name: string) => void;
  setEventType: (type: Event['type']) => void;

  // Actions - Tables
  addTable: (shape: TableShape, x: number, y: number) => void;
  updateTable: (id: string, updates: Partial<Table>) => void;
  removeTable: (id: string) => void;
  moveTable: (id: string, x: number, y: number) => void;

  // Actions - Venue Elements
  addVenueElement: (type: VenueElementType, x: number, y: number) => void;
  updateVenueElement: (id: string, updates: Partial<VenueElement>) => void;
  removeVenueElement: (id: string) => void;
  moveVenueElement: (id: string, x: number, y: number) => void;
  selectVenueElement: (id: string | null) => void;

  // Actions - Guests
  addGuest: (guest: Omit<Guest, 'id' | 'relationships' | 'rsvpStatus'>) => void;
  addQuickGuest: (canvasX: number, canvasY: number) => string;
  updateGuest: (id: string, updates: Partial<Guest>) => void;
  removeGuest: (id: string) => void;
  assignGuestToTable: (guestId: string, tableId: string | undefined, seatIndex?: number) => void;
  moveGuestOnCanvas: (guestId: string, x: number, y: number) => void;
  detachGuestFromTable: (guestId: string, canvasX: number, canvasY: number) => void;
  swapGuestSeats: (guestId1: string, guestId2: string) => void;
  addRelationship: (guestId: string, targetGuestId: string, type: Guest['relationships'][0]['type'], strength: number) => void;
  removeRelationship: (guestId: string, targetGuestId: string) => void;
  importGuests: (guests: Partial<Guest>[]) => void;

  // Actions - Constraints
  addConstraint: (constraint: Omit<Constraint, 'id'>) => void;
  removeConstraint: (id: string) => void;

  // Actions - Survey
  addSurveyQuestion: (question: Omit<SurveyQuestion, 'id'>) => void;
  updateSurveyQuestion: (id: string, updates: Partial<SurveyQuestion>) => void;
  removeSurveyQuestion: (id: string) => void;
  reorderSurveyQuestions: (questionIds: string[]) => void;
  addSurveyResponse: (response: SurveyResponse) => void;

  // Actions - Canvas
  setZoom: (zoom: number) => void;
  setPan: (x: number, y: number) => void;
  selectTable: (id: string | null) => void;
  selectGuest: (id: string | null) => void;

  // Actions - Multi-Select
  toggleTableSelection: (id: string) => void;
  addTableToSelection: (id: string) => void;
  selectMultipleTables: (ids: string[]) => void;
  selectAllTables: () => void;
  clearTableSelection: () => void;
  toggleGuestSelection: (id: string) => void;
  addGuestToSelection: (id: string) => void;
  selectMultipleGuests: (ids: string[]) => void;
  clearGuestSelection: () => void;
  clearAllSelection: () => void;

  // Actions - Batch Operations
  batchAssignGuests: (guestIds: string[], tableId: string) => void;
  batchRemoveGuests: (guestIds: string[]) => void;
  batchRemoveTables: (tableIds: string[]) => void;

  // Actions - Layout Tools
  alignTables: (tableIds: string[], alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => void;
  distributeTables: (tableIds: string[], direction: 'horizontal' | 'vertical') => void;
  autoArrangeTables: (tableIds: string[]) => void;

  // Actions - View
  setActiveView: (view: AppState['activeView']) => void;
  toggleSidebar: () => void;

  // Actions - Context Menu
  openContextMenu: (x: number, y: number, targetType: 'table' | 'guest' | 'canvas', targetId: string | null) => void;
  closeContextMenu: () => void;

  // Actions - Canvas Preferences
  toggleGrid: () => void;
  toggleSnapToGrid: () => void;
  setGridSize: (size: CanvasPreferences['gridSize']) => void;
  toggleAlignmentGuides: () => void;
  setAlignmentGuides: (guides: AlignmentGuide[]) => void;
  clearAlignmentGuides: () => void;

  // Actions - Undo/Redo
  undo: () => void;
  redo: () => void;
  pushHistory: (description: string) => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // Actions - Persistence
  resetEvent: () => void;
  exportEvent: () => string;
  importEvent: (json: string) => void;
  loadDemoData: () => void;

  // Computed - Constraint Violations
  getViolations: () => ConstraintViolation[];
  getViolationsForTable: (tableId: string) => ConstraintViolation[];
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
  venueElements: [],
});

const getTableDefaults = (shape: TableShape): { width: number; height: number; capacity: number } => {
  switch (shape) {
    case 'round':
      return { width: 120, height: 120, capacity: 8 };
    case 'rectangle':
      return { width: 200, height: 80, capacity: 10 };
    case 'square':
      return { width: 100, height: 100, capacity: 8 };
    case 'oval':
      return { width: 180, height: 120, capacity: 10 };
    case 'half-round':
      return { width: 160, height: 80, capacity: 5 };
    case 'serpentine':
      return { width: 300, height: 100, capacity: 0 }; // Buffet tables typically don't seat guests
  }
};

// Get venue element defaults by type
const getVenueElementDefaults = (type: VenueElementType): { width: number; height: number; label: string } => {
  switch (type) {
    case 'dance-floor':
      return { width: 200, height: 200, label: 'Dance Floor' };
    case 'stage':
      return { width: 300, height: 100, label: 'Stage' };
    case 'dj-booth':
      return { width: 100, height: 60, label: 'DJ Booth' };
    case 'bar':
      return { width: 200, height: 60, label: 'Bar' };
    case 'buffet':
      return { width: 240, height: 60, label: 'Buffet' };
    case 'entrance':
      return { width: 80, height: 40, label: 'Entrance' };
    case 'exit':
      return { width: 80, height: 40, label: 'Exit' };
    case 'photo-booth':
      return { width: 120, height: 120, label: 'Photo Booth' };
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
        selectedTableIds: [],
        selectedGuestIds: [],
        selectedVenueElementId: null,
      },
      canvasPrefs: {
        showGrid: true,
        snapToGrid: true,
        gridSize: 40,
        showAlignmentGuides: true,
      },
      history: [],
      historyIndex: -1,
      alignmentGuides: [],
      activeView: 'canvas',
      sidebarOpen: true,
      contextMenu: {
        isOpen: false,
        x: 0,
        y: 0,
        targetType: null,
        targetId: null,
      },

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
            selectedTableIds: state.canvas.selectedTableIds.filter((tid) => tid !== id),
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

      // Venue Element actions
      addVenueElement: (type, x, y) => {
        const defaults = getVenueElementDefaults(type);
        const newElement: VenueElement = {
          id: uuidv4(),
          type,
          label: defaults.label,
          x,
          y,
          width: defaults.width,
          height: defaults.height,
        };
        set((state) => ({
          event: {
            ...state.event,
            venueElements: [...(state.event.venueElements || []), newElement],
          },
        }));
      },

      updateVenueElement: (id, updates) =>
        set((state) => ({
          event: {
            ...state.event,
            venueElements: (state.event.venueElements || []).map((el) =>
              el.id === id ? { ...el, ...updates } : el
            ),
          },
        })),

      removeVenueElement: (id) =>
        set((state) => ({
          event: {
            ...state.event,
            venueElements: (state.event.venueElements || []).filter((el) => el.id !== id),
          },
          canvas: {
            ...state.canvas,
            selectedVenueElementId: state.canvas.selectedVenueElementId === id ? null : state.canvas.selectedVenueElementId,
          },
        })),

      moveVenueElement: (id, x, y) =>
        set((state) => ({
          event: {
            ...state.event,
            venueElements: (state.event.venueElements || []).map((el) =>
              el.id === id ? { ...el, x, y } : el
            ),
          },
        })),

      selectVenueElement: (id) =>
        set((state) => ({
          canvas: { ...state.canvas, selectedVenueElementId: id, selectedTableIds: [], selectedGuestIds: [] },
        })),

      // Guest actions
      addGuest: (guestData) => {
        // Calculate default canvas position for new unassigned guests
        const existingUnassigned = get().event.guests.filter((g) => !g.tableId);
        const defaultX = 80;
        const defaultY = 100 + existingUnassigned.length * 70;

        const newGuest: Guest = {
          id: uuidv4(),
          relationships: [],
          rsvpStatus: 'pending',
          canvasX: defaultX,
          canvasY: defaultY,
          ...guestData,
        };
        set((state) => ({
          event: {
            ...state.event,
            guests: [...state.event.guests, newGuest],
          },
        }));
      },

      addQuickGuest: (canvasX, canvasY) => {
        const guestCount = get().event.guests.length;
        const newId = uuidv4();
        const newGuest: Guest = {
          id: newId,
          name: `Guest ${guestCount + 1}`,
          canvasX,
          canvasY,
          rsvpStatus: 'pending',
          relationships: [],
        };
        set((state) => ({
          event: {
            ...state.event,
            guests: [...state.event.guests, newGuest],
          },
          canvas: {
            ...state.canvas,
            selectedGuestIds: [newId],
            selectedTableIds: [],
            selectedVenueElementId: null,
          },
        }));
        return newId;
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
            selectedGuestIds: state.canvas.selectedGuestIds.filter((gid) => gid !== id),
          },
        })),

      assignGuestToTable: (guestId, tableId, seatIndex) =>
        set((state) => ({
          event: {
            ...state.event,
            guests: state.event.guests.map((g) =>
              g.id === guestId
                ? { ...g, tableId, seatIndex, canvasX: undefined, canvasY: undefined }
                : g
            ),
          },
        })),

      moveGuestOnCanvas: (guestId, x, y) =>
        set((state) => ({
          event: {
            ...state.event,
            guests: state.event.guests.map((g) =>
              g.id === guestId ? { ...g, canvasX: x, canvasY: y } : g
            ),
          },
        })),

      detachGuestFromTable: (guestId, canvasX, canvasY) =>
        set((state) => ({
          event: {
            ...state.event,
            guests: state.event.guests.map((g) =>
              g.id === guestId
                ? { ...g, tableId: undefined, seatIndex: undefined, canvasX, canvasY }
                : g
            ),
          },
        })),

      swapGuestSeats: (guestId1, guestId2) =>
        set((state) => {
          const guest1 = state.event.guests.find((g) => g.id === guestId1);
          const guest2 = state.event.guests.find((g) => g.id === guestId2);
          if (!guest1 || !guest2) return state;

          return {
            event: {
              ...state.event,
              guests: state.event.guests.map((g) => {
                if (g.id === guestId1) {
                  return { ...g, tableId: guest2.tableId, seatIndex: guest2.seatIndex };
                }
                if (g.id === guestId2) {
                  return { ...g, tableId: guest1.tableId, seatIndex: guest1.seatIndex };
                }
                return g;
              }),
            },
          };
        }),

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

      // Survey actions
      addSurveyQuestion: (question) =>
        set((state) => ({
          event: {
            ...state.event,
            surveyQuestions: [...state.event.surveyQuestions, { ...question, id: uuidv4() }],
          },
        })),

      updateSurveyQuestion: (id, updates) =>
        set((state) => ({
          event: {
            ...state.event,
            surveyQuestions: state.event.surveyQuestions.map((q) =>
              q.id === id ? { ...q, ...updates } : q
            ),
          },
        })),

      removeSurveyQuestion: (id) =>
        set((state) => ({
          event: {
            ...state.event,
            surveyQuestions: state.event.surveyQuestions.filter((q) => q.id !== id),
            surveyResponses: state.event.surveyResponses.filter((r) => r.questionId !== id),
          },
        })),

      reorderSurveyQuestions: (questionIds) =>
        set((state) => {
          const questionMap = new Map(state.event.surveyQuestions.map((q) => [q.id, q]));
          const reordered = questionIds
            .map((id) => questionMap.get(id))
            .filter((q): q is SurveyQuestion => q !== undefined);
          return {
            event: {
              ...state.event,
              surveyQuestions: reordered,
            },
          };
        }),

      addSurveyResponse: (response) =>
        set((state) => ({
          event: {
            ...state.event,
            surveyResponses: [...state.event.surveyResponses, response],
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
          canvas: {
            ...state.canvas,
            selectedTableIds: id ? [id] : [],
            selectedGuestIds: [],
            selectedVenueElementId: null,
          },
        })),

      selectGuest: (id) =>
        set((state) => ({
          canvas: {
            ...state.canvas,
            selectedGuestIds: id ? [id] : [],
            selectedTableIds: [],
            selectedVenueElementId: null,
          },
        })),

      // Multi-Select Actions - Tables
      toggleTableSelection: (id) =>
        set((state) => {
          const current = state.canvas.selectedTableIds;
          const isSelected = current.includes(id);
          return {
            canvas: {
              ...state.canvas,
              selectedTableIds: isSelected
                ? current.filter((tid) => tid !== id)
                : [...current, id],
              selectedGuestIds: [],
              selectedVenueElementId: null,
            },
          };
        }),

      addTableToSelection: (id) =>
        set((state) => ({
          canvas: {
            ...state.canvas,
            selectedTableIds: state.canvas.selectedTableIds.includes(id)
              ? state.canvas.selectedTableIds
              : [...state.canvas.selectedTableIds, id],
            selectedGuestIds: [],
            selectedVenueElementId: null,
          },
        })),

      selectMultipleTables: (ids) =>
        set((state) => ({
          canvas: {
            ...state.canvas,
            selectedTableIds: ids,
            selectedGuestIds: [],
            selectedVenueElementId: null,
          },
        })),

      selectAllTables: () =>
        set((state) => ({
          canvas: {
            ...state.canvas,
            selectedTableIds: state.event.tables.map((t) => t.id),
            selectedGuestIds: [],
            selectedVenueElementId: null,
          },
        })),

      clearTableSelection: () =>
        set((state) => ({
          canvas: { ...state.canvas, selectedTableIds: [] },
        })),

      // Multi-Select Actions - Guests
      toggleGuestSelection: (id) =>
        set((state) => {
          const current = state.canvas.selectedGuestIds;
          const isSelected = current.includes(id);
          return {
            canvas: {
              ...state.canvas,
              selectedGuestIds: isSelected
                ? current.filter((gid) => gid !== id)
                : [...current, id],
              selectedTableIds: [],
              selectedVenueElementId: null,
            },
          };
        }),

      addGuestToSelection: (id) =>
        set((state) => ({
          canvas: {
            ...state.canvas,
            selectedGuestIds: state.canvas.selectedGuestIds.includes(id)
              ? state.canvas.selectedGuestIds
              : [...state.canvas.selectedGuestIds, id],
            selectedTableIds: [],
            selectedVenueElementId: null,
          },
        })),

      selectMultipleGuests: (ids) =>
        set((state) => ({
          canvas: {
            ...state.canvas,
            selectedGuestIds: ids,
            selectedTableIds: [],
            selectedVenueElementId: null,
          },
        })),

      clearGuestSelection: () =>
        set((state) => ({
          canvas: { ...state.canvas, selectedGuestIds: [] },
        })),

      clearAllSelection: () =>
        set((state) => ({
          canvas: {
            ...state.canvas,
            selectedTableIds: [],
            selectedGuestIds: [],
            selectedVenueElementId: null,
          },
        })),

      // Batch Operations
      batchAssignGuests: (guestIds, tableId) =>
        set((state) => ({
          event: {
            ...state.event,
            guests: state.event.guests.map((g) =>
              guestIds.includes(g.id)
                ? { ...g, tableId, seatIndex: undefined, canvasX: undefined, canvasY: undefined }
                : g
            ),
          },
          canvas: { ...state.canvas, selectedGuestIds: [] },
        })),

      batchRemoveGuests: (guestIds) =>
        set((state) => ({
          event: {
            ...state.event,
            guests: state.event.guests
              .filter((g) => !guestIds.includes(g.id))
              .map((g) => ({
                ...g,
                relationships: g.relationships.filter((r) => !guestIds.includes(r.guestId)),
              })),
          },
          canvas: { ...state.canvas, selectedGuestIds: [] },
        })),

      batchRemoveTables: (tableIds) =>
        set((state) => ({
          event: {
            ...state.event,
            tables: state.event.tables.filter((t) => !tableIds.includes(t.id)),
            guests: state.event.guests.map((g) =>
              tableIds.includes(g.tableId || '')
                ? { ...g, tableId: undefined, seatIndex: undefined }
                : g
            ),
          },
          canvas: { ...state.canvas, selectedTableIds: [] },
        })),

      // Layout Tools actions
      alignTables: (tableIds, alignment) =>
        set((state) => {
          const tables = state.event.tables.filter((t) => tableIds.includes(t.id));
          if (tables.length < 2) return state;

          let targetValue: number;

          switch (alignment) {
            case 'left':
              targetValue = Math.min(...tables.map((t) => t.x));
              break;
            case 'center':
              const minX = Math.min(...tables.map((t) => t.x));
              const maxX = Math.max(...tables.map((t) => t.x + t.width));
              targetValue = (minX + maxX) / 2;
              break;
            case 'right':
              targetValue = Math.max(...tables.map((t) => t.x + t.width));
              break;
            case 'top':
              targetValue = Math.min(...tables.map((t) => t.y));
              break;
            case 'middle':
              const minY = Math.min(...tables.map((t) => t.y));
              const maxY = Math.max(...tables.map((t) => t.y + t.height));
              targetValue = (minY + maxY) / 2;
              break;
            case 'bottom':
              targetValue = Math.max(...tables.map((t) => t.y + t.height));
              break;
          }

          return {
            event: {
              ...state.event,
              tables: state.event.tables.map((t) => {
                if (!tableIds.includes(t.id)) return t;

                switch (alignment) {
                  case 'left':
                    return { ...t, x: targetValue };
                  case 'center':
                    return { ...t, x: targetValue - t.width / 2 };
                  case 'right':
                    return { ...t, x: targetValue - t.width };
                  case 'top':
                    return { ...t, y: targetValue };
                  case 'middle':
                    return { ...t, y: targetValue - t.height / 2 };
                  case 'bottom':
                    return { ...t, y: targetValue - t.height };
                  default:
                    return t;
                }
              }),
            },
          };
        }),

      distributeTables: (tableIds, direction) =>
        set((state) => {
          const tables = state.event.tables
            .filter((t) => tableIds.includes(t.id))
            .sort((a, b) => (direction === 'horizontal' ? a.x - b.x : a.y - b.y));

          if (tables.length < 3) return state;

          const first = tables[0];
          const last = tables[tables.length - 1];

          let totalSpace: number;
          let totalTableSize: number;

          if (direction === 'horizontal') {
            totalSpace = last.x + last.width - first.x;
            totalTableSize = tables.reduce((sum, t) => sum + t.width, 0);
          } else {
            totalSpace = last.y + last.height - first.y;
            totalTableSize = tables.reduce((sum, t) => sum + t.height, 0);
          }

          const gap = (totalSpace - totalTableSize) / (tables.length - 1);
          let currentPos = direction === 'horizontal' ? first.x : first.y;

          const positionMap = new Map<string, number>();
          for (const table of tables) {
            positionMap.set(table.id, currentPos);
            currentPos += (direction === 'horizontal' ? table.width : table.height) + gap;
          }

          return {
            event: {
              ...state.event,
              tables: state.event.tables.map((t) => {
                if (!tableIds.includes(t.id)) return t;
                const newPos = positionMap.get(t.id);
                if (newPos === undefined) return t;

                return direction === 'horizontal'
                  ? { ...t, x: newPos }
                  : { ...t, y: newPos };
              }),
            },
          };
        }),

      autoArrangeTables: (tableIds) =>
        set((state) => {
          const tables = state.event.tables.filter((t) => tableIds.includes(t.id));
          if (tables.length === 0) return state;

          // Calculate grid dimensions
          const cols = Math.ceil(Math.sqrt(tables.length));
          const rows = Math.ceil(tables.length / cols);

          // Find average table size for spacing
          const avgWidth = tables.reduce((sum, t) => sum + t.width, 0) / tables.length;
          const avgHeight = tables.reduce((sum, t) => sum + t.height, 0) / tables.length;
          const spacingX = avgWidth * 0.5;
          const spacingY = avgHeight * 0.5;

          // Find starting position (center of current selection)
          const minX = Math.min(...tables.map((t) => t.x));
          const maxX = Math.max(...tables.map((t) => t.x + t.width));
          const minY = Math.min(...tables.map((t) => t.y));
          const maxY = Math.max(...tables.map((t) => t.y + t.height));
          const centerX = (minX + maxX) / 2;
          const centerY = (minY + maxY) / 2;

          // Calculate total grid size
          const gridWidth = cols * avgWidth + (cols - 1) * spacingX;
          const gridHeight = rows * avgHeight + (rows - 1) * spacingY;

          // Starting position (top-left of grid, centered on selection center)
          const startX = centerX - gridWidth / 2;
          const startY = centerY - gridHeight / 2;

          // Sort tables by their original position for consistent ordering
          const sortedTables = [...tables].sort((a, b) => {
            const rowA = Math.floor((a.y - minY) / (avgHeight + spacingY));
            const rowB = Math.floor((b.y - minY) / (avgHeight + spacingY));
            if (rowA !== rowB) return rowA - rowB;
            return a.x - b.x;
          });

          // Create position map
          const positionMap = new Map<string, { x: number; y: number }>();
          sortedTables.forEach((table, index) => {
            const col = index % cols;
            const row = Math.floor(index / cols);
            positionMap.set(table.id, {
              x: startX + col * (avgWidth + spacingX) + (avgWidth - table.width) / 2,
              y: startY + row * (avgHeight + spacingY) + (avgHeight - table.height) / 2,
            });
          });

          return {
            event: {
              ...state.event,
              tables: state.event.tables.map((t) => {
                const newPos = positionMap.get(t.id);
                if (!newPos) return t;
                return { ...t, x: newPos.x, y: newPos.y };
              }),
            },
          };
        }),

      // View actions
      setActiveView: (activeView) => set({ activeView }),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

      // Context Menu actions
      openContextMenu: (x, y, targetType, targetId) =>
        set({
          contextMenu: { isOpen: true, x, y, targetType, targetId },
        }),

      closeContextMenu: () =>
        set({
          contextMenu: {
            isOpen: false,
            x: 0,
            y: 0,
            targetType: null,
            targetId: null,
          },
        }),

      // Canvas Preferences
      toggleGrid: () =>
        set((state) => ({
          canvasPrefs: { ...state.canvasPrefs, showGrid: !state.canvasPrefs.showGrid },
        })),

      toggleSnapToGrid: () =>
        set((state) => ({
          canvasPrefs: { ...state.canvasPrefs, snapToGrid: !state.canvasPrefs.snapToGrid },
        })),

      setGridSize: (size) =>
        set((state) => ({
          canvasPrefs: { ...state.canvasPrefs, gridSize: size },
        })),

      toggleAlignmentGuides: () =>
        set((state) => ({
          canvasPrefs: { ...state.canvasPrefs, showAlignmentGuides: !state.canvasPrefs.showAlignmentGuides },
        })),

      setAlignmentGuides: (guides) => set({ alignmentGuides: guides }),
      clearAlignmentGuides: () => set({ alignmentGuides: [] }),

      // Undo/Redo
      pushHistory: (description) =>
        set((state) => {
          // Trim future history if we're not at the end
          const newHistory = state.history.slice(0, state.historyIndex + 1);
          // Add current state to history
          newHistory.push({
            event: JSON.parse(JSON.stringify(state.event)),
            description,
          });
          // Limit history size
          if (newHistory.length > MAX_HISTORY_SIZE) {
            newHistory.shift();
          }
          return {
            history: newHistory,
            historyIndex: newHistory.length - 1,
          };
        }),

      undo: () =>
        set((state) => {
          if (state.historyIndex < 0) return state;
          const prevEntry = state.history[state.historyIndex];
          return {
            event: JSON.parse(JSON.stringify(prevEntry.event)),
            historyIndex: state.historyIndex - 1,
          };
        }),

      redo: () =>
        set((state) => {
          if (state.historyIndex >= state.history.length - 1) return state;
          const nextEntry = state.history[state.historyIndex + 1];
          return {
            event: JSON.parse(JSON.stringify(nextEntry.event)),
            historyIndex: state.historyIndex + 1,
          };
        }),

      canUndo: () => get().historyIndex >= 0,
      canRedo: () => get().historyIndex < get().history.length - 1,

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

      loadDemoData: () =>
        set({
          event: {
            id: uuidv4(),
            name: demoEventMetadata.name,
            date: demoEventMetadata.date,
            type: demoEventMetadata.type,
            tables: demoTables,
            guests: demoGuests,
            constraints: demoConstraints,
            surveyQuestions: demoSurveyQuestions,
            surveyResponses: [],
            venueElements: [],
          },
        }),

      // Constraint Violations
      getViolations: () => detectConstraintViolations(get().event),

      getViolationsForTable: (tableId) => {
        const violations = detectConstraintViolations(get().event);
        return violations.filter(v => v.tableIds.includes(tableId));
      },
    }),
    {
      name: 'seating-arrangement-storage',
      partialize: (state) => ({ event: state.event }),
    }
  )
);
