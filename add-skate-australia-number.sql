-- Add Skate Australia number field to players table
-- This adds a field to store the player's Skate Australia registration number

-- Add skate_australia_number column to players table
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS skate_australia_number TEXT;

-- Drop existing constraint if it exists
ALTER TABLE public.players DROP CONSTRAINT IF EXISTS check_skate_australia_number;

-- Add a check constraint to ensure the number is max 6 digits (if not blank)
ALTER TABLE public.players ADD CONSTRAINT check_skate_australia_number 
CHECK (skate_australia_number IS NULL OR skate_australia_number = '' OR (skate_australia_number ~ '^[0-9]{1,6}$'));

-- Add comment to document the field
COMMENT ON COLUMN public.players.skate_australia_number IS 'Skate Australia registration number (max 6 digits)'; 