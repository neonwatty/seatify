-- Seatify Demo Event Seed Data
-- This script creates a demo event with 18 guests, 3 tables, and sample constraints
-- The demo event is accessible to all users (both authenticated and anonymous)

-- Use a fixed UUID for the demo event so it can be referenced
-- Demo event ID: 00000000-0000-0000-0000-000000000001
-- Demo user ID (system): 00000000-0000-0000-0000-000000000000

-- =====================================================
-- STEP 1: Create a system user for demo data
-- =====================================================

-- First, we need to create a demo user in auth.users (if not exists)
-- This is a special system user that owns demo events
DO $$
BEGIN
  -- Check if demo profile exists
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = '00000000-0000-0000-0000-000000000000') THEN
    -- Insert demo profile (we can't insert into auth.users directly, so we just create the profile)
    INSERT INTO public.profiles (id, email, display_name, created_at, updated_at)
    VALUES (
      '00000000-0000-0000-0000-000000000000',
      'demo@seatify.app',
      'Demo User',
      NOW(),
      NOW()
    );
  END IF;
END $$;

-- =====================================================
-- STEP 2: Create the demo event
-- =====================================================

-- Delete existing demo event if it exists (for idempotency)
DELETE FROM public.events WHERE id = '00000000-0000-0000-0000-000000000001';

-- Insert demo event
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
-- STEP 3: Create tables for the demo event
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
-- STEP 4: Create guests for the demo event
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
-- STEP 5: Create guest relationships
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
-- STEP 6: Create constraints
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
-- STEP 7: Create guest profiles with interests
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
-- STEP 8: Enable RSVP for demo event
-- =====================================================

-- Create RSVP settings for the demo event
INSERT INTO public.rsvp_settings (
  event_id,
  enabled,
  deadline,
  allow_plus_ones,
  max_plus_ones,
  meal_options,
  collect_dietary,
  collect_accessibility,
  collect_seating_preferences,
  custom_message,
  confirmation_message
)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  true,
  '2099-12-31 23:59:59+00',
  true,
  2,
  ARRAY['Chicken', 'Fish', 'Vegetarian', 'Vegan'],
  true,
  true,
  true,
  'We are so excited to celebrate with you!',
  'Thank you for your RSVP! We look forward to seeing you at the event.'
)
ON CONFLICT (event_id) DO UPDATE SET
  enabled = true,
  deadline = '2099-12-31 23:59:59+00',
  allow_plus_ones = true,
  max_plus_ones = 2,
  meal_options = ARRAY['Chicken', 'Fish', 'Vegetarian', 'Vegan'],
  collect_dietary = true,
  collect_accessibility = true,
  collect_seating_preferences = true,
  custom_message = 'We are so excited to celebrate with you!',
  confirmation_message = 'Thank you for your RSVP! We look forward to seeing you at the event.';

-- Add RSVP tokens to some guests for direct email links
UPDATE public.guests
SET rsvp_token = 'testtoken001'
WHERE id = '00000000-0000-0000-0000-000000000201'; -- Emma Wilson

UPDATE public.guests
SET rsvp_token = 'testtoken002'
WHERE id = '00000000-0000-0000-0000-000000000209'; -- Isabella Brown (pending)

-- =====================================================
-- Success message
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE 'Demo event created successfully!';
  RAISE NOTICE 'Event ID: 00000000-0000-0000-0000-000000000001';
  RAISE NOTICE 'Tables: 3, Guests: 18, Constraints: 2, RSVP: Enabled';
END $$;
