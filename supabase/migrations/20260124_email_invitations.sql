-- Email Invitations Migration
-- Adds email logging and reminder settings for RSVP invitations

-- Email log table to track all sent emails
CREATE TABLE IF NOT EXISTS public.email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  guest_id UUID NOT NULL REFERENCES public.guests(id) ON DELETE CASCADE,
  email_type VARCHAR NOT NULL, -- 'invitation', 'reminder'
  resend_id VARCHAR, -- Resend's message ID for tracking
  recipient_email VARCHAR NOT NULL,
  subject VARCHAR NOT NULL,
  status VARCHAR NOT NULL DEFAULT 'pending', -- pending/sent/delivered/opened/bounced/failed
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add reminder settings to rsvp_settings
ALTER TABLE public.rsvp_settings
ADD COLUMN IF NOT EXISTS reminder_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS reminder_days_before INTEGER DEFAULT 7,
ADD COLUMN IF NOT EXISTS last_reminder_sent_at TIMESTAMPTZ;

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_email_logs_event_id ON public.email_logs(event_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_guest_id ON public.email_logs(guest_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_event_guest ON public.email_logs(event_id, guest_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON public.email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_resend_id ON public.email_logs(resend_id);

-- Enable RLS
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view email logs for events they own
CREATE POLICY "Users can view email logs for their events"
  ON public.email_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = email_logs.event_id
      AND e.user_id = auth.uid()
    )
  );

-- Policy: Users can insert email logs for events they own
CREATE POLICY "Users can insert email logs for their events"
  ON public.email_logs
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = email_logs.event_id
      AND e.user_id = auth.uid()
    )
  );

-- Policy: Service role can update email logs (for webhook updates)
CREATE POLICY "Service role can update email logs"
  ON public.email_logs
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Grant permissions to service role for webhook updates
GRANT ALL ON public.email_logs TO service_role;

-- Comment on table
COMMENT ON TABLE public.email_logs IS 'Tracks all RSVP invitation and reminder emails sent';
COMMENT ON COLUMN public.email_logs.email_type IS 'Type of email: invitation or reminder';
COMMENT ON COLUMN public.email_logs.resend_id IS 'Resend API message ID for tracking delivery status';
COMMENT ON COLUMN public.email_logs.status IS 'Email status: pending, sent, delivered, opened, bounced, or failed';
