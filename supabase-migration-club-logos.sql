-- Migration script to add logo upload functionality for clubs
-- This adds a logo_url column to store club logos

-- Add logo_url column to clubs table
ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Create a storage bucket for club logos if it doesn't exist
-- Note: This needs to be done manually in the Supabase dashboard
-- Go to Storage > Create a new bucket called 'club-logos'
-- Set it to private and enable RLS

-- Create a function to generate unique file names for club logos
CREATE OR REPLACE FUNCTION generate_club_logo_filename(original_name TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN gen_random_uuid()::TEXT || '_' || original_name;
END;
$$ LANGUAGE plpgsql; 