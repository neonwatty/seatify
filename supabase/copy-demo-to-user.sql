-- Copy Demo Event to User Account
-- This script creates a copy of the demo event for a specific user
-- Replace USER_ID_HERE with the actual user ID or run with a parameter

-- Usage:
--   1. Find your user ID in Supabase Auth > Users
--   2. Replace 'USER_ID_HERE' below with your actual user ID
--   3. Run this script in Supabase SQL Editor

-- For test@seatify.local, first get the user ID:
-- SELECT id FROM auth.users WHERE email = 'test@seatify.local';

DO $$
DECLARE
  target_user_id UUID;
  new_event_id UUID := gen_random_uuid();
  demo_event_id UUID := '00000000-0000-0000-0000-000000000001';

  -- Table ID mappings
  new_table1_id UUID := gen_random_uuid();
  new_table2_id UUID := gen_random_uuid();
  new_table3_id UUID := gen_random_uuid();

  -- Guest ID mappings (we'll generate these dynamically)
  guest_id_map JSONB := '{}';
  old_guest_id UUID;
  new_guest_id UUID;

  -- Constraint ID mappings
  constraint_id_map JSONB := '{}';
  old_constraint_id UUID;
  new_constraint_id UUID;
BEGIN
  -- Get the test user's ID
  SELECT id INTO target_user_id FROM auth.users WHERE email = 'test@seatify.local';

  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'User test@seatify.local not found!';
  END IF;

  RAISE NOTICE 'Copying demo event to user: %', target_user_id;

  -- =====================================================
  -- STEP 1: Create the event copy
  -- =====================================================
  INSERT INTO public.events (id, user_id, name, event_type, date, venue_name, created_at, updated_at)
  SELECT
    new_event_id,
    target_user_id,
    'Demo Event (Copy)',
    event_type,
    date,
    venue_name,
    NOW(),
    NOW()
  FROM public.events
  WHERE id = demo_event_id;

  RAISE NOTICE 'Created event: %', new_event_id;

  -- =====================================================
  -- STEP 2: Create tables (with mapped IDs)
  -- =====================================================
  INSERT INTO public.tables (id, event_id, name, shape, capacity, x, y, width, height, rotation)
  SELECT
    CASE
      WHEN id = '00000000-0000-0000-0000-000000000101' THEN new_table1_id
      WHEN id = '00000000-0000-0000-0000-000000000102' THEN new_table2_id
      WHEN id = '00000000-0000-0000-0000-000000000103' THEN new_table3_id
    END,
    new_event_id,
    name,
    shape,
    capacity,
    x,
    y,
    width,
    height,
    rotation
  FROM public.tables
  WHERE event_id = demo_event_id;

  RAISE NOTICE 'Created 3 tables';

  -- =====================================================
  -- STEP 3: Create guests (with new IDs and mapped table IDs)
  -- =====================================================
  FOR old_guest_id IN
    SELECT id FROM public.guests WHERE event_id = demo_event_id
  LOOP
    new_guest_id := gen_random_uuid();
    guest_id_map := guest_id_map || jsonb_build_object(old_guest_id::text, new_guest_id::text);

    INSERT INTO public.guests (
      id, event_id, first_name, last_name, email, company, job_title,
      industry, group_name, rsvp_status, table_id
    )
    SELECT
      new_guest_id,
      new_event_id,
      first_name,
      last_name,
      email,
      company,
      job_title,
      industry,
      group_name,
      rsvp_status,
      CASE
        WHEN table_id = '00000000-0000-0000-0000-000000000101' THEN new_table1_id
        WHEN table_id = '00000000-0000-0000-0000-000000000102' THEN new_table2_id
        WHEN table_id = '00000000-0000-0000-0000-000000000103' THEN new_table3_id
        ELSE NULL
      END
    FROM public.guests
    WHERE id = old_guest_id;
  END LOOP;

  RAISE NOTICE 'Created 18 guests';

  -- =====================================================
  -- STEP 4: Create guest relationships (with mapped guest IDs)
  -- =====================================================
  INSERT INTO public.guest_relationships (event_id, guest_id, related_guest_id, relationship_type, strength)
  SELECT
    new_event_id,
    (guest_id_map->>guest_id::text)::UUID,
    (guest_id_map->>related_guest_id::text)::UUID,
    relationship_type,
    strength
  FROM public.guest_relationships
  WHERE event_id = demo_event_id;

  RAISE NOTICE 'Created guest relationships';

  -- =====================================================
  -- STEP 5: Create constraints (with new IDs)
  -- =====================================================
  FOR old_constraint_id IN
    SELECT id FROM public.constraints WHERE event_id = demo_event_id
  LOOP
    new_constraint_id := gen_random_uuid();
    constraint_id_map := constraint_id_map || jsonb_build_object(old_constraint_id::text, new_constraint_id::text);

    INSERT INTO public.constraints (id, event_id, constraint_type, priority, description)
    SELECT
      new_constraint_id,
      new_event_id,
      constraint_type,
      priority,
      description
    FROM public.constraints
    WHERE id = old_constraint_id;
  END LOOP;

  RAISE NOTICE 'Created constraints';

  -- =====================================================
  -- STEP 6: Create constraint_guests (with mapped IDs)
  -- =====================================================
  INSERT INTO public.constraint_guests (constraint_id, guest_id)
  SELECT
    (constraint_id_map->>cg.constraint_id::text)::UUID,
    (guest_id_map->>cg.guest_id::text)::UUID
  FROM public.constraint_guests cg
  JOIN public.constraints c ON c.id = cg.constraint_id
  WHERE c.event_id = demo_event_id;

  RAISE NOTICE 'Created constraint guest mappings';

  -- =====================================================
  -- STEP 7: Create guest profiles (with mapped guest IDs)
  -- =====================================================
  INSERT INTO public.guest_profiles (guest_id, interests)
  SELECT
    (guest_id_map->>gp.guest_id::text)::UUID,
    interests
  FROM public.guest_profiles gp
  JOIN public.guests g ON g.id = gp.guest_id
  WHERE g.event_id = demo_event_id;

  RAISE NOTICE 'Created guest profiles';

  -- =====================================================
  -- Success!
  -- =====================================================
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Demo event copied successfully!';
  RAISE NOTICE 'New Event ID: %', new_event_id;
  RAISE NOTICE 'User: test@seatify.local';
  RAISE NOTICE '========================================';

END $$;
