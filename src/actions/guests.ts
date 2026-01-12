'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

// Type for guest data from the frontend
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
  // Profile data (stored in separate table)
  interests?: string[];
  dietaryRestrictions?: string[];
  accessibilityNeeds?: string[];
  // Relationships (stored in separate table)
  relationships?: {
    guestId: string;
    type: string;
    strength: number;
  }[];
}

// Transform frontend guest to database format
function toDbGuest(guest: GuestInput, eventId: string) {
  return {
    id: guest.id,
    event_id: eventId,
    first_name: guest.firstName,
    last_name: guest.lastName,
    email: guest.email || null,
    company: guest.company || null,
    job_title: guest.jobTitle || null,
    industry: guest.industry || null,
    profile_summary: guest.profileSummary || null,
    group_name: guest.group || null,
    rsvp_status: guest.rsvpStatus || 'pending',
    notes: guest.notes || null,
    table_id: guest.tableId || null,
    seat_index: guest.seatIndex ?? null,
    canvas_x: guest.canvasX ?? null,
    canvas_y: guest.canvasY ?? null,
  };
}

// Batch insert guests
export async function insertGuests(eventId: string, guests: GuestInput[]) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Not authenticated' };
  }

  // Verify user owns the event
  const { data: event } = await supabase
    .from('events')
    .select('id')
    .eq('id', eventId)
    .eq('user_id', user.id)
    .single();

  if (!event) {
    return { error: 'Event not found or access denied' };
  }

  // Prepare guests for insert
  const dbGuests = guests.map(g => toDbGuest(g, eventId));

  // Insert guests
  const { data: insertedGuests, error: guestsError } = await supabase
    .from('guests')
    .insert(dbGuests)
    .select();

  if (guestsError) {
    console.error('Error inserting guests:', guestsError);
    return { error: guestsError.message };
  }

  // Insert guest profiles for those with profile data
  const profileData = guests
    .filter(g => g.interests?.length || g.dietaryRestrictions?.length || g.accessibilityNeeds?.length)
    .map((g, idx) => ({
      guest_id: insertedGuests[idx].id,
      interests: g.interests || [],
      dietary_restrictions: g.dietaryRestrictions || [],
      accessibility_needs: g.accessibilityNeeds || [],
    }));

  if (profileData.length > 0) {
    const { error: profilesError } = await supabase
      .from('guest_profiles')
      .insert(profileData);

    if (profilesError) {
      console.error('Error inserting guest profiles:', profilesError);
      // Non-fatal, continue
    }
  }

  revalidatePath(`/dashboard/events/${eventId}/canvas`);
  return { data: insertedGuests, count: insertedGuests.length };
}

// Batch update guests
export async function updateGuests(eventId: string, guests: GuestInput[]) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Not authenticated' };
  }

  // Verify user owns the event
  const { data: event } = await supabase
    .from('events')
    .select('id')
    .eq('id', eventId)
    .eq('user_id', user.id)
    .single();

  if (!event) {
    return { error: 'Event not found or access denied' };
  }

  // Update each guest
  const results = await Promise.all(
    guests.map(async (guest) => {
      if (!guest.id) return { error: 'Guest ID required for update' };

      const dbGuest = toDbGuest(guest, eventId);
      const { data, error } = await supabase
        .from('guests')
        .update(dbGuest)
        .eq('id', guest.id)
        .eq('event_id', eventId)
        .select()
        .single();

      return { data, error: error?.message };
    })
  );

  const errors = results.filter(r => r.error);
  if (errors.length > 0) {
    return { error: `Failed to update ${errors.length} guests`, details: errors };
  }

  revalidatePath(`/dashboard/events/${eventId}/canvas`);
  return { data: results.map(r => r.data), count: results.length };
}

// Delete guests
export async function deleteGuests(eventId: string, guestIds: string[]) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Not authenticated' };
  }

  // Verify user owns the event
  const { data: event } = await supabase
    .from('events')
    .select('id')
    .eq('id', eventId)
    .eq('user_id', user.id)
    .single();

  if (!event) {
    return { error: 'Event not found or access denied' };
  }

  // Delete guests (cascades to profiles and relationships)
  const { error } = await supabase
    .from('guests')
    .delete()
    .in('id', guestIds)
    .eq('event_id', eventId);

  if (error) {
    console.error('Error deleting guests:', error);
    return { error: error.message };
  }

  revalidatePath(`/dashboard/events/${eventId}/canvas`);
  return { success: true, count: guestIds.length };
}

// Get guests for export
export async function getGuestsForExport(eventId: string) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Not authenticated' };
  }

  // Get guests with profiles and table names
  const { data: guests, error } = await supabase
    .from('guests')
    .select(`
      *,
      guest_profiles (*),
      tables (name)
    `)
    .eq('event_id', eventId)
    .order('last_name', { ascending: true });

  if (error) {
    console.error('Error fetching guests:', error);
    return { error: error.message };
  }

  // Transform to export format
  const exportData = guests.map(g => ({
    firstName: g.first_name,
    lastName: g.last_name,
    email: g.email || '',
    company: g.company || '',
    jobTitle: g.job_title || '',
    industry: g.industry || '',
    group: g.group_name || '',
    rsvpStatus: g.rsvp_status,
    notes: g.notes || '',
    tableName: g.tables?.name || '',
    interests: g.guest_profiles?.interests?.join(', ') || '',
    dietaryRestrictions: g.guest_profiles?.dietary_restrictions?.join(', ') || '',
    accessibilityNeeds: g.guest_profiles?.accessibility_needs?.join(', ') || '',
  }));

  return { data: exportData };
}

// Insert guest relationships
export async function insertRelationships(
  eventId: string,
  relationships: { guestId: string; relatedGuestId: string; type: string; strength: number }[]
) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Not authenticated' };
  }

  // Verify user owns the event
  const { data: event } = await supabase
    .from('events')
    .select('id')
    .eq('id', eventId)
    .eq('user_id', user.id)
    .single();

  if (!event) {
    return { error: 'Event not found or access denied' };
  }

  // Prepare relationships
  const dbRelationships = relationships.map(r => ({
    event_id: eventId,
    guest_id: r.guestId,
    related_guest_id: r.relatedGuestId,
    relationship_type: r.type,
    strength: r.strength,
  }));

  // Upsert relationships (insert or update on conflict)
  const { data, error } = await supabase
    .from('guest_relationships')
    .upsert(dbRelationships, { onConflict: 'guest_id,related_guest_id' })
    .select();

  if (error) {
    console.error('Error inserting relationships:', error);
    return { error: error.message };
  }

  revalidatePath(`/dashboard/events/${eventId}/canvas`);
  return { data, count: data.length };
}
