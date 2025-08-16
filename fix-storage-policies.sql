-- Fix storage bucket policies for club-logos
-- This will allow authenticated users to access the files

-- First, check current policies
SELECT 'Current storage policies:' as info;
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'
AND policyname LIKE '%club%'
ORDER BY tablename, policyname;

-- Drop ALL existing policies for club-logos to avoid conflicts
DROP POLICY IF EXISTS "club_logos_view_all" ON storage.objects;
DROP POLICY IF EXISTS "club_logos_upload_coaches_admins" ON storage.objects;
DROP POLICY IF EXISTS "club_logos_update_coaches_admins" ON storage.objects;
DROP POLICY IF EXISTS "club_logos_delete_coaches_admins" ON storage.objects;
DROP POLICY IF EXISTS "club_logos_upload_all" ON storage.objects;
DROP POLICY IF EXISTS "club_logos_update_all" ON storage.objects;
DROP POLICY IF EXISTS "club_logos_delete_all" ON storage.objects;
DROP POLICY IF EXISTS "club_logos_upload_own" ON storage.objects;
DROP POLICY IF EXISTS "club_logos_update_own" ON storage.objects;
DROP POLICY IF EXISTS "club_logos_delete_own" ON storage.objects;

-- Create new permissive policies for club-logos
-- Allow any authenticated user to view club logos
CREATE POLICY "club_logos_view_all" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'club-logos' AND 
        auth.role() = 'authenticated'
    );

-- Allow any authenticated user to upload club logos
CREATE POLICY "club_logos_upload_all" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'club-logos' AND 
        auth.role() = 'authenticated'
    );

-- Allow any authenticated user to update club logos
CREATE POLICY "club_logos_update_all" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'club-logos' AND 
        auth.role() = 'authenticated'
    );

-- Allow any authenticated user to delete club logos
CREATE POLICY "club_logos_delete_all" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'club-logos' AND 
        auth.role() = 'authenticated'
    );

-- Verify the new policies
SELECT 'New storage policies:' as info;
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'
AND policyname LIKE '%club%'
ORDER BY tablename, policyname;

-- Test if we can now access the storage
-- This should work after the policies are updated
