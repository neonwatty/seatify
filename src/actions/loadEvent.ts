'use server';

import { createClient } from '@/lib/supabase/server';
import type { Event, Guest, Table, VenueElement, Constraint, TableShape, VenueElementType, RelationshipType, Relationship } from '@/types';

// Database row types
interface DbEvent {
  id: string;
  user_id: string;
  name: string;
  event_type: string;
  date: string | null;
  venue_name: string | null;
  venue_address: string | null;
  guest_capacity_limit: number | null;
  project_id: string | null;
  created_at: string;
  updated_at: string;
}

interface DbProject {
  id: string;
  name: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
}

interface DbProjectEvent {
  id: string;
  name: string;
  date: string | null;
}

interface DbTable {
  id: string;
  event_id: string;
  name: string;
  shape: string;
  capacity: number;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number | null;
  created_at: string;
  updated_at: string;
}

interface DbGuest {
  id: string;
  event_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  company: string | null;
  job_title: string | null;
  industry: string | null;
  profile_summary: string | null;
  group_name: string | null;
  rsvp_status: string;
  notes: string | null;
  table_id: string | null;
  seat_index: number | null;
  canvas_x: number | null;
  canvas_y: number | null;
  created_at: string;
  updated_at: string;
}

interface DbRelationship {
  id: string;
  event_id: string;
  guest_id: string;
  related_guest_id: string;
  relationship_type: string;
  strength: number;
  created_at: string;
  updated_at: string;
}

interface DbVenueElement {
  id: string;
  event_id: string;
  type: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number | null;
  created_at: string;
  updated_at: string;
}

interface DbConstraint {
  id: string;
  event_id: string;
  constraint_type: string;
  priority: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

interface DbGuestProfile {
  guest_id: string;
  interests: string[] | null;
  dietary_restrictions: string[] | null;
  accessibility_needs: string[] | null;
}

interface DbConstraintGuest {
  constraint_id: string;
  guest_id: string;
}

// Transform database event to frontend format
function transformEvent(
  dbEvent: DbEvent,
  dbTables: DbTable[] | null,
  dbGuests: DbGuest[] | null,
  dbRelationships: DbRelationship[] | null,
  dbVenueElements: DbVenueElement[] | null,
  dbConstraints: DbConstraint[] | null,
  dbGuestProfiles: DbGuestProfile[] | null,
  dbConstraintGuests: DbConstraintGuest[] | null
): Event {
  // Create a map of guest profiles
  const profileMap = new Map<string, DbGuestProfile>();
  (dbGuestProfiles || []).forEach(p => profileMap.set(p.guest_id, p));

  // Create a map of relationships by guest ID (bidirectional)
  const relationshipMap = new Map<string, Relationship[]>();
  (dbRelationships || []).forEach(r => {
    // Add relationship from guest_id perspective
    if (!relationshipMap.has(r.guest_id)) {
      relationshipMap.set(r.guest_id, []);
    }
    relationshipMap.get(r.guest_id)!.push({
      guestId: r.related_guest_id,
      type: r.relationship_type as RelationshipType,
      strength: r.strength,
    });

    // Add reverse relationship from related_guest_id perspective
    if (!relationshipMap.has(r.related_guest_id)) {
      relationshipMap.set(r.related_guest_id, []);
    }
    relationshipMap.get(r.related_guest_id)!.push({
      guestId: r.guest_id,
      type: r.relationship_type as RelationshipType,
      strength: r.strength,
    });
  });

  // Transform tables
  const tables: Table[] = (dbTables || []).map(t => ({
    id: t.id,
    name: t.name,
    shape: t.shape as TableShape,
    capacity: t.capacity,
    x: Number(t.x),
    y: Number(t.y),
    width: Number(t.width),
    height: Number(t.height),
    rotation: t.rotation ? Number(t.rotation) : 0,
  }));

  // Transform guests
  const guests: Guest[] = (dbGuests || []).map(g => {
    const profile = profileMap.get(g.id);
    const relationships = relationshipMap.get(g.id) || [];

    return {
      id: g.id,
      firstName: g.first_name,
      lastName: g.last_name,
      email: g.email || undefined,
      company: g.company || undefined,
      jobTitle: g.job_title || undefined,
      industry: g.industry || undefined,
      profileSummary: g.profile_summary || undefined,
      group: g.group_name || undefined,
      rsvpStatus: g.rsvp_status as 'pending' | 'confirmed' | 'declined',
      notes: g.notes || undefined,
      tableId: g.table_id || undefined,
      seatIndex: g.seat_index ?? undefined,
      canvasX: g.canvas_x ? Number(g.canvas_x) : undefined,
      canvasY: g.canvas_y ? Number(g.canvas_y) : undefined,
      interests: profile?.interests || [],
      dietaryRestrictions: profile?.dietary_restrictions || [],
      accessibilityNeeds: profile?.accessibility_needs || [],
      relationships,
    };
  });

  // Transform venue elements
  const venueElements: VenueElement[] = (dbVenueElements || []).map(v => ({
    id: v.id,
    type: v.type as VenueElementType,
    label: v.label,
    x: Number(v.x),
    y: Number(v.y),
    width: Number(v.width),
    height: Number(v.height),
    rotation: v.rotation ? Number(v.rotation) : 0,
  }));

  // Create a map of constraint guest IDs
  const constraintGuestMap = new Map<string, string[]>();
  (dbConstraintGuests || []).forEach(cg => {
    const existing = constraintGuestMap.get(cg.constraint_id) || [];
    existing.push(cg.guest_id);
    constraintGuestMap.set(cg.constraint_id, existing);
  });

  // Transform constraints with their guest IDs
  const constraints: Constraint[] = (dbConstraints || []).map(c => ({
    id: c.id,
    type: c.constraint_type as Constraint['type'],
    priority: c.priority as Constraint['priority'],
    guestIds: constraintGuestMap.get(c.id) || [],
    description: c.description || undefined,
  }));

  return {
    id: dbEvent.id,
    name: dbEvent.name,
    date: dbEvent.date || undefined,
    eventType: dbEvent.event_type as Event['eventType'],
    projectId: dbEvent.project_id || undefined,
    tables,
    guests,
    constraints,
    surveyQuestions: [],
    surveyResponses: [],
    venueElements,
    venueName: dbEvent.venue_name || undefined,
    venueAddress: dbEvent.venue_address || undefined,
    guestCapacityLimit: dbEvent.guest_capacity_limit || undefined,
    createdAt: dbEvent.created_at,
    updatedAt: dbEvent.updated_at,
  };
}

// Project info returned with event
interface ProjectInfo {
  id: string;
  name: string;
  description?: string;
  events: Array<{ id: string; name: string; date?: string }>;
}

// Load full event with all related data
export async function loadEvent(eventId: string): Promise<{ data?: Event; project?: ProjectInfo; error?: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Not authenticated' };
  }

  // Fetch event
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .eq('user_id', user.id)
    .single();

  if (eventError || !event) {
    console.error('Error loading event:', eventError);
    return { error: eventError?.message || 'Event not found' };
  }

  // Fetch project info if event is part of a project
  let projectInfo: ProjectInfo | undefined;
  if (event.project_id) {
    const { data: project } = await supabase
      .from('projects')
      .select('id, name, description')
      .eq('id', event.project_id)
      .single();

    if (project) {
      // Fetch other events in this project
      const { data: projectEvents } = await supabase
        .from('events')
        .select('id, name, date')
        .eq('project_id', event.project_id)
        .order('date', { ascending: true });

      projectInfo = {
        id: project.id,
        name: project.name,
        description: project.description || undefined,
        events: (projectEvents || []).map((e: DbProjectEvent) => ({
          id: e.id,
          name: e.name,
          date: e.date || undefined,
        })),
      };
    }
  }

  // Fetch all related data in parallel
  const [
    { data: tables },
    { data: guests },
    { data: relationships },
    { data: venueElements },
    { data: constraints },
  ] = await Promise.all([
    supabase.from('tables').select('*').eq('event_id', eventId),
    supabase.from('guests').select('*').eq('event_id', eventId),
    supabase.from('guest_relationships').select('*').eq('event_id', eventId),
    supabase.from('venue_elements').select('*').eq('event_id', eventId),
    supabase.from('constraints').select('*').eq('event_id', eventId),
  ]);

  // Fetch constraint-guest mappings if there are constraints
  const constraintIds = (constraints || []).map(c => c.id);
  let constraintGuests: DbConstraintGuest[] | null = null;
  if (constraintIds.length > 0) {
    const { data: cgData } = await supabase
      .from('constraint_guests')
      .select('constraint_id, guest_id')
      .in('constraint_id', constraintIds);
    constraintGuests = cgData as DbConstraintGuest[] | null;
  }

  // Fetch guest profiles for all guests
  const guestIds = (guests || []).map(g => g.id);
  let guestProfiles: DbGuestProfile[] | null = null;
  if (guestIds.length > 0) {
    const { data: profiles } = await supabase
      .from('guest_profiles')
      .select('*')
      .in('guest_id', guestIds);
    guestProfiles = profiles;
  }

  // Transform and return
  const transformedEvent = transformEvent(
    event as DbEvent,
    tables as DbTable[] | null,
    guests as DbGuest[] | null,
    relationships as DbRelationship[] | null,
    venueElements as DbVenueElement[] | null,
    constraints as DbConstraint[] | null,
    guestProfiles,
    constraintGuests
  );

  return { data: transformedEvent, project: projectInfo };
}

// Load events list for dashboard
export async function loadEvents(): Promise<{ data?: Array<{ id: string; name: string; eventType: string; date?: string; guestCount: number; tableCount: number }>; error?: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Not authenticated' };
  }

  // Fetch events with guest and table counts
  const { data: events, error } = await supabase
    .from('events')
    .select(`
      id,
      name,
      event_type,
      date,
      guests(count),
      tables(count)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error loading events:', error);
    return { error: error.message };
  }

  const transformedEvents = (events || []).map(e => ({
    id: e.id,
    name: e.name,
    eventType: e.event_type,
    date: e.date || undefined,
    guestCount: (e.guests as unknown as { count: number }[])?.[0]?.count || 0,
    tableCount: (e.tables as unknown as { count: number }[])?.[0]?.count || 0,
  }));

  return { data: transformedEvents };
}
