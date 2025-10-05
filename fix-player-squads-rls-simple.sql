-- Simple fix for player_squads table RLS policies
-- This creates basic policies that avoid circular dependencies and complex joins

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

-- Drop any existing policies with the new names to avoid conflicts
DROP POLICY IF EXISTS "Authenticated users can view player-squad assignments" ON player_squads;
DROP POLICY IF EXISTS "Authenticated users can insert player-squad assignments" ON player_squads;
DROP POLICY IF EXISTS "Authenticated users can update player-squad assignments" ON player_squads;
DROP POLICY IF EXISTS "Authenticated users can delete player-squad assignments" ON player_squads;

-- Create simple, non-circular policies
-- Policy: Allow all authenticated users to view player-squad assignments (for now)
CREATE POLICY "Authenticated users can view player-squad assignments" ON player_squads
  FOR SELECT USING (auth.role() = 'authenticated');

-- Policy: Allow all authenticated users to insert player-squad assignments (for now)
CREATE POLICY "Authenticated users can insert player-squad assignments" ON player_squads
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Policy: Allow all authenticated users to update player-squad assignments (for now)
CREATE POLICY "Authenticated users can update player-squad assignments" ON player_squads
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Policy: Allow all authenticated users to delete player-squad assignments (for now)
CREATE POLICY "Authenticated users can delete player-squad assignments" ON player_squads
  FOR DELETE USING (auth.role() = 'authenticated');

-- Add a comment to document the simplified approach
COMMENT ON TABLE player_squads IS 'Player-squad junction table - Simplified RLS policies to allow all authenticated users access. This avoids circular dependencies and complex joins that were causing 500 errors.';
