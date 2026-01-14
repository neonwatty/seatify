-- Demo Event RLS Policy Updates
-- These policies allow public read access to the demo event
-- Run this AFTER schema.sql and seed-demo.sql

-- Define the demo event ID constant
DO $$
DECLARE
  demo_event_id UUID := '00000000-0000-0000-0000-000000000001';
BEGIN
  RAISE NOTICE 'Adding public read policies for demo event: %', demo_event_id;
END $$;

-- =====================================================
-- PUBLIC READ POLICIES FOR DEMO EVENT
-- =====================================================

-- Events: Allow public read of demo event
CREATE POLICY "Anyone can view demo event" ON public.events
  FOR SELECT USING (id = '00000000-0000-0000-0000-000000000001');

-- Tables: Allow public read of demo event tables
CREATE POLICY "Anyone can view demo event tables" ON public.tables
  FOR SELECT USING (event_id = '00000000-0000-0000-0000-000000000001');

-- Guests: Allow public read of demo event guests
CREATE POLICY "Anyone can view demo event guests" ON public.guests
  FOR SELECT USING (event_id = '00000000-0000-0000-0000-000000000001');

-- Guest relationships: Allow public read of demo event relationships
CREATE POLICY "Anyone can view demo event relationships" ON public.guest_relationships
  FOR SELECT USING (event_id = '00000000-0000-0000-0000-000000000001');

-- Constraints: Allow public read of demo event constraints
CREATE POLICY "Anyone can view demo event constraints" ON public.constraints
  FOR SELECT USING (event_id = '00000000-0000-0000-0000-000000000001');

-- Constraint guests: Allow public read of demo event constraint guests
CREATE POLICY "Anyone can view demo event constraint_guests" ON public.constraint_guests
  FOR SELECT USING (
    constraint_id IN (
      SELECT id FROM public.constraints
      WHERE event_id = '00000000-0000-0000-0000-000000000001'
    )
  );

-- Venue elements: Allow public read of demo event venue elements
CREATE POLICY "Anyone can view demo event venue_elements" ON public.venue_elements
  FOR SELECT USING (event_id = '00000000-0000-0000-0000-000000000001');

-- Guest profiles: Allow public read of demo event guest profiles
CREATE POLICY "Anyone can view demo event guest_profiles" ON public.guest_profiles
  FOR SELECT USING (
    guest_id IN (
      SELECT id FROM public.guests
      WHERE event_id = '00000000-0000-0000-0000-000000000001'
    )
  );

-- =====================================================
-- Success message
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE 'Demo event public read policies added successfully!';
  RAISE NOTICE 'Anyone can now view the demo event without authentication.';
END $$;
