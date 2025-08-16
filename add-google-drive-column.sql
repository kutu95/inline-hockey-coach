-- Add is_google_drive column to game_videos table
ALTER TABLE game_videos 
ADD COLUMN IF NOT EXISTS is_google_drive BOOLEAN DEFAULT FALSE;

-- Update existing records to mark them as not Google Drive (since they were uploaded files)
UPDATE game_videos 
SET is_google_drive = FALSE 
WHERE is_google_drive IS NULL;

-- Verify the change
SELECT 'is_google_drive column added to game_videos' as status;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'game_videos' 
AND column_name = 'is_google_drive';
