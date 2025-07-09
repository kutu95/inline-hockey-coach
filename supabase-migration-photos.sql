-- Migration script to add photo upload functionality
-- This adds a photo_url column to store player photos

-- Add photo_url column to players table
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Create a storage bucket for player photos if it doesn't exist
-- Note: This needs to be done manually in the Supabase dashboard
-- Go to Storage > Create a new bucket called 'player-photos'
-- Set it to private and enable RLS

-- Create a function to generate unique file names
CREATE OR REPLACE FUNCTION generate_unique_filename(original_name TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN gen_random_uuid()::TEXT || '_' || original_name;
END;
$$ LANGUAGE plpgsql; 