// Types for Server Actions
// These are exported separately since "use server" files can only export async functions

import type { TableShape, VenueElementType, Constraint } from '@/types';

// Event types
export interface UpdateEventData {
  name?: string;
  event_type?: string;
  date?: string | null;
  venue_name?: string | null;
  venue_address?: string | null;
  guest_capacity_limit?: number | null;
}

// Table types
export interface TableInput {
  id?: string;
  name: string;
  shape: TableShape;
  capacity: number;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
}

// Guest types
export interface GuestInput {
  id?: string;
  firstName: string;
  lastName: string;
  email?: string;
  company?: string;
  jobTitle?: string;
  industry?: string;
  profileSummary?: string;
  group?: string;
  rsvpStatus?: 'pending' | 'confirmed' | 'declined';
  notes?: string;
  tableId?: string;
  seatIndex?: number;
  canvasX?: number;
  canvasY?: number;
  interests?: string[];
  dietaryRestrictions?: string[];
  accessibilityNeeds?: string[];
  relationships?: {
    guestId: string;
    type: string;
    strength: number;
  }[];
}

// Constraint types
export interface ConstraintInput {
  id?: string;
  type: Constraint['type'];
  priority: Constraint['priority'];
  guestIds: string[];
  description?: string;
}

// Venue element types
export interface VenueElementInput {
  id?: string;
  type: VenueElementType;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
}

// User preferences types
export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  eventListViewMode: 'cards' | 'list';
  hasCompletedOnboarding: boolean;
  completedTours: string[];
  hasUsedOptimizeButton: boolean;
  optimizeAnimationEnabled: boolean;
}
