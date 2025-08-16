-- Fix RLS policies for media_attachments table
-- This will resolve the 400 errors when querying for animation data

-- First, check current policies
SELECT 'Current media_attachments policies:' as info;
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'media_attachments' 
AND schemaname = 'public'
ORDER BY tablename, policyname;

-- Drop ALL existing policies for media_attachments to start fresh
-- Drop policies with various naming patterns that might exist
DROP POLICY IF EXISTS "Authenticated users can view media attachments" ON media_attachments;
DROP POLICY IF EXISTS "Authenticated users can insert media attachments" ON media_attachments;
DROP POLICY IF EXISTS "Authenticated users can update media attachments" ON media_attachments;
DROP POLICY IF EXISTS "Authenticated users can delete media attachments" ON media_attachments;
DROP POLICY IF EXISTS "Allow authenticated users to view media attachments" ON media_attachments;
DROP POLICY IF EXISTS "Allow authenticated users to insert media attachments" ON media_attachments;
DROP POLICY IF EXISTS "Allow authenticated users to update media attachments" ON media_attachments;
DROP POLICY IF EXISTS "Allow authenticated users to delete media attachments" ON media_attachments;
DROP POLICY IF EXISTS "media_attachments_select_anyone" ON media_attachments;
DROP POLICY IF EXISTS "media_attachments_insert_anyone" ON media_attachments;
DROP POLICY IF EXISTS "media_attachments_update_anyone" ON media_attachments;
DROP POLICY IF EXISTS "media_attachments_delete_anyone" ON media_attachments;
DROP POLICY IF EXISTS "media_attachments_all_operations" ON media_attachments;

-- Create new permissive policies for media_attachments
-- Allow any authenticated user to view media attachments
CREATE POLICY "media_attachments_select_anyone" ON media_attachments
    FOR SELECT USING (auth.role() = 'authenticated');

-- Allow any authenticated user to insert media attachments
CREATE POLICY "media_attachments_insert_anyone" ON media_attachments
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow any authenticated user to update media attachments
CREATE POLICY "media_attachments_update_anyone" ON media_attachments
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Allow any authenticated user to delete media attachments
CREATE POLICY "media_attachments_delete_anyone" ON media_attachments
    FOR DELETE USING (auth.role() = 'authenticated');

-- Also create a catch-all policy that allows everything for media_attachments
CREATE POLICY "media_attachments_all_operations" ON media_attachments
    FOR ALL USING (auth.role() = 'authenticated');

-- Verify the new policies
SELECT 'New media_attachments policies:' as info;
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'media_attachments' 
AND schemaname = 'public'
ORDER BY tablename, policyname;

-- Test if the policies are working by checking if we can see them
SELECT 'Policy verification:' as info;
SELECT COUNT(*) as total_policies FROM pg_policies 
WHERE tablename = 'media_attachments' 
AND schemaname = 'public';

-- Also check if the table exists and has the right structure
SELECT 'Table structure check:' as info;
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'media_attachments' 
AND table_schema = 'public'
ORDER BY ordinal_position;
