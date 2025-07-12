-- Fix coach_id constraint to allow null values
-- This removes the requirement for players to have a coach_id

-- Make coach_id nullable
ALTER TABLE players ALTER COLUMN coach_id DROP NOT NULL; 