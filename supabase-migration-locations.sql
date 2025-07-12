-- Migration: Add Locations table and update Sessions
-- This migration adds a locations table and updates sessions to reference locations

-- Create locations table
CREATE TABLE IF NOT EXISTS locations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_locations_organization_id ON locations(organization_id);
CREATE INDEX IF NOT EXISTS idx_locations_name ON locations(name);

-- Add location_id column to sessions table
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id) ON DELETE SET NULL;

-- Create index for sessions location_id
CREATE INDEX IF NOT EXISTS idx_sessions_location_id ON sessions(location_id);

-- Enable Row Level Security
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for locations
-- Policy for superadmins to see all locations
CREATE POLICY IF NOT EXISTS "Superadmins can view all locations" ON locations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND r.name = 'superadmin'
        )
    );

-- Policy for organization admins and coaches to see locations in their organization
CREATE POLICY IF NOT EXISTS "Organization users can view their locations" ON locations
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND r.name IN ('admin', 'coach')
        )
    );

-- Update sessions RLS policies to include location access
-- Drop existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Superadmins can view all sessions" ON sessions;
DROP POLICY IF EXISTS "Organization users can view their sessions" ON sessions;

-- Recreate sessions policies
CREATE POLICY "Superadmins can view all sessions" ON sessions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND r.name = 'superadmin'
        )
    );

CREATE POLICY "Organization users can view their sessions" ON sessions
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND r.name IN ('admin', 'coach')
        )
    );

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_locations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_locations_updated_at
    BEFORE UPDATE ON locations
    FOR EACH ROW
    EXECUTE FUNCTION update_locations_updated_at();

-- Insert some sample locations for testing (optional)
-- You can remove these if you don't want sample data
INSERT INTO locations (name, description, organization_id) VALUES
    ('Main Arena', 'Primary training facility with full-size rink', (SELECT id FROM organizations LIMIT 1)),
    ('Training Hall', 'Indoor training area for skills practice', (SELECT id FROM organizations LIMIT 1)),
    ('Outdoor Rink', 'Seasonal outdoor facility', (SELECT id FROM organizations LIMIT 1))
ON CONFLICT DO NOTHING; 