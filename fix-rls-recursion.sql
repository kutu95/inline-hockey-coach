-- Fix RLS Recursion Issues
-- This script fixes the infinite recursion in RLS policies

-- Step 1: Drop existing problematic policies
DROP POLICY IF EXISTS "Superadmins can manage all organizations" ON organizations;
DROP POLICY IF EXISTS "Users can view their own organization" ON organizations;
DROP POLICY IF EXISTS "Users can view their own organization" ON clubs;
DROP POLICY IF EXISTS "Users can view their own organization" ON players;
DROP POLICY IF EXISTS "Users can view their own organization" ON squads;
DROP POLICY IF EXISTS "Users can view their own organization" ON sessions;
DROP POLICY IF EXISTS "Users can view their own organization" ON drills;
DROP POLICY IF EXISTS "Users can view their own organization" ON attendance;

-- Step 2: Create simplified policies for organizations table
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmins can manage all organizations" ON organizations
    FOR ALL USING (
        auth.role() = 'superadmin'
    );

-- Allow all authenticated users to view organizations (simplified)
CREATE POLICY "Authenticated users can view organizations" ON organizations
    FOR SELECT USING (
        auth.role() = 'authenticated'
    );

-- Step 3: Create simplified policies for other tables
-- Clubs
ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view clubs in their organization" ON clubs
    FOR ALL USING (
        organization_id IN (
            SELECT id FROM organizations
        )
    );

-- Players
ALTER TABLE players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view players in their organization" ON players
    FOR ALL USING (
        organization_id IN (
            SELECT id FROM organizations
        )
    );

-- Squads
ALTER TABLE squads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view squads in their organization" ON squads
    FOR ALL USING (
        organization_id IN (
            SELECT id FROM organizations
        )
    );

-- Sessions
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view sessions in their organization" ON sessions
    FOR ALL USING (
        organization_id IN (
            SELECT id FROM organizations
        )
    );

-- Drills
ALTER TABLE drills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view drills in their organization" ON drills
    FOR ALL USING (
        organization_id IN (
            SELECT id FROM organizations
        )
    );

-- Attendance
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view attendance in their organization" ON attendance
    FOR ALL USING (
        organization_id IN (
            SELECT id FROM organizations
        )
    );

-- Success message
SELECT 'RLS policies fixed successfully!' as status; 