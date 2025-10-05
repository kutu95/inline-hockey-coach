-- Remove coach_id field from clubs table
-- This field was never meant to be mandatory and has caused problems throughout the app's evolution

-- Drop coach_id column from clubs table
ALTER TABLE clubs DROP COLUMN IF EXISTS coach_id;

-- Update RLS policies for clubs table to remove coach_id dependencies
-- Drop existing policies that assume coach_id is always present
DROP POLICY IF EXISTS "Coaches can view their own clubs" ON clubs;
DROP POLICY IF EXISTS "Coaches can insert their own clubs" ON clubs;
DROP POLICY IF EXISTS "Coaches can update their own clubs" ON clubs;
DROP POLICY IF EXISTS "Coaches can delete their own clubs" ON clubs;

-- Drop any existing policies with the new names to avoid conflicts
DROP POLICY IF EXISTS "Users can view clubs in their organization" ON clubs;
DROP POLICY IF EXISTS "Users can insert clubs in their organization" ON clubs;
DROP POLICY IF EXISTS "Users can update clubs in their organization" ON clubs;
DROP POLICY IF EXISTS "Users can delete clubs in their organization" ON clubs;

-- Create new policies that handle organization-based access
-- Policy: Users can view clubs in their organization
CREATE POLICY "Users can view clubs in their organization" ON clubs
  FOR SELECT USING (
    -- Can see clubs in their organization
    (organization_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      JOIN players p ON p.user_id = ur.user_id
      WHERE ur.user_id = auth.uid()
      AND p.organization_id = clubs.organization_id
      AND r.name IN ('admin', 'superadmin', 'coach')
    )) OR
    -- Superadmins can see all clubs
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name = 'superadmin'
    )
  );

-- Policy: Users can insert clubs in their organization
CREATE POLICY "Users can insert clubs in their organization" ON clubs
  FOR INSERT WITH CHECK (
    -- Can create clubs in their organization
    (organization_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      JOIN players p ON p.user_id = ur.user_id
      WHERE ur.user_id = auth.uid()
      AND p.organization_id = clubs.organization_id
      AND r.name IN ('admin', 'superadmin', 'coach')
    )) OR
    -- Superadmins can create any clubs
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name = 'superadmin'
    )
  );

-- Policy: Users can update clubs in their organization
CREATE POLICY "Users can update clubs in their organization" ON clubs
  FOR UPDATE USING (
    -- Can update clubs in their organization
    (organization_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      JOIN players p ON p.user_id = ur.user_id
      WHERE ur.user_id = auth.uid()
      AND p.organization_id = clubs.organization_id
      AND r.name IN ('admin', 'superadmin', 'coach')
    )) OR
    -- Superadmins can update all clubs
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name = 'superadmin'
    )
  );

-- Policy: Users can delete clubs in their organization
CREATE POLICY "Users can delete clubs in their organization" ON clubs
  FOR DELETE USING (
    -- Can delete clubs in their organization
    (organization_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      JOIN players p ON p.user_id = ur.user_id
      WHERE ur.user_id = auth.uid()
      AND p.organization_id = clubs.organization_id
      AND r.name IN ('admin', 'superadmin', 'coach')
    )) OR
    -- Superadmins can delete all clubs
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name = 'superadmin'
    )
  );

-- Add a comment to document the change
COMMENT ON TABLE clubs IS 'Clubs table - no longer has coach_id field to avoid mandatory coach constraints that caused problems throughout the app evolution. Access is now based on organization membership.';
