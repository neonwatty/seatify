'use server';

import { render } from '@react-email/components';
import { resend, EMAIL_FROM, EMAIL_BATCH_SIZE, type BatchEmailResult } from './resend';
import { InvitationEmail } from './templates/invitation';
import { ReminderEmail } from './templates/reminder';
import { createClient } from '@/lib/supabase/server';
import { generateRSVPToken, buildRSVPUrl } from './utils';

// Re-export utility functions for convenience
export { generateRSVPToken, buildRSVPUrl };

interface SendInvitationParams {
  guestId: string;
  guestName: string;
  guestEmail: string;
  eventId: string;
  eventName: string;
  eventDate?: string;
  hostName?: string;
  customMessage?: string;
  deadline?: string;
  rsvpToken: string;
}

interface SendReminderParams {
  guestId: string;
  guestName: string;
  guestEmail: string;
  eventId: string;
  eventName: string;
  eventDate?: string;
  hostName?: string;
  deadline?: string;
  daysUntilDeadline?: number;
  rsvpToken: string;
}

// Get or create RSVP token for a guest
export async function ensureGuestToken(guestId: string): Promise<string> {
  const supabase = await createClient();

  // First check if guest already has a token
  const { data: guest } = await supabase
    .from('guests')
    .select('rsvp_token')
    .eq('id', guestId)
    .single();

  if (guest?.rsvp_token) {
    return guest.rsvp_token;
  }

  // Generate new token
  const token = generateRSVPToken();

  // Update guest with new token
  await supabase
    .from('guests')
    .update({ rsvp_token: token })
    .eq('id', guestId);

  return token;
}

// Send a single invitation email
export async function sendInvitationEmail(
  params: SendInvitationParams
): Promise<{ success: boolean; resendId?: string; error?: string }> {
  if (!resend) {
    return { success: false, error: 'Email service not configured' };
  }

  const supabase = await createClient();
  const rsvpUrl = buildRSVPUrl(params.eventId, params.rsvpToken);

  // Create email log entry
  const { data: emailLog, error: logError } = await supabase
    .from('email_logs')
    .insert({
      event_id: params.eventId,
      guest_id: params.guestId,
      email_type: 'invitation',
      recipient_email: params.guestEmail,
      subject: `You're Invited: ${params.eventName}`,
      status: 'pending',
    })
    .select('id')
    .single();

  if (logError) {
    console.error('Failed to create email log:', logError);
  }

  try {
    const emailHtml = await render(
      InvitationEmail({
        guestName: params.guestName,
        eventName: params.eventName,
        eventDate: params.eventDate,
        hostName: params.hostName,
        rsvpUrl,
        customMessage: params.customMessage,
        deadline: params.deadline,
      })
    );

    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: params.guestEmail,
      subject: `You're Invited: ${params.eventName}`,
      html: emailHtml,
    });

    if (error) {
      // Update log with error
      if (emailLog?.id) {
        await supabase
          .from('email_logs')
          .update({
            status: 'failed',
            error_message: error.message,
          })
          .eq('id', emailLog.id);
      }
      return { success: false, error: error.message };
    }

    // Update log with success
    if (emailLog?.id) {
      await supabase
        .from('email_logs')
        .update({
          status: 'sent',
          resend_id: data?.id,
          sent_at: new Date().toISOString(),
        })
        .eq('id', emailLog.id);
    }

    return { success: true, resendId: data?.id };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';

    // Update log with error
    if (emailLog?.id) {
      await supabase
        .from('email_logs')
        .update({
          status: 'failed',
          error_message: errorMessage,
        })
        .eq('id', emailLog.id);
    }

    return { success: false, error: errorMessage };
  }
}

// Send a single reminder email
export async function sendReminderEmail(
  params: SendReminderParams
): Promise<{ success: boolean; resendId?: string; error?: string }> {
  if (!resend) {
    return { success: false, error: 'Email service not configured' };
  }

  const supabase = await createClient();
  const rsvpUrl = buildRSVPUrl(params.eventId, params.rsvpToken);

  // Create email log entry
  const { data: emailLog, error: logError } = await supabase
    .from('email_logs')
    .insert({
      event_id: params.eventId,
      guest_id: params.guestId,
      email_type: 'reminder',
      recipient_email: params.guestEmail,
      subject: `Reminder: Please RSVP for ${params.eventName}`,
      status: 'pending',
    })
    .select('id')
    .single();

  if (logError) {
    console.error('Failed to create email log:', logError);
  }

  try {
    const emailHtml = await render(
      ReminderEmail({
        guestName: params.guestName,
        eventName: params.eventName,
        eventDate: params.eventDate,
        hostName: params.hostName,
        rsvpUrl,
        deadline: params.deadline,
        daysUntilDeadline: params.daysUntilDeadline,
      })
    );

    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: params.guestEmail,
      subject: `Reminder: Please RSVP for ${params.eventName}`,
      html: emailHtml,
    });

    if (error) {
      if (emailLog?.id) {
        await supabase
          .from('email_logs')
          .update({
            status: 'failed',
            error_message: error.message,
          })
          .eq('id', emailLog.id);
      }
      return { success: false, error: error.message };
    }

    if (emailLog?.id) {
      await supabase
        .from('email_logs')
        .update({
          status: 'sent',
          resend_id: data?.id,
          sent_at: new Date().toISOString(),
        })
        .eq('id', emailLog.id);
    }

    return { success: true, resendId: data?.id };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';

    if (emailLog?.id) {
      await supabase
        .from('email_logs')
        .update({
          status: 'failed',
          error_message: errorMessage,
        })
        .eq('id', emailLog.id);
    }

    return { success: false, error: errorMessage };
  }
}

// Send batch invitations (processes in chunks)
export async function sendBatchInvitations(
  eventId: string,
  guests: Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    rsvpToken: string;
  }>,
  eventDetails: {
    eventName: string;
    eventDate?: string;
    hostName?: string;
    customMessage?: string;
    deadline?: string;
  }
): Promise<BatchEmailResult> {
  const results: BatchEmailResult = {
    total: guests.length,
    sent: 0,
    failed: 0,
    results: [],
  };

  // Process in batches
  for (let i = 0; i < guests.length; i += EMAIL_BATCH_SIZE) {
    const batch = guests.slice(i, i + EMAIL_BATCH_SIZE);

    // Send emails in parallel within each batch
    const batchResults = await Promise.all(
      batch.map(async (guest) => {
        const result = await sendInvitationEmail({
          guestId: guest.id,
          guestName: `${guest.firstName} ${guest.lastName}`.trim(),
          guestEmail: guest.email,
          eventId,
          ...eventDetails,
          rsvpToken: guest.rsvpToken,
        });

        return {
          guestId: guest.id,
          email: guest.email,
          ...result,
        };
      })
    );

    // Aggregate results
    for (const result of batchResults) {
      results.results.push(result);
      if (result.success) {
        results.sent++;
      } else {
        results.failed++;
      }
    }

    // Small delay between batches to respect rate limits
    if (i + EMAIL_BATCH_SIZE < guests.length) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  return results;
}
