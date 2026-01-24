-- Migration: Enhanced RSVP System
-- Date: 2026-01-23
-- Description: Adds full RSVP functionality with settings, plus-ones, and preferences

-- =====================================================
-- RSVP SETTINGS TABLE
-- Stores per-event RSVP configuration
-- =====================================================
CREATE TABLE IF NOT EXISTS public.rsvp_settings (
  event_id UUID PRIMARY KEY REFERENCES public.events(id) ON DELETE CASCADE,
  enabled BOOLEAN DEFAULT false,
  deadline TIMESTAMPTZ,
  allow_plus_ones BOOLEAN DEFAULT true,
  max_plus_ones INTEGER DEFAULT 1,
  meal_options TEXT[] DEFAULT '{}',
  collect_dietary BOOLEAN DEFAULT true,
  collect_accessibility BOOLEAN DEFAULT true,
  collect_seating_preferences BOOLEAN DEFAULT true,
  custom_message TEXT,
  confirmation_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.rsvp_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for rsvp_settings
CREATE POLICY "Users can view own event RSVP settings"
  ON public.rsvp_settings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = rsvp_settings.event_id
      AND events.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own event RSVP settings"
  ON public.rsvp_settings
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = rsvp_settings.event_id
      AND events.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own event RSVP settings"
  ON public.rsvp_settings
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = rsvp_settings.event_id
      AND events.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own event RSVP settings"
  ON public.rsvp_settings
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = rsvp_settings.event_id
      AND events.user_id = auth.uid()
    )
  );

-- =====================================================
-- EXTEND GUESTS TABLE FOR RSVP
-- =====================================================

-- Plus-one reference (links a plus-one to their invitee)
ALTER TABLE public.guests
ADD COLUMN IF NOT EXISTS plus_one_of UUID REFERENCES public.guests(id) ON DELETE SET NULL;

-- Meal preference selection
ALTER TABLE public.guests
ADD COLUMN IF NOT EXISTS meal_preference VARCHAR;

-- Seating preferences (array of guest IDs they want to sit with)
ALTER TABLE public.guests
ADD COLUMN IF NOT EXISTS seating_preferences UUID[] DEFAULT '{}';

-- Timestamp when guest responded to RSVP
ALTER TABLE public.guests
ADD COLUMN IF NOT EXISTS rsvp_responded_at TIMESTAMPTZ;

-- Unique token for email RSVP links (allows guests to respond without login)
ALTER TABLE public.guests
ADD COLUMN IF NOT EXISTS rsvp_token VARCHAR UNIQUE;

-- =====================================================
-- RSVP RESPONSES TABLE (for audit trail)
-- Tracks all RSVP changes over time
-- =====================================================
CREATE TABLE IF NOT EXISTS public.rsvp_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id UUID NOT NULL REFERENCES public.guests(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  status VARCHAR NOT NULL, -- 'pending', 'confirmed', 'declined'
  meal_preference VARCHAR,
  dietary_restrictions TEXT[],
  accessibility_needs TEXT[],
  seating_preferences UUID[],
  plus_ones_added INTEGER DEFAULT 0,
  responded_at TIMESTAMPTZ DEFAULT NOW(),
  response_source VARCHAR DEFAULT 'web' -- 'web', 'email', 'manual'
);

-- Enable RLS
ALTER TABLE public.rsvp_responses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for rsvp_responses
CREATE POLICY "Users can view own event RSVP responses"
  ON public.rsvp_responses
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = rsvp_responses.event_id
      AND events.user_id = auth.uid()
    )
  );

-- Allow public inserts for guest RSVP submissions (via service role or anonymous)
CREATE POLICY "Allow RSVP response inserts"
  ON public.rsvp_responses
  FOR INSERT
  WITH CHECK (true);

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_guests_plus_one_of ON public.guests(plus_one_of);
CREATE INDEX IF NOT EXISTS idx_guests_rsvp_token ON public.guests(rsvp_token);
CREATE INDEX IF NOT EXISTS idx_rsvp_responses_guest_id ON public.rsvp_responses(guest_id);
CREATE INDEX IF NOT EXISTS idx_rsvp_responses_event_id ON public.rsvp_responses(event_id);

-- =====================================================
-- TRIGGER: Update updated_at on rsvp_settings
-- =====================================================
CREATE OR REPLACE FUNCTION update_rsvp_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_rsvp_settings_updated_at ON public.rsvp_settings;
CREATE TRIGGER trigger_update_rsvp_settings_updated_at
  BEFORE UPDATE ON public.rsvp_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_rsvp_settings_updated_at();

-- =====================================================
-- FUNCTION: Generate unique RSVP token
-- =====================================================
CREATE OR REPLACE FUNCTION generate_rsvp_token()
RETURNS VARCHAR AS $$
DECLARE
  chars VARCHAR := 'abcdefghijklmnopqrstuvwxyz0123456789';
  result VARCHAR := '';
  i INTEGER;
BEGIN
  FOR i IN 1..12 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;
