-- Migration to remove coach_id requirement and add created_by field to drills
-- This allows drills to be created without requiring a coach, but tracks who created them

-- First, drop existing RLS policies for drills
DROP POLICY IF EXISTS "Coaches can view their own drills" ON drills;
DROP POLICY IF EXISTS "Coaches can insert their own drills" ON drills;
DROP POLICY IF EXISTS "Coaches can update their own drills" ON drills;
DROP POLICY IF EXISTS "Coaches can delete their own drills" ON drills;

-- Drop the coach_id column (this will fail if there are existing drills with coach_id)
-- We'll handle this by making it nullable first, then dropping it
ALTER TABLE drills ALTER COLUMN coach_id DROP NOT NULL;
ALTER TABLE drills DROP COLUMN coach_id;

-- Add created_by column to track who created the drill
ALTER TABLE drills ADD COLUMN created_by UUID REFERENCES auth.users(id);

-- Update existing drills to set created_by to the user who created them
-- This assumes the user is currently logged in and has created drills
-- For existing data, we'll set created_by to NULL for now
UPDATE drills SET created_by = NULL WHERE created_by IS NULL;

-- Create new RLS policies for drills
-- Users can view drills in their organization or drills they created
CREATE POLICY "Users can view organization drills" ON drills
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
        )
        OR created_by = auth.uid()
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