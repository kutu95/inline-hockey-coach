-- Fix storage access so any authenticated user can view player images and club logos
-- Run this in your Supabase SQL Editor

-- =====================================================
-- 1. FIX PLAYER PHOTOS BUCKET POLICIES
-- =====================================================

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Coaches and admins can upload player photos" ON storage.objects;
DROP POLICY IF EXISTS "Coaches and admins can update player photos" ON storage.objects;
DROP POLICY IF EXISTS "Coaches and admins can delete player photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own player photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own player photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own player photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own player photos" ON storage.objects;

-- Create new policies that allow any authenticated user to view player photos
CREATE POLICY "Any authenticated user can view player photos" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'player-photos' AND 
        auth.role() = 'authenticated'
    );

-- Allow coaches and admins to upload/update/delete player photos
CREATE POLICY "Coaches and admins can upload player photos" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'player-photos' AND
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'coach')
        )
    );

CREATE POLICY "Coaches and admins can update player photos" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'player-photos' AND
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'coach')
        )
    );

CREATE POLICY "Coaches and admins can delete player photos" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'player-photos' AND
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'coach')
        )
    );

-- =====================================================
-- 2. FIX CLUB LOGOS BUCKET POLICIES
-- =====================================================

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Coaches and admins can upload club logos" ON storage.objects;
DROP POLICY IF EXISTS "Coaches and admins can update club logos" ON storage.objects;
DROP POLICY IF EXISTS "Coaches and admins can delete club logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own club logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own club logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own club logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own club logos" ON storage.objects;

-- Create new policies that allow any authenticated user to view club logos
CREATE POLICY "Any authenticated user can view club logos" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'club-logos' AND 
        auth.role() = 'authenticated'
    );

-- Allow coaches and admins to upload/update/delete club logos
CREATE POLICY "Coaches and admins can upload club logos" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'club-logos' AND
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'coach')
        )
    );

CREATE POLICY "Coaches and admins can update club logos" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'club-logos' AND
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'coach')
        )
    );

CREATE POLICY "Coaches and admins can delete club logos" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'club-logos' AND
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'coach')
        )
    );

-- =====================================================
-- 3. FIX DRILL IMAGES BUCKET POLICIES
-- =====================================================

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Coaches and admins can upload drill images" ON storage.objects;
DROP POLICY IF EXISTS "Coaches and admins can update drill images" ON storage.objects;
DROP POLICY IF EXISTS "Coaches and admins can delete drill images" ON storage.objects;

-- Create new policies that allow any authenticated user to view drill images
CREATE POLICY "Any authenticated user can view drill images" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'drill-images' AND 
        auth.role() = 'authenticated'
    );

-- Allow coaches and admins to upload/update/delete drill images
CREATE POLICY "Coaches and admins can upload drill images" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'drill-images' AND
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'coach')
        )
    );

CREATE POLICY "Coaches and admins can update drill images" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'drill-images' AND
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'coach')
        )
    );

CREATE POLICY "Coaches and admins can delete drill images" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'drill-images' AND
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'coach')
        )
    );

-- =====================================================
-- 4. VERIFY THE FIXES
-- =====================================================

-- Check current storage policies
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

-- Test if the policies are working
SELECT 'Testing if any authenticated user can view player photos...' as test;
SELECT 
    bucket_id,
    name,
    created_at
FROM storage.objects 
WHERE bucket_id = 'player-photos' 
LIMIT 5;

SELECT 'Testing if any authenticated user can view club logos...' as test;
SELECT 
    bucket_id,
    name,
    created_at
FROM storage.objects 
WHERE bucket_id = 'club-logos' 
LIMIT 5;

SELECT 'Testing if any authenticated user can view drill images...' as test;
SELECT 
    bucket_id,
    name,
    created_at
FROM storage.objects 
WHERE bucket_id = 'drill-images' 
LIMIT 5;

