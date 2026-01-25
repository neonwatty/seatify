'use server';

import { createClient } from '@/lib/supabase/server';
import { getServerSubscription } from '@/lib/subscription/server';
import { ensureGuestToken, sendBatchInvitations, sendInvitationEmail, sendReminderEmail } from '@/lib/email/send';
import { buildRSVPUrl } from '@/lib/email/utils';
import type { BatchEmailResult } from '@/lib/email/resend';
import type { EmailStatusSummary, SendInvitationsResult } from '@/types';

// Check if user has Pro subscription
async function requirePro(userId: string): Promise<{ allowed: boolean; error?: string }> {
  const { plan } = await getServerSubscription(userId);
  if (plan === 'free') {
    return { allowed: false, error: 'PRO_REQUIRED' };
  }
  return { allowed: true };
}

// Get email status summary for an event
export async function getEmailStatus(eventId: string): Promise<EmailStatusSummary | { error: string }> {
  const supabase = await createClient();

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Not authenticated' };
  }

  // Verify user owns the event
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('id, user_id')
    .eq('id', eventId)
    .single();

  if (eventError || !event) {
    return { error: 'Event not found' };
  }

  if (event.user_id !== user.id) {
    return { error: 'Not authorized' };
  }

  // Get all email logs for this event
  const { data: emailLogs, error: logsError } = await supabase
    .from('email_logs')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false });

  if (logsError) {
    return { error: 'Failed to fetch email logs' };
  }

  // Get all guests with emails for this event
  const { data: guests, error: guestsError } = await supabase
    .from('guests')
    .select('id, first_name, last_name, email')
    .eq('event_id', eventId)
    .not('email', 'is', null)
    .is('plus_one_of', null); // Exclude plus-ones

  if (guestsError) {
    return { error: 'Failed to fetch guests' };
  }

  // Calculate status counts
  const statusCounts = {
    pending: 0,
    sent: 0,
    delivered: 0,
    opened: 0,
    bounced: 0,
    failed: 0,
  };

  for (const log of emailLogs || []) {
    const status = log.status as keyof typeof statusCounts;
    if (status in statusCounts) {
      statusCounts[status]++;
    }
  }

  // Build guest statuses
  const guestStatuses = (guests || []).map((guest) => {
    const guestLogs = (emailLogs || []).filter((log) => log.guest_id === guest.id);
    const invitations = guestLogs.filter((log) => log.email_type === 'invitation');
    const reminders = guestLogs.filter((log) => log.email_type === 'reminder');
    const lastLog = guestLogs[0]; // Already sorted by created_at desc

    return {
      guestId: guest.id,
      guestName: `${guest.first_name} ${guest.last_name}`.trim(),
      email: guest.email,
      lastEmailType: lastLog?.email_type as 'invitation' | 'reminder' | null,
      lastStatus: lastLog?.status || null,
      lastSentAt: lastLog?.sent_at || null,
      invitationsSent: invitations.length,
      remindersSent: reminders.length,
    };
  });

  return {
    total: emailLogs?.length || 0,
    ...statusCounts,
    guestStatuses,
  };
}

// Send invitations to selected guests
export async function sendInvitations(
  eventId: string,
  guestSelection: string[] | 'all' | 'pending' | 'no-email'
): Promise<SendInvitationsResult> {
  const supabase = await createClient();

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Check Pro subscription
  const proCheck = await requirePro(user.id);
  if (!proCheck.allowed) {
    return { success: false, error: proCheck.error };
  }

  // Get event with RSVP settings
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select(`
      id,
      name,
      date,
      user_id,
      profiles!events_user_id_fkey (
        display_name
      )
    `)
    .eq('id', eventId)
    .single();

  if (eventError || !event) {
    return { success: false, error: 'Event not found' };
  }

  if (event.user_id !== user.id) {
    return { success: false, error: 'Not authorized' };
  }

  // Get RSVP settings
  const { data: rsvpSettings } = await supabase
    .from('rsvp_settings')
    .select('*')
    .eq('event_id', eventId)
    .single();

  // Build guest query based on selection
  let guestsQuery = supabase
    .from('guests')
    .select('id, first_name, last_name, email, rsvp_status, rsvp_token')
    .eq('event_id', eventId)
    .not('email', 'is', null)
    .is('plus_one_of', null); // Exclude plus-ones

  if (Array.isArray(guestSelection)) {
    guestsQuery = guestsQuery.in('id', guestSelection);
  } else if (guestSelection === 'pending') {
    guestsQuery = guestsQuery.eq('rsvp_status', 'pending');
  } else if (guestSelection === 'no-email') {
    // Guests who haven't received any invitation yet
    const { data: sentGuestIds } = await supabase
      .from('email_logs')
      .select('guest_id')
      .eq('event_id', eventId)
      .eq('email_type', 'invitation');

    const sentIds = (sentGuestIds || []).map((g) => g.guest_id);
    if (sentIds.length > 0) {
      guestsQuery = guestsQuery.not('id', 'in', `(${sentIds.join(',')})`);
    }
  }
  // 'all' doesn't need additional filtering

  const { data: guests, error: guestsError } = await guestsQuery;

  if (guestsError) {
    return { success: false, error: 'Failed to fetch guests' };
  }

  if (!guests || guests.length === 0) {
    return { success: false, error: 'No guests found with email addresses' };
  }

  // Ensure all guests have RSVP tokens
  const guestsWithTokens = await Promise.all(
    guests.map(async (guest) => {
      const token = guest.rsvp_token || await ensureGuestToken(guest.id);
      return {
        id: guest.id,
        firstName: guest.first_name,
        lastName: guest.last_name,
        email: guest.email,
        rsvpToken: token,
      };
    })
  );

  // Build host name from profile
  const profile = event.profiles as { display_name?: string } | null;
  const hostName = profile?.display_name || undefined;

  // Send batch invitations
  const result = await sendBatchInvitations(
    eventId,
    guestsWithTokens,
    {
      eventName: event.name,
      eventDate: event.date,
      hostName,
      customMessage: rsvpSettings?.custom_message,
      deadline: rsvpSettings?.deadline,
    }
  );

  return { success: true, result };
}

// Send a single invitation
export async function sendSingleInvitation(
  eventId: string,
  guestId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Check Pro subscription
  const proCheck = await requirePro(user.id);
  if (!proCheck.allowed) {
    return { success: false, error: proCheck.error };
  }

  // Get event
  const { data: event } = await supabase
    .from('events')
    .select(`
      id,
      name,
      date,
      user_id,
      profiles!events_user_id_fkey (
        display_name
      )
    `)
    .eq('id', eventId)
    .single();

  if (!event || event.user_id !== user.id) {
    return { success: false, error: 'Event not found or not authorized' };
  }

  // Get RSVP settings
  const { data: rsvpSettings } = await supabase
    .from('rsvp_settings')
    .select('*')
    .eq('event_id', eventId)
    .single();

  // Get guest
  const { data: guest } = await supabase
    .from('guests')
    .select('id, first_name, last_name, email, rsvp_token')
    .eq('id', guestId)
    .eq('event_id', eventId)
    .single();

  if (!guest || !guest.email) {
    return { success: false, error: 'Guest not found or has no email' };
  }

  // Ensure token exists
  const token = guest.rsvp_token || await ensureGuestToken(guest.id);

  const profile = event.profiles as { display_name?: string } | null;
  const hostName = profile?.display_name || undefined;

  const result = await sendInvitationEmail({
    guestId: guest.id,
    guestName: `${guest.first_name} ${guest.last_name}`.trim(),
    guestEmail: guest.email,
    eventId,
    eventName: event.name,
    eventDate: event.date,
    hostName,
    customMessage: rsvpSettings?.custom_message,
    deadline: rsvpSettings?.deadline,
    rsvpToken: token,
  });

  return result;
}

// Send reminder to a single guest
export async function sendSingleReminder(
  eventId: string,
  guestId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Check Pro subscription
  const proCheck = await requirePro(user.id);
  if (!proCheck.allowed) {
    return { success: false, error: proCheck.error };
  }

  // Get event
  const { data: event } = await supabase
    .from('events')
    .select(`
      id,
      name,
      date,
      user_id,
      profiles!events_user_id_fkey (
        display_name
      )
    `)
    .eq('id', eventId)
    .single();

  if (!event || event.user_id !== user.id) {
    return { success: false, error: 'Event not found or not authorized' };
  }

  // Get RSVP settings
  const { data: rsvpSettings } = await supabase
    .from('rsvp_settings')
    .select('*')
    .eq('event_id', eventId)
    .single();

  // Get guest
  const { data: guest } = await supabase
    .from('guests')
    .select('id, first_name, last_name, email, rsvp_token, rsvp_status')
    .eq('id', guestId)
    .eq('event_id', eventId)
    .single();

  if (!guest || !guest.email) {
    return { success: false, error: 'Guest not found or has no email' };
  }

  if (guest.rsvp_status !== 'pending') {
    return { success: false, error: 'Guest has already responded' };
  }

  // Calculate days until deadline
  let daysUntilDeadline: number | undefined;
  if (rsvpSettings?.deadline) {
    const deadline = new Date(rsvpSettings.deadline);
    const now = new Date();
    const diffTime = deadline.getTime() - now.getTime();
    daysUntilDeadline = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (daysUntilDeadline < 0) daysUntilDeadline = 0;
  }

  // Ensure token exists
  const token = guest.rsvp_token || await ensureGuestToken(guest.id);

  const profile = event.profiles as { display_name?: string } | null;
  const hostName = profile?.display_name || undefined;

  const result = await sendReminderEmail({
    guestId: guest.id,
    guestName: `${guest.first_name} ${guest.last_name}`.trim(),
    guestEmail: guest.email,
    eventId,
    eventName: event.name,
    eventDate: event.date,
    hostName,
    deadline: rsvpSettings?.deadline,
    daysUntilDeadline,
    rsvpToken: token,
  });

  return result;
}

// Send reminders to all pending guests
export async function sendBulkReminders(
  eventId: string
): Promise<SendInvitationsResult> {
  const supabase = await createClient();

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Check Pro subscription
  const proCheck = await requirePro(user.id);
  if (!proCheck.allowed) {
    return { success: false, error: proCheck.error };
  }

  // Get event
  const { data: event } = await supabase
    .from('events')
    .select(`
      id,
      name,
      date,
      user_id,
      profiles!events_user_id_fkey (
        display_name
      )
    `)
    .eq('id', eventId)
    .single();

  if (!event || event.user_id !== user.id) {
    return { success: false, error: 'Event not found or not authorized' };
  }

  // Get RSVP settings
  const { data: rsvpSettings } = await supabase
    .from('rsvp_settings')
    .select('*')
    .eq('event_id', eventId)
    .single();

  // Get all pending guests with emails who have received at least one invitation
  const { data: sentGuestIds } = await supabase
    .from('email_logs')
    .select('guest_id')
    .eq('event_id', eventId)
    .eq('email_type', 'invitation');

  const sentIds = [...new Set((sentGuestIds || []).map((g) => g.guest_id))];

  if (sentIds.length === 0) {
    return { success: false, error: 'No invitations have been sent yet' };
  }

  const { data: guests } = await supabase
    .from('guests')
    .select('id, first_name, last_name, email, rsvp_token')
    .eq('event_id', eventId)
    .eq('rsvp_status', 'pending')
    .not('email', 'is', null)
    .is('plus_one_of', null)
    .in('id', sentIds);

  if (!guests || guests.length === 0) {
    return { success: false, error: 'No pending guests to remind' };
  }

  // Calculate days until deadline
  let daysUntilDeadline: number | undefined;
  if (rsvpSettings?.deadline) {
    const deadline = new Date(rsvpSettings.deadline);
    const now = new Date();
    const diffTime = deadline.getTime() - now.getTime();
    daysUntilDeadline = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (daysUntilDeadline < 0) daysUntilDeadline = 0;
  }

  const profile = event.profiles as { display_name?: string } | null;
  const hostName = profile?.display_name || undefined;

  // Send reminders
  const results: BatchEmailResult = {
    total: guests.length,
    sent: 0,
    failed: 0,
    results: [],
  };

  for (const guest of guests) {
    const token = guest.rsvp_token || await ensureGuestToken(guest.id);

    const result = await sendReminderEmail({
      guestId: guest.id,
      guestName: `${guest.first_name} ${guest.last_name}`.trim(),
      guestEmail: guest.email,
      eventId,
      eventName: event.name,
      eventDate: event.date,
      hostName,
      deadline: rsvpSettings?.deadline,
      daysUntilDeadline,
      rsvpToken: token,
    });

    results.results.push({
      guestId: guest.id,
      email: guest.email,
      ...result,
    });

    if (result.success) {
      results.sent++;
    } else {
      results.failed++;
    }
  }

  // Update last_reminder_sent_at
  await supabase
    .from('rsvp_settings')
    .update({ last_reminder_sent_at: new Date().toISOString() })
    .eq('event_id', eventId);

  return { success: true, result: results };
}

// Get direct RSVP link for a guest
export async function getGuestRSVPLink(
  eventId: string,
  guestId: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  const supabase = await createClient();

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Verify user owns the event
  const { data: event } = await supabase
    .from('events')
    .select('id, user_id')
    .eq('id', eventId)
    .single();

  if (!event || event.user_id !== user.id) {
    return { success: false, error: 'Event not found or not authorized' };
  }

  // Get guest token
  const { data: guest } = await supabase
    .from('guests')
    .select('rsvp_token')
    .eq('id', guestId)
    .eq('event_id', eventId)
    .single();

  if (!guest) {
    return { success: false, error: 'Guest not found' };
  }

  const token = guest.rsvp_token || await ensureGuestToken(guestId);
  const url = buildRSVPUrl(eventId, token);

  return { success: true, url };
}
