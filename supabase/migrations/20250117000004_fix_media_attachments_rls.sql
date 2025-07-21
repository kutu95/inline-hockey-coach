-- Fix RLS policies for media_attachments to allow animation saves
-- The current policies are too restrictive and blocking inserts

-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can view media attachments" ON media_attachments;
DROP POLICY IF EXISTS "Authenticated users can insert media attachments" ON media_attachments;
DROP POLICY IF EXISTS "Authenticated users can update media attachments" ON media_attachments;
DROP POLICY IF EXISTS "Authenticated users can delete media attachments" ON media_attachments;

-- Create more permissive policies
-- Allow any authenticated user to view media attachments
CREATE POLICY "Allow authenticated users to view media attachments" ON media_attachments
    FOR SELECT USING (auth.role() = 'authenticated');

-- Allow any authenticated user to insert media attachments
CREATE POLICY "Allow authenticated users to insert media attachments" ON media_attachments
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow any authenticated user to update media attachments
CREATE POLICY "Allow authenticated users to update media attachments" ON media_attachments
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Allow any authenticated user to delete media attachments
CREATE POLICY "Allow authenticated users to delete media attachments" ON media_attachments
    FOR DELETE USING (auth.role() = 'authenticated');

-- Also fix drill_media policies
DROP POLICY IF EXISTS "Authenticated users can view drill media" ON drill_media;
DROP POLICY IF EXISTS "Authenticated users can insert drill media" ON drill_media;
DROP POLICY IF EXISTS "Authenticated users can delete drill media" ON drill_media;

CREATE POLICY "Allow authenticated users to view drill media" ON drill_media
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert drill media" ON drill_media
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete drill media" ON drill_media
    FOR DELETE USING (auth.role() = 'authenticated');

-- Also fix session_media policies
DROP POLICY IF EXISTS "Authenticated users can view session media" ON session_media;
DROP POLICY IF EXISTS "Authenticated users can insert session media" ON session_media;
DROP POLICY IF EXISTS "Authenticated users can delete session media" ON session_media;

CREATE POLICY "Allow authenticated users to view session media" ON session_media
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert session media" ON session_media
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete session media" ON session_media
    FOR DELETE USING (auth.role() = 'authenticated'); 