-- Add user_id column to players table to link players to auth users
-- This allows players to access their own profile

-- Add user_id column if it doesn't exist
ALTER TABLE players ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for user_id lookups if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_players_user_id ON players(user_id);

-- Update RLS policies to allow players to view their own profile
DROP POLICY IF EXISTS "Users can view own players" ON players;
DROP POLICY IF EXISTS "Users can insert own players" ON players;
DROP POLICY IF EXISTS "Users can update own players" ON players;
DROP POLICY IF EXISTS "Users can delete own players" ON players;

-- Create new policies that work with both coach_id and user_id
CREATE POLICY "Users can view own players" ON players
  FOR SELECT USING (
    auth.uid() = coach_id OR 
    auth.uid() = user_id OR
    is_superadmin(auth.uid())
  );

CREATE POLICY "Users can insert own players" ON players
  FOR INSERT WITH CHECK (
    auth.uid() = coach_id OR
    is_superadmin(auth.uid())
  );

CREATE POLICY "Users can update own players" ON players
  FOR UPDATE USING (
    auth.uid() = coach_id OR 
    auth.uid() = user_id OR
    is_superadmin(auth.uid())
  );

CREATE POLICY "Users can delete own players" ON players
  FOR DELETE USING (
    auth.uid() = coach_id OR
    is_superadmin(auth.uid())
  ); 