import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendReminderEmail, ensureGuestToken } from '@/lib/email/send';

// Use service role client for cron job (bypasses RLS)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Cron secret for authentication
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Find all events with reminder enabled
    const { data: settings, error: settingsError } = await supabase
      .from('rsvp_settings')
      .select(`
        event_id,
        deadline,
        reminder_enabled,
        reminder_days_before,
        last_reminder_sent_at,
        events!inner (
          id,
          name,
          date,
          user_id,
          profiles!events_user_id_fkey (
            first_name,
            last_name
          )
        )
      `)
      .eq('enabled', true)
      .eq('reminder_enabled', true);

    if (settingsError) {
      console.error('Failed to fetch settings:', settingsError);
      return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
    }

    if (!settings || settings.length === 0) {
      return NextResponse.json({ message: 'No reminders to send', sent: 0 });
    }

    const now = new Date();
    let totalSent = 0;
    const results: Array<{ eventId: string; sent: number; error?: string }> = [];

    for (const setting of settings) {
      // Check if deadline is set and approaching
      if (!setting.deadline) {
        continue;
      }

      const deadline = new Date(setting.deadline);
      const daysUntilDeadline = Math.ceil(
        (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Skip if deadline has passed
      if (daysUntilDeadline < 0) {
        continue;
      }

      // Check if it's time to send reminder (based on reminder_days_before)
      const reminderDays = setting.reminder_days_before || 7;
      if (daysUntilDeadline > reminderDays) {
        continue;
      }

      // Check if reminder was already sent today
      if (setting.last_reminder_sent_at) {
        const lastSent = new Date(setting.last_reminder_sent_at);
        const hoursSinceLastReminder = (now.getTime() - lastSent.getTime()) / (1000 * 60 * 60);
        if (hoursSinceLastReminder < 24) {
          continue;
        }
      }

      // Get pending guests with emails who have received an invitation
      const { data: sentGuestIds } = await supabase
        .from('email_logs')
        .select('guest_id')
        .eq('event_id', setting.event_id)
        .eq('email_type', 'invitation');

      const sentIds = [...new Set((sentGuestIds || []).map((g) => g.guest_id))];

      if (sentIds.length === 0) {
        continue;
      }

      const { data: guests } = await supabase
        .from('guests')
        .select('id, first_name, last_name, email, rsvp_token')
        .eq('event_id', setting.event_id)
        .eq('rsvp_status', 'pending')
        .not('email', 'is', null)
        .is('plus_one_of', null)
        .in('id', sentIds);

      if (!guests || guests.length === 0) {
        continue;
      }

      // Type assertion for the joined event data
      const event = setting.events as unknown as {
        id: string;
        name: string;
        date?: string;
        user_id: string;
        profiles?: { first_name?: string; last_name?: string };
      };

      const hostName = event.profiles
        ? `${event.profiles.first_name || ''} ${event.profiles.last_name || ''}`.trim() || undefined
        : undefined;

      let sentCount = 0;

      for (const guest of guests) {
        try {
          const token = guest.rsvp_token || await ensureGuestToken(guest.id);

          await sendReminderEmail({
            guestId: guest.id,
            guestName: `${guest.first_name} ${guest.last_name}`.trim(),
            guestEmail: guest.email,
            eventId: setting.event_id,
            eventName: event.name,
            eventDate: event.date,
            hostName,
            deadline: setting.deadline,
            daysUntilDeadline,
            rsvpToken: token,
          });

          sentCount++;
        } catch (err) {
          console.error(`Failed to send reminder to ${guest.email}:`, err);
        }
      }

      // Update last_reminder_sent_at
      await supabase
        .from('rsvp_settings')
        .update({ last_reminder_sent_at: now.toISOString() })
        .eq('event_id', setting.event_id);

      totalSent += sentCount;
      results.push({ eventId: setting.event_id, sent: sentCount });
    }

    return NextResponse.json({
      message: `Sent ${totalSent} reminders`,
      sent: totalSent,
      results,
    });
  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Allow POST as well for manual triggering
export async function POST(request: NextRequest) {
  return GET(request);
}
