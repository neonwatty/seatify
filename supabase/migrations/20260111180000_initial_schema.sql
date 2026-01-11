-- Seatify Database Schema
-- Run this in your Supabase SQL Editor to set up the database

-- =====================================================
-- PROFILES TABLE (extends Supabase auth.users)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR NOT NULL,
  display_name VARCHAR,
  avatar_url VARCHAR,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- EVENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name VARCHAR NOT NULL,
  event_type VARCHAR NOT NULL DEFAULT 'other',
  date DATE,
  venue_name VARCHAR,
  venue_address VARCHAR,
  guest_capacity_limit INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_user_id ON public.events(user_id);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON public.events(created_at DESC);

-- =====================================================
-- TABLES (Seating units)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name VARCHAR NOT NULL,
  shape VARCHAR NOT NULL DEFAULT 'round',
  capacity INTEGER NOT NULL DEFAULT 8,
  x NUMERIC NOT NULL DEFAULT 0,
  y NUMERIC NOT NULL DEFAULT 0,
  width NUMERIC NOT NULL DEFAULT 120,
  height NUMERIC NOT NULL DEFAULT 120,
  rotation NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tables_event_id ON public.tables(event_id);

-- =====================================================
-- GUESTS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  first_name VARCHAR NOT NULL,
  last_name VARCHAR NOT NULL,
  email VARCHAR,
  company VARCHAR,
  job_title VARCHAR,
  industry VARCHAR,
  profile_summary TEXT,
  group_name VARCHAR,
  rsvp_status VARCHAR NOT NULL DEFAULT 'pending',
  notes TEXT,
  table_id UUID REFERENCES public.tables(id) ON DELETE SET NULL,
  seat_index INTEGER,
  canvas_x NUMERIC,
  canvas_y NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_guests_event_id ON public.guests(event_id);
CREATE INDEX IF NOT EXISTS idx_guests_table_id ON public.guests(table_id);
CREATE INDEX IF NOT EXISTS idx_guests_rsvp_status ON public.guests(rsvp_status);

-- =====================================================
-- GUEST RELATIONSHIPS (many-to-many)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.guest_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  guest_id UUID NOT NULL REFERENCES public.guests(id) ON DELETE CASCADE,
  related_guest_id UUID NOT NULL REFERENCES public.guests(id) ON DELETE CASCADE,
  relationship_type VARCHAR NOT NULL,
  strength INTEGER NOT NULL DEFAULT 3,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(guest_id, related_guest_id)
);

CREATE INDEX IF NOT EXISTS idx_guest_relationships_guest_id ON public.guest_relationships(guest_id);
CREATE INDEX IF NOT EXISTS idx_guest_relationships_related_guest_id ON public.guest_relationships(related_guest_id);

-- =====================================================
-- CONSTRAINTS (Seating rules)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.constraints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  constraint_type VARCHAR NOT NULL,
  priority VARCHAR NOT NULL DEFAULT 'preferred',
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_constraints_event_id ON public.constraints(event_id);

-- =====================================================
-- CONSTRAINT GUESTS (junction table)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.constraint_guests (
  constraint_id UUID NOT NULL REFERENCES public.constraints(id) ON DELETE CASCADE,
  guest_id UUID NOT NULL REFERENCES public.guests(id) ON DELETE CASCADE,
  PRIMARY KEY (constraint_id, guest_id)
);

CREATE INDEX IF NOT EXISTS idx_constraint_guests_constraint_id ON public.constraint_guests(constraint_id);

-- =====================================================
-- VENUE ELEMENTS (non-seating items)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.venue_elements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  type VARCHAR NOT NULL,
  label VARCHAR NOT NULL,
  x NUMERIC NOT NULL,
  y NUMERIC NOT NULL,
  width NUMERIC NOT NULL,
  height NUMERIC NOT NULL,
  rotation NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_venue_elements_event_id ON public.venue_elements(event_id);

-- =====================================================
-- GUEST PROFILE DATA (arrays for interests, dietary, etc.)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.guest_profiles (
  guest_id UUID PRIMARY KEY REFERENCES public.guests(id) ON DELETE CASCADE,
  interests TEXT[],
  dietary_restrictions TEXT[],
  accessibility_needs TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.constraints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.constraint_guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_elements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_profiles ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can only see/edit their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Events: Users can only access their own events
CREATE POLICY "Users can view own events" ON public.events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own events" ON public.events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own events" ON public.events
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own events" ON public.events
  FOR DELETE USING (auth.uid() = user_id);

-- Tables: Access via event ownership
CREATE POLICY "Users can CRUD tables in own events" ON public.tables
  FOR ALL USING (
    event_id IN (SELECT id FROM public.events WHERE user_id = auth.uid())
  );

-- Guests: Access via event ownership
CREATE POLICY "Users can CRUD guests in own events" ON public.guests
  FOR ALL USING (
    event_id IN (SELECT id FROM public.events WHERE user_id = auth.uid())
  );

-- Relationships: Access via event ownership
CREATE POLICY "Users can CRUD relationships in own events" ON public.guest_relationships
  FOR ALL USING (
    event_id IN (SELECT id FROM public.events WHERE user_id = auth.uid())
  );

-- Constraints: Access via event ownership
CREATE POLICY "Users can CRUD constraints in own events" ON public.constraints
  FOR ALL USING (
    event_id IN (SELECT id FROM public.events WHERE user_id = auth.uid())
  );

-- Constraint guests: Access via constraint → event ownership
CREATE POLICY "Users can CRUD constraint_guests" ON public.constraint_guests
  FOR ALL USING (
    constraint_id IN (
      SELECT id FROM public.constraints
      WHERE event_id IN (SELECT id FROM public.events WHERE user_id = auth.uid())
    )
  );

-- Venue elements: Access via event ownership
CREATE POLICY "Users can CRUD venue_elements in own events" ON public.venue_elements
  FOR ALL USING (
    event_id IN (SELECT id FROM public.events WHERE user_id = auth.uid())
  );

-- Guest profiles: Access via guest → event ownership
CREATE POLICY "Users can CRUD guest_profiles" ON public.guest_profiles
  FOR ALL USING (
    guest_id IN (
      SELECT id FROM public.guests
      WHERE event_id IN (SELECT id FROM public.events WHERE user_id = auth.uid())
    )
  );

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all tables
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN
    SELECT table_name
    FROM information_schema.columns
    WHERE column_name = 'updated_at'
    AND table_schema = 'public'
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS set_updated_at ON public.%I', t);
    EXECUTE format('CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at()', t);
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to get full event with all related data
CREATE OR REPLACE FUNCTION public.get_full_event(p_event_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'event', (SELECT row_to_json(e) FROM public.events e WHERE e.id = p_event_id),
    'tables', (SELECT json_agg(row_to_json(t)) FROM public.tables t WHERE t.event_id = p_event_id),
    'guests', (SELECT json_agg(row_to_json(g)) FROM public.guests g WHERE g.event_id = p_event_id),
    'relationships', (SELECT json_agg(row_to_json(r)) FROM public.guest_relationships r WHERE r.event_id = p_event_id),
    'constraints', (SELECT json_agg(row_to_json(c)) FROM public.constraints c WHERE c.event_id = p_event_id),
    'venue_elements', (SELECT json_agg(row_to_json(v)) FROM public.venue_elements v WHERE v.event_id = p_event_id)
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
