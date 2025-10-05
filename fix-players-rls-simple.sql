-- Simple fix for players table RLS policies
-- This creates basic policies that avoid circular dependencies and complex joins

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

-- Drop any existing policies with the new names to avoid conflicts
DROP POLICY IF EXISTS "Authenticated users can view players" ON players;
DROP POLICY IF EXISTS "Authenticated users can insert players" ON players;
DROP POLICY IF EXISTS "Authenticated users can update players" ON players;
DROP POLICY IF EXISTS "Authenticated users can delete players" ON players;

-- Create simple, non-circular policies
-- Policy: Allow all authenticated users to view players (for now)
CREATE POLICY "Authenticated users can view players" ON players
  FOR SELECT USING (auth.role() = 'authenticated');

-- Policy: Allow all authenticated users to insert players (for now)
CREATE POLICY "Authenticated users can insert players" ON players
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Policy: Allow all authenticated users to update players (for now)
CREATE POLICY "Authenticated users can update players" ON players
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Policy: Allow all authenticated users to delete players (for now)
CREATE POLICY "Authenticated users can delete players" ON players
  FOR DELETE USING (auth.role() = 'authenticated');

-- Add a comment to document the simplified approach
COMMENT ON TABLE players IS 'Players table - Simplified RLS policies to allow all authenticated users access. This avoids circular dependencies and complex joins that were causing 500 errors.';
