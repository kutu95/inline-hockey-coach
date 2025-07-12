-- Fix Skate Australia Number Constraint
-- This script properly handles the existing constraint issue

-- First, let's check if the column exists and add it if not
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'players' 
                   AND column_name = 'skate_australia_number' 
                   AND table_schema = 'public') THEN
        ALTER TABLE public.players ADD COLUMN skate_australia_number TEXT;
    END IF;
END $$;

-- Now let's handle the constraint properly
DO $$ 
BEGIN
    -- Check if the constraint exists
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE constraint_name = 'check_skate_australia_number' 
               AND table_name = 'players' 
               AND table_schema = 'public') THEN
        
        -- Drop the existing constraint
        EXECUTE 'ALTER TABLE public.players DROP CONSTRAINT check_skate_australia_number';
        
        -- Add the new constraint
        EXECUTE 'ALTER TABLE public.players ADD CONSTRAINT check_skate_australia_number 
                 CHECK (skate_australia_number IS NULL OR skate_australia_number = '''' OR (skate_australia_number ~ ''^[0-9]{1,6}$''))';
    ELSE
        -- Add the constraint if it doesn't exist
        EXECUTE 'ALTER TABLE public.players ADD CONSTRAINT check_skate_australia_number 
                 CHECK (skate_australia_number IS NULL OR skate_australia_number = '''' OR (skate_australia_number ~ ''^[0-9]{1,6}$''))';
    END IF;
END $$;

-- Add comment to document the field
COMMENT ON COLUMN public.players.skate_australia_number IS 'Skate Australia registration number (max 6 digits)';

-- Verify the setup
SELECT 'Skate Australia number field setup complete' as status;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'players' 
AND column_name = 'skate_australia_number'; 