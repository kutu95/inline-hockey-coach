-- Migration script to make jersey_number and birthdate optional
-- This allows NULL values for these fields in the players table

-- Make jersey_number nullable
ALTER TABLE public.players ALTER COLUMN jersey_number DROP NOT NULL;

-- Make birthdate nullable
ALTER TABLE public.players ALTER COLUMN birthdate DROP NOT NULL; 