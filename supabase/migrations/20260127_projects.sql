-- Migration: Add Projects for hierarchical event organization
-- Projects allow event planners to group related events (e.g., multi-day conference)

-- =====================================================
-- PROJECTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name VARCHAR NOT NULL,
  description TEXT,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON public.projects(created_at DESC);

-- =====================================================
-- PROJECT GUESTS (Master guest list at project level)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.project_guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  first_name VARCHAR NOT NULL,
  last_name VARCHAR NOT NULL,
  email VARCHAR,
  phone VARCHAR,
  company VARCHAR,
  job_title VARCHAR,
  industry VARCHAR,
  profile_summary TEXT,
  group_name VARCHAR,
  notes TEXT,
  dietary_restrictions TEXT,
  accessibility_needs TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Unique constraint on email within a project (where email is not null)
CREATE UNIQUE INDEX IF NOT EXISTS idx_project_guests_unique_email
  ON public.project_guests(project_id, email)
  WHERE email IS NOT NULL AND email != '';

CREATE INDEX IF NOT EXISTS idx_project_guests_project_id ON public.project_guests(project_id);
CREATE INDEX IF NOT EXISTS idx_project_guests_email ON public.project_guests(email) WHERE email IS NOT NULL;

-- =====================================================
-- PROJECT GUEST RELATIONSHIPS (Project-level relationships)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.project_guest_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  guest_id UUID NOT NULL REFERENCES public.project_guests(id) ON DELETE CASCADE,
  related_guest_id UUID NOT NULL REFERENCES public.project_guests(id) ON DELETE CASCADE,
  relationship_type VARCHAR NOT NULL CHECK (relationship_type IN ('family', 'friend', 'colleague', 'acquaintance', 'partner', 'prefer', 'avoid')),
  strength INTEGER NOT NULL DEFAULT 3 CHECK (strength >= 1 AND strength <= 5),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Prevent duplicate relationships (either direction)
  UNIQUE(guest_id, related_guest_id),
  -- Prevent self-relationships
  CHECK (guest_id != related_guest_id)
);

CREATE INDEX IF NOT EXISTS idx_project_guest_relationships_project_id ON public.project_guest_relationships(project_id);
CREATE INDEX IF NOT EXISTS idx_project_guest_relationships_guest_id ON public.project_guest_relationships(guest_id);
CREATE INDEX IF NOT EXISTS idx_project_guest_relationships_related_guest_id ON public.project_guest_relationships(related_guest_id);

-- =====================================================
-- ADD PROJECT_ID TO EVENTS TABLE
-- =====================================================
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_events_project_id ON public.events(project_id) WHERE project_id IS NOT NULL;

-- =====================================================
-- EVENT GUEST ATTENDANCE (Per-event RSVP for project guests)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.event_guest_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  project_guest_id UUID NOT NULL REFERENCES public.project_guests(id) ON DELETE CASCADE,
  rsvp_status VARCHAR NOT NULL DEFAULT 'pending' CHECK (rsvp_status IN ('pending', 'confirmed', 'declined', 'maybe')),
  rsvp_token VARCHAR UNIQUE,
  rsvp_responded_at TIMESTAMP WITH TIME ZONE,
  -- Per-event seating assignment (separate from project-level guest data)
  table_id UUID REFERENCES public.tables(id) ON DELETE SET NULL,
  seat_index INTEGER,
  canvas_x NUMERIC,
  canvas_y NUMERIC,
  -- Per-event preferences
  meal_preference VARCHAR,
  plus_one_of UUID REFERENCES public.event_guest_attendance(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Each project guest can only have one attendance record per event
  UNIQUE(event_id, project_guest_id)
);

CREATE INDEX IF NOT EXISTS idx_event_guest_attendance_event_id ON public.event_guest_attendance(event_id);
CREATE INDEX IF NOT EXISTS idx_event_guest_attendance_project_guest_id ON public.event_guest_attendance(project_guest_id);
CREATE INDEX IF NOT EXISTS idx_event_guest_attendance_rsvp_status ON public.event_guest_attendance(rsvp_status);
CREATE INDEX IF NOT EXISTS idx_event_guest_attendance_table_id ON public.event_guest_attendance(table_id) WHERE table_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_event_guest_attendance_rsvp_token ON public.event_guest_attendance(rsvp_token) WHERE rsvp_token IS NOT NULL;

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_guest_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_guest_attendance ENABLE ROW LEVEL SECURITY;

-- Projects: Users can only access their own projects
CREATE POLICY "Users can view own projects" ON public.projects
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own projects" ON public.projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects" ON public.projects
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects" ON public.projects
  FOR DELETE USING (auth.uid() = user_id);

-- Project guests: Access via project ownership
CREATE POLICY "Users can CRUD project_guests in own projects" ON public.project_guests
  FOR ALL USING (
    project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid())
  );

-- Project guest relationships: Access via project ownership
CREATE POLICY "Users can CRUD project_guest_relationships in own projects" ON public.project_guest_relationships
  FOR ALL USING (
    project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid())
  );

-- Event guest attendance: Access via event ownership
CREATE POLICY "Users can CRUD event_guest_attendance in own events" ON public.event_guest_attendance
  FOR ALL USING (
    event_id IN (SELECT id FROM public.events WHERE user_id = auth.uid())
  );

-- Public RSVP access: Allow reading/updating attendance via RSVP token (for public RSVP submissions)
CREATE POLICY "Public can read attendance by rsvp_token" ON public.event_guest_attendance
  FOR SELECT USING (rsvp_token IS NOT NULL);

CREATE POLICY "Public can update attendance by rsvp_token" ON public.event_guest_attendance
  FOR UPDATE USING (rsvp_token IS NOT NULL)
  WITH CHECK (rsvp_token IS NOT NULL);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to seed event_guest_attendance when a new event is created in a project
CREATE OR REPLACE FUNCTION public.seed_event_attendance_from_project()
RETURNS TRIGGER AS $$
BEGIN
  -- Only seed if the event has a project_id
  IF NEW.project_id IS NOT NULL THEN
    INSERT INTO public.event_guest_attendance (event_id, project_guest_id, rsvp_status, rsvp_token)
    SELECT
      NEW.id,
      pg.id,
      'pending',
      encode(gen_random_bytes(16), 'hex')
    FROM public.project_guests pg
    WHERE pg.project_id = NEW.project_id
    ON CONFLICT (event_id, project_guest_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to seed attendance when event is created or added to a project
CREATE OR REPLACE TRIGGER seed_attendance_on_event_project_change
  AFTER INSERT OR UPDATE OF project_id ON public.events
  FOR EACH ROW
  WHEN (NEW.project_id IS NOT NULL)
  EXECUTE FUNCTION public.seed_event_attendance_from_project();

-- Function to add new project guest to all project events
CREATE OR REPLACE FUNCTION public.add_project_guest_to_events()
RETURNS TRIGGER AS $$
BEGIN
  -- Add attendance record to all events in this project
  INSERT INTO public.event_guest_attendance (event_id, project_guest_id, rsvp_status, rsvp_token)
  SELECT
    e.id,
    NEW.id,
    'pending',
    encode(gen_random_bytes(16), 'hex')
  FROM public.events e
  WHERE e.project_id = NEW.project_id
  ON CONFLICT (event_id, project_guest_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to add guest to events when added to project
CREATE OR REPLACE TRIGGER add_guest_to_project_events
  AFTER INSERT ON public.project_guests
  FOR EACH ROW
  EXECUTE FUNCTION public.add_project_guest_to_events();

-- Function to get project with all events and guest counts
CREATE OR REPLACE FUNCTION public.get_project_summary(p_project_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'project', (SELECT row_to_json(p) FROM public.projects p WHERE p.id = p_project_id),
    'event_count', (SELECT COUNT(*) FROM public.events e WHERE e.project_id = p_project_id),
    'guest_count', (SELECT COUNT(*) FROM public.project_guests pg WHERE pg.project_id = p_project_id),
    'events', (
      SELECT json_agg(json_build_object(
        'id', e.id,
        'name', e.name,
        'date', e.date,
        'confirmed_count', (
          SELECT COUNT(*) FROM public.event_guest_attendance ega
          WHERE ega.event_id = e.id AND ega.rsvp_status = 'confirmed'
        ),
        'pending_count', (
          SELECT COUNT(*) FROM public.event_guest_attendance ega
          WHERE ega.event_id = e.id AND ega.rsvp_status = 'pending'
        )
      ) ORDER BY e.date NULLS LAST, e.created_at)
      FROM public.events e WHERE e.project_id = p_project_id
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- APPLY updated_at TRIGGERS TO NEW TABLES
-- =====================================================
CREATE TRIGGER set_updated_at_projects
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_project_guests
  BEFORE UPDATE ON public.project_guests
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_project_guest_relationships
  BEFORE UPDATE ON public.project_guest_relationships
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_event_guest_attendance
  BEFORE UPDATE ON public.event_guest_attendance
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
