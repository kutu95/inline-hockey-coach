-- Migration script to add image upload functionality to drills
-- This adds an image_url column to store drill images

-- Add image_url column to drills table
ALTER TABLE public.drills ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Create a storage bucket for drill images if it doesn't exist
-- Note: This needs to be done manually in the Supabase dashboard
-- Go to Storage > Create a new bucket called 'drill-images'
-- Set it to private and enable RLS

-- Create a function to generate unique file names for drill images
CREATE OR REPLACE FUNCTION generate_drill_image_filename(original_name TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN gen_random_uuid()::TEXT || '_' || original_name;
END;
$$ LANGUAGE plpgsql; 