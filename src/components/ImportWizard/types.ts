import type { Guest, EventType, TableShape } from '../../types';
import type { SourcePlatformInfo } from './utils/columnDetector';

// Column mapping types
export interface ColumnMapping {
  sourceColumn: string;
  targetField: GuestField | 'fullName' | null;
  confidence: number; // 0-1
  sampleValues: string[];
}

// Guest fields that can be imported
export type GuestField =
  | 'firstName'
  | 'lastName'
  | 'email'
  | 'company'
  | 'jobTitle'
  | 'industry'
  | 'interests'
  | 'dietaryRestrictions'
  | 'accessibilityNeeds'
  | 'group'
  | 'rsvpStatus'
  | 'notes';

// Validation error for a specific row/field
export interface ValidationError {
  rowIndex: number;
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

// Duplicate detection result
export interface DuplicateCandidate {
  newGuestIndex: number;
  newGuest: Partial<Guest>;
  existingGuest: Guest;
  matchScore: number; // 0-1
  matchReasons: string[];
}

// Resolution action for duplicates
export type DuplicateResolution = 'skip' | 'merge' | 'import';

// Distribution strategy for table assignment
export type DistributionStrategy = 'even' | 'groups' | 'optimized' | 'skip';

// Table assignment configuration
export interface TableAssignmentConfig {
  enabled: boolean;
  tableShape: TableShape;
  tableCapacity: number;
  tableCount: number;
  distributionStrategy: DistributionStrategy;
}

// Parsed file result
export interface ParsedFile {
  headers: string[];
  rows: string[][];
  rowCount: number;
  fileName: string;
  fileSize: number;
}

// Import wizard state
export interface ImportWizardState {
  // Step 1: File
  file: File | null;
  parsedFile: ParsedFile | null;
  detectedEventType: EventType | null;
  detectedPlatform: SourcePlatformInfo | null;
  fileError: string | null;

  // Step 2: Mapping
  columnMappings: ColumnMapping[];

  // Step 3: Preview
  parsedGuests: Partial<Guest>[];
  validationErrors: ValidationError[];
  excludedRowIndices: Set<number>;

  // Step 4: Table Assignment
  tableAssignment: TableAssignmentConfig;
  tableAssignmentPreview: Map<number, string[]>; // tableIndex -> guestNames[]

  // Step 5: Duplicates
  duplicates: DuplicateCandidate[];
  duplicateResolutions: Map<number, DuplicateResolution>;

  // Import state
  isImporting: boolean;
  importError: string | null;
}

// Action types for reducer
export type ImportWizardAction =
  | { type: 'SET_FILE'; payload: { file: File; parsedFile: ParsedFile } }
  | { type: 'SET_FILE_ERROR'; payload: string }
  | { type: 'CLEAR_FILE' }
  | { type: 'SET_DETECTED_EVENT_TYPE'; payload: EventType }
  | { type: 'SET_DETECTED_PLATFORM'; payload: SourcePlatformInfo }
  | { type: 'SET_COLUMN_MAPPINGS'; payload: ColumnMapping[] }
  | { type: 'UPDATE_COLUMN_MAPPING'; payload: { index: number; mapping: Partial<ColumnMapping> } }
  | { type: 'SET_PARSED_GUESTS'; payload: Partial<Guest>[] }
  | { type: 'SET_VALIDATION_ERRORS'; payload: ValidationError[] }
  | { type: 'TOGGLE_EXCLUDE_ROW'; payload: number }
  | { type: 'SET_TABLE_ASSIGNMENT_ENABLED'; payload: boolean }
  | { type: 'SET_TABLE_SHAPE'; payload: TableShape }
  | { type: 'SET_TABLE_CAPACITY'; payload: number }
  | { type: 'SET_TABLE_COUNT'; payload: number }
  | { type: 'SET_DISTRIBUTION_STRATEGY'; payload: DistributionStrategy }
  | { type: 'SET_TABLE_ASSIGNMENT_PREVIEW'; payload: Map<number, string[]> }
  | { type: 'SET_DUPLICATES'; payload: DuplicateCandidate[] }
  | { type: 'SET_DUPLICATE_RESOLUTION'; payload: { index: number; resolution: DuplicateResolution } }
  | { type: 'SET_ALL_DUPLICATE_RESOLUTIONS'; payload: DuplicateResolution }
  | { type: 'SET_IMPORTING'; payload: boolean }
  | { type: 'SET_IMPORT_ERROR'; payload: string | null }
  | { type: 'RESET' };

// Initial state
export const initialImportState: ImportWizardState = {
  file: null,
  parsedFile: null,
  detectedEventType: null,
  detectedPlatform: null,
  fileError: null,
  columnMappings: [],
  parsedGuests: [],
  validationErrors: [],
  excludedRowIndices: new Set(),
  tableAssignment: {
    enabled: false,
    tableShape: 'round',
    tableCapacity: 8,
    tableCount: 0,
    distributionStrategy: 'even',
  },
  tableAssignmentPreview: new Map(),
  duplicates: [],
  duplicateResolutions: new Map(),
  isImporting: false,
  importError: null,
};

// Reducer function
export function importReducer(
  state: ImportWizardState,
  action: ImportWizardAction
): ImportWizardState {
  switch (action.type) {
    case 'SET_FILE':
      return {
        ...state,
        file: action.payload.file,
        parsedFile: action.payload.parsedFile,
        fileError: null,
      };
    case 'SET_FILE_ERROR':
      return { ...state, fileError: action.payload };
    case 'CLEAR_FILE':
      return { ...initialImportState };
    case 'SET_DETECTED_EVENT_TYPE':
      return { ...state, detectedEventType: action.payload };
    case 'SET_DETECTED_PLATFORM':
      return { ...state, detectedPlatform: action.payload };
    case 'SET_COLUMN_MAPPINGS':
      return { ...state, columnMappings: action.payload };
    case 'UPDATE_COLUMN_MAPPING':
      return {
        ...state,
        columnMappings: state.columnMappings.map((m, i) =>
          i === action.payload.index ? { ...m, ...action.payload.mapping } : m
        ),
      };
    case 'SET_PARSED_GUESTS':
      return { ...state, parsedGuests: action.payload };
    case 'SET_VALIDATION_ERRORS':
      return { ...state, validationErrors: action.payload };
    case 'TOGGLE_EXCLUDE_ROW': {
      const newExcluded = new Set(state.excludedRowIndices);
      if (newExcluded.has(action.payload)) {
        newExcluded.delete(action.payload);
      } else {
        newExcluded.add(action.payload);
      }
      return { ...state, excludedRowIndices: newExcluded };
    }
    case 'SET_TABLE_ASSIGNMENT_ENABLED':
      return {
        ...state,
        tableAssignment: { ...state.tableAssignment, enabled: action.payload },
      };
    case 'SET_TABLE_SHAPE': {
      const shapeDefaults = TABLE_SHAPE_DEFAULTS[action.payload];
      return {
        ...state,
        tableAssignment: {
          ...state.tableAssignment,
          tableShape: action.payload,
          tableCapacity: shapeDefaults.capacity,
        },
      };
    }
    case 'SET_TABLE_CAPACITY':
      return {
        ...state,
        tableAssignment: { ...state.tableAssignment, tableCapacity: action.payload },
      };
    case 'SET_TABLE_COUNT':
      return {
        ...state,
        tableAssignment: { ...state.tableAssignment, tableCount: action.payload },
      };
    case 'SET_DISTRIBUTION_STRATEGY':
      return {
        ...state,
        tableAssignment: { ...state.tableAssignment, distributionStrategy: action.payload },
      };
    case 'SET_TABLE_ASSIGNMENT_PREVIEW':
      return { ...state, tableAssignmentPreview: action.payload };
    case 'SET_DUPLICATES':
      return { ...state, duplicates: action.payload };
    case 'SET_DUPLICATE_RESOLUTION': {
      const newResolutions = new Map(state.duplicateResolutions);
      newResolutions.set(action.payload.index, action.payload.resolution);
      return { ...state, duplicateResolutions: newResolutions };
    }
    case 'SET_ALL_DUPLICATE_RESOLUTIONS': {
      const newResolutions = new Map<number, DuplicateResolution>();
      state.duplicates.forEach((_, i) => newResolutions.set(i, action.payload));
      return { ...state, duplicateResolutions: newResolutions };
    }
    case 'SET_IMPORTING':
      return { ...state, isImporting: action.payload };
    case 'SET_IMPORT_ERROR':
      return { ...state, importError: action.payload };
    case 'RESET':
      return initialImportState;
    default:
      return state;
  }
}

// Guest field labels for UI
export const GUEST_FIELD_LABELS: Record<GuestField | 'fullName', string> = {
  firstName: 'First Name',
  lastName: 'Last Name',
  fullName: 'Full Name (will split)',
  email: 'Email',
  company: 'Company',
  jobTitle: 'Job Title',
  industry: 'Industry',
  interests: 'Interests',
  dietaryRestrictions: 'Dietary Restrictions',
  accessibilityNeeds: 'Accessibility Needs',
  group: 'Group',
  rsvpStatus: 'RSVP Status',
  notes: 'Notes',
};

// Required fields for import
export const REQUIRED_FIELDS: GuestField[] = ['firstName', 'lastName'];

// Table shape defaults (capacity and dimensions)
export const TABLE_SHAPE_DEFAULTS: Record<TableShape, { capacity: number; width: number; height: number }> = {
  round: { capacity: 8, width: 120, height: 120 },
  rectangle: { capacity: 10, width: 200, height: 80 },
  square: { capacity: 8, width: 100, height: 100 },
  oval: { capacity: 10, width: 180, height: 120 },
  'half-round': { capacity: 5, width: 160, height: 80 },
  serpentine: { capacity: 12, width: 300, height: 100 },
};

// Table shape display labels
export const TABLE_SHAPE_LABELS: Record<TableShape, string> = {
  round: 'Round',
  rectangle: 'Rectangle',
  square: 'Square',
  oval: 'Oval',
  'half-round': 'Half-Round',
  serpentine: 'Serpentine',
};

// Distribution strategy information for UI
export const DISTRIBUTION_STRATEGY_INFO: Record<DistributionStrategy, { label: string; description: string }> = {
  even: {
    label: 'Distribute Evenly',
    description: 'Spread guests uniformly across all tables',
  },
  groups: {
    label: 'Keep Groups Together',
    description: 'Seat guests with the same group at the same table when possible',
  },
  optimized: {
    label: 'Smart Optimization',
    description: 'Use relationship data (partners, friends, avoid) to optimize seating',
  },
  skip: {
    label: "Don't Assign",
    description: 'Create tables but leave all guests unassigned',
  },
};
