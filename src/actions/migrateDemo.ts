'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { v4 as uuidv4 } from 'uuid';
import type { Event, Guest, Table, Constraint, VenueElement } from '@/types';

/**
 * Migrates demo event data to a new event for the authenticated user.
 * This is called after a user signs up from the demo to preserve their work.
 */
export async function migrateDemo(demoEvent: Event): Promise<{ data?: { eventId: string }; error?: string }> {
  const supabase = await createClient();

  // Get authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: 'Not authenticated' };
  }

  try {
    // Create ID maps for remapping references
    const tableIdMap = new Map<string, string>();
    const guestIdMap = new Map<string, string>();
    const constraintIdMap = new Map<string, string>();

    // Generate new IDs for all entities
    demoEvent.tables.forEach(table => {
      tableIdMap.set(table.id, uuidv4());
    });
    demoEvent.guests.forEach(guest => {
      guestIdMap.set(guest.id, uuidv4());
    });
    demoEvent.constraints.forEach(constraint => {
      constraintIdMap.set(constraint.id, uuidv4());
    });

    // 1. Create the new event
    const eventName = demoEvent.name === 'Demo Wedding' ? 'My Event' : demoEvent.name;
    const { data: newEvent, error: eventError } = await supabase
      .from('events')
      .insert({
        name: eventName,
        event_type: demoEvent.eventType,
        date: demoEvent.date || null,
        venue_name: demoEvent.venueName || null,
        venue_address: demoEvent.venueAddress || null,
        guest_capacity_limit: demoEvent.guestCapacityLimit || null,
        user_id: user.id,
      })
      .select()
      .single();

    if (eventError || !newEvent) {
      console.error('Error creating event during migration:', eventError);
      return { error: eventError?.message || 'Failed to create event' };
    }

    const eventId = newEvent.id;

    // 2. Insert tables with new IDs
    if (demoEvent.tables.length > 0) {
      const tablesToInsert = demoEvent.tables.map(table => ({
        id: tableIdMap.get(table.id),
        event_id: eventId,
        name: table.name,
        shape: table.shape,
        capacity: table.capacity,
        x: table.x,
        y: table.y,
        width: table.width,
        height: table.height,
        rotation: table.rotation || 0,
      }));

      const { error: tablesError } = await supabase
        .from('tables')
        .insert(tablesToInsert);

      if (tablesError) {
        console.error('Error inserting tables during migration:', tablesError);
        // Continue anyway - tables are important but we can still save guests
      }
    }

    // 3. Insert guests with new IDs and remapped table IDs
    if (demoEvent.guests.length > 0) {
      const guestsToInsert = demoEvent.guests.map(guest => ({
        id: guestIdMap.get(guest.id),
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
        table_id: guest.tableId ? tableIdMap.get(guest.tableId) : null,
        seat_index: guest.seatIndex ?? null,
        canvas_x: guest.canvasX ?? null,
        canvas_y: guest.canvasY ?? null,
      }));

      const { error: guestsError } = await supabase
        .from('guests')
        .insert(guestsToInsert);

      if (guestsError) {
        console.error('Error inserting guests during migration:', guestsError);
      }

      // Insert guest profiles
      const profilesData = demoEvent.guests
        .filter(g => g.interests?.length || g.dietaryRestrictions?.length || g.accessibilityNeeds?.length)
        .map(g => ({
          guest_id: guestIdMap.get(g.id),
          interests: g.interests || [],
          dietary_restrictions: g.dietaryRestrictions || [],
          accessibility_needs: g.accessibilityNeeds || [],
        }));

      if (profilesData.length > 0) {
        const { error: profilesError } = await supabase
          .from('guest_profiles')
          .insert(profilesData);

        if (profilesError) {
          console.error('Error inserting guest profiles during migration:', profilesError);
        }
      }

      // Insert relationships (need to remap guest IDs)
      const relationshipsToInsert: Array<{
        event_id: string;
        guest_id: string;
        related_guest_id: string;
        relationship_type: string;
        strength: number;
      }> = [];

      // Track which relationships we've already added (to avoid duplicates)
      const addedRelationships = new Set<string>();

      demoEvent.guests.forEach(guest => {
        const newGuestId = guestIdMap.get(guest.id);
        if (!newGuestId) return;

        (guest.relationships || []).forEach(rel => {
          const newRelatedGuestId = guestIdMap.get(rel.guestId);
          if (!newRelatedGuestId) return;

          // Create a canonical key to avoid duplicate relationships
          const key = [newGuestId, newRelatedGuestId].sort().join('-');
          if (addedRelationships.has(key)) return;
          addedRelationships.add(key);

          relationshipsToInsert.push({
            event_id: eventId,
            guest_id: newGuestId,
            related_guest_id: newRelatedGuestId,
            relationship_type: rel.type,
            strength: rel.strength,
          });
        });
      });

      if (relationshipsToInsert.length > 0) {
        const { error: relationshipsError } = await supabase
          .from('guest_relationships')
          .insert(relationshipsToInsert);

        if (relationshipsError) {
          console.error('Error inserting relationships during migration:', relationshipsError);
        }
      }
    }

    // 4. Insert constraints with remapped guest IDs
    if (demoEvent.constraints.length > 0) {
      for (const constraint of demoEvent.constraints) {
        const newConstraintId = constraintIdMap.get(constraint.id);
        if (!newConstraintId) continue;

        // Insert constraint
        const { data: newConstraint, error: constraintError } = await supabase
          .from('constraints')
          .insert({
            id: newConstraintId,
            event_id: eventId,
            constraint_type: constraint.type,
            priority: constraint.priority,
            description: constraint.description || null,
          })
          .select()
          .single();

        if (constraintError || !newConstraint) {
          console.error('Error inserting constraint during migration:', constraintError);
          continue;
        }

        // Insert constraint-guest associations
        const constraintGuests = constraint.guestIds
          .map(oldGuestId => guestIdMap.get(oldGuestId))
          .filter((id): id is string => !!id)
          .map(guestId => ({
            constraint_id: newConstraint.id,
            guest_id: guestId,
          }));

        if (constraintGuests.length > 0) {
          const { error: cgError } = await supabase
            .from('constraint_guests')
            .insert(constraintGuests);

          if (cgError) {
            console.error('Error inserting constraint guests during migration:', cgError);
          }
        }
      }
    }

    // 5. Insert venue elements
    if (demoEvent.venueElements && demoEvent.venueElements.length > 0) {
      const venueElementsToInsert = demoEvent.venueElements.map(element => ({
        id: uuidv4(),
        event_id: eventId,
        type: element.type,
        label: element.label,
        x: element.x,
        y: element.y,
        width: element.width,
        height: element.height,
        rotation: element.rotation || 0,
      }));

      const { error: venueError } = await supabase
        .from('venue_elements')
        .insert(venueElementsToInsert);

      if (venueError) {
        console.error('Error inserting venue elements during migration:', venueError);
      }
    }

    revalidatePath('/dashboard');
    revalidatePath(`/dashboard/events/${eventId}/canvas`);

    return { data: { eventId } };
  } catch (error) {
    console.error('Migration error:', error);
    return { error: 'An unexpected error occurred during migration' };
  }
}

/**
 * Check if there's pending demo migration data and return it
 */
export async function checkPendingDemoMigration(): Promise<{ hasPending: boolean }> {
  // This is a client-side check, so we just return false from server
  // The actual check happens in the client using sessionStorage
  return { hasPending: false };
}
