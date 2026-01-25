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
  firstName: string;
  lastName: string;
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

  // Canvas position (for unassigned guests)
  canvasX?: number;
  canvasY?: number;

  // Metadata
  group?: string; // e.g., "Bride's family", "Marketing team"
  rsvpStatus: 'pending' | 'confirmed' | 'declined';
  notes?: string;

  // Enhanced RSVP fields
  plusOneOf?: string; // Guest ID this person is a plus-one of
  mealPreference?: string; // Selected meal option
  seatingPreferences?: string[]; // Guest IDs they want to sit with
  rsvpRespondedAt?: string; // Timestamp of RSVP response
  rsvpToken?: string; // Unique token for email RSVP links
}

export type TableShape = 'round' | 'rectangle' | 'square' | 'oval' | 'half-round' | 'serpentine';

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

// Venue elements (non-seating items like dance floors, stages, etc.)
export type VenueElementType =
  | 'dance-floor'
  | 'stage'
  | 'dj-booth'
  | 'bar'
  | 'buffet'
  | 'entrance'
  | 'exit'
  | 'photo-booth';

export interface VenueElement {
  id: string;
  type: VenueElementType;
  label: string;
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

// RSVP Settings for an event
export interface RSVPSettings {
  eventId: string;
  enabled: boolean;
  deadline?: string; // ISO timestamp
  allowPlusOnes: boolean;
  maxPlusOnes: number;
  mealOptions: string[]; // e.g., ['Chicken', 'Fish', 'Vegetarian']
  collectDietary: boolean;
  collectAccessibility: boolean;
  collectSeatingPreferences: boolean;
  customMessage?: string; // Welcome message on RSVP page
  confirmationMessage?: string; // Shown after submitting
  // Email invitation settings (Pro feature)
  reminderEnabled?: boolean;
  reminderDaysBefore?: number;
  lastReminderSentAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Email log entry for tracking invitation/reminder status
export type EmailLogStatus = 'pending' | 'sent' | 'delivered' | 'opened' | 'bounced' | 'failed';
export type EmailLogType = 'invitation' | 'reminder';

export interface EmailLog {
  id: string;
  eventId: string;
  guestId: string;
  emailType: EmailLogType;
  resendId?: string;
  recipientEmail: string;
  subject: string;
  status: EmailLogStatus;
  errorMessage?: string;
  sentAt?: string;
  deliveredAt?: string;
  openedAt?: string;
  createdAt: string;
}

// RSVP Response audit record
export type RSVPResponseSource = 'web' | 'email' | 'manual';

export interface RSVPResponseRecord {
  id: string;
  guestId: string;
  eventId: string;
  status: 'pending' | 'confirmed' | 'declined';
  mealPreference?: string;
  dietaryRestrictions?: string[];
  accessibilityNeeds?: string[];
  seatingPreferences?: string[];
  plusOnesAdded: number;
  respondedAt: string;
  responseSource: RSVPResponseSource;
}

export type EventType = 'wedding' | 'corporate' | 'gala' | 'party' | 'other';

// QR Code data structure for table lookup
export interface QRTableData {
  v: number; // Version for future compatibility
  e: string; // Event name
  d?: string; // Event date (optional)
  t: string; // Table name
  g: string[]; // Guest names (first + last)
  c: number; // Capacity
  b?: number; // Show branding (0 = hide, 1 or undefined = show)
}

export interface Event {
  id: string;
  name: string;
  date?: string;
  eventType: EventType;
  tables: Table[];
  guests: Guest[];
  constraints: Constraint[];
  surveyQuestions: SurveyQuestion[];
  surveyResponses: SurveyResponse[];
  venueElements: VenueElement[];

  // RSVP settings (optional, loaded separately)
  rsvpSettings?: RSVPSettings;

  // Venue Information
  venueName?: string;
  venueAddress?: string;
  guestCapacityLimit?: number;

  // Timestamps
  createdAt?: string;
  updatedAt?: string;
}

export interface CanvasState {
  zoom: number;
  panX: number;
  panY: number;
  selectedTableIds: string[];
  selectedGuestIds: string[];
  selectedVenueElementId: string | null;
}

export interface CanvasPreferences {
  showGrid: boolean;
  snapToGrid: boolean;
  gridSize: 20 | 40 | 80;
  showAlignmentGuides: boolean;
  panMode: boolean; // When true, single-finger touch pans instead of selecting
}

export interface AlignmentGuide {
  type: 'horizontal' | 'vertical';
  position: number;
  start: number;
  end: number;
}

export interface ConstraintViolation {
  constraintId: string;
  constraintType: Constraint['type'];
  priority: Constraint['priority'];
  description: string;
  guestIds: string[];
  tableIds: string[];
}

// Email status summary for RSVP invitations
export interface EmailStatusSummary {
  total: number;
  pending: number;
  sent: number;
  delivered: number;
  opened: number;
  bounced: number;
  failed: number;
  guestStatuses: Array<{
    guestId: string;
    guestName: string;
    email: string;
    lastEmailType: 'invitation' | 'reminder' | null;
    lastStatus: string | null;
    lastSentAt: string | null;
    invitationsSent: number;
    remindersSent: number;
  }>;
}

// Result from sending invitations
export interface SendInvitationsResult {
  success: boolean;
  error?: string;
  result?: {
    total: number;
    sent: number;
    failed: number;
    results: Array<{
      guestId: string;
      email: string;
      success: boolean;
      resendId?: string;
      error?: string;
    }>;
  };
}

// Helper function to get full name from firstName + lastName
export function getFullName(guest: Pick<Guest, 'firstName' | 'lastName'>): string {
  return `${guest.firstName} ${guest.lastName}`.trim();
}

// Helper function to get initials from guest name
export function getInitials(guest: Pick<Guest, 'firstName' | 'lastName'>): string {
  const firstInitial = guest.firstName ? guest.firstName.charAt(0).toUpperCase() : '';
  const lastInitial = guest.lastName ? guest.lastName.charAt(0).toUpperCase() : '';
  return `${firstInitial}${lastInitial}` || '?';
}
