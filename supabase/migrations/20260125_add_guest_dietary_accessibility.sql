-- Migration: Add dietary_restrictions and accessibility_needs to guests table
-- Date: 2026-01-25
-- Description: Adds columns needed for storing guest preferences directly on guests table

-- Add dietary restrictions array
ALTER TABLE public.guests
ADD COLUMN IF NOT EXISTS dietary_restrictions TEXT[] DEFAULT '{}';

-- Add accessibility needs array
ALTER TABLE public.guests
ADD COLUMN IF NOT EXISTS accessibility_needs TEXT[] DEFAULT '{}';
