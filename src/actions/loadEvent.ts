'use server';

import { serverRailsApi, isAuthenticated } from '@/lib/rails/server';
import type { Event, Guest, Table, VenueElement, Constraint, TableShape, VenueElementType, RelationshipType, Relationship } from '@/types';

// Response types from Rails API
interface EventApiResponse {
  data: {
    id: string;
    type: string;
    attributes: {
      id: string;
      name: string;
      eventType: string;
      date: string | null;
      venueName: string | null;
      venueAddress: string | null;
      guestCapacityLimit: number | null;
      createdAt: string;
      updatedAt: string;
    };
    relationships?: {
      tables: { data: Array<{ id: string; type: string }> };
      guests: { data: Array<{ id: string; type: string }> };
      constraints: { data: Array<{ id: string; type: string }> };
      venueElements: { data: Array<{ id: string; type: string }> };
    };
  };
  included?: Array<{
    id: string;
    type: string;
    attributes: Record<string, unknown>;
  }>;
}

interface TableAttributes {
  id: string;
  name: string;
  shape: TableShape;
  capacity: number;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

interface GuestAttributes {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  company: string | null;
  jobTitle: string | null;
  industry: string | null;
  profileSummary: string | null;
  group: string | null;
  rsvpStatus: string;
  notes: string | null;
  tableId: string | null;
  seatIndex: number | null;
  canvasX: number | null;
  canvasY: number | null;
  interests: string[];
  dietaryRestrictions: string[];
  accessibilityNeeds: string[];
  relationships: Array<{
    guestId: string;
    type: RelationshipType;
    strength: number;
  }>;
}

interface ConstraintAttributes {
  id: string;
  constraintType: Constraint['type'];
  priority: Constraint['priority'];
  guestIds: string[];
  description: string | null;
}

interface VenueElementAttributes {
  id: string;
  type: VenueElementType;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

// Transform Rails API response to frontend Event format
function transformApiToEvent(response: EventApiResponse): Event {
  const eventAttrs = response.data.attributes;
  const included = response.included || [];

  // Extract tables
  const tables: Table[] = included
    .filter(item => item.type === 'table')
    .map(item => {
      const attrs = item.attributes as unknown as TableAttributes;
      return {
        id: attrs.id,
        name: attrs.name,
        shape: attrs.shape,
        capacity: attrs.capacity,
        x: Number(attrs.x),
        y: Number(attrs.y),
        width: Number(attrs.width),
        height: Number(attrs.height),
        rotation: attrs.rotation ? Number(attrs.rotation) : 0,
      };
    });

  // Extract guests
  const guests: Guest[] = included
    .filter(item => item.type === 'guest')
    .map(item => {
      const attrs = item.attributes as unknown as GuestAttributes;
      return {
        id: attrs.id,
        firstName: attrs.firstName,
        lastName: attrs.lastName,
        email: attrs.email || undefined,
        company: attrs.company || undefined,
        jobTitle: attrs.jobTitle || undefined,
        industry: attrs.industry || undefined,
        profileSummary: attrs.profileSummary || undefined,
        group: attrs.group || undefined,
        rsvpStatus: attrs.rsvpStatus as 'pending' | 'confirmed' | 'declined',
        notes: attrs.notes || undefined,
        tableId: attrs.tableId || undefined,
        seatIndex: attrs.seatIndex ?? undefined,
        canvasX: attrs.canvasX ? Number(attrs.canvasX) : undefined,
        canvasY: attrs.canvasY ? Number(attrs.canvasY) : undefined,
        interests: attrs.interests || [],
        dietaryRestrictions: attrs.dietaryRestrictions || [],
        accessibilityNeeds: attrs.accessibilityNeeds || [],
        relationships: attrs.relationships || [],
      };
    });

  // Extract constraints
  const constraints: Constraint[] = included
    .filter(item => item.type === 'constraint')
    .map(item => {
      const attrs = item.attributes as unknown as ConstraintAttributes;
      return {
        id: attrs.id,
        type: attrs.constraintType,
        priority: attrs.priority,
        guestIds: attrs.guestIds || [],
        description: attrs.description || undefined,
      };
    });

  // Extract venue elements
  const venueElements: VenueElement[] = included
    .filter(item => item.type === 'venue_element')
    .map(item => {
      const attrs = item.attributes as unknown as VenueElementAttributes;
      return {
        id: attrs.id,
        type: attrs.type,
        label: attrs.label,
        x: Number(attrs.x),
        y: Number(attrs.y),
        width: Number(attrs.width),
        height: Number(attrs.height),
        rotation: attrs.rotation ? Number(attrs.rotation) : 0,
      };
    });

  return {
    id: eventAttrs.id,
    name: eventAttrs.name,
    date: eventAttrs.date || undefined,
    eventType: eventAttrs.eventType as Event['eventType'],
    tables,
    guests,
    constraints,
    surveyQuestions: [],
    surveyResponses: [],
    venueElements,
    venueName: eventAttrs.venueName || undefined,
    venueAddress: eventAttrs.venueAddress || undefined,
    guestCapacityLimit: eventAttrs.guestCapacityLimit || undefined,
    createdAt: eventAttrs.createdAt,
    updatedAt: eventAttrs.updatedAt,
  };
}

// Load full event with all related data
export async function loadEvent(eventId: string): Promise<{ data?: Event; error?: string }> {
  if (!await isAuthenticated()) {
    return { error: 'Not authenticated' };
  }

  // Fetch event with included relationships
  const response = await serverRailsApi.get<EventApiResponse>(
    `/api/v1/events/${eventId}?include=tables,guests,constraints,venue_elements`
  );

  if (response.error) {
    console.error('Error loading event:', response.error);
    return { error: response.error };
  }

  if (!response.data) {
    return { error: 'Event not found' };
  }

  const event = transformApiToEvent(response.data);
  return { data: event };
}

// Load events list for dashboard
export async function loadEvents(): Promise<{
  data?: Array<{
    id: string;
    name: string;
    eventType: string;
    date?: string;
    guestCount: number;
    tableCount: number;
  }>;
  error?: string;
}> {
  if (!await isAuthenticated()) {
    return { error: 'Not authenticated' };
  }

  const response = await serverRailsApi.get<{
    data: Array<{
      id: string;
      type: string;
      attributes: {
        id: string;
        name: string;
        eventType: string;
        date: string | null;
        guestCount: number;
        tableCount: number;
      };
    }>;
  }>('/api/v1/events');

  if (response.error) {
    console.error('Error loading events:', response.error);
    return { error: response.error };
  }

  const events = (response.data?.data || []).map(e => ({
    id: e.attributes.id,
    name: e.attributes.name,
    eventType: e.attributes.eventType,
    date: e.attributes.date || undefined,
    guestCount: e.attributes.guestCount || 0,
    tableCount: e.attributes.tableCount || 0,
  }));

  return { data: events };
}
