'use server';

import { revalidatePath } from 'next/cache';
import { serverRailsApi, isAuthenticated } from '@/lib/rails/server';
import type { GuestInput } from './types';

interface GuestResponse {
  data: {
    id: string;
    type: string;
    attributes: {
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
    };
  };
}

// Transform frontend guest to Rails format
function toRailsGuest(guest: GuestInput) {
  return {
    id: guest.id,
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
    interests: guest.interests || [],
    dietary_restrictions: guest.dietaryRestrictions || [],
    accessibility_needs: guest.accessibilityNeeds || [],
  };
}

// Batch insert guests
export async function insertGuests(eventId: string, guests: GuestInput[]) {
  if (!await isAuthenticated()) {
    return { error: 'Not authenticated' };
  }

  const results = await Promise.all(
    guests.map(async (guest) => {
      const response = await serverRailsApi.post<GuestResponse>(
        `/api/v1/events/${eventId}/guests`,
        { guest: toRailsGuest(guest) }
      );

      if (response.error) {
        return { error: response.error };
      }
      return { data: response.data?.data.attributes };
    })
  );

  const errors = results.filter(r => r.error);
  if (errors.length > 0) {
    console.error('Error inserting guests:', errors);
    return { error: `Failed to insert ${errors.length} guests` };
  }

  revalidatePath(`/dashboard/events/${eventId}/canvas`);
  return { data: results.map(r => r.data), count: results.length };
}

// Batch update guests
export async function updateGuests(eventId: string, guests: GuestInput[]) {
  if (!await isAuthenticated()) {
    return { error: 'Not authenticated' };
  }

  const results = await Promise.all(
    guests.map(async (guest) => {
      if (!guest.id) return { error: 'Guest ID required for update' };

      const response = await serverRailsApi.patch<GuestResponse>(
        `/api/v1/events/${eventId}/guests/${guest.id}`,
        { guest: toRailsGuest(guest) }
      );

      if (response.error) {
        return { error: response.error };
      }
      return { data: response.data?.data.attributes };
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
  if (!await isAuthenticated()) {
    return { error: 'Not authenticated' };
  }

  const results = await Promise.all(
    guestIds.map(async (guestId) => {
      const response = await serverRailsApi.delete<{ message: string }>(
        `/api/v1/events/${eventId}/guests/${guestId}`
      );

      if (response.error) {
        return { error: response.error };
      }
      return { success: true };
    })
  );

  const errors = results.filter(r => r.error);
  if (errors.length > 0) {
    console.error('Error deleting guests:', errors);
    return { error: `Failed to delete ${errors.length} guests` };
  }

  revalidatePath(`/dashboard/events/${eventId}/canvas`);
  return { success: true, count: guestIds.length };
}

// Get guests for export
export async function getGuestsForExport(eventId: string) {
  if (!await isAuthenticated()) {
    return { error: 'Not authenticated' };
  }

  // Fetch all guests for the event
  const response = await serverRailsApi.get<{
    data: Array<{
      attributes: {
        id: string;
        firstName: string;
        lastName: string;
        email: string | null;
        company: string | null;
        jobTitle: string | null;
        industry: string | null;
        group: string | null;
        rsvpStatus: string;
        notes: string | null;
        tableId: string | null;
        interests: string[];
        dietaryRestrictions: string[];
        accessibilityNeeds: string[];
      };
    }>;
  }>(`/api/v1/events/${eventId}/guests`);

  if (response.error) {
    console.error('Error fetching guests:', response.error);
    return { error: response.error };
  }

  // Transform to export format
  const exportData = (response.data?.data || []).map(g => ({
    firstName: g.attributes.firstName,
    lastName: g.attributes.lastName,
    email: g.attributes.email || '',
    company: g.attributes.company || '',
    jobTitle: g.attributes.jobTitle || '',
    industry: g.attributes.industry || '',
    group: g.attributes.group || '',
    rsvpStatus: g.attributes.rsvpStatus,
    notes: g.attributes.notes || '',
    tableName: '', // Table name would need to be fetched separately
    interests: g.attributes.interests?.join(', ') || '',
    dietaryRestrictions: g.attributes.dietaryRestrictions?.join(', ') || '',
    accessibilityNeeds: g.attributes.accessibilityNeeds?.join(', ') || '',
  }));

  return { data: exportData };
}

// Insert guest relationships
export async function insertRelationships(
  eventId: string,
  relationships: { guestId: string; relatedGuestId: string; type: string; strength: number }[]
) {
  if (!await isAuthenticated()) {
    return { error: 'Not authenticated' };
  }

  const results = await Promise.all(
    relationships.map(async (rel) => {
      const response = await serverRailsApi.post<{ data: unknown }>(
        `/api/v1/events/${eventId}/guest_relationships`,
        {
          guest_relationship: {
            guest_id: rel.guestId,
            related_guest_id: rel.relatedGuestId,
            relationship_type: rel.type,
            strength: rel.strength,
          },
        }
      );

      if (response.error) {
        return { error: response.error };
      }
      return { data: response.data };
    })
  );

  const errors = results.filter(r => r.error);
  if (errors.length > 0) {
    console.error('Error inserting relationships:', errors);
    return { error: `Failed to insert ${errors.length} relationships` };
  }

  revalidatePath(`/dashboard/events/${eventId}/canvas`);
  return { data: results.map(r => r.data), count: results.length };
}

// Delete a guest relationship
export async function deleteRelationship(
  eventId: string,
  guestId: string,
  relatedGuestId: string
) {
  if (!await isAuthenticated()) {
    return { error: 'Not authenticated' };
  }

  // Find and delete the relationship
  // We need to get relationships first to find the ID
  const response = await serverRailsApi.delete<{ message: string }>(
    `/api/v1/events/${eventId}/guest_relationships?guest_id=${guestId}&related_guest_id=${relatedGuestId}`
  );

  if (response.error) {
    console.error('Error deleting relationship:', response.error);
    return { error: response.error };
  }

  revalidatePath(`/dashboard/events/${eventId}/canvas`);
  return { success: true };
}
