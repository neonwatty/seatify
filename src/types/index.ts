export type RelationshipType =
  | 'family'
  | 'friend'
  | 'colleague'
  | 'acquaintance'
  | 'partner'
  | 'avoid';

export interface Relationship {
  guestId: string;
  type: RelationshipType;
  strength: number; // 1-5, higher = stronger preference
}

export interface Guest {
  id: string;
  name: string;
  email?: string;

  // Profile data (from survey or LinkedIn)
  company?: string;
  jobTitle?: string;
  industry?: string;
  interests?: string[];
  dietaryRestrictions?: string[];
  accessibilityNeeds?: string[];

  // Relationships with other guests
  relationships: Relationship[];

  // Condensed profile from LLM
  profileSummary?: string;

  // Seating assignment
  tableId?: string;
  seatIndex?: number;

  // Metadata
  group?: string; // e.g., "Bride's family", "Marketing team"
  rsvpStatus: 'pending' | 'confirmed' | 'declined';
  notes?: string;
}

export type TableShape = 'round' | 'rectangle' | 'square';

export interface Table {
  id: string;
  name: string;
  shape: TableShape;
  capacity: number;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
}

export interface Constraint {
  id: string;
  type: 'must_sit_together' | 'must_not_sit_together' | 'same_table' | 'different_table' | 'near_front' | 'accessibility';
  guestIds: string[];
  priority: 'required' | 'preferred' | 'optional';
  description?: string;
}

export interface SurveyQuestion {
  id: string;
  question: string;
  type: 'text' | 'multiselect' | 'single_select' | 'relationship';
  options?: string[];
  required: boolean;
}

export interface SurveyResponse {
  guestId: string;
  questionId: string;
  answer: string | string[];
}

export interface Event {
  id: string;
  name: string;
  date?: string;
  type: 'wedding' | 'corporate' | 'social' | 'other';
  tables: Table[];
  guests: Guest[];
  constraints: Constraint[];
  surveyQuestions: SurveyQuestion[];
  surveyResponses: SurveyResponse[];
}

export interface CanvasState {
  zoom: number;
  panX: number;
  panY: number;
  selectedTableId: string | null;
  selectedGuestId: string | null;
}
