-- Complete fix for storage access issues
-- This will allow any authenticated user to view player images and club logos
-- AND allow players to upload their own profile photos
-- Run this in your Supabase SQL Editor

-- =====================================================
-- 1. FIRST, CHECK CURRENT STORAGE POLICIES
-- =====================================================

SELECT 'Current storage policies before fix:' as info;
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

-- =====================================================
-- 2. DROP ALL EXISTING STORAGE POLICIES
-- =====================================================

-- Drop all existing policies for player-photos bucket
DROP POLICY IF EXISTS "Coaches and admins can upload player photos" ON storage.objects;
DROP POLICY IF EXISTS "Coaches and admins can update player photos" ON storage.objects;
DROP POLICY IF EXISTS "Coaches and admins can delete player photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own player photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own player photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own player photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own player photos" ON storage.objects;
DROP POLICY IF EXISTS "Player photos are viewable by authenticated users" ON storage.objects;
DROP POLICY IF EXISTS "Any authenticated user can view player photos" ON storage.objects;
DROP POLICY IF EXISTS "player_photos_view_all" ON storage.objects;
DROP POLICY IF EXISTS "player_photos_upload_coaches_admins" ON storage.objects;
DROP POLICY IF EXISTS "player_photos_update_coaches_admins" ON storage.objects;
DROP POLICY IF EXISTS "player_photos_delete_coaches_admins" ON storage.objects;

-- Drop all existing policies for club-logos bucket
DROP POLICY IF EXISTS "Coaches and admins can upload club logos" ON storage.objects;
DROP POLICY IF EXISTS "Coaches and admins can update club logos" ON storage.objects;
DROP POLICY IF EXISTS "Coaches and admins can delete club logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own club logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own club logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own club logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own club logos" ON storage.objects;
DROP POLICY IF EXISTS "Club logos are viewable by authenticated users" ON storage.objects;
DROP POLICY IF EXISTS "Any authenticated user can view club logos" ON storage.objects;
DROP POLICY IF EXISTS "club_logos_view_all" ON storage.objects;
DROP POLICY IF EXISTS "club_logos_upload_coaches_admins" ON storage.objects;
DROP POLICY IF EXISTS "club_logos_update_coaches_admins" ON storage.objects;
DROP POLICY IF EXISTS "club_logos_delete_coaches_admins" ON storage.objects;

-- Drop all existing policies for drill-images bucket
DROP POLICY IF EXISTS "Coaches and admins can upload drill images" ON storage.objects;
DROP POLICY IF EXISTS "Coaches and admins can update drill images" ON storage.objects;
DROP POLICY IF EXISTS "Coaches and admins can delete drill images" ON storage.objects;
DROP POLICY IF EXISTS "Drill images are viewable by authenticated users" ON storage.objects;
DROP POLICY IF EXISTS "Any authenticated user can view drill images" ON storage.objects;
DROP POLICY IF EXISTS "drill_images_view_all" ON storage.objects;
DROP POLICY IF EXISTS "drill_images_upload_coaches_admins" ON storage.objects;
DROP POLICY IF EXISTS "drill_images_update_coaches_admins" ON storage.objects;
DROP POLICY IF EXISTS "drill_images_delete_coaches_admins" ON storage.objects;

-- =====================================================
-- 3. CREATE NEW PERMISSIVE POLICIES
-- =====================================================

-- PLAYER PHOTOS: Allow any authenticated user to view, players to manage their own, coaches/admins to manage all
CREATE POLICY "player_photos_view_all" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'player-photos' AND 
        auth.role() = 'authenticated'
    );

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

-- CLUB LOGOS: Allow any authenticated user to view, coaches/admins to manage
CREATE POLICY "club_logos_view_all" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'club-logos' AND 
        auth.role() = 'authenticated'
    );

CREATE POLICY "club_logos_upload_coaches_admins" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'club-logos' AND
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'coach')
        )
    );

CREATE POLICY "club_logos_update_coaches_admins" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'club-logos' AND
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'coach')
        )
    );

CREATE POLICY "club_logos_delete_coaches_admins" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'club-logos' AND
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'coach')
        )
    );

-- DRILL IMAGES: Allow any authenticated user to view, coaches/admins to manage
CREATE POLICY "drill_images_view_all" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'drill-images' AND 
        auth.role() = 'authenticated'
    );

CREATE POLICY "drill_images_upload_coaches_admins" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'drill-images' AND
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'coach')
        )
    );

CREATE POLICY "drill_images_update_coaches_admins" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'drill-images' AND
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'coach')
        )
    );

CREATE POLICY "drill_images_delete_coaches_admins" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'drill-images' AND
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'coach')
        )
    );

-- =====================================================
-- 4. VERIFY THE NEW POLICIES
-- =====================================================

SELECT 'New storage policies after fix:' as info;
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

-- =====================================================
-- 5. TEST ACCESS TO STORAGE
-- =====================================================

-- Test if we can see files in the buckets
SELECT 'Testing access to player-photos bucket:' as test;
SELECT 
    COUNT(*) as total_files
FROM storage.objects 
WHERE bucket_id = 'player-photos';

SELECT 'Testing access to club-logos bucket:' as test;
SELECT 
    COUNT(*) as total_files
FROM storage.objects 
WHERE bucket_id = 'club-logos';

SELECT 'Testing access to drill-images bucket:' as test;
SELECT 
    COUNT(*) as total_files
FROM storage.objects 
WHERE bucket_id = 'drill-images';

-- =====================================================
-- 6. SHOW SAMPLE FILES (if any exist)
-- =====================================================

SELECT 'Sample files in player-photos:' as info;
SELECT 
    name,
    created_at
FROM storage.objects 
WHERE bucket_id = 'player-photos'
ORDER BY created_at DESC
LIMIT 5;

SELECT 'Sample files in club-logos:' as info;
SELECT 
    name,
    created_at
FROM storage.objects 
WHERE bucket_id = 'club-logos'
ORDER BY created_at DESC
LIMIT 5;

SELECT 'Sample files in drill-images:' as info;
SELECT 
    name,
    created_at
FROM storage.objects 
WHERE bucket_id = 'drill-images'
ORDER BY created_at DESC
LIMIT 5;

-- =====================================================
-- 7. EXPLAIN THE NEW PERMISSIONS
-- =====================================================

SELECT 'New permissions summary:' as info;
SELECT 
    'Player Photos:' as bucket,
    '✅ Any authenticated user can VIEW' as view_permission,
    '✅ Players can UPLOAD/UPDATE/DELETE their own photos' as player_permission,
    '✅ Coaches/Admins can UPLOAD/UPDATE/DELETE any photos' as admin_permission;

SELECT 
    'Club Logos:' as bucket,
    '✅ Any authenticated user can VIEW' as view_permission,
    '❌ Only Coaches/Admins can UPLOAD/UPDATE/DELETE' as player_permission,
    '✅ Coaches/Admins can UPLOAD/UPDATE/DELETE any logos' as admin_permission;

SELECT 
    'Drill Images:' as bucket,
    '✅ Any authenticated user can VIEW' as view_permission,
    '❌ Only Coaches/Admins can UPLOAD/UPDATE/DELETE' as player_permission,
    '✅ Coaches/Admins can UPLOAD/UPDATE/DELETE any images' as admin_permission;
