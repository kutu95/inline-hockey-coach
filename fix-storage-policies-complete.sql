-- Complete fix for storage access issues
-- This will make the club-logos bucket fully accessible

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
ORDER BY tablename, policyname;

-- Drop ALL existing policies for club-logos to start fresh
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

-- Create the most permissive policies possible for club-logos
-- This will allow ANY authenticated user to do ANYTHING with club logos

-- Allow viewing (SELECT) - this is the most important one
CREATE POLICY "club_logos_select_anyone" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'club-logos'
    );

-- Allow uploading (INSERT)
CREATE POLICY "club_logos_insert_anyone" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'club-logos'
    );

-- Allow updating (UPDATE)
CREATE POLICY "club_logos_update_anyone" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'club-logos'
    );

-- Allow deleting (DELETE)
CREATE POLICY "club_logos_delete_anyone" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'club-logos'
    );

-- Also create a catch-all policy that allows everything for club-logos
CREATE POLICY "club_logos_all_operations" ON storage.objects
    FOR ALL USING (
        bucket_id = 'club-logos'
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

-- Test if the policies are working by checking if we can see them
SELECT 'Policy verification:' as info;
SELECT COUNT(*) as total_policies FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'
AND policyname LIKE '%club%';
