-- Fix RLS policies for squads table to remove coach_id dependencies
-- This addresses the 500 errors when trying to load squads

-- Drop all existing policies that might conflict
DROP POLICY IF EXISTS "Users can view relevant squads" ON squads;
DROP POLICY IF EXISTS "Users can insert relevant squads" ON squads;
DROP POLICY IF EXISTS "Users can update relevant squads" ON squads;
DROP POLICY IF EXISTS "Users can delete relevant squads" ON squads;
DROP POLICY IF EXISTS "Coaches can view their own squads" ON squads;
DROP POLICY IF EXISTS "Coaches can insert their own squads" ON squads;
DROP POLICY IF EXISTS "Coaches can update their own squads" ON squads;
DROP POLICY IF EXISTS "Coaches can delete their own squads" ON squads;

-- Drop any existing policies with the new names to avoid conflicts
DROP POLICY IF EXISTS "Users can view squads in their organization" ON squads;
DROP POLICY IF EXISTS "Users can insert squads in their organization" ON squads;
DROP POLICY IF EXISTS "Users can update squads in their organization" ON squads;
DROP POLICY IF EXISTS "Users can delete squads in their organization" ON squads;

-- Create simplified policies that work with organization-based access
-- Policy: Users can view squads in their organization
CREATE POLICY "Users can view squads in their organization" ON squads
  FOR SELECT USING (
    -- Superadmins can see all squads
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name = 'superadmin'
    ) OR
    -- Users can see squads in their organization
    (organization_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      JOIN players p ON p.user_id = ur.user_id
      WHERE ur.user_id = auth.uid()
      AND p.organization_id = squads.organization_id
      AND r.name IN ('admin', 'superadmin', 'coach')
    )) OR
    -- Allow access if coach_id matches (for backward compatibility)
    (coach_id IS NOT NULL AND auth.uid() = coach_id)
  );

-- Policy: Users can insert squads in their organization
CREATE POLICY "Users can insert squads in their organization" ON squads
  FOR INSERT WITH CHECK (
    -- Superadmins can create any squads
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name = 'superadmin'
    ) OR
    -- Users can create squads in their organization
    (organization_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      JOIN players p ON p.user_id = ur.user_id
      WHERE ur.user_id = auth.uid()
      AND p.organization_id = squads.organization_id
      AND r.name IN ('admin', 'superadmin', 'coach')
    )) OR
    -- Allow creation if coach_id matches (for backward compatibility)
    (coach_id IS NOT NULL AND auth.uid() = coach_id)
  );

-- Policy: Users can update squads in their organization
CREATE POLICY "Users can update squads in their organization" ON squads
  FOR UPDATE USING (
    -- Superadmins can update any squads
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name = 'superadmin'
    ) OR
    -- Users can update squads in their organization
    (organization_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      JOIN players p ON p.user_id = ur.user_id
      WHERE ur.user_id = auth.uid()
      AND p.organization_id = squads.organization_id
      AND r.name IN ('admin', 'superadmin', 'coach')
    )) OR
    -- Allow update if coach_id matches (for backward compatibility)
    (coach_id IS NOT NULL AND auth.uid() = coach_id)
  );

-- Policy: Users can delete squads in their organization
CREATE POLICY "Users can delete squads in their organization" ON squads
  FOR DELETE USING (
    -- Superadmins can delete any squads
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name = 'superadmin'
    ) OR
    -- Users can delete squads in their organization
    (organization_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      JOIN players p ON p.user_id = ur.user_id
      WHERE ur.user_id = auth.uid()
      AND p.organization_id = squads.organization_id
      AND r.name IN ('admin', 'superadmin', 'coach')
    )) OR
    -- Allow deletion if coach_id matches (for backward compatibility)
    (coach_id IS NOT NULL AND auth.uid() = coach_id)
  );

-- Add a comment to document the changes
COMMENT ON TABLE squads IS 'Squads table - RLS policies updated to use organization-based access with backward compatibility for coach_id. Allows system imports and organization-level management.';
