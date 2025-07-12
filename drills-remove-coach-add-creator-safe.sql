-- Migration to remove coach_id requirement and add created_by field to drills
-- This allows drills to be created without requiring a coach, but tracks who created them

-- First, drop ALL existing RLS policies for drills to avoid dependency issues
DROP POLICY IF EXISTS "Coaches can view their own drills" ON drills;
DROP POLICY IF EXISTS "Coaches can insert their own drills" ON drills;
DROP POLICY IF EXISTS "Coaches can update their own drills" ON drills;
DROP POLICY IF EXISTS "Coaches can delete their own drills" ON drills;
DROP POLICY IF EXISTS "Drills - view own" ON drills;
DROP POLICY IF EXISTS "Drills - insert own" ON drills;
DROP POLICY IF EXISTS "Drills - update own" ON drills;
DROP POLICY IF EXISTS "Drills - delete own" ON drills;
DROP POLICY IF EXISTS "Users can view organization drills" ON drills;
DROP POLICY IF EXISTS "Users can insert organization drills" ON drills;
DROP POLICY IF EXISTS "Users can update organization drills" ON drills;
DROP POLICY IF EXISTS "Users can delete organization drills" ON drills;
DROP POLICY IF EXISTS "Superadmins can manage all drills" ON drills;

-- Add created_by column to track who created the drill (if it doesn't exist)
ALTER TABLE drills ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Check if coach_id column exists and has data
DO $$
BEGIN
    -- Check if coach_id column exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'drills' AND column_name = 'coach_id'
    ) THEN
        -- Check if there are any non-null coach_id values
        IF EXISTS (SELECT 1 FROM drills WHERE coach_id IS NOT NULL) THEN
            -- Set created_by to coach_id for existing drills before dropping
            UPDATE drills SET created_by = coach_id WHERE created_by IS NULL AND coach_id IS NOT NULL;
        END IF;
        
        -- Make coach_id nullable first
        ALTER TABLE drills ALTER COLUMN coach_id DROP NOT NULL;
        
        -- Drop the coach_id column
        ALTER TABLE drills DROP COLUMN coach_id;
    END IF;
END $$;

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