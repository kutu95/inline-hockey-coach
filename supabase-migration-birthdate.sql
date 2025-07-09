-- Migration script to change from age to birthdate
-- This preserves existing data by adding birthdate column and removing age column

-- First, add the birthdate column (nullable initially)
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS birthdate DATE;

-- Create a function to calculate age from birthdate (if it doesn't exist)
CREATE OR REPLACE FUNCTION calculate_age(birth_date DATE)
RETURNS INTEGER AS $$
BEGIN
    RETURN EXTRACT(YEAR FROM AGE(CURRENT_DATE, birth_date));
END;
$$ LANGUAGE plpgsql;

-- Update existing records to set a default birthdate based on current age
-- This is a rough estimate - you may want to manually update these later
UPDATE public.players 
SET birthdate = CURRENT_DATE - INTERVAL '1 year' * age
WHERE birthdate IS NULL AND age IS NOT NULL;

-- Make birthdate NOT NULL after setting default values
ALTER TABLE public.players ALTER COLUMN birthdate SET NOT NULL;

-- Drop the age column
ALTER TABLE public.players DROP COLUMN IF EXISTS age;

-- Verify the table structure
-- You can run this to see the current structure:
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'players' AND table_schema = 'public'
-- ORDER BY ordinal_position; 