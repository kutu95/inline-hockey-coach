-- Add deleted_players column to game_sessions table
-- This migration adds a JSONB column to store the list of deleted player IDs

-- Add the deleted_players column
ALTER TABLE game_sessions 
ADD COLUMN IF NOT EXISTS deleted_players JSONB DEFAULT '[]'::jsonb;

-- Add a comment to document the column
COMMENT ON COLUMN game_sessions.deleted_players IS 'Array of player IDs that have been deleted from this game session';

-- Create an index for better performance when querying deleted players
CREATE INDEX IF NOT EXISTS idx_game_sessions_deleted_players 
ON game_sessions USING GIN (deleted_players);

-- Update existing records to have an empty array if they don't have one
UPDATE game_sessions 
SET deleted_players = '[]'::jsonb 
WHERE deleted_players IS NULL;
