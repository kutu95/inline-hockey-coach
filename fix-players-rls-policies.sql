-- Fix RLS policies for players table to remove coach_id dependencies
-- This addresses the 406 errors when trying to access the players table

-- Drop all existing policies that might conflict
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
DROP POLICY IF EXISTS "Users can view relevant players" ON players;
DROP POLICY IF EXISTS "Users can insert players in their organization" ON players;
DROP POLICY IF EXISTS "Users can update relevant players" ON players;
DROP POLICY IF EXISTS "Users can delete players in their organization" ON players;

-- Create simplified policies that work with organization-based access
-- Policy: Users can view players in their organization or their own player profile
CREATE POLICY "Users can view relevant players" ON players
  FOR SELECT USING (
    -- Superadmins can see all players
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name = 'superadmin'
    ) OR
    -- Users can see players in their organization
    (organization_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      JOIN players p ON p.user_id = ur.user_id
      WHERE ur.user_id = auth.uid()
      AND p.organization_id = players.organization_id
      AND r.name IN ('admin', 'superadmin', 'coach')
    )) OR
    -- Users can see their own player profile
    auth.uid() = user_id
  );

-- Policy: Users can insert players in their organization
CREATE POLICY "Users can insert players in their organization" ON players
  FOR INSERT WITH CHECK (
    -- Superadmins can create any players
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name = 'superadmin'
    ) OR
    -- Users can create players in their organization
    (organization_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      JOIN players p ON p.user_id = ur.user_id
      WHERE ur.user_id = auth.uid()
      AND p.organization_id = players.organization_id
      AND r.name IN ('admin', 'superadmin', 'coach')
    ))
  );

-- Policy: Users can update players in their organization or their own profile
CREATE POLICY "Users can update relevant players" ON players
  FOR UPDATE USING (
    -- Superadmins can update any players
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name = 'superadmin'
    ) OR
    -- Users can update players in their organization
    (organization_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      JOIN players p ON p.user_id = ur.user_id
      WHERE ur.user_id = auth.uid()
      AND p.organization_id = players.organization_id
      AND r.name IN ('admin', 'superadmin', 'coach')
    )) OR
    -- Users can update their own player profile
    auth.uid() = user_id
  );

-- Policy: Users can delete players in their organization
CREATE POLICY "Users can delete players in their organization" ON players
  FOR DELETE USING (
    -- Superadmins can delete any players
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name = 'superadmin'
    ) OR
    -- Users can delete players in their organization
    (organization_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      JOIN players p ON p.user_id = ur.user_id
      WHERE ur.user_id = auth.uid()
      AND p.organization_id = players.organization_id
      AND r.name IN ('admin', 'superadmin', 'coach')
    ))
  );

-- Add a comment to document the changes
COMMENT ON TABLE players IS 'Players table - RLS policies updated to use organization-based access instead of coach_id dependencies. Allows system imports and organization-level management.';
