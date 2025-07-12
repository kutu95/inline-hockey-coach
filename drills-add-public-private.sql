-- Migration to add public/private option to drills
-- This allows drills to be marked as public (visible outside organization) or private (organization only)

-- Add is_public column to drills table (default to false/private)
ALTER TABLE drills ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE;

-- Update existing drills to be private by default
UPDATE drills SET is_public = FALSE WHERE is_public IS NULL;

-- Drop existing RLS policies for drills
DROP POLICY IF EXISTS "Users can view organization drills" ON drills;
DROP POLICY IF EXISTS "Users can insert organization drills" ON drills;
DROP POLICY IF EXISTS "Users can update organization drills" ON drills;
DROP POLICY IF EXISTS "Users can delete organization drills" ON drills;
DROP POLICY IF EXISTS "Superadmins can manage all drills" ON drills;

-- Create new RLS policies for drills with public/private support
-- Users can view drills in their organization, drills they created, or public drills
CREATE POLICY "Users can view organization and public drills" ON drills
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
        )
        OR created_by = auth.uid()
        OR is_public = TRUE
    );

-- Users can insert drills in their organization
CREATE POLICY "Users can insert organization drills" ON drills
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
        )
    );

-- Users can update drills they created or drills in their organization
CREATE POLICY "Users can update organization drills" ON drills
    FOR UPDATE USING (
        organization_id IN (
            SELECT organization_id FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
        )
        OR created_by = auth.uid()
    );

-- Users can delete drills they created or drills in their organization
CREATE POLICY "Users can delete organization drills" ON drills
    FOR DELETE USING (
        organization_id IN (
            SELECT organization_id FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
        )
        OR created_by = auth.uid()
    );

-- Add superadmin policy to manage all drills
CREATE POLICY "Superadmins can manage all drills" ON drills
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.name = 'superadmin'
        )
    ); 