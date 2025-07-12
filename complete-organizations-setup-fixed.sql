-- Complete Organizations Setup with Multi-Tenancy Support
-- This script sets up organizations, roles, and RLS policies
-- Run this script in your Supabase SQL editor

-- Step 1: Create organizations table
CREATE TABLE IF NOT EXISTS organizations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    logo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Add organization_id to existing tables
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE players ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE squads ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE drills ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

-- Step 3: Create superadmin role
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'superadmin') THEN
        CREATE ROLE superadmin;
    END IF;
END
$$;

-- Step 4: Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Superadmins can manage all organizations" ON organizations;
DROP POLICY IF EXISTS "Users can view their own organization" ON organizations;
DROP POLICY IF EXISTS "Users can view their own organization" ON clubs;
DROP POLICY IF EXISTS "Users can view their own organization" ON players;
DROP POLICY IF EXISTS "Users can view their own organization" ON squads;
DROP POLICY IF EXISTS "Users can view their own organization" ON sessions;
DROP POLICY IF EXISTS "Users can view their own organization" ON drills;
DROP POLICY IF EXISTS "Users can view their own organization" ON attendance;

-- Step 5: Create RLS policies for organizations table
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmins can manage all organizations" ON organizations
    FOR ALL USING (
        auth.role() = 'superadmin'
    );

CREATE POLICY "Users can manage their own organization" ON organizations
    FOR ALL USING (
        id IN (
            SELECT organization_id 
            FROM players 
            WHERE coach_id = auth.uid()
        )
    );

-- Step 6: Update RLS policies for all tables to include organization_id
-- Clubs
ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own organization" ON clubs
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id 
            FROM players 
            WHERE coach_id = auth.uid()
        )
    );

-- Players
ALTER TABLE players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own organization" ON players
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id 
            FROM players 
            WHERE coach_id = auth.uid()
        )
    );

-- Squads
ALTER TABLE squads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own organization" ON squads
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id 
            FROM players 
            WHERE coach_id = auth.uid()
        )
    );

-- Sessions
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own organization" ON sessions
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id 
            FROM players 
            WHERE coach_id = auth.uid()
        )
    );

-- Drills
ALTER TABLE drills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own organization" ON drills
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id 
            FROM players 
            WHERE coach_id = auth.uid()
        )
    );

-- Attendance
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own organization" ON attendance
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id 
            FROM players 
            WHERE coach_id = auth.uid()
        )
    );

-- Step 7: Create a default organization and assign existing data
INSERT INTO organizations (id, name, description) 
VALUES (
    '00000000-0000-0000-0000-000000000001', 
    'Default Organization', 
    'Default organization for existing data'
) ON CONFLICT (id) DO NOTHING;

-- Step 8: Temporarily disable triggers to avoid updated_at conflicts
DO $$
DECLARE
    trigger_record RECORD;
BEGIN
    -- Disable all triggers temporarily
    FOR trigger_record IN 
        SELECT trigger_name, event_object_table 
        FROM information_schema.triggers 
        WHERE trigger_schema = 'public'
    LOOP
        EXECUTE format('ALTER TABLE %I DISABLE TRIGGER %I', 
                      trigger_record.event_object_table, 
                      trigger_record.trigger_name);
    END LOOP;
END $$;

-- Step 9: Assign existing data to the default organization
UPDATE clubs SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE players SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE squads SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE sessions SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE drills SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE attendance SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;

-- Step 10: Re-enable all triggers
DO $$
DECLARE
    trigger_record RECORD;
BEGIN
    -- Re-enable all triggers
    FOR trigger_record IN 
        SELECT trigger_name, event_object_table 
        FROM information_schema.triggers 
        WHERE trigger_schema = 'public'
    LOOP
        EXECUTE format('ALTER TABLE %I ENABLE TRIGGER %I', 
                      trigger_record.event_object_table, 
                      trigger_record.trigger_name);
    END LOOP;
END $$;

-- Step 11: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_clubs_organization_id ON clubs(organization_id);
CREATE INDEX IF NOT EXISTS idx_players_organization_id ON players(organization_id);
CREATE INDEX IF NOT EXISTS idx_squads_organization_id ON squads(organization_id);
CREATE INDEX IF NOT EXISTS idx_sessions_organization_id ON sessions(organization_id);
CREATE INDEX IF NOT EXISTS idx_drills_organization_id ON drills(organization_id);
CREATE INDEX IF NOT EXISTS idx_attendance_organization_id ON attendance(organization_id);

-- Step 12: Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Step 13: Create trigger for organizations table
DROP TRIGGER IF EXISTS update_organizations_updated_at ON organizations;
CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Success message
SELECT 'Organizations setup completed successfully!' as status; 