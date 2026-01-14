-- Add user preference columns to profiles table
-- Run this in your Supabase SQL Editor

-- Theme preference (light, dark, system)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS theme VARCHAR DEFAULT 'system';

-- Event list view mode (cards, list)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS event_list_view_mode VARCHAR DEFAULT 'cards';

-- Onboarding completion flag
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS has_completed_onboarding BOOLEAN DEFAULT false;

-- Completed tour IDs (stored as array)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS completed_tours TEXT[] DEFAULT '{}';

-- Feature usage tracking
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS has_used_optimize_button BOOLEAN DEFAULT false;

-- Animation preference
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS optimize_animation_enabled BOOLEAN DEFAULT true;

-- Verify the changes
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
ORDER BY ordinal_position;
