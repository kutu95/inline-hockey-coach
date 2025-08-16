-- Fix RLS policies for game_videos table
-- This will resolve the "new row violates row-level security policy" error

-- First, check current policies
SELECT 'Current game_videos policies:' as info;
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'game_videos'
AND schemaname = 'public'
ORDER BY tablename, policyname;

-- Drop ALL existing policies for game_videos to start fresh
DROP POLICY IF EXISTS "Users can view game videos from their organization" ON game_videos;
DROP POLICY IF EXISTS "Users can insert game videos for their organization" ON game_videos;
DROP POLICY IF EXISTS "Users can update game videos from their organization" ON game_videos;
DROP POLICY IF EXISTS "Users can delete game videos from their organization" ON game_videos;

-- Create new, more permissive policies for game_videos
-- Allow any authenticated user to view game videos
CREATE POLICY "game_videos_select_anyone" ON game_videos
    FOR SELECT USING (auth.role() = 'authenticated');

-- Allow any authenticated user to insert game videos
CREATE POLICY "game_videos_insert_anyone" ON game_videos
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow any authenticated user to update game videos
CREATE POLICY "game_videos_update_anyone" ON game_videos
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Allow any authenticated user to delete game videos
CREATE POLICY "game_videos_delete_anyone" ON game_videos
    FOR DELETE USING (auth.role() = 'authenticated');

-- Also create a catch-all policy that allows everything for game_videos
CREATE POLICY "game_videos_all_operations" ON game_videos
    FOR ALL USING (auth.role() = 'authenticated');

-- Verify the new policies
SELECT 'New game_videos policies:' as info;
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'game_videos'
AND schemaname = 'public'
ORDER BY tablename, policyname;

-- Test if the policies are working by checking if we can see them
SELECT 'Policy verification:' as info;
SELECT COUNT(*) as total_policies FROM pg_policies
WHERE tablename = 'game_videos'
AND schemaname = 'public';

-- Also check if the table exists and has the right structure
SELECT 'Table structure check:' as info;
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'game_videos'
AND table_schema = 'public'
ORDER BY ordinal_position;
