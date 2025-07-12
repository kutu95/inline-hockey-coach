-- Migration: Add Locations table
-- This migration creates a locations table for organizations

-- Create locations table
CREATE TABLE IF NOT EXISTS locations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_locations_organization_id ON locations(organization_id);
CREATE INDEX IF NOT EXISTS idx_locations_name ON locations(name);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_locations_updated_at 
    BEFORE UPDATE ON locations 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view locations in their organization" ON locations;
DROP POLICY IF EXISTS "Coaches can create locations in their organization" ON locations;
DROP POLICY IF EXISTS "Coaches can update locations in their organization" ON locations;
DROP POLICY IF EXISTS "Coaches can delete locations in their organization" ON locations;
DROP POLICY IF EXISTS "Superadmins can manage all locations" ON locations;

-- Enable RLS
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view locations in their organization" ON locations
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM user_roles 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Coaches can create locations in their organization" ON locations
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM user_roles 
            WHERE user_id = auth.uid() AND role_id IN (
                SELECT id FROM roles WHERE name = 'coach'
            )
        )
    );

CREATE POLICY "Coaches can update locations in their organization" ON locations
    FOR UPDATE USING (
        organization_id IN (
            SELECT organization_id FROM user_roles 
            WHERE user_id = auth.uid() AND role_id IN (
                SELECT id FROM roles WHERE name = 'coach'
            )
        )
    );

CREATE POLICY "Coaches can delete locations in their organization" ON locations
    FOR DELETE USING (
        organization_id IN (
            SELECT organization_id FROM user_roles 
            WHERE user_id = auth.uid() AND role_id IN (
                SELECT id FROM roles WHERE name = 'coach'
            )
        )
    );

CREATE POLICY "Superadmins can manage all locations" ON locations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.name = 'superadmin'
        )
    );

-- Add location_id to sessions table
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id) ON DELETE SET NULL;

-- Create index for location_id in sessions
CREATE INDEX IF NOT EXISTS idx_sessions_location_id ON sessions(location_id);

-- Update sessions RLS policies to include location_id
-- Note: The existing sessions policies should already work with the new location_id column
-- since they filter by organization_id, and locations are also filtered by organization_id 