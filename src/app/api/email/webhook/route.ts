import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service role client for webhook updates (bypasses RLS)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Resend webhook event types
type ResendEventType =
  | 'email.sent'
  | 'email.delivered'
  | 'email.delivery_delayed'
  | 'email.complained'
  | 'email.bounced'
  | 'email.opened'
  | 'email.clicked'
  | 'email.unsubscribed';

interface ResendWebhookEvent {
  type: ResendEventType;
  created_at: string;
  data: {
    email_id: string;
    from: string;
    to: string[];
    subject: string;
    bounce?: {
      message: string;
    };
  };
}

export async function POST(request: NextRequest) {
  try {
    // Verify webhook secret if configured
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
    if (webhookSecret) {
      const signature = request.headers.get('svix-signature');
      // In production, you should verify the signature using Resend's webhook verification
      // For now, we'll check if the header exists
      if (!signature) {
        return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
      }
    }

    const event: ResendWebhookEvent = await request.json();
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Map Resend event type to our status
    let status: string | null = null;
    let updateData: Record<string, string | null> = {};

    switch (event.type) {
      case 'email.sent':
        status = 'sent';
        updateData = { status, sent_at: event.created_at };
        break;
      case 'email.delivered':
        status = 'delivered';
        updateData = { status, delivered_at: event.created_at };
        break;
      case 'email.opened':
        status = 'opened';
        updateData = { status, opened_at: event.created_at };
        break;
      case 'email.bounced':
        status = 'bounced';
        updateData = {
          status,
          error_message: event.data.bounce?.message || 'Email bounced',
        };
        break;
      case 'email.complained':
        status = 'failed';
        updateData = { status, error_message: 'Recipient marked as spam' };
        break;
      default:
        // Ignore other event types
        return NextResponse.json({ received: true });
    }

    // Update the email log by Resend ID
    const { error } = await supabase
      .from('email_logs')
      .update(updateData)
      .eq('resend_id', event.data.email_id);

    if (error) {
      console.error('Failed to update email log:', error);
      // Don't return error to Resend - they'll retry
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

// Handle webhook verification (Resend sends a GET request to verify the endpoint)
export async function GET() {
  return NextResponse.json({ status: 'ok' });
}
