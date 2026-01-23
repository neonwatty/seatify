-- Migration: Add custom logo support for Pro users
-- Date: 2026-01-23
-- Description: Adds custom_logo_url to profiles for PDF branding

-- =====================================================
-- ADD CUSTOM LOGO URL TO PROFILES
-- =====================================================
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS custom_logo_url VARCHAR;

-- =====================================================
-- CREATE STORAGE BUCKET FOR LOGOS (if not exists)
-- Note: This needs to be run in Supabase dashboard or via API
-- The bucket should be created with the following settings:
-- Name: logos
-- Public: false
-- Allowed MIME types: image/png, image/jpeg, image/svg+xml
-- Max file size: 500KB
-- =====================================================

-- =====================================================
-- STORAGE POLICIES (run in Supabase dashboard)
-- =====================================================
-- These policies should be created in the Supabase dashboard:

-- Policy: Users can upload their own logo
-- CREATE POLICY "Users can upload own logo" ON storage.objects
--   FOR INSERT WITH CHECK (
--     bucket_id = 'logos' AND
--     auth.uid()::text = (storage.foldername(name))[1]
--   );

-- Policy: Users can update their own logo
-- CREATE POLICY "Users can update own logo" ON storage.objects
--   FOR UPDATE USING (
--     bucket_id = 'logos' AND
--     auth.uid()::text = (storage.foldername(name))[1]
--   );

-- Policy: Users can delete their own logo
-- CREATE POLICY "Users can delete own logo" ON storage.objects
--   FOR DELETE USING (
--     bucket_id = 'logos' AND
--     auth.uid()::text = (storage.foldername(name))[1]
--   );

-- Policy: Users can view their own logo
-- CREATE POLICY "Users can view own logo" ON storage.objects
--   FOR SELECT USING (
--     bucket_id = 'logos' AND
--     auth.uid()::text = (storage.foldername(name))[1]
--   );
