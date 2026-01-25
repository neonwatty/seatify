-- Migration: Add email customization options to rsvp_settings
-- Date: 2026-01-25
-- Description: Adds columns for customizing RSVP invitation emails

-- Add email customization columns
ALTER TABLE public.rsvp_settings
ADD COLUMN IF NOT EXISTS email_primary_color VARCHAR(7) DEFAULT '#E07A5F',
ADD COLUMN IF NOT EXISTS email_subject_template VARCHAR(255),
ADD COLUMN IF NOT EXISTS email_sender_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS email_header_image_url TEXT,
ADD COLUMN IF NOT EXISTS hide_seatify_branding BOOLEAN DEFAULT false;

-- Add confirmation email settings
ALTER TABLE public.rsvp_settings
ADD COLUMN IF NOT EXISTS send_confirmation_email BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS include_calendar_invite BOOLEAN DEFAULT true;

-- Add comments for documentation
COMMENT ON COLUMN public.rsvp_settings.email_primary_color IS 'Primary color for email buttons and links (hex format, e.g., #E07A5F)';
COMMENT ON COLUMN public.rsvp_settings.email_subject_template IS 'Custom email subject line template';
COMMENT ON COLUMN public.rsvp_settings.email_sender_name IS 'Custom sender name for RSVP emails';
COMMENT ON COLUMN public.rsvp_settings.email_header_image_url IS 'URL for custom header image in emails';
COMMENT ON COLUMN public.rsvp_settings.hide_seatify_branding IS 'Pro feature: hide Powered by Seatify footer in emails';
COMMENT ON COLUMN public.rsvp_settings.send_confirmation_email IS 'Whether to send confirmation email after RSVP submission';
COMMENT ON COLUMN public.rsvp_settings.include_calendar_invite IS 'Whether to include calendar invite (.ics) in confirmation email';
