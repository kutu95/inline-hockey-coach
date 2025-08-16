-- Fix game_videos table constraints for Google Drive links
-- This removes the unique constraint on storage_path since Google Drive links can be reused

-- 1. Check current constraints
SELECT 'Current constraints on game_videos:' as info;
SELECT conname, pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conrelid = 'game_videos'::regclass;

-- 2. Drop the unique constraint on storage_path
ALTER TABLE game_videos 
DROP CONSTRAINT IF EXISTS game_videos_storage_path_key;

-- 3. Add a more flexible constraint - allow multiple videos with same storage_path but different titles
-- This makes sense for Google Drive links that might be shared across multiple sessions
ALTER TABLE game_videos 
ADD CONSTRAINT game_videos_unique_video 
UNIQUE (title, storage_path, created_by);

-- 4. Verify the changes
SELECT 'Constraints after fix:' as info;
SELECT conname, pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conrelid = 'game_videos'::regclass;

-- 5. Show current game_videos data
SELECT 'Current game_videos data:' as info;
SELECT id, title, storage_path, created_by, created_at
FROM game_videos
ORDER BY created_at DESC
LIMIT 10;
