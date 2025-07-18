-- Fix squads table coach_id constraint to allow null values
-- This allows squads to be created without requiring a coach

-- Make coach_id nullable
ALTER TABLE squads ALTER COLUMN coach_id DROP NOT NULL; 