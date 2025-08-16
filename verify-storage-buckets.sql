-- Verify and fix storage bucket configuration
-- Run this in your Supabase SQL Editor

-- =====================================================
-- 1. CHECK CURRENT BUCKET CONFIGURATION
-- =====================================================

SELECT 'Current storage buckets:' as info;
SELECT 
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
FROM storage.buckets
ORDER BY name;

-- =====================================================
-- 2. ENSURE BUCKETS EXIST AND ARE PROPERLY CONFIGURED
-- =====================================================

-- Create player-photos bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'player-photos', 
    'player-photos', 
    false, -- Keep private for security
    52428800, -- 50MB limit
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Create club-logos bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'club-logos', 
    'club-logos', 
    false, -- Keep private for security
    10485760, -- 10MB limit
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Create drill-images bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'drill-images', 
    'drill-images', 
    false, -- Keep private for security
    52428800, -- 50MB limit
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- =====================================================
-- 3. VERIFY BUCKET CONTENTS
-- =====================================================

SELECT 'Files in player-photos bucket:' as info;
SELECT 
    name,
    bucket_id,
    size,
    created_at
FROM storage.objects 
WHERE bucket_id = 'player-photos'
ORDER BY created_at DESC
LIMIT 10;

SELECT 'Files in club-logos bucket:' as info;
SELECT 
    name,
    bucket_id,
    size,
    created_at
FROM storage.objects 
WHERE bucket_id = 'club-logos'
ORDER BY created_at DESC
LIMIT 10;

SELECT 'Files in drill-images bucket:' as info;
SELECT 
    name,
    bucket_id,
    size,
    created_at
FROM storage.objects 
WHERE bucket_id = 'drill-images'
ORDER BY created_at DESC
LIMIT 10;

-- =====================================================
-- 4. TEST ACCESS WITH CURRENT USER
-- =====================================================

SELECT 'Testing current user access to storage...' as test;
SELECT 
    'Current user ID:' as info,
    auth.uid() as user_id;

-- Test if current user can see any files
SELECT 'Can current user see player photos?' as test;
SELECT 
    COUNT(*) as file_count
FROM storage.objects 
WHERE bucket_id = 'player-photos';

SELECT 'Can current user see club logos?' as test;
SELECT 
    COUNT(*) as file_count
FROM storage.objects 
WHERE bucket_id = 'club-logos';

SELECT 'Can current user see drill images?' as test;
SELECT 
    COUNT(*) as file_count
FROM storage.objects 
WHERE bucket_id = 'drill-images';

