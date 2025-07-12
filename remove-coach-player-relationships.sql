-- Remove coach-player relationship from players table only
-- This script removes coach_id foreign key relationship from the players table

-- 1. Drop RLS policies that reference coach_id for players table first
-- Players policies (using exact names from error message)
DROP POLICY IF EXISTS "Players - view own" ON players;
DROP POLICY IF EXISTS "Players - insert own" ON players;
DROP POLICY IF EXISTS "Players - update own" ON players;
DROP POLICY IF EXISTS "Players - delete own" ON players;

-- 2. Drop player_squads policies that reference coach_id (using exact names from error message)
DROP POLICY IF EXISTS "Player squads - view own" ON player_squads;
DROP POLICY IF EXISTS "Player squads - insert own" ON player_squads;
DROP POLICY IF EXISTS "Player squads - delete own" ON player_squads;

-- 3. Also try dropping with alternative policy names that might exist
DROP POLICY IF EXISTS "Users can view own players" ON players;
DROP POLICY IF EXISTS "Users can insert own players" ON players;
DROP POLICY IF EXISTS "Users can update own players" ON players;
DROP POLICY IF EXISTS "Users can delete own players" ON players;
DROP POLICY IF EXISTS "Coaches can view their own players" ON players;
DROP POLICY IF EXISTS "Coaches can insert their own players" ON players;
DROP POLICY IF EXISTS "Coaches can update their own players" ON players;
DROP POLICY IF EXISTS "Coaches can delete their own players" ON players;

-- 4. Drop alternative player_squads policy names
DROP POLICY IF EXISTS "Coaches can view player-squad assignments" ON player_squads;
DROP POLICY IF EXISTS "Coaches can insert player-squad assignments" ON player_squads;
DROP POLICY IF EXISTS "Coaches can delete player-squad assignments" ON player_squads;

-- 5. Now remove coach_id from players table
ALTER TABLE players DROP COLUMN IF EXISTS coach_id;

-- 6. Drop related index for players coach_id
DROP INDEX IF EXISTS idx_players_coach_id;

-- 7. Verify the change
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'players'
  AND column_name = 'coach_id';

-- This should return no rows if coach_id column was successfully removed from players table 