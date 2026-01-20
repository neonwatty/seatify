-- Seatify Demo Seed Data
-- This file is run by Supabase CLI during `supabase db reset`
-- It creates a demo user and seeds the demo event data

-- =====================================================
-- STEP 1: Create demo user in auth.users
-- =====================================================
-- In local Supabase, we can insert directly into auth.users
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  aud,
  role
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-0000-0000-000000000000',
  'demo@seatify.app',
  crypt('demo-password-not-used', gen_salt('bf')),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"display_name":"Demo User"}',
  NOW(),
  NOW(),
  'authenticated',
  'authenticated'
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- STEP 2: Create demo profile
-- =====================================================
INSERT INTO public.profiles (id, email, display_name, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'demo@seatify.app',
  'Demo User',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- STEP 3: Create the demo event
-- =====================================================
DELETE FROM public.events WHERE id = '00000000-0000-0000-0000-000000000001';

INSERT INTO public.events (id, user_id, name, event_type, date, venue_name, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'Demo Event',
  'wedding',
  '2025-06-15',
  'Grand Ballroom',
  NOW(),
  NOW()
);

-- =====================================================
-- STEP 4: Create tables for the demo event
-- =====================================================

-- Table 1: Round table
INSERT INTO public.tables (id, event_id, name, shape, capacity, x, y, width, height, rotation)
VALUES (
  '00000000-0000-0000-0000-000000000101',
  '00000000-0000-0000-0000-000000000001',
  'Table 1',
  'round',
  8,
  150,
  150,
  120,
  120,
  0
);

-- Table 2: Rectangle table
INSERT INTO public.tables (id, event_id, name, shape, capacity, x, y, width, height, rotation)
VALUES (
  '00000000-0000-0000-0000-000000000102',
  '00000000-0000-0000-0000-000000000001',
  'Table 2',
  'rectangle',
  10,
  450,
  120,
  200,
  80,
  0
);

-- Table 3: Square table
INSERT INTO public.tables (id, event_id, name, shape, capacity, x, y, width, height, rotation)
VALUES (
  '00000000-0000-0000-0000-000000000103',
  '00000000-0000-0000-0000-000000000001',
  'Table 3',
  'square',
  8,
  350,
  350,
  100,
  100,
  0
);

-- =====================================================
-- STEP 5: Create guests for the demo event
-- =====================================================

-- Guest 1: Emma Wilson (Table 1)
INSERT INTO public.guests (id, event_id, first_name, last_name, email, company, job_title, industry, group_name, rsvp_status, table_id)
VALUES (
  '00000000-0000-0000-0000-000000000201',
  '00000000-0000-0000-0000-000000000001',
  'Emma', 'Wilson', 'emma@wilson-law.com', 'Wilson & Associates', 'Partner', 'Legal', 'Family', 'confirmed',
  '00000000-0000-0000-0000-000000000101'
);

-- Guest 2: James Wilson (Table 2 - separated from partner for demo)
INSERT INTO public.guests (id, event_id, first_name, last_name, email, company, job_title, industry, group_name, rsvp_status, table_id)
VALUES (
  '00000000-0000-0000-0000-000000000202',
  '00000000-0000-0000-0000-000000000001',
  'James', 'Wilson', 'james.wilson@cityhospital.org', 'City Hospital', 'Surgeon', 'Healthcare', 'Family', 'confirmed',
  '00000000-0000-0000-0000-000000000102'
);

-- Guest 3: Olivia Chen (Unassigned)
INSERT INTO public.guests (id, event_id, first_name, last_name, email, company, job_title, industry, group_name, rsvp_status)
VALUES (
  '00000000-0000-0000-0000-000000000203',
  '00000000-0000-0000-0000-000000000001',
  'Olivia', 'Chen', 'olivia.chen@figma.com', 'Figma', 'Product Designer', 'Technology', 'Friends', 'confirmed'
);

-- Guest 4: Liam Chen (Unassigned)
INSERT INTO public.guests (id, event_id, first_name, last_name, email, company, job_title, industry, group_name, rsvp_status)
VALUES (
  '00000000-0000-0000-0000-000000000204',
  '00000000-0000-0000-0000-000000000001',
  'Liam', 'Chen', 'liam@stripe.com', 'Stripe', 'Software Engineer', 'Technology', 'Friends', 'confirmed'
);

-- Guest 5: Sophia Martinez (Unassigned)
INSERT INTO public.guests (id, event_id, first_name, last_name, email, company, job_title, industry, group_name, rsvp_status)
VALUES (
  '00000000-0000-0000-0000-000000000205',
  '00000000-0000-0000-0000-000000000001',
  'Sophia', 'Martinez', 'sophia.m@acme.com', 'Acme Corp', 'Marketing Director', 'Consumer Goods', 'Work', 'confirmed'
);

-- Guest 6: Noah Martinez (Unassigned)
INSERT INTO public.guests (id, event_id, first_name, last_name, email, company, job_title, industry, group_name, rsvp_status)
VALUES (
  '00000000-0000-0000-0000-000000000206',
  '00000000-0000-0000-0000-000000000001',
  'Noah', 'Martinez', 'noah@martinezconsulting.com', 'Martinez Consulting', 'Founder', 'Consulting', 'Work', 'confirmed'
);

-- Guest 7: Ava Johnson (Unassigned)
INSERT INTO public.guests (id, event_id, first_name, last_name, email, company, job_title, industry, group_name, rsvp_status)
VALUES (
  '00000000-0000-0000-0000-000000000207',
  '00000000-0000-0000-0000-000000000001',
  'Ava', 'Johnson', 'ava.johnson@netflix.com', 'Netflix', 'Content Strategist', 'Entertainment', 'Friends', 'confirmed'
);

-- Guest 8: Mason Lee (Unassigned)
INSERT INTO public.guests (id, event_id, first_name, last_name, email, company, job_title, industry, group_name, rsvp_status)
VALUES (
  '00000000-0000-0000-0000-000000000208',
  '00000000-0000-0000-0000-000000000001',
  'Mason', 'Lee', 'mason.lee@gs.com', 'Goldman Sachs', 'Vice President', 'Finance', 'Friends', 'confirmed'
);

-- Guest 9: Isabella Brown (Pending RSVP)
INSERT INTO public.guests (id, event_id, first_name, last_name, email, company, job_title, industry, rsvp_status)
VALUES (
  '00000000-0000-0000-0000-000000000209',
  '00000000-0000-0000-0000-000000000001',
  'Isabella', 'Brown', 'isabella@brownarch.com', 'Brown Architecture', 'Principal Architect', 'Architecture', 'pending'
);

-- Guest 10: Ethan Davis (Unassigned)
INSERT INTO public.guests (id, event_id, first_name, last_name, email, company, job_title, industry, group_name, rsvp_status)
VALUES (
  '00000000-0000-0000-0000-000000000210',
  '00000000-0000-0000-0000-000000000001',
  'Ethan', 'Davis', 'edavis@stanford.edu', 'Stanford University', 'Professor', 'Education', 'Family', 'confirmed'
);

-- Guest 11: Mia Thompson (Table 3)
INSERT INTO public.guests (id, event_id, first_name, last_name, email, company, job_title, industry, group_name, rsvp_status, table_id)
VALUES (
  '00000000-0000-0000-0000-000000000211',
  '00000000-0000-0000-0000-000000000001',
  'Mia', 'Thompson', 'mia.t@spotify.com', 'Spotify', 'Data Scientist', 'Technology', 'Friends', 'confirmed',
  '00000000-0000-0000-0000-000000000103'
);

-- Guest 12: Lucas Garcia (Unassigned)
INSERT INTO public.guests (id, event_id, first_name, last_name, email, company, job_title, industry, group_name, rsvp_status)
VALUES (
  '00000000-0000-0000-0000-000000000212',
  '00000000-0000-0000-0000-000000000001',
  'Lucas', 'Garcia', 'lgarcia@tesla.com', 'Tesla', 'Mechanical Engineer', 'Automotive', 'Work', 'confirmed'
);

-- Guest 13: Charlotte White (Unassigned)
INSERT INTO public.guests (id, event_id, first_name, last_name, email, company, job_title, industry, group_name, rsvp_status)
VALUES (
  '00000000-0000-0000-0000-000000000213',
  '00000000-0000-0000-0000-000000000001',
  'Charlotte', 'White', 'charlotte@whitemedia.com', 'White Media Group', 'CEO', 'Media', 'Family', 'confirmed'
);

-- Guest 14: Benjamin Taylor (Unassigned)
INSERT INTO public.guests (id, event_id, first_name, last_name, email, company, job_title, industry, rsvp_status)
VALUES (
  '00000000-0000-0000-0000-000000000214',
  '00000000-0000-0000-0000-000000000001',
  'Benjamin', 'Taylor', 'ben@taylorvc.com', 'Taylor Ventures', 'Managing Partner', 'Venture Capital', 'confirmed'
);

-- Guest 15: Daniel Thompson (Table 1 - separated from partner Mia for demo)
INSERT INTO public.guests (id, event_id, first_name, last_name, email, company, job_title, industry, group_name, rsvp_status, table_id)
VALUES (
  '00000000-0000-0000-0000-000000000215',
  '00000000-0000-0000-0000-000000000001',
  'Daniel', 'Thompson', 'daniel.t@google.com', 'Google', 'Product Manager', 'Technology', 'Friends', 'confirmed',
  '00000000-0000-0000-0000-000000000101'
);

-- Guest 16: Sofia Garcia (Unassigned)
INSERT INTO public.guests (id, event_id, first_name, last_name, email, company, job_title, industry, group_name, rsvp_status)
VALUES (
  '00000000-0000-0000-0000-000000000216',
  '00000000-0000-0000-0000-000000000001',
  'Sofia', 'Garcia', 'sofia.g@apple.com', 'Apple', 'UX Designer', 'Technology', 'Work', 'confirmed'
);

-- Guest 17: Ryan Mitchell (Unassigned)
INSERT INTO public.guests (id, event_id, first_name, last_name, email, company, job_title, industry, group_name, rsvp_status)
VALUES (
  '00000000-0000-0000-0000-000000000217',
  '00000000-0000-0000-0000-000000000001',
  'Ryan', 'Mitchell', 'ryan.m@airbnb.com', 'Airbnb', 'Engineering Lead', 'Technology', 'Friends', 'confirmed'
);

-- Guest 18: Harper Reed (Unassigned)
INSERT INTO public.guests (id, event_id, first_name, last_name, email, company, job_title, industry, group_name, rsvp_status)
VALUES (
  '00000000-0000-0000-0000-000000000218',
  '00000000-0000-0000-0000-000000000001',
  'Harper', 'Reed', 'harper.r@shopify.com', 'Shopify', 'Solutions Architect', 'Technology', 'Friends', 'confirmed'
);

-- =====================================================
-- STEP 6: Create guest relationships
-- =====================================================

-- Emma & James Wilson (partners)
INSERT INTO public.guest_relationships (event_id, guest_id, related_guest_id, relationship_type, strength)
VALUES
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000202', 'partner', 5),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000201', 'partner', 5);

-- Emma & Charlotte (family)
INSERT INTO public.guest_relationships (event_id, guest_id, related_guest_id, relationship_type, strength)
VALUES
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000213', 'family', 4),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000213', '00000000-0000-0000-0000-000000000201', 'family', 4);

-- Olivia & Liam Chen (partners)
INSERT INTO public.guest_relationships (event_id, guest_id, related_guest_id, relationship_type, strength)
VALUES
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000203', '00000000-0000-0000-0000-000000000204', 'partner', 5),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000204', '00000000-0000-0000-0000-000000000203', 'partner', 5);

-- Olivia & Ava (friends)
INSERT INTO public.guest_relationships (event_id, guest_id, related_guest_id, relationship_type, strength)
VALUES
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000203', '00000000-0000-0000-0000-000000000207', 'friend', 3),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000207', '00000000-0000-0000-0000-000000000203', 'friend', 3);

-- Sophia & Noah Martinez (partners)
INSERT INTO public.guest_relationships (event_id, guest_id, related_guest_id, relationship_type, strength)
VALUES
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000205', '00000000-0000-0000-0000-000000000206', 'partner', 5),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000206', '00000000-0000-0000-0000-000000000205', 'partner', 5);

-- Sophia & Lucas (colleagues)
INSERT INTO public.guest_relationships (event_id, guest_id, related_guest_id, relationship_type, strength)
VALUES
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000205', '00000000-0000-0000-0000-000000000212', 'colleague', 2),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000212', '00000000-0000-0000-0000-000000000205', 'colleague', 2);

-- Noah & Lucas (colleagues)
INSERT INTO public.guest_relationships (event_id, guest_id, related_guest_id, relationship_type, strength)
VALUES
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000206', '00000000-0000-0000-0000-000000000212', 'colleague', 2),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000212', '00000000-0000-0000-0000-000000000206', 'colleague', 2);

-- Ava & Mason (friends)
INSERT INTO public.guest_relationships (event_id, guest_id, related_guest_id, relationship_type, strength)
VALUES
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000207', '00000000-0000-0000-0000-000000000208', 'friend', 3),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000208', '00000000-0000-0000-0000-000000000207', 'friend', 3);

-- Ava & Mia (friends)
INSERT INTO public.guest_relationships (event_id, guest_id, related_guest_id, relationship_type, strength)
VALUES
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000207', '00000000-0000-0000-0000-000000000211', 'friend', 3),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000211', '00000000-0000-0000-0000-000000000207', 'friend', 3);

-- Mason & Benjamin (AVOID)
INSERT INTO public.guest_relationships (event_id, guest_id, related_guest_id, relationship_type, strength)
VALUES
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000208', '00000000-0000-0000-0000-000000000214', 'avoid', 5),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000214', '00000000-0000-0000-0000-000000000208', 'avoid', 5);

-- Isabella & Ethan (AVOID)
INSERT INTO public.guest_relationships (event_id, guest_id, related_guest_id, relationship_type, strength)
VALUES
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000209', '00000000-0000-0000-0000-000000000210', 'avoid', 5),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000210', '00000000-0000-0000-0000-000000000209', 'avoid', 5);

-- Ethan & Charlotte (family)
INSERT INTO public.guest_relationships (event_id, guest_id, related_guest_id, relationship_type, strength)
VALUES
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000210', '00000000-0000-0000-0000-000000000213', 'family', 4),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000213', '00000000-0000-0000-0000-000000000210', 'family', 4);

-- Mia & Daniel Thompson (partners)
INSERT INTO public.guest_relationships (event_id, guest_id, related_guest_id, relationship_type, strength)
VALUES
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000211', '00000000-0000-0000-0000-000000000215', 'partner', 5),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000215', '00000000-0000-0000-0000-000000000211', 'partner', 5);

-- Lucas & Sofia Garcia (partners)
INSERT INTO public.guest_relationships (event_id, guest_id, related_guest_id, relationship_type, strength)
VALUES
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000212', '00000000-0000-0000-0000-000000000216', 'partner', 5),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000216', '00000000-0000-0000-0000-000000000212', 'partner', 5);

-- Ryan & Harper (friends)
INSERT INTO public.guest_relationships (event_id, guest_id, related_guest_id, relationship_type, strength)
VALUES
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000217', '00000000-0000-0000-0000-000000000218', 'friend', 3),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000218', '00000000-0000-0000-0000-000000000217', 'friend', 3);

-- Ryan & Mia (friends)
INSERT INTO public.guest_relationships (event_id, guest_id, related_guest_id, relationship_type, strength)
VALUES
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000217', '00000000-0000-0000-0000-000000000211', 'friend', 3),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000211', '00000000-0000-0000-0000-000000000217', 'friend', 3);

-- =====================================================
-- STEP 7: Create constraints
-- =====================================================

-- Constraint 1: Emma & James must sit together (they are married but separated in demo)
INSERT INTO public.constraints (id, event_id, constraint_type, priority, description)
VALUES (
  '00000000-0000-0000-0000-000000000301',
  '00000000-0000-0000-0000-000000000001',
  'must_sit_together',
  'required',
  'Emma and James Wilson are married'
);

INSERT INTO public.constraint_guests (constraint_id, guest_id)
VALUES
  ('00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000201'),
  ('00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000202');

-- Constraint 2: Mia & Daniel should sit at same table (partners but separated in demo)
INSERT INTO public.constraints (id, event_id, constraint_type, priority, description)
VALUES (
  '00000000-0000-0000-0000-000000000302',
  '00000000-0000-0000-0000-000000000001',
  'same_table',
  'preferred',
  'Mia and Daniel Thompson are partners'
);

INSERT INTO public.constraint_guests (constraint_id, guest_id)
VALUES
  ('00000000-0000-0000-0000-000000000302', '00000000-0000-0000-0000-000000000211'),
  ('00000000-0000-0000-0000-000000000302', '00000000-0000-0000-0000-000000000215');

-- =====================================================
-- STEP 8: Create guest profiles with interests
-- =====================================================

INSERT INTO public.guest_profiles (guest_id, interests) VALUES
  ('00000000-0000-0000-0000-000000000201', ARRAY['golf', 'wine tasting', 'travel']),
  ('00000000-0000-0000-0000-000000000202', ARRAY['sailing', 'classical music']),
  ('00000000-0000-0000-0000-000000000203', ARRAY['photography', 'hiking', 'cooking']),
  ('00000000-0000-0000-0000-000000000204', ARRAY['cycling', 'board games', 'coffee']),
  ('00000000-0000-0000-0000-000000000205', ARRAY['yoga', 'reading', 'podcasts']),
  ('00000000-0000-0000-0000-000000000206', ARRAY['tennis', 'investing']),
  ('00000000-0000-0000-0000-000000000207', ARRAY['film', 'theater', 'writing']),
  ('00000000-0000-0000-0000-000000000208', ARRAY['running', 'art collecting']),
  ('00000000-0000-0000-0000-000000000209', ARRAY['design', 'sustainable living', 'gardening']),
  ('00000000-0000-0000-0000-000000000210', ARRAY['research', 'chess', 'history']),
  ('00000000-0000-0000-0000-000000000211', ARRAY['music', 'machine learning', 'skiing']),
  ('00000000-0000-0000-0000-000000000212', ARRAY['electric vehicles', 'robotics', 'camping']),
  ('00000000-0000-0000-0000-000000000213', ARRAY['philanthropy', 'art', 'travel']),
  ('00000000-0000-0000-0000-000000000214', ARRAY['startups', 'golf', 'wine']),
  ('00000000-0000-0000-0000-000000000215', ARRAY['hiking', 'photography', 'cooking']),
  ('00000000-0000-0000-0000-000000000216', ARRAY['design', 'yoga', 'painting']),
  ('00000000-0000-0000-0000-000000000217', ARRAY['travel', 'rock climbing', 'craft beer']),
  ('00000000-0000-0000-0000-000000000218', ARRAY['gaming', 'sci-fi books', 'running']);

-- =====================================================
-- STEP 9: Add public read policies for demo event
-- =====================================================

-- Drop existing demo policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Anyone can view demo event" ON public.events;
DROP POLICY IF EXISTS "Anyone can view demo event tables" ON public.tables;
DROP POLICY IF EXISTS "Anyone can view demo event guests" ON public.guests;
DROP POLICY IF EXISTS "Anyone can view demo event relationships" ON public.guest_relationships;
DROP POLICY IF EXISTS "Anyone can view demo event constraints" ON public.constraints;
DROP POLICY IF EXISTS "Anyone can view demo event constraint_guests" ON public.constraint_guests;
DROP POLICY IF EXISTS "Anyone can view demo event venue_elements" ON public.venue_elements;
DROP POLICY IF EXISTS "Anyone can view demo event guest_profiles" ON public.guest_profiles;

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
