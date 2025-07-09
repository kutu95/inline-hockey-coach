-- Migration script to change position field to accreditations
-- This allows players to have multiple accreditations (skater, goalie, coach, referee)

-- First, create a new accreditations column
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS accreditations TEXT[] DEFAULT '{}';

-- Update existing position data to accreditations
UPDATE public.players 
SET accreditations = CASE 
  WHEN position = 'Skater' THEN ARRAY['skater']
  WHEN position = 'Goalie' THEN ARRAY['goalie']
  ELSE ARRAY['skater'] -- Default fallback
END
WHERE accreditations IS NULL OR array_length(accreditations, 1) IS NULL;

-- Drop the old position column
ALTER TABLE public.players DROP COLUMN IF EXISTS position;

-- Add a check constraint to ensure only valid accreditations are used
ALTER TABLE public.players ADD CONSTRAINT valid_accreditations 
CHECK (accreditations <@ ARRAY['skater', 'goalie', 'coach', 'referee']);

-- Update RLS policies to include the new column
-- (The existing policies should still work as they reference all columns with *) 