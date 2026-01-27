'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendConfirmationEmail } from '@/lib/email/send';
import type { RSVPSettings, Guest } from '@/types';

// Type for public event data (only what guests need)
export interface PublicEventData {
  id: string;
  name: string;
  date?: string;
  rsvpSettings: RSVPSettings | null;
  guests: Array<{
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    rsvpStatus: 'pending' | 'confirmed' | 'declined';
  }>;
  // For seating preferences selection
  otherGuests: Array<{
    id: string;
    firstName: string;
    lastName: string;
  }>;
  // Project info (if event is part of a project)
  projectId?: string;
  projectName?: string;
  isProjectEvent?: boolean;
}

// Type for RSVP submission
export interface RSVPSubmission {
  eventId: string;
  guestId: string;
  status: 'confirmed' | 'declined';
  plusOnes?: Array<{
    firstName: string;
    lastName: string;
    email?: string;
    mealPreference?: string;
    dietaryRestrictions?: string[];
  }>;
  mealPreference?: string;
  dietaryRestrictions?: string[];
  accessibilityNeeds?: string[];
  seatingPreferences?: string[];
}

/**
 * Load public event data for RSVP page (no auth required)
 */
export async function loadPublicEventForRSVP(
  eventId: string
): Promise<{ data?: PublicEventData; error?: string }> {
  // Use admin client for public RSVP access (bypasses RLS)
  let supabase;
  try {
    supabase = createAdminClient();
  } catch (error) {
    console.error('Failed to create admin client:', error);
    return { error: 'Service temporarily unavailable' };
  }

  // Load event basic info including project_id
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('id, name, date, project_id')
    .eq('id', eventId)
    .single();

  if (eventError || !event) {
    return { error: 'Event not found' };
  }

  const isProjectEvent = !!event.project_id;
  let projectName: string | undefined;

  // If project event, load project name
  if (isProjectEvent) {
    const { data: project } = await supabase
      .from('projects')
      .select('name')
      .eq('id', event.project_id)
      .single();
    projectName = project?.name;
  }

  // Load RSVP settings
  const { data: rsvpData } = await supabase
    .from('rsvp_settings')
    .select('*')
    .eq('event_id', eventId)
    .single();

  // If RSVP is not enabled, return error
  if (!rsvpData?.enabled) {
    return { error: 'RSVP is not enabled for this event' };
  }

  // Check deadline
  if (rsvpData.deadline && new Date(rsvpData.deadline) < new Date()) {
    return { error: 'The RSVP deadline has passed' };
  }

  // Transform RSVP settings
  const rsvpSettings: RSVPSettings = {
    eventId: rsvpData.event_id,
    enabled: rsvpData.enabled,
    deadline: rsvpData.deadline,
    allowPlusOnes: rsvpData.allow_plus_ones,
    maxPlusOnes: rsvpData.max_plus_ones,
    mealOptions: rsvpData.meal_options || [],
    collectDietary: rsvpData.collect_dietary,
    collectAccessibility: rsvpData.collect_accessibility,
    collectSeatingPreferences: rsvpData.collect_seating_preferences,
    customMessage: rsvpData.custom_message,
    confirmationMessage: rsvpData.confirmation_message,
    hideSeatifyBranding: rsvpData.hide_seatify_branding || false,
  };

  let transformedGuests: Array<{
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    rsvpStatus: 'pending' | 'confirmed' | 'declined';
  }> = [];

  let otherGuests: Array<{
    id: string;
    firstName: string;
    lastName: string;
  }> = [];

  if (isProjectEvent) {
    // Load guests from event_guest_attendance joined with project_guests
    const { data: attendance, error: attendanceError } = await supabase
      .from('event_guest_attendance')
      .select(`
        id,
        rsvp_status,
        project_guest:project_guests(
          id,
          first_name,
          last_name,
          email
        )
      `)
      .eq('event_id', eventId);

    if (attendanceError) {
      return { error: 'Failed to load guest data' };
    }

    transformedGuests = (attendance || [])
      .filter((a) => a.project_guest)
      .map((a) => {
        const pg = a.project_guest as unknown as { id: string; first_name: string; last_name: string; email: string | null };
        return {
          id: a.id, // Use attendance ID as the guest ID for RSVP submission
          firstName: pg.first_name,
          lastName: pg.last_name,
          email: pg.email ?? undefined,
          rsvpStatus: a.rsvp_status as 'pending' | 'confirmed' | 'declined',
        };
      });

    // For seating preferences in project events, include all project guests (not just this event's attendees)
    const { data: projectGuests } = await supabase
      .from('project_guests')
      .select('id, first_name, last_name')
      .eq('project_id', event.project_id);

    otherGuests = (projectGuests || []).map((g) => ({
      id: g.id,
      firstName: g.first_name,
      lastName: g.last_name,
    }));
  } else {
    // Load guests from regular guests table (standalone event)
    const { data: guests, error: guestsError } = await supabase
      .from('guests')
      .select('id, first_name, last_name, email, rsvp_status')
      .eq('event_id', eventId)
      .is('plus_one_of', null); // Only primary guests, not plus-ones

    if (guestsError) {
      return { error: 'Failed to load guest data' };
    }

    transformedGuests = (guests || []).map((g) => ({
      id: g.id,
      firstName: g.first_name,
      lastName: g.last_name,
      email: g.email ?? undefined,
      rsvpStatus: g.rsvp_status as 'pending' | 'confirmed' | 'declined',
    }));

    // For seating preferences, return all guests who might attend (pending or confirmed)
    otherGuests = transformedGuests
      .filter((g) => g.rsvpStatus !== 'declined')
      .map((g) => ({
        id: g.id,
        firstName: g.firstName,
        lastName: g.lastName,
      }));
  }

  return {
    data: {
      id: event.id,
      name: event.name,
      date: event.date ?? undefined,
      rsvpSettings,
      guests: transformedGuests,
      otherGuests,
      projectId: event.project_id ?? undefined,
      projectName,
      isProjectEvent,
    },
  };
}

/**
 * Find a guest by RSVP token (for direct email links)
 */
export async function findGuestByToken(
  eventId: string,
  token: string
): Promise<{ data?: Guest; error?: string }> {
  // Use admin client for public RSVP access (bypasses RLS)
  let supabase;
  try {
    supabase = createAdminClient();
  } catch (error) {
    console.error('Failed to create admin client:', error);
    return { error: 'Service temporarily unavailable' };
  }

  // Check if this is a project event
  const { data: event } = await supabase
    .from('events')
    .select('project_id')
    .eq('id', eventId)
    .single();

  const isProjectEvent = !!event?.project_id;

  if (isProjectEvent) {
    // Search in event_guest_attendance by token
    const { data: attendance, error } = await supabase
      .from('event_guest_attendance')
      .select(`
        id,
        rsvp_status,
        rsvp_token,
        meal_preference,
        dietary_restrictions,
        accessibility_needs,
        seating_preferences,
        project_guest:project_guests(
          id,
          first_name,
          last_name,
          email
        )
      `)
      .eq('event_id', eventId)
      .eq('rsvp_token', token)
      .single();

    if (error || !attendance || !attendance.project_guest) {
      return { error: 'Invalid or expired invitation link' };
    }

    const pg = attendance.project_guest as unknown as { id: string; first_name: string; last_name: string; email: string | null };

    const transformedGuest: Guest = {
      id: attendance.id, // Use attendance ID for RSVP submission
      firstName: pg.first_name,
      lastName: pg.last_name,
      email: pg.email ?? undefined,
      rsvpStatus: attendance.rsvp_status as 'pending' | 'confirmed' | 'declined',
      mealPreference: (attendance.meal_preference as string) ?? undefined,
      dietaryRestrictions: (attendance.dietary_restrictions as string[]) || [],
      accessibilityNeeds: (attendance.accessibility_needs as string[]) || [],
      seatingPreferences: (attendance.seating_preferences as string[]) || [],
      rsvpToken: attendance.rsvp_token ?? undefined,
      relationships: [],
    };

    return { data: transformedGuest };
  } else {
    // Search in regular guests table
    const { data: guest, error } = await supabase
      .from('guests')
      .select('*')
      .eq('event_id', eventId)
      .eq('rsvp_token', token)
      .is('plus_one_of', null)
      .single();

    if (error || !guest) {
      return { error: 'Invalid or expired invitation link' };
    }

    // Transform to camelCase
    const transformedGuest: Guest = {
      id: guest.id,
      firstName: guest.first_name,
      lastName: guest.last_name,
      email: guest.email ?? undefined,
      rsvpStatus: guest.rsvp_status,
      mealPreference: guest.meal_preference ?? undefined,
      dietaryRestrictions: guest.dietary_restrictions || [],
      accessibilityNeeds: guest.accessibility_needs || [],
      seatingPreferences: guest.seating_preferences || [],
      rsvpToken: guest.rsvp_token ?? undefined,
      relationships: [],
    };

    return { data: transformedGuest };
  }
}

/**
 * Find a guest by email or name
 */
export async function findGuestByEmailOrName(
  eventId: string,
  searchTerm: string
): Promise<{ data?: Guest; error?: string }> {
  // Use admin client for public RSVP access
  let supabase;
  try {
    supabase = createAdminClient();
  } catch (error) {
    console.error('Failed to create admin client:', error);
    return { error: 'Service temporarily unavailable' };
  }

  const searchLower = searchTerm.toLowerCase().trim();

  // First check if this is a project event
  const { data: event } = await supabase
    .from('events')
    .select('project_id')
    .eq('id', eventId)
    .single();

  const isProjectEvent = !!event?.project_id;

  if (isProjectEvent) {
    // Search in event_guest_attendance joined with project_guests
    const { data: attendance } = await supabase
      .from('event_guest_attendance')
      .select(`
        id,
        rsvp_status,
        meal_preference,
        dietary_restrictions,
        accessibility_needs,
        seating_preferences,
        project_guest:project_guests(
          id,
          first_name,
          last_name,
          email
        )
      `)
      .eq('event_id', eventId);

    // Find by email first
    let found = attendance?.find((a) => {
      const pg = a.project_guest as unknown as { email: string | null };
      return pg?.email?.toLowerCase() === searchLower;
    });

    // If not found by email, search by name
    if (!found) {
      found = attendance?.find((a) => {
        const pg = a.project_guest as unknown as { first_name: string; last_name: string };
        if (!pg) return false;
        const fullName = `${pg.first_name} ${pg.last_name}`.toLowerCase();
        return fullName.includes(searchLower) ||
               pg.first_name?.toLowerCase() === searchLower ||
               pg.last_name?.toLowerCase() === searchLower;
      });
    }

    if (!found || !found.project_guest) {
      return { error: 'Guest not found. Please check your name or email.' };
    }

    const pg = found.project_guest as unknown as { id: string; first_name: string; last_name: string; email: string | null };

    // Transform to Guest type (using attendance ID as guest ID for RSVP submission)
    const transformedGuest: Guest = {
      id: found.id,
      firstName: pg.first_name,
      lastName: pg.last_name,
      email: pg.email ?? undefined,
      rsvpStatus: found.rsvp_status as 'pending' | 'confirmed' | 'declined',
      mealPreference: (found.meal_preference as string) ?? undefined,
      dietaryRestrictions: (found.dietary_restrictions as string[]) || [],
      accessibilityNeeds: (found.accessibility_needs as string[]) || [],
      seatingPreferences: (found.seating_preferences as string[]) || [],
      relationships: [],
    };

    return { data: transformedGuest };
  } else {
    // Search in regular guests table (standalone event)
    // Try to find by email first
    const { data: guestByEmail } = await supabase
      .from('guests')
      .select('*')
      .eq('event_id', eventId)
      .ilike('email', searchLower)
      .is('plus_one_of', null)
      .single();

    let guest = guestByEmail;

    // If not found by email, try by full name
    if (!guest) {
      const { data: guests } = await supabase
        .from('guests')
        .select('*')
        .eq('event_id', eventId)
        .is('plus_one_of', null);

      // Search by name (first + last)
      guest = guests?.find((g) => {
        const fullName = `${g.first_name} ${g.last_name}`.toLowerCase();
        return fullName.includes(searchLower) ||
               g.first_name?.toLowerCase() === searchLower ||
               g.last_name?.toLowerCase() === searchLower;
      }) || null;
    }

    if (!guest) {
      return { error: 'Guest not found. Please check your name or email.' };
    }

    // Transform to camelCase
    const transformedGuest: Guest = {
      id: guest.id,
      firstName: guest.first_name,
      lastName: guest.last_name,
      email: guest.email ?? undefined,
      rsvpStatus: guest.rsvp_status,
      mealPreference: guest.meal_preference ?? undefined,
      dietaryRestrictions: guest.dietary_restrictions || [],
      accessibilityNeeds: guest.accessibility_needs || [],
      seatingPreferences: guest.seating_preferences || [],
      relationships: [],
    };

    return { data: transformedGuest };
  }
}

/**
 * Submit RSVP response
 * Uses admin client to bypass RLS since guests are not authenticated
 */
export async function submitRSVPResponse(
  submission: RSVPSubmission
): Promise<{ success?: boolean; error?: string }> {
  // Use admin client since guests submitting RSVP are not authenticated
  let supabase;
  try {
    supabase = createAdminClient();
  } catch (error) {
    console.error('Failed to create admin client:', error);
    return { error: 'Service temporarily unavailable' };
  }

  // Check if this is a project event
  const { data: event } = await supabase
    .from('events')
    .select('project_id')
    .eq('id', submission.eventId)
    .single();

  const isProjectEvent = !!event?.project_id;

  // Verify event has RSVP enabled and deadline not passed
  const { data: rsvpSettings } = await supabase
    .from('rsvp_settings')
    .select('*')
    .eq('event_id', submission.eventId)
    .single();

  if (!rsvpSettings?.enabled) {
    return { error: 'RSVP is not enabled for this event' };
  }

  if (rsvpSettings.deadline && new Date(rsvpSettings.deadline) < new Date()) {
    return { error: 'The RSVP deadline has passed' };
  }

  if (isProjectEvent) {
    // Update event_guest_attendance for project events
    const { error: updateError } = await supabase
      .from('event_guest_attendance')
      .update({
        rsvp_status: submission.status,
        meal_preference: submission.mealPreference || null,
        dietary_restrictions: submission.dietaryRestrictions || [],
        accessibility_needs: submission.accessibilityNeeds || [],
        seating_preferences: submission.seatingPreferences || [],
        rsvp_responded_at: new Date().toISOString(),
      })
      .eq('id', submission.guestId); // guestId is actually attendance ID for project events

    if (updateError) {
      console.error('Error updating attendance:', updateError);
      return { error: 'Failed to save your response' };
    }

    // Handle plus-ones for project events
    if (submission.status === 'confirmed' && submission.plusOnes && submission.plusOnes.length > 0) {
      if (!rsvpSettings.allow_plus_ones) {
        return { error: 'Plus-ones are not allowed for this event' };
      }
      if (submission.plusOnes.length > rsvpSettings.max_plus_ones) {
        return { error: `Maximum ${rsvpSettings.max_plus_ones} plus-one(s) allowed` };
      }

      // Get the attendance record to find the primary guest
      const { data: attendance } = await supabase
        .from('event_guest_attendance')
        .select('project_guest_id')
        .eq('id', submission.guestId)
        .single();

      if (attendance) {
        // Add plus-ones to both project_guests and event_guest_attendance
        for (const plusOne of submission.plusOnes) {
          // First add to project_guests
          const { data: newProjectGuest, error: projectGuestError } = await supabase
            .from('project_guests')
            .insert({
              project_id: event.project_id,
              first_name: plusOne.firstName,
              last_name: plusOne.lastName,
              email: plusOne.email || null,
              notes: `Plus-one of attendance ${submission.guestId}`,
            })
            .select()
            .single();

          if (projectGuestError) {
            console.error('Error adding plus-one to project:', projectGuestError);
            continue;
          }

          // Then add to event_guest_attendance
          const { error: attendanceError } = await supabase
            .from('event_guest_attendance')
            .insert({
              event_id: submission.eventId,
              project_guest_id: newProjectGuest.id,
              rsvp_status: 'confirmed',
              meal_preference: plusOne.mealPreference || null,
              dietary_restrictions: plusOne.dietaryRestrictions || [],
              rsvp_responded_at: new Date().toISOString(),
            });

          if (attendanceError) {
            console.error('Error adding plus-one attendance:', attendanceError);
          }
        }
      }
    }
  } else {
    // Update the guest record for standalone events
    const { error: updateError } = await supabase
      .from('guests')
      .update({
        rsvp_status: submission.status,
        meal_preference: submission.mealPreference || null,
        dietary_restrictions: submission.dietaryRestrictions || [],
        accessibility_needs: submission.accessibilityNeeds || [],
        seating_preferences: submission.seatingPreferences || [],
        rsvp_responded_at: new Date().toISOString(),
      })
      .eq('id', submission.guestId)
      .eq('event_id', submission.eventId);

    if (updateError) {
      console.error('Error updating guest:', updateError);
      return { error: 'Failed to save your response' };
    }

    // Handle plus-ones if attending and allowed
    if (submission.status === 'confirmed' && submission.plusOnes && submission.plusOnes.length > 0) {
      // Verify plus-ones are allowed
      if (!rsvpSettings.allow_plus_ones) {
        return { error: 'Plus-ones are not allowed for this event' };
      }

      // Check max plus-ones
      if (submission.plusOnes.length > rsvpSettings.max_plus_ones) {
        return { error: `Maximum ${rsvpSettings.max_plus_ones} plus-one(s) allowed` };
      }

      // First, remove any existing plus-ones for this guest
      await supabase
        .from('guests')
        .delete()
        .eq('event_id', submission.eventId)
        .eq('plus_one_of', submission.guestId);

      // Add new plus-ones
      for (const plusOne of submission.plusOnes) {
        const { error: plusOneError } = await supabase
          .from('guests')
          .insert({
            event_id: submission.eventId,
            first_name: plusOne.firstName,
            last_name: plusOne.lastName,
            email: plusOne.email || null,
            rsvp_status: 'confirmed',
            meal_preference: plusOne.mealPreference || null,
            dietary_restrictions: plusOne.dietaryRestrictions || [],
            plus_one_of: submission.guestId,
            rsvp_responded_at: new Date().toISOString(),
          });

        if (plusOneError) {
          console.error('Error adding plus-one:', plusOneError);
        }
      }
    } else if (submission.status === 'declined') {
      // If declining, remove any existing plus-ones
      await supabase
        .from('guests')
        .delete()
        .eq('event_id', submission.eventId)
        .eq('plus_one_of', submission.guestId);
    }
  }

  // Record the response in the audit table
  await supabase
    .from('rsvp_responses')
    .insert({
      guest_id: submission.guestId,
      event_id: submission.eventId,
      status: submission.status,
      meal_preference: submission.mealPreference || null,
      dietary_restrictions: submission.dietaryRestrictions || [],
      accessibility_needs: submission.accessibilityNeeds || [],
      seating_preferences: submission.seatingPreferences || [],
      plus_ones_added: submission.plusOnes?.length || 0,
      response_source: 'web',
    });

  // Send confirmation email if enabled
  if (rsvpSettings.send_confirmation_email) {
    // Fetch guest details for the email
    const { data: guest } = await supabase
      .from('guests')
      .select('first_name, last_name, email')
      .eq('id', submission.guestId)
      .single();

    // Fetch event details for the email
    const { data: event } = await supabase
      .from('events')
      .select('name, date, venue_address')
      .eq('id', submission.eventId)
      .single();

    // Fetch host profile for the email
    const { data: eventWithHost } = await supabase
      .from('events')
      .select('user_id')
      .eq('id', submission.eventId)
      .single();

    let hostName: string | undefined;
    if (eventWithHost?.user_id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', eventWithHost.user_id)
        .single();
      hostName = profile?.full_name || undefined;
    }

    // Only send if we have guest email and data
    if (guest?.email && event) {
      const guestName = `${guest.first_name} ${guest.last_name}`.trim();

      // Send confirmation email (don't block on result)
      sendConfirmationEmail({
        guestId: submission.guestId,
        guestName,
        guestEmail: guest.email,
        eventId: submission.eventId,
        eventName: event.name,
        eventDate: event.date || undefined,
        hostName,
        isAttending: submission.status === 'confirmed',
        plusOneCount: submission.plusOnes?.length || 0,
        mealPreference: submission.mealPreference,
        dietaryRestrictions: submission.dietaryRestrictions,
        venueAddress: event.venue_address || undefined,
        includeCalendarInvite: rsvpSettings.include_calendar_invite ?? true,
      }).catch((err) => {
        // Log error but don't fail the RSVP submission
        console.error('Failed to send confirmation email:', err);
      });
    }
  }

  return { success: true };
}

// Dashboard data types
export interface RSVPDashboardData {
  settings: RSVPSettings | null;
  stats: {
    totalInvited: number;
    responded: number;
    pending: number;
    confirmed: number;
    declined: number;
    responseRate: number;
    plusOnesCount: number;
    totalAttending: number;
  };
  mealBreakdown: Record<string, number>;
  dietaryBreakdown: Record<string, number>;
  recentResponses: Array<{
    guestId: string;
    guestName: string;
    status: 'confirmed' | 'declined';
    respondedAt: string;
    plusOnes: number;
  }>;
  seatingPreferences: Array<{
    fromGuestId: string;
    fromGuestName: string;
    toGuestId: string;
    toGuestName: string;
    mutual: boolean;
  }>;
  pendingGuests: Array<{
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
  }>;
}

/**
 * Load RSVP dashboard data for event planners (requires auth)
 */
export async function loadRSVPDashboardData(
  eventId: string
): Promise<{ data?: RSVPDashboardData; error?: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Not authenticated' };
  }

  // Verify user owns the event
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('id')
    .eq('id', eventId)
    .eq('user_id', user.id)
    .single();

  if (eventError || !event) {
    return { error: 'Event not found or access denied' };
  }

  // Load RSVP settings
  const { data: rsvpData } = await supabase
    .from('rsvp_settings')
    .select('*')
    .eq('event_id', eventId)
    .single();

  const settings: RSVPSettings | null = rsvpData ? {
    eventId: rsvpData.event_id,
    enabled: rsvpData.enabled,
    deadline: rsvpData.deadline,
    allowPlusOnes: rsvpData.allow_plus_ones,
    maxPlusOnes: rsvpData.max_plus_ones,
    mealOptions: rsvpData.meal_options || [],
    collectDietary: rsvpData.collect_dietary,
    collectAccessibility: rsvpData.collect_accessibility,
    collectSeatingPreferences: rsvpData.collect_seating_preferences,
    customMessage: rsvpData.custom_message,
    confirmationMessage: rsvpData.confirmation_message,
  } : null;

  // Load all guests
  const { data: guests } = await supabase
    .from('guests')
    .select('*')
    .eq('event_id', eventId);

  if (!guests) {
    return { error: 'Failed to load guests' };
  }

  // Separate primary guests and plus-ones
  const primaryGuests = guests.filter((g) => !g.plus_one_of);
  const plusOnes = guests.filter((g) => g.plus_one_of);

  // Calculate stats
  const confirmed = primaryGuests.filter((g) => g.rsvp_status === 'confirmed');
  const declined = primaryGuests.filter((g) => g.rsvp_status === 'declined');
  const pending = primaryGuests.filter((g) => g.rsvp_status === 'pending');

  const stats = {
    totalInvited: primaryGuests.length,
    responded: confirmed.length + declined.length,
    pending: pending.length,
    confirmed: confirmed.length,
    declined: declined.length,
    responseRate: primaryGuests.length > 0
      ? Math.round(((confirmed.length + declined.length) / primaryGuests.length) * 100)
      : 0,
    plusOnesCount: plusOnes.length,
    totalAttending: confirmed.length + plusOnes.length,
  };

  // Meal breakdown (from confirmed guests + plus-ones)
  const mealBreakdown: Record<string, number> = {};
  [...confirmed, ...plusOnes].forEach((g) => {
    if (g.meal_preference) {
      mealBreakdown[g.meal_preference] = (mealBreakdown[g.meal_preference] || 0) + 1;
    }
  });

  // Dietary breakdown
  const dietaryBreakdown: Record<string, number> = {};
  [...confirmed, ...plusOnes].forEach((g) => {
    (g.dietary_restrictions || []).forEach((restriction: string) => {
      dietaryBreakdown[restriction] = (dietaryBreakdown[restriction] || 0) + 1;
    });
  });

  // Recent responses (last 10)
  const respondedGuests = primaryGuests
    .filter((g) => g.rsvp_responded_at)
    .sort((a, b) => new Date(b.rsvp_responded_at).getTime() - new Date(a.rsvp_responded_at).getTime())
    .slice(0, 10);

  const recentResponses = respondedGuests.map((g) => ({
    guestId: g.id,
    guestName: `${g.first_name} ${g.last_name}`,
    status: g.rsvp_status as 'confirmed' | 'declined',
    respondedAt: g.rsvp_responded_at,
    plusOnes: plusOnes.filter((p) => p.plus_one_of === g.id).length,
  }));

  // Seating preferences
  const seatingPreferences: RSVPDashboardData['seatingPreferences'] = [];
  const guestMap = new Map(guests.map((g) => [g.id, g]));

  confirmed.forEach((g) => {
    const prefs = g.seating_preferences || [];
    prefs.forEach((prefGuestId: string) => {
      const prefGuest = guestMap.get(prefGuestId);
      if (prefGuest) {
        // Check if mutual
        const otherPrefs = prefGuest.seating_preferences || [];
        const mutual = otherPrefs.includes(g.id);

        seatingPreferences.push({
          fromGuestId: g.id,
          fromGuestName: `${g.first_name} ${g.last_name}`,
          toGuestId: prefGuestId,
          toGuestName: `${prefGuest.first_name} ${prefGuest.last_name}`,
          mutual,
        });
      }
    });
  });

  // Pending guests
  const pendingGuests = pending.map((g) => ({
    id: g.id,
    firstName: g.first_name,
    lastName: g.last_name,
    email: g.email,
  }));

  return {
    data: {
      settings,
      stats,
      mealBreakdown,
      dietaryBreakdown,
      recentResponses,
      seatingPreferences,
      pendingGuests,
    },
  };
}
