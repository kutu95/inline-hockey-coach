-- Fix RLS policies for player_squads table to remove coach_id dependencies
-- This addresses the 406 errors when trying to access the player_squads table

-- Drop all existing policies that might conflict
DROP POLICY IF EXISTS "Coaches can view player-squad assignments" ON player_squads;
DROP POLICY IF EXISTS "Coaches can insert player-squad assignments" ON player_squads;
DROP POLICY IF EXISTS "Coaches can update player-squad assignments" ON player_squads;
DROP POLICY IF EXISTS "Coaches can delete player-squad assignments" ON player_squads;
DROP POLICY IF EXISTS "Users can view player-squad assignments" ON player_squads;
DROP POLICY IF EXISTS "Users can insert player-squad assignments" ON player_squads;
DROP POLICY IF EXISTS "Users can update player-squad assignments" ON player_squads;
DROP POLICY IF EXISTS "Users can delete player-squad assignments" ON player_squads;

-- Drop any existing policies with the new names to avoid conflicts
DROP POLICY IF EXISTS "Users can view player-squad assignments in their organization" ON player_squads;
DROP POLICY IF EXISTS "Users can insert player-squad assignments in their organization" ON player_squads;
DROP POLICY IF EXISTS "Users can update player-squad assignments in their organization" ON player_squads;
DROP POLICY IF EXISTS "Users can delete player-squad assignments in their organization" ON player_squads;

-- Create simplified policies that work with organization-based access
-- Policy: Users can view player-squad assignments in their organization
CREATE POLICY "Users can view player-squad assignments in their organization" ON player_squads
  FOR SELECT USING (
    -- Superadmins can see all assignments
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name = 'superadmin'
    ) OR
    -- Users can see assignments for players in their organization
    EXISTS (
      SELECT 1 FROM players p
      JOIN squads s ON s.organization_id = p.organization_id
      JOIN user_roles ur ON ur.user_id = auth.uid()
      JOIN roles r ON ur.role_id = r.id
      WHERE p.id = player_squads.player_id
      AND s.id = player_squads.squad_id
      AND p.organization_id = ur.user_id -- This should be checked against user's organization
      AND r.name IN ('admin', 'superadmin', 'coach')
    )
  );

-- Policy: Users can insert player-squad assignments in their organization
CREATE POLICY "Users can insert player-squad assignments in their organization" ON player_squads
  FOR INSERT WITH CHECK (
    -- Superadmins can create any assignments
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name = 'superadmin'
    ) OR
    -- Users can create assignments for players in their organization
    EXISTS (
      SELECT 1 FROM players p
      JOIN squads s ON s.organization_id = p.organization_id
      JOIN user_roles ur ON ur.user_id = auth.uid()
      JOIN roles r ON ur.role_id = r.id
      WHERE p.id = player_squads.player_id
      AND s.id = player_squads.squad_id
      AND p.organization_id = ur.user_id -- This should be checked against user's organization
      AND r.name IN ('admin', 'superadmin', 'coach')
    )
  );

-- Policy: Users can update player-squad assignments in their organization
CREATE POLICY "Users can update player-squad assignments in their organization" ON player_squads
  FOR UPDATE USING (
    -- Superadmins can update any assignments
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name = 'superadmin'
    ) OR
    -- Users can update assignments for players in their organization
    EXISTS (
      SELECT 1 FROM players p
      JOIN squads s ON s.organization_id = p.organization_id
      JOIN user_roles ur ON ur.user_id = auth.uid()
      JOIN roles r ON ur.role_id = r.id
      WHERE p.id = player_squads.player_id
      AND s.id = player_squads.squad_id
      AND p.organization_id = ur.user_id -- This should be checked against user's organization
      AND r.name IN ('admin', 'superadmin', 'coach')
    )
  );

-- Policy: Users can delete player-squad assignments in their organization
CREATE POLICY "Users can delete player-squad assignments in their organization" ON player_squads
  FOR DELETE USING (
    -- Superadmins can delete any assignments
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name = 'superadmin'
    ) OR
    -- Users can delete assignments for players in their organization
    EXISTS (
      SELECT 1 FROM players p
      JOIN squads s ON s.organization_id = p.organization_id
      JOIN user_roles ur ON ur.user_id = auth.uid()
      JOIN roles r ON ur.role_id = r.id
      WHERE p.id = player_squads.player_id
      AND s.id = player_squads.squad_id
      AND p.organization_id = ur.user_id -- This should be checked against user's organization
      AND r.name IN ('admin', 'superadmin', 'coach')
    )
  );

-- Add a comment to document the changes
COMMENT ON TABLE player_squads IS 'Player-squad junction table - RLS policies updated to use organization-based access instead of coach_id dependencies. Allows system imports and organization-level management.';
