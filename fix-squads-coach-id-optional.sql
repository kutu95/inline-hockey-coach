-- Fix squads table coach_id constraint to make it optional
-- This allows squads to be created without requiring a coach
-- This addresses issues that have occurred throughout the app's evolution

-- Make coach_id nullable
ALTER TABLE squads ALTER COLUMN coach_id DROP NOT NULL;

-- Add a comment to document the change
COMMENT ON COLUMN squads.coach_id IS 'Optional reference to the coach/user who manages this squad. Can be NULL for system-created or organization-level squads.';

-- Update RLS policies to handle nullable coach_id
-- Drop existing policies that assume coach_id is always present
DROP POLICY IF EXISTS "Coaches can view their own squads" ON squads;
DROP POLICY IF EXISTS "Coaches can insert their own squads" ON squads;
DROP POLICY IF EXISTS "Coaches can update their own squads" ON squads;
DROP POLICY IF EXISTS "Coaches can delete their own squads" ON squads;

-- Drop any existing policies with the new names to avoid conflicts
DROP POLICY IF EXISTS "Users can view relevant squads" ON squads;
DROP POLICY IF EXISTS "Users can insert relevant squads" ON squads;
DROP POLICY IF EXISTS "Users can update relevant squads" ON squads;
DROP POLICY IF EXISTS "Users can delete relevant squads" ON squads;

-- Create new policies that handle nullable coach_id
-- Policy: Users can view squads they coach OR squads in their organization
CREATE POLICY "Users can view relevant squads" ON squads
  FOR SELECT USING (
    -- Can see squads they coach
    (coach_id IS NOT NULL AND auth.uid() = coach_id) OR
    -- Can see squads in their organization (if user has organization access)
    (organization_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      JOIN players p ON p.user_id = ur.user_id
      WHERE ur.user_id = auth.uid()
      AND p.organization_id = squads.organization_id
      AND r.name IN ('admin', 'superadmin', 'coach')
    )) OR
    -- Superadmins can see all squads
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name = 'superadmin'
    )
  );

-- Policy: Users can insert squads they coach OR in their organization
CREATE POLICY "Users can insert relevant squads" ON squads
  FOR INSERT WITH CHECK (
    -- Can create squads they will coach
    (coach_id IS NOT NULL AND auth.uid() = coach_id) OR
    -- Can create squads in their organization
    (organization_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      JOIN players p ON p.user_id = ur.user_id
      WHERE ur.user_id = auth.uid()
      AND p.organization_id = squads.organization_id
      AND r.name IN ('admin', 'superadmin', 'coach')
    )) OR
    -- Superadmins can create any squads
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name = 'superadmin'
    )
  );

-- Policy: Users can update squads they coach OR in their organization
CREATE POLICY "Users can update relevant squads" ON squads
  FOR UPDATE USING (
    -- Can update squads they coach
    (coach_id IS NOT NULL AND auth.uid() = coach_id) OR
    -- Can update squads in their organization
    (organization_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      JOIN players p ON p.user_id = ur.user_id
      WHERE ur.user_id = auth.uid()
      AND p.organization_id = squads.organization_id
      AND r.name IN ('admin', 'superadmin', 'coach')
    )) OR
    -- Superadmins can update all squads
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name = 'superadmin'
    )
  );

-- Policy: Users can delete squads they coach OR in their organization
CREATE POLICY "Users can delete relevant squads" ON squads
  FOR DELETE USING (
    -- Can delete squads they coach
    (coach_id IS NOT NULL AND auth.uid() = coach_id) OR
    -- Can delete squads in their organization
    (organization_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      JOIN players p ON p.user_id = ur.user_id
      WHERE ur.user_id = auth.uid()
      AND p.organization_id = squads.organization_id
      AND r.name IN ('admin', 'superadmin', 'coach')
    )) OR
    -- Superadmins can delete all squads
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name = 'superadmin'
    )
  );
