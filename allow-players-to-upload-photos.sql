-- Allow players to upload their own profile photos
-- Run this in your Supabase SQL Editor

-- =====================================================
-- 1. DROP EXISTING RESTRICTIVE PLAYER PHOTO POLICIES
-- =====================================================

-- Drop policies that only allow coaches/admins to manage player photos
DROP POLICY IF EXISTS "Coaches and admins can upload player photos" ON storage.objects;
DROP POLICY IF EXISTS "Coaches and admins can update player photos" ON storage.objects;
DROP POLICY IF EXISTS "Coaches and admins can delete player photos" ON storage.objects;
DROP POLICY IF EXISTS "player_photos_upload_coaches_admins" ON storage.objects;
DROP POLICY IF EXISTS "player_photos_update_coaches_admins" ON storage.objects;
DROP POLICY IF EXISTS "player_photos_delete_coaches_admins" ON storage.objects;

-- =====================================================
-- 2. CREATE NEW PLAYER PHOTO POLICIES
-- =====================================================

-- Players can upload their own photos (based on folder structure: user_id/filename)
CREATE POLICY "player_photos_upload_own" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'player-photos' AND
        (
            -- Players can upload to their own folder
            (storage.foldername(name))[1] = auth.uid()::text
            OR
            -- Coaches and admins can upload anywhere
            EXISTS (
                SELECT 1 FROM user_roles ur
                JOIN roles r ON ur.role_id = r.id
                WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'coach')
            )
        )
    );

-- Players can update their own photos, coaches/admins can update any
CREATE POLICY "player_photos_update_own_or_admin" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'player-photos' AND
        (
            -- Players can update their own photos
            (storage.foldername(name))[1] = auth.uid()::text
            OR
            -- Coaches and admins can update any
            EXISTS (
                SELECT 1 FROM user_roles ur
                JOIN roles r ON ur.role_id = r.id
                WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'coach')
            )
        )
    );

-- Players can delete their own photos, coaches/admins can delete any
CREATE POLICY "player_photos_delete_own_or_admin" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'player-photos' AND
        (
            -- Players can delete their own photos
            (storage.foldername(name))[1] = auth.uid()::text
            OR
            -- Coaches and admins can delete any
            EXISTS (
                SELECT 1 FROM user_roles ur
                JOIN roles r ON ur.role_id = r.id
                WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'coach')
            )
        )
    );

-- =====================================================
-- 3. VERIFY THE NEW POLICIES
-- =====================================================

SELECT 'New player photo policies:' as info;
SELECT 
    policyname,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'
AND policyname LIKE '%player_photos%'
ORDER BY policyname;

-- =====================================================
-- 4. EXPLAIN THE NEW PERMISSIONS
-- =====================================================

SELECT 'Player photo permissions after fix:' as info;
SELECT 
    '✅ VIEWING:' as permission,
    'Any authenticated user can see all player photos' as description;

SELECT 
    '✅ UPLOADING:' as permission,
    'Players can upload photos to their own folder (user_id/filename)' as description;

SELECT 
    '✅ UPDATING:' as permission,
    'Players can update their own photos, coaches/admins can update any' as description;

SELECT 
    '✅ DELETING:' as permission,
    'Players can delete their own photos, coaches/admins can delete any' as description;

-- =====================================================
-- 5. TEST THE POLICIES
-- =====================================================

-- Test if we can see the player-photos bucket
SELECT 'Testing access to player-photos bucket:' as test;
SELECT 
    COUNT(*) as total_files
FROM storage.objects 
WHERE bucket_id = 'player-photos';

-- Show current files (if any exist)
SELECT 'Current files in player-photos:' as info;
SELECT 
    name,
    created_at
FROM storage.objects 
WHERE bucket_id = 'player-photos'
ORDER BY created_at DESC
LIMIT 10;
