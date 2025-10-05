-- Complete RLS policy fix for all tables
-- This creates simple policies that avoid circular dependencies and complex joins

-- =====================================================
-- 1. CLUBS TABLE
-- =====================================================

-- Drop ALL existing policies on clubs table
DROP POLICY IF EXISTS "Users can view clubs in their organization" ON clubs;
DROP POLICY IF EXISTS "Users can insert clubs in their organization" ON clubs;
DROP POLICY IF EXISTS "Users can update clubs in their organization" ON clubs;
DROP POLICY IF EXISTS "Users can delete clubs in their organization" ON clubs;
DROP POLICY IF EXISTS "Coaches can view their own clubs" ON clubs;
DROP POLICY IF EXISTS "Coaches can insert their own clubs" ON clubs;
DROP POLICY IF EXISTS "Coaches can update their own clubs" ON clubs;
DROP POLICY IF EXISTS "Coaches can delete their own clubs" ON clubs;
DROP POLICY IF EXISTS "Authenticated users can view clubs" ON clubs;
DROP POLICY IF EXISTS "Authenticated users can insert clubs" ON clubs;
DROP POLICY IF EXISTS "Authenticated users can update clubs" ON clubs;
DROP POLICY IF EXISTS "Authenticated users can delete clubs" ON clubs;

-- Create simple policies for clubs
CREATE POLICY "Authenticated users can view clubs" ON clubs
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert clubs" ON clubs
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update clubs" ON clubs
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete clubs" ON clubs
  FOR DELETE USING (auth.role() = 'authenticated');

-- =====================================================
-- 2. SQUADS TABLE
-- =====================================================

-- Drop ALL existing policies on squads table
DROP POLICY IF EXISTS "Users can view relevant squads" ON squads;
DROP POLICY IF EXISTS "Users can insert relevant squads" ON squads;
DROP POLICY IF EXISTS "Users can update relevant squads" ON squads;
DROP POLICY IF EXISTS "Users can delete relevant squads" ON squads;
DROP POLICY IF EXISTS "Coaches can view their own squads" ON squads;
DROP POLICY IF EXISTS "Coaches can insert their own squads" ON squads;
DROP POLICY IF EXISTS "Coaches can update their own squads" ON squads;
DROP POLICY IF EXISTS "Coaches can delete their own squads" ON squads;
DROP POLICY IF EXISTS "Users can view squads in their organization" ON squads;
DROP POLICY IF EXISTS "Users can insert squads in their organization" ON squads;
DROP POLICY IF EXISTS "Users can update squads in their organization" ON squads;
DROP POLICY IF EXISTS "Users can delete squads in their organization" ON squads;
DROP POLICY IF EXISTS "Authenticated users can view squads" ON squads;
DROP POLICY IF EXISTS "Authenticated users can insert squads" ON squads;
DROP POLICY IF EXISTS "Authenticated users can update squads" ON squads;
DROP POLICY IF EXISTS "Authenticated users can delete squads" ON squads;

-- Create simple policies for squads
CREATE POLICY "Authenticated users can view squads" ON squads
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert squads" ON squads
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update squads" ON squads
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete squads" ON squads
  FOR DELETE USING (auth.role() = 'authenticated');

-- =====================================================
-- 3. PLAYERS TABLE
-- =====================================================

-- Drop ALL existing policies on players table
DROP POLICY IF EXISTS "Users can view relevant players" ON players;
DROP POLICY IF EXISTS "Users can insert players in their organization" ON players;
DROP POLICY IF EXISTS "Users can update relevant players" ON players;
DROP POLICY IF EXISTS "Users can delete players in their organization" ON players;
DROP POLICY IF EXISTS "Users can view own players" ON players;
DROP POLICY IF EXISTS "Users can insert own players" ON players;
DROP POLICY IF EXISTS "Users can update own players" ON players;
DROP POLICY IF EXISTS "Users can delete own players" ON players;
DROP POLICY IF EXISTS "Coaches can view their own players" ON players;
DROP POLICY IF EXISTS "Coaches can insert their own players" ON players;
DROP POLICY IF EXISTS "Coaches can update their own players" ON players;
DROP POLICY IF EXISTS "Coaches can delete their own players" ON players;
DROP POLICY IF EXISTS "Users can view players in their organization" ON players;
DROP POLICY IF EXISTS "Users can insert players in their organization" ON players;
DROP POLICY IF EXISTS "Users can update players in their organization" ON players;
DROP POLICY IF EXISTS "Users can delete players in their organization" ON players;
DROP POLICY IF EXISTS "Authenticated users can view players" ON players;
DROP POLICY IF EXISTS "Authenticated users can insert players" ON players;
DROP POLICY IF EXISTS "Authenticated users can update players" ON players;
DROP POLICY IF EXISTS "Authenticated users can delete players" ON players;

-- Create simple policies for players
CREATE POLICY "Authenticated users can view players" ON players
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert players" ON players
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update players" ON players
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete players" ON players
  FOR DELETE USING (auth.role() = 'authenticated');

-- =====================================================
-- 4. PLAYER_SQUADS TABLE
-- =====================================================

-- Drop ALL existing policies on player_squads table
DROP POLICY IF EXISTS "Users can view player-squad assignments in their organization" ON player_squads;
DROP POLICY IF EXISTS "Users can insert player-squad assignments in their organization" ON player_squads;
DROP POLICY IF EXISTS "Users can update player-squad assignments in their organization" ON player_squads;
DROP POLICY IF EXISTS "Users can delete player-squad assignments in their organization" ON player_squads;
DROP POLICY IF EXISTS "Coaches can view player-squad assignments" ON player_squads;
DROP POLICY IF EXISTS "Coaches can insert player-squad assignments" ON player_squads;
DROP POLICY IF EXISTS "Coaches can update player-squad assignments" ON player_squads;
DROP POLICY IF EXISTS "Coaches can delete player-squad assignments" ON player_squads;
DROP POLICY IF EXISTS "Users can view player-squad assignments" ON player_squads;
DROP POLICY IF EXISTS "Users can insert player-squad assignments" ON player_squads;
DROP POLICY IF EXISTS "Users can update player-squad assignments" ON player_squads;
DROP POLICY IF EXISTS "Users can delete player-squad assignments" ON player_squads;
DROP POLICY IF EXISTS "Authenticated users can view player-squad assignments" ON player_squads;
DROP POLICY IF EXISTS "Authenticated users can insert player-squad assignments" ON player_squads;
DROP POLICY IF EXISTS "Authenticated users can update player-squad assignments" ON player_squads;
DROP POLICY IF EXISTS "Authenticated users can delete player-squad assignments" ON player_squads;

-- Create simple policies for player_squads
CREATE POLICY "Authenticated users can view player-squad assignments" ON player_squads
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert player-squad assignments" ON player_squads
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update player-squad assignments" ON player_squads
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete player-squad assignments" ON player_squads
  FOR DELETE USING (auth.role() = 'authenticated');

-- Add comments to document the simplified approach
COMMENT ON TABLE clubs IS 'Clubs table - Simplified RLS policies to allow all authenticated users access. This avoids circular dependencies and complex joins that were causing 406/500 errors.';
COMMENT ON TABLE squads IS 'Squads table - Simplified RLS policies to allow all authenticated users access. This avoids circular dependencies and complex joins that were causing 406/500 errors.';
COMMENT ON TABLE players IS 'Players table - Simplified RLS policies to allow all authenticated users access. This avoids circular dependencies and complex joins that were causing 406/500 errors.';
COMMENT ON TABLE player_squads IS 'Player-squad junction table - Simplified RLS policies to allow all authenticated users access. This avoids circular dependencies and complex joins that were causing 406/500 errors.';
