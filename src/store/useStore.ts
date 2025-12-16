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
              description: constraint.description || `${guests.map(g => `${g.firstName} ${g.lastName}`).join(', ')} should be seated together`,
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
                description: constraint.description || `${guestsAtTable.map(g => `${g.firstName} ${g.lastName}`).join(' and ')} should not be seated together`,
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

// Theme type
type Theme = 'light' | 'dark' | 'system';

// Onboarding state
interface OnboardingState {
  hasCompletedOnboarding: boolean;
  setOnboardingComplete: () => void;
  resetOnboarding: () => void;
}

interface AppState extends OnboardingState {
  // Current event
  event: Event;
  canvas: CanvasState;
  canvasPrefs: CanvasPreferences;

  // Theme
  theme: Theme;

  // Undo/Redo history
  history: HistoryEntry[];
  historyIndex: number;

  // Alignment guides (computed during drag)
  alignmentGuides: AlignmentGuide[];

  // View state
  activeView: 'dashboard' | 'canvas' | 'guests';
  sidebarOpen: boolean;

  // Group visibility filter (for canvas dimming)
  visibleGroups: Set<string> | 'all';

  // Context menu state
  contextMenu: {
    isOpen: boolean;
    x: number;
    y: number;
    targetType: 'table' | 'guest' | 'canvas' | null;
    targetId: string | null;
  };

  // Guest editing modal state
  editingGuestId: string | null;

  // Animation state for optimization
  animatingGuestIds: Set<string>;

  // Newly added guest for highlight animation
  newlyAddedGuestId: string | null;

  // Newly added table for highlight animation
  newlyAddedTableId: string | null;

  // Pre-optimization snapshot for reset
  preOptimizationSnapshot: { guestId: string; tableId: string | undefined }[] | null;

  // Actions - Event
  setEventName: (name: string) => void;
  setEventType: (eventType: Event['eventType']) => void;

  // Actions - Tables
  addTable: (shape: TableShape, x: number, y: number) => void;
  addTables: (tables: Array<{ shape: TableShape; x: number; y: number; capacity?: number }>) => string[];
  updateTable: (id: string, updates: Partial<Table>) => void;
  removeTable: (id: string) => void;
  moveTable: (id: string, x: number, y: number) => void;
  duplicateTable: (id: string) => void;
  rotateTable: (id: string, degrees: number) => void;

  // Actions - Venue Elements
  addVenueElement: (type: VenueElementType, x: number, y: number) => void;
  updateVenueElement: (id: string, updates: Partial<VenueElement>) => void;
  removeVenueElement: (id: string) => void;
  moveVenueElement: (id: string, x: number, y: number) => void;
  selectVenueElement: (id: string | null) => void;

  // Actions - Guests
  addGuest: (guest: Omit<Guest, 'id' | 'relationships' | 'rsvpStatus'>) => string;
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
  panToPosition: (canvasX: number, canvasY: number, viewportWidth: number, viewportHeight: number) => void;
  recenterCanvas: (viewportWidth?: number, viewportHeight?: number) => void;
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
  selectMultipleItems: (tableIds: string[], guestIds: string[]) => void;
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
  nudgeSelectedTables: (dx: number, dy: number) => void;

  // Actions - View
  setActiveView: (view: AppState['activeView']) => void;
  toggleSidebar: () => void;

  // Actions - Group Visibility
  toggleGroupVisibility: (groupKey: string) => void;
  showAllGroups: () => void;
  hideAllGroups: () => void;

  // Actions - Context Menu
  openContextMenu: (x: number, y: number, targetType: 'table' | 'guest' | 'canvas', targetId: string | null) => void;
  closeContextMenu: () => void;

  // Actions - Guest Editing Modal
  setEditingGuest: (id: string | null) => void;

  // Actions - Canvas Preferences
  toggleGrid: () => void;
  toggleSnapToGrid: () => void;
  setGridSize: (size: CanvasPreferences['gridSize']) => void;
  toggleAlignmentGuides: () => void;
  togglePanMode: () => void;
  setAlignmentGuides: (guides: AlignmentGuide[]) => void;
  clearAlignmentGuides: () => void;

  // Actions - Undo/Redo
  undo: () => void;
  redo: () => void;
  pushHistory: (description: string) => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // Actions - Theme
  setTheme: (theme: Theme) => void;
  cycleTheme: () => void;

  // Actions - Persistence
  resetEvent: () => void;
  exportEvent: () => string;
  importEvent: (json: string) => void;
  loadDemoData: () => void;

  // Computed - Constraint Violations
  getViolations: () => ConstraintViolation[];
  getViolationsForTable: (tableId: string) => ConstraintViolation[];

  // Actions - Seating Optimization
  calculateSeatingScore: () => number;
  optimizeSeating: () => { beforeScore: number; afterScore: number; movedGuests: string[] };
  resetSeating: () => void;
  clearAnimatingGuests: () => void;
  hasOptimizationSnapshot: () => boolean;
  clearNewlyAddedGuest: () => void;
  clearNewlyAddedTable: () => void;
}

const createDefaultEvent = (): Event => {
  // Create stable IDs for demo data
  const table1Id = 'demo-table-1';
  const table2Id = 'demo-table-2';
  const table3Id = 'demo-table-3';

  return {
    id: uuidv4(),
    name: 'My Event',
    eventType: 'wedding',
    tables: [
      {
        id: table1Id,
        name: 'Table 1',
        shape: 'round',
        x: 150,
        y: 150,
        width: 120,
        height: 120,
        capacity: 8,
        rotation: 0,
      },
      {
        id: table2Id,
        name: 'Table 2',
        shape: 'rectangle',
        x: 450,
        y: 120,
        width: 200,
        height: 80,
        capacity: 10,
        rotation: 0,
      },
      {
        id: table3Id,
        name: 'Table 3',
        shape: 'square',
        x: 350,
        y: 350,
        width: 100,
        height: 100,
        capacity: 8,
        rotation: 0,
      },
    ],
    guests: [
      // Table 1 guests (4 of 8) - Family
      {
        id: 'demo-guest-1', firstName: 'Emma', lastName: 'Wilson', tableId: table1Id, rsvpStatus: 'confirmed', group: 'Family',
        relationships: [
          { guestId: 'demo-guest-2', type: 'partner', strength: 5 },
          { guestId: 'demo-guest-13', type: 'family', strength: 4 },
        ],
        company: 'Wilson & Associates', jobTitle: 'Partner', industry: 'Legal',
        interests: ['golf', 'wine tasting', 'travel'], email: 'emma@wilson-law.com'
      },
      {
        id: 'demo-guest-2', firstName: 'James', lastName: 'Wilson', tableId: table1Id, rsvpStatus: 'confirmed', group: 'Family',
        relationships: [
          { guestId: 'demo-guest-1', type: 'partner', strength: 5 },
        ],
        company: 'City Hospital', jobTitle: 'Surgeon', industry: 'Healthcare',
        interests: ['sailing', 'classical music'], email: 'james.wilson@cityhospital.org'
      },
      {
        id: 'demo-guest-3', firstName: 'Olivia', lastName: 'Chen', tableId: table1Id, rsvpStatus: 'confirmed', group: 'Friends',
        relationships: [
          { guestId: 'demo-guest-4', type: 'partner', strength: 5 },
          { guestId: 'demo-guest-7', type: 'friend', strength: 3 },
        ],
        company: 'Figma', jobTitle: 'Product Designer', industry: 'Technology',
        interests: ['photography', 'hiking', 'cooking'], email: 'olivia.chen@figma.com'
      },
      {
        id: 'demo-guest-4', firstName: 'Liam', lastName: 'Chen', tableId: table1Id, rsvpStatus: 'confirmed', group: 'Friends',
        relationships: [
          { guestId: 'demo-guest-3', type: 'partner', strength: 5 },
        ],
        company: 'Stripe', jobTitle: 'Software Engineer', industry: 'Technology',
        interests: ['cycling', 'board games', 'coffee'], email: 'liam@stripe.com'
      },
      // Table 2 guests (6 of 10) - Work colleagues - NOTE: Sophia is separated from partner Noah for demo
      {
        id: 'demo-guest-5', firstName: 'Sophia', lastName: 'Martinez', tableId: table3Id, rsvpStatus: 'confirmed', group: 'Work',
        relationships: [
          { guestId: 'demo-guest-6', type: 'partner', strength: 5 },
          { guestId: 'demo-guest-12', type: 'colleague', strength: 2 },
        ],
        company: 'Acme Corp', jobTitle: 'Marketing Director', industry: 'Consumer Goods',
        interests: ['yoga', 'reading', 'podcasts'], email: 'sophia.m@acme.com'
      },
      {
        id: 'demo-guest-6', firstName: 'Noah', lastName: 'Martinez', tableId: table2Id, rsvpStatus: 'confirmed', group: 'Work',
        relationships: [
          { guestId: 'demo-guest-5', type: 'partner', strength: 5 },
          { guestId: 'demo-guest-12', type: 'colleague', strength: 2 },
        ],
        company: 'Martinez Consulting', jobTitle: 'Founder', industry: 'Consulting',
        interests: ['tennis', 'investing'], email: 'noah@martinezconsulting.com'
      },
      {
        id: 'demo-guest-7', firstName: 'Ava', lastName: 'Johnson', tableId: table2Id, rsvpStatus: 'confirmed', group: 'Friends',
        relationships: [
          { guestId: 'demo-guest-8', type: 'friend', strength: 3 },
          { guestId: 'demo-guest-11', type: 'friend', strength: 3 },
          { guestId: 'demo-guest-3', type: 'friend', strength: 3 },
        ],
        company: 'Netflix', jobTitle: 'Content Strategist', industry: 'Entertainment',
        interests: ['film', 'theater', 'writing'], email: 'ava.johnson@netflix.com'
      },
      {
        id: 'demo-guest-8', firstName: 'Mason', lastName: 'Lee', tableId: table3Id, rsvpStatus: 'confirmed', group: 'Friends',
        relationships: [
          { guestId: 'demo-guest-7', type: 'friend', strength: 3 },
          { guestId: 'demo-guest-14', type: 'avoid', strength: 5 },
        ],
        company: 'Goldman Sachs', jobTitle: 'Vice President', industry: 'Finance',
        interests: ['running', 'art collecting'], email: 'mason.lee@gs.com'
      },
      {
        id: 'demo-guest-9', firstName: 'Isabella', lastName: 'Brown', tableId: table2Id, rsvpStatus: 'pending',
        relationships: [
          { guestId: 'demo-guest-10', type: 'avoid', strength: 5 },
        ],
        company: 'Brown Architecture', jobTitle: 'Principal Architect', industry: 'Architecture',
        interests: ['design', 'sustainable living', 'gardening'], email: 'isabella@brownarch.com'
      },
      {
        id: 'demo-guest-10', firstName: 'Ethan', lastName: 'Davis', tableId: table2Id, rsvpStatus: 'confirmed', group: 'Family',
        relationships: [
          { guestId: 'demo-guest-13', type: 'family', strength: 4 },
          { guestId: 'demo-guest-9', type: 'avoid', strength: 5 },
        ],
        company: 'Stanford University', jobTitle: 'Professor', industry: 'Education',
        interests: ['research', 'chess', 'history'], email: 'edavis@stanford.edu'
      },
      // Table 3 guests (8 of 8)
      {
        id: 'demo-guest-11', firstName: 'Mia', lastName: 'Thompson', tableId: table3Id, rsvpStatus: 'confirmed', group: 'Friends',
        relationships: [
          { guestId: 'demo-guest-7', type: 'friend', strength: 3 },
          { guestId: 'demo-guest-15', type: 'partner', strength: 5 },
        ],
        company: 'Spotify', jobTitle: 'Data Scientist', industry: 'Technology',
        interests: ['music', 'machine learning', 'skiing'], email: 'mia.t@spotify.com'
      },
      {
        id: 'demo-guest-12', firstName: 'Lucas', lastName: 'Garcia', tableId: table3Id, rsvpStatus: 'confirmed', group: 'Work',
        relationships: [
          { guestId: 'demo-guest-5', type: 'colleague', strength: 2 },
          { guestId: 'demo-guest-6', type: 'colleague', strength: 2 },
          { guestId: 'demo-guest-16', type: 'partner', strength: 5 },
        ],
        company: 'Tesla', jobTitle: 'Mechanical Engineer', industry: 'Automotive',
        interests: ['electric vehicles', 'robotics', 'camping'], email: 'lgarcia@tesla.com'
      },
      {
        id: 'demo-guest-13', firstName: 'Charlotte', lastName: 'White', tableId: table3Id, rsvpStatus: 'confirmed', group: 'Family',
        relationships: [
          { guestId: 'demo-guest-1', type: 'family', strength: 4 },
          { guestId: 'demo-guest-10', type: 'family', strength: 4 },
        ],
        company: 'White Media Group', jobTitle: 'CEO', industry: 'Media',
        interests: ['philanthropy', 'art', 'travel'], email: 'charlotte@whitemedia.com'
      },
      {
        id: 'demo-guest-14', firstName: 'Benjamin', lastName: 'Taylor', tableId: table3Id, rsvpStatus: 'confirmed',
        relationships: [
          { guestId: 'demo-guest-8', type: 'avoid', strength: 5 },
        ],
        company: 'Taylor Ventures', jobTitle: 'Managing Partner', industry: 'Venture Capital',
        interests: ['startups', 'golf', 'wine'], email: 'ben@taylorvc.com'
      },
      {
        id: 'demo-guest-15', firstName: 'Daniel', lastName: 'Thompson', tableId: table3Id, rsvpStatus: 'confirmed', group: 'Friends',
        relationships: [
          { guestId: 'demo-guest-11', type: 'partner', strength: 5 },
        ],
        company: 'Google', jobTitle: 'Product Manager', industry: 'Technology',
        interests: ['hiking', 'photography', 'cooking'], email: 'daniel.t@google.com'
      },
      {
        id: 'demo-guest-16', firstName: 'Sofia', lastName: 'Garcia', tableId: table3Id, rsvpStatus: 'confirmed', group: 'Work',
        relationships: [
          { guestId: 'demo-guest-12', type: 'partner', strength: 5 },
        ],
        company: 'Apple', jobTitle: 'UX Designer', industry: 'Technology',
        interests: ['design', 'yoga', 'painting'], email: 'sofia.g@apple.com'
      },
      {
        id: 'demo-guest-17', firstName: 'Ryan', lastName: 'Mitchell', tableId: table3Id, rsvpStatus: 'confirmed', group: 'Friends',
        relationships: [
          { guestId: 'demo-guest-18', type: 'friend', strength: 3 },
          { guestId: 'demo-guest-11', type: 'friend', strength: 3 },
        ],
        company: 'Airbnb', jobTitle: 'Engineering Lead', industry: 'Technology',
        interests: ['travel', 'rock climbing', 'craft beer'], email: 'ryan.m@airbnb.com'
      },
      {
        id: 'demo-guest-18', firstName: 'Harper', lastName: 'Reed', tableId: table3Id, rsvpStatus: 'confirmed', group: 'Friends',
        relationships: [
          { guestId: 'demo-guest-17', type: 'friend', strength: 3 },
        ],
        company: 'Shopify', jobTitle: 'Solutions Architect', industry: 'Technology',
        interests: ['gaming', 'sci-fi books', 'running'], email: 'harper.r@shopify.com'
      },
    ],
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
  };
};

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
        zoom: 1.25,
        panX: 50,
        panY: 20,
        selectedTableIds: [],
        selectedGuestIds: [],
        selectedVenueElementId: null,
      },
      canvasPrefs: {
        showGrid: true,
        snapToGrid: true,
        gridSize: 40,
        showAlignmentGuides: true,
        panMode: false,
      },
      history: [],
      historyIndex: -1,
      alignmentGuides: [],
      activeView: 'canvas',
      sidebarOpen: false,
      theme: 'system',
      visibleGroups: 'all',
      contextMenu: {
        isOpen: false,
        x: 0,
        y: 0,
        targetType: null,
        targetId: null,
      },
      editingGuestId: null,
      animatingGuestIds: new Set(),
      newlyAddedGuestId: null,
      newlyAddedTableId: null,
      preOptimizationSnapshot: null,
      hasCompletedOnboarding: false,

      // Onboarding actions
      setOnboardingComplete: () => set({ hasCompletedOnboarding: true }),
      resetOnboarding: () => set({ hasCompletedOnboarding: false }),

      // Event actions
      setEventName: (name) =>
        set((state) => ({
          event: { ...state.event, name },
        })),

      setEventType: (eventType) =>
        set((state) => ({
          event: { ...state.event, eventType },
        })),

      // Table actions
      addTable: (shape, x, y) => {
        const defaults = getTableDefaults(shape);
        const tableCount = get().event.tables.length;
        const newId = uuidv4();
        const newTable: Table = {
          id: newId,
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
          // Track the newly added table for highlight animation
          newlyAddedTableId: newId,
        }));
      },

      addTables: (tableDefs) => {
        const currentTableCount = get().event.tables.length;
        const newTables: Table[] = [];
        const newIds: string[] = [];

        tableDefs.forEach((def, index) => {
          const defaults = getTableDefaults(def.shape);
          const newId = uuidv4();
          newIds.push(newId);
          newTables.push({
            id: newId,
            name: `Table ${currentTableCount + index + 1}`,
            shape: def.shape,
            x: def.x,
            y: def.y,
            width: defaults.width,
            height: defaults.height,
            capacity: def.capacity ?? defaults.capacity,
            rotation: 0,
          });
        });

        set((state) => ({
          event: {
            ...state.event,
            tables: [...state.event.tables, ...newTables],
          },
        }));

        return newIds;
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

      duplicateTable: (id) => {
        const state = get();
        const table = state.event.tables.find((t) => t.id === id);
        if (!table) return;

        const newTable: Table = {
          ...table,
          id: uuidv4(),
          name: `${table.name} (copy)`,
          x: table.x + 50,
          y: table.y + 50,
        };

        set((s) => ({
          event: {
            ...s.event,
            tables: [...s.event.tables, newTable],
          },
          canvas: {
            ...s.canvas,
            selectedTableIds: [newTable.id],
          },
        }));
        state.pushHistory('Duplicate table');
      },

      rotateTable: (id, degrees) =>
        set((state) => ({
          event: {
            ...state.event,
            tables: state.event.tables.map((t) =>
              t.id === id ? { ...t, rotation: ((t.rotation || 0) + degrees) % 360 } : t
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
        // Place them near the center of existing tables, or at a default position
        const state = get();
        const tables = state.event.tables;
        const existingUnassigned = state.event.guests.filter((g) => !g.tableId && g.canvasX !== undefined);

        let defaultX = 80;
        let defaultY = 100;

        if (tables.length > 0) {
          // Calculate bounding box of all tables
          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
          for (const table of tables) {
            minX = Math.min(minX, table.x);
            minY = Math.min(minY, table.y);
            maxX = Math.max(maxX, table.x + table.width);
            maxY = Math.max(maxY, table.y + table.height);
          }

          // Place new guests to the left of the tables area
          defaultX = minX - 100;
          defaultY = minY + existingUnassigned.length * 60;

          // If there are many unassigned guests, wrap to new columns
          const maxGuestsPerColumn = Math.max(1, Math.floor((maxY - minY) / 60));
          const column = Math.floor(existingUnassigned.length / maxGuestsPerColumn);
          const row = existingUnassigned.length % maxGuestsPerColumn;
          defaultX = minX - 100 - column * 80;
          defaultY = minY + row * 60;
        } else {
          // No tables - place guests in a grid starting from a reasonable position
          defaultY = 100 + existingUnassigned.length * 70;
        }

        const newId = uuidv4();
        const newGuest: Guest = {
          id: newId,
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
          // Select the new guest so they're highlighted
          canvas: {
            ...state.canvas,
            selectedGuestIds: [newId],
            selectedTableIds: [],
            selectedVenueElementId: null,
          },
          // Track the newly added guest for highlight animation
          newlyAddedGuestId: newId,
        }));
        return newId;
      },

      addQuickGuest: (canvasX, canvasY) => {
        const guestCount = get().event.guests.length;
        const newId = uuidv4();
        const newGuest: Guest = {
          id: newId,
          firstName: `Guest`,
          lastName: `${guestCount + 1}`,
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
          // Track the newly added guest for highlight animation
          newlyAddedGuestId: newId,
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
                firstName: g.firstName || 'Unknown',
                lastName: g.lastName || '',
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

      panToPosition: (canvasX, canvasY, viewportWidth, viewportHeight) =>
        set((state) => {
          // Calculate pan values to center the position in the viewport
          const { zoom } = state.canvas;
          const panX = viewportWidth / 2 - canvasX * zoom;
          const panY = viewportHeight / 2 - canvasY * zoom;
          return {
            canvas: { ...state.canvas, panX, panY },
          };
        }),

      recenterCanvas: (viewportWidth = 800, viewportHeight = 600) =>
        set((state) => {
          const tables = state.event.tables;
          if (tables.length === 0) {
            // No tables, reset to default view
            return {
              canvas: { ...state.canvas, panX: 50, panY: 20, zoom: 1 },
            };
          }

          // Calculate bounding box of all tables
          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
          for (const table of tables) {
            minX = Math.min(minX, table.x);
            minY = Math.min(minY, table.y);
            maxX = Math.max(maxX, table.x + table.width);
            maxY = Math.max(maxY, table.y + table.height);
          }

          // Add padding
          const padding = 100;
          minX -= padding;
          minY -= padding;
          maxX += padding;
          maxY += padding;

          // Calculate zoom to fit
          const contentWidth = maxX - minX;
          const contentHeight = maxY - minY;
          const zoomX = viewportWidth / contentWidth;
          const zoomY = viewportHeight / contentHeight;
          const newZoom = Math.min(Math.max(Math.min(zoomX, zoomY), 0.25), 2);

          // Calculate pan to center content
          const centerX = (minX + maxX) / 2;
          const centerY = (minY + maxY) / 2;
          const newPanX = (viewportWidth / 2) - (centerX * newZoom);
          const newPanY = (viewportHeight / 2) - (centerY * newZoom);

          return {
            canvas: { ...state.canvas, panX: newPanX, panY: newPanY, zoom: newZoom },
          };
        }),

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

      selectMultipleItems: (tableIds, guestIds) =>
        set((state) => ({
          canvas: {
            ...state.canvas,
            selectedTableIds: tableIds,
            selectedGuestIds: guestIds,
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
            case 'center': {
              const minX = Math.min(...tables.map((t) => t.x));
              const maxX = Math.max(...tables.map((t) => t.x + t.width));
              targetValue = (minX + maxX) / 2;
              break;
            }
            case 'right':
              targetValue = Math.max(...tables.map((t) => t.x + t.width));
              break;
            case 'top':
              targetValue = Math.min(...tables.map((t) => t.y));
              break;
            case 'middle': {
              const minY = Math.min(...tables.map((t) => t.y));
              const maxY = Math.max(...tables.map((t) => t.y + t.height));
              targetValue = (minY + maxY) / 2;
              break;
            }
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

      nudgeSelectedTables: (dx, dy) =>
        set((state) => {
          const selectedIds = state.canvas.selectedTableIds;
          if (selectedIds.length === 0) return state;

          return {
            event: {
              ...state.event,
              tables: state.event.tables.map((t) =>
                selectedIds.includes(t.id)
                  ? { ...t, x: t.x + dx, y: t.y + dy }
                  : t
              ),
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

      // Theme actions
      setTheme: (theme) => set({ theme }),
      cycleTheme: () =>
        set((state) => {
          const themes: Theme[] = ['light', 'dark', 'system'];
          const currentIndex = themes.indexOf(state.theme);
          const nextIndex = (currentIndex + 1) % themes.length;
          return { theme: themes[nextIndex] };
        }),

      // Group Visibility actions
      toggleGroupVisibility: (groupKey) =>
        set((state) => {
          if (state.visibleGroups === 'all') {
            // Switching from 'all' - create Set with all groups except clicked one
            const allGroups = new Set(
              state.event.guests
                .map((g) => g.group ?? '')
                .filter((g, i, arr) => arr.indexOf(g) === i)
            );
            allGroups.delete(groupKey);
            return { visibleGroups: allGroups };
          }

          const newSet = new Set(state.visibleGroups);
          if (newSet.has(groupKey)) {
            newSet.delete(groupKey);
          } else {
            newSet.add(groupKey);
          }
          return { visibleGroups: newSet };
        }),

      showAllGroups: () => set({ visibleGroups: 'all' }),

      hideAllGroups: () => set({ visibleGroups: new Set<string>() }),

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

      // Guest Editing Modal
      setEditingGuest: (id) => set({ editingGuestId: id }),

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

      togglePanMode: () =>
        set((state) => ({
          canvasPrefs: { ...state.canvasPrefs, panMode: !state.canvasPrefs.panMode },
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
            eventType: demoEventMetadata.eventType,
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

      // Seating Optimization
      calculateSeatingScore: () => {
        const { guests } = get().event;
        let score = 0;

        for (const guest of guests) {
          if (!guest.tableId) continue;

          for (const rel of guest.relationships) {
            const relatedGuest = guests.find(g => g.id === rel.guestId);
            if (!relatedGuest) continue;

            const sameTable = guest.tableId === relatedGuest.tableId;

            switch (rel.type) {
              case 'partner':
                score += sameTable ? 10 : -5;
                break;
              case 'family':
                score += sameTable ? 5 : 0;
                break;
              case 'friend':
                score += sameTable ? 3 : 0;
                break;
              case 'colleague':
                score += sameTable ? 1 : 0;
                break;
              case 'avoid':
                score += sameTable ? -20 : 5;
                break;
            }
          }
        }

        // Divide by 2 since relationships are bidirectional
        return Math.round(score / 2);
      },

      optimizeSeating: () => {
        const state = get();
        const { guests, tables } = state.event;
        const beforeScore = state.calculateSeatingScore();
        const movedGuests: string[] = [];

        // Save snapshot of current seating before optimization
        const snapshot = guests.map(g => ({ guestId: g.id, tableId: g.tableId }));

        // Get confirmed guests only
        const confirmedGuests = guests.filter(g => g.rsvpStatus !== 'declined');

        // Build relationship graph
        const getRelationshipScore = (g1Id: string, g2Id: string): number => {
          const g1 = guests.find(g => g.id === g1Id);
          const rel = g1?.relationships.find(r => r.guestId === g2Id);
          if (!rel) return 0;
          switch (rel.type) {
            case 'partner': return 10;
            case 'family': return 5;
            case 'friend': return 3;
            case 'colleague': return 1;
            case 'avoid': return -20;
            default: return 0;
          }
        };

        // Find partner pairs (must stay together)
        const partnerPairs: Set<string> = new Set();
        const processed: Set<string> = new Set();

        for (const guest of confirmedGuests) {
          if (processed.has(guest.id)) continue;
          const partnerRel = guest.relationships.find(r => r.type === 'partner');
          if (partnerRel) {
            partnerPairs.add(guest.id);
            partnerPairs.add(partnerRel.guestId);
            processed.add(guest.id);
            processed.add(partnerRel.guestId);
          }
        }

        // Group guests: partner pairs together, then individuals
        const guestGroups: string[][] = [];
        const assigned: Set<string> = new Set();

        // Add partner pairs as groups
        for (const guest of confirmedGuests) {
          if (assigned.has(guest.id)) continue;
          const partnerRel = guest.relationships.find(r => r.type === 'partner');
          if (partnerRel && confirmedGuests.find(g => g.id === partnerRel.guestId)) {
            guestGroups.push([guest.id, partnerRel.guestId]);
            assigned.add(guest.id);
            assigned.add(partnerRel.guestId);
          }
        }

        // Add remaining guests as individuals
        for (const guest of confirmedGuests) {
          if (!assigned.has(guest.id)) {
            guestGroups.push([guest.id]);
            assigned.add(guest.id);
          }
        }

        // Sort tables by capacity (largest first)
        const sortedTables = [...tables].sort((a, b) => b.capacity - a.capacity);

        // Assign groups to tables
        const tableAssignments: Map<string, string[]> = new Map();
        for (const table of sortedTables) {
          tableAssignments.set(table.id, []);
        }

        // Score a potential assignment
        const scoreAssignment = (guestIds: string[], tableId: string): number => {
          const currentGuests = tableAssignments.get(tableId) || [];
          let score = 0;

          // Check compatibility with existing guests at table
          for (const guestId of guestIds) {
            for (const existingId of currentGuests) {
              score += getRelationshipScore(guestId, existingId);
            }
          }

          return score;
        };

        // Greedy assignment: for each group, find best table
        for (const group of guestGroups) {
          let bestTable: string | null = null;
          let bestScore = -Infinity;

          for (const table of sortedTables) {
            const currentCount = (tableAssignments.get(table.id) || []).length;
            if (currentCount + group.length > table.capacity) continue;

            const score = scoreAssignment(group, table.id);
            if (score > bestScore) {
              bestScore = score;
              bestTable = table.id;
            }
          }

          if (bestTable) {
            const current = tableAssignments.get(bestTable) || [];
            tableAssignments.set(bestTable, [...current, ...group]);
          }
        }

        // First pass: identify moved guests
        for (const guest of guests) {
          for (const [tableId, guestIds] of tableAssignments) {
            if (guestIds.includes(guest.id)) {
              if (guest.tableId !== tableId) {
                movedGuests.push(guest.id);
              }
              break;
            }
          }
        }

        // Apply assignments and set animation state
        set((state) => ({
          event: {
            ...state.event,
            guests: state.event.guests.map(guest => {
              // Find new table for this guest
              for (const [tableId, guestIds] of tableAssignments) {
                if (guestIds.includes(guest.id)) {
                  return { ...guest, tableId, canvasX: undefined, canvasY: undefined };
                }
              }
              return guest;
            }),
          },
          animatingGuestIds: new Set(movedGuests),
          preOptimizationSnapshot: snapshot,
        }));

        const afterScore = get().calculateSeatingScore();

        console.log('Optimization complete:', { beforeScore, afterScore, movedGuests, tableAssignments: Object.fromEntries(tableAssignments) });
        return { beforeScore, afterScore, movedGuests };
      },

      resetSeating: () => {
        const snapshot = get().preOptimizationSnapshot;
        console.log('resetSeating called, snapshot:', snapshot);
        if (!snapshot) return;

        // Find which guests will move back
        const movedGuests: string[] = [];
        const currentGuests = get().event.guests;
        for (const entry of snapshot) {
          const currentGuest = currentGuests.find(g => g.id === entry.guestId);
          if (currentGuest && currentGuest.tableId !== entry.tableId) {
            movedGuests.push(entry.guestId);
          }
        }

        console.log('Resetting seating, movedGuests:', movedGuests);
        set((state) => ({
          event: {
            ...state.event,
            guests: state.event.guests.map(guest => {
              const snapshotEntry = snapshot.find(s => s.guestId === guest.id);
              if (snapshotEntry) {
                return { ...guest, tableId: snapshotEntry.tableId };
              }
              return guest;
            }),
          },
          animatingGuestIds: new Set(movedGuests),
          preOptimizationSnapshot: null,
        }));
      },

      clearAnimatingGuests: () => set({ animatingGuestIds: new Set() }),

      hasOptimizationSnapshot: () => get().preOptimizationSnapshot !== null,

      clearNewlyAddedGuest: () => set({ newlyAddedGuestId: null }),

      clearNewlyAddedTable: () => set({ newlyAddedTableId: null }),
    }),
    {
      name: 'seating-arrangement-storage',
      version: 10, // Increment for firstName/lastName split and eventType rename
      partialize: (state) => ({
        event: state.event,
        theme: state.theme,
        hasCompletedOnboarding: state.hasCompletedOnboarding,
      }),
      migrate: (persistedState: unknown, version: number) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const state = persistedState as any;

        if (version < 10 && state?.event) {
          // Migrate guests from 'name' to 'firstName'/'lastName'
          if (state.event.guests) {
            state.event.guests = state.event.guests.map((guest: { name?: string; firstName?: string; lastName?: string }) => {
              if (guest.name && !guest.firstName) {
                const nameParts = guest.name.trim().split(' ');
                const firstName = nameParts[0] || '';
                const lastName = nameParts.slice(1).join(' ') || '';
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { name: _, ...rest } = guest;
                return { ...rest, firstName, lastName };
              }
              return guest;
            });
          }

          // Migrate event 'type' to 'eventType'
          if (state.event.type && !state.event.eventType) {
            state.event.eventType = state.event.type;
            delete state.event.type;
          }
        }

        return state;
      },
    }
  )
);
