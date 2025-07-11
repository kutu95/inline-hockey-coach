-- Role-Based Security Migration for Inline Hockey Coach App
-- Run this in your Supabase SQL Editor to add role-based security

-- =====================================================
-- 1. ROLES AND USER MANAGEMENT
-- =====================================================

-- Create roles table
CREATE TABLE IF NOT EXISTS roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_roles table for many-to-many relationship
CREATE TABLE IF NOT EXISTS user_roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, role_id)
);

-- Insert default roles
INSERT INTO roles (name, description) VALUES
    ('admin', 'Full system access and user management'),
    ('coach', 'Can manage players, sessions, and drills'),
    ('player', 'Read-only access to sessions and drills')
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- 2. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on role tables
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Roles policies
CREATE POLICY "Roles are viewable by authenticated users" ON roles
    FOR SELECT USING (auth.role() = 'authenticated');

-- User roles policies
CREATE POLICY "Users can view their own roles" ON user_roles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all user roles" ON user_roles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.name = 'admin'
        )
    );

-- =====================================================
-- 3. UPDATE EXISTING TABLE POLICIES
-- =====================================================

-- Update clubs policies to include role checks
DROP POLICY IF EXISTS "Clubs are viewable by authenticated users" ON clubs;
CREATE POLICY "Clubs are viewable by authenticated users" ON clubs
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Coaches and admins can manage clubs" ON clubs;
CREATE POLICY "Coaches and admins can manage clubs" ON clubs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'coach')
        )
    );

-- Update players policies
DROP POLICY IF EXISTS "Players are viewable by authenticated users" ON players;
CREATE POLICY "Players are viewable by authenticated users" ON players
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Coaches and admins can manage players" ON players;
CREATE POLICY "Coaches and admins can manage players" ON players
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'coach')
        )
    );

-- Update squads policies
DROP POLICY IF EXISTS "Squads are viewable by authenticated users" ON squads;
CREATE POLICY "Squads are viewable by authenticated users" ON squads
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Coaches and admins can manage squads" ON squads;
CREATE POLICY "Coaches and admins can manage squads" ON squads
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'coach')
        )
    );

-- Update player_squads policies
DROP POLICY IF EXISTS "Player squads are viewable by authenticated users" ON player_squads;
CREATE POLICY "Player squads are viewable by authenticated users" ON player_squads
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Coaches and admins can manage player squads" ON player_squads;
CREATE POLICY "Coaches and admins can manage player squads" ON player_squads
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'coach')
        )
    );

-- Update sessions policies
DROP POLICY IF EXISTS "Sessions are viewable by authenticated users" ON sessions;
CREATE POLICY "Sessions are viewable by authenticated users" ON sessions
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Coaches and admins can manage sessions" ON sessions;
CREATE POLICY "Coaches and admins can manage sessions" ON sessions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'coach')
        )
    );

-- Update session_attendance policies
DROP POLICY IF EXISTS "Session attendance is viewable by authenticated users" ON session_attendance;
CREATE POLICY "Session attendance is viewable by authenticated users" ON session_attendance
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Coaches and admins can manage session attendance" ON session_attendance;
CREATE POLICY "Coaches and admins can manage session attendance" ON session_attendance
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'coach')
        )
    );

-- Update drills policies
DROP POLICY IF EXISTS "Drills are viewable by authenticated users" ON drills;
CREATE POLICY "Drills are viewable by authenticated users" ON drills
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Coaches and admins can manage drills" ON drills;
CREATE POLICY "Coaches and admins can manage drills" ON drills
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'coach')
        )
    );

-- =====================================================
-- 4. HELPER FUNCTIONS
-- =====================================================

-- Function to get user roles
CREATE OR REPLACE FUNCTION get_user_roles(user_uuid UUID)
RETURNS TABLE(role_name TEXT, role_description TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT r.name, r.description
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has a specific role
CREATE OR REPLACE FUNCTION has_role(user_uuid UUID, role_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = user_uuid AND r.name = role_name
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has any of the specified roles
CREATE OR REPLACE FUNCTION has_any_role(user_uuid UUID, role_names TEXT[])
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = user_uuid AND r.name = ANY(role_names)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has all of the specified roles
CREATE OR REPLACE FUNCTION has_all_roles(user_uuid UUID, role_names TEXT[])
RETURNS BOOLEAN AS $$
DECLARE
    required_count INTEGER;
    user_role_count INTEGER;
BEGIN
    required_count := array_length(role_names, 1);
    
    SELECT COUNT(DISTINCT r.name) INTO user_role_count
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = user_uuid AND r.name = ANY(role_names);
    
    RETURN user_role_count = required_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. UPDATE STORAGE POLICIES
-- =====================================================

-- Update storage policies for player photos
DROP POLICY IF EXISTS "Coaches and admins can upload player photos" ON storage.objects;
CREATE POLICY "Coaches and admins can upload player photos" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'player-photos' AND
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'coach')
        )
    );

DROP POLICY IF EXISTS "Coaches and admins can update player photos" ON storage.objects;
CREATE POLICY "Coaches and admins can update player photos" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'player-photos' AND
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'coach')
        )
    );

DROP POLICY IF EXISTS "Coaches and admins can delete player photos" ON storage.objects;
CREATE POLICY "Coaches and admins can delete player photos" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'player-photos' AND
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'coach')
        )
    );

-- Update storage policies for club logos
DROP POLICY IF EXISTS "Coaches and admins can upload club logos" ON storage.objects;
CREATE POLICY "Coaches and admins can upload club logos" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'club-logos' AND
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'coach')
        )
    );

DROP POLICY IF EXISTS "Coaches and admins can update club logos" ON storage.objects;
CREATE POLICY "Coaches and admins can update club logos" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'club-logos' AND
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'coach')
        )
    );

DROP POLICY IF EXISTS "Coaches and admins can delete club logos" ON storage.objects;
CREATE POLICY "Coaches and admins can delete club logos" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'club-logos' AND
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'coach')
        )
    );

-- Update storage policies for drill images
DROP POLICY IF EXISTS "Coaches and admins can upload drill images" ON storage.objects;
CREATE POLICY "Coaches and admins can upload drill images" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'drill-images' AND
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'coach')
        )
    );

DROP POLICY IF EXISTS "Coaches and admins can update drill images" ON storage.objects;
CREATE POLICY "Coaches and admins can update drill images" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'drill-images' AND
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'coach')
        )
    );

DROP POLICY IF EXISTS "Coaches and admins can delete drill images" ON storage.objects;
CREATE POLICY "Coaches and admins can delete drill images" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'drill-images' AND
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'coach')
        )
    );

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- To assign admin role to your first user, run this after the migration:
-- 1. Get your user ID from Supabase Dashboard → Authentication → Users
-- 2. Replace 'your-user-id' with your actual user ID
-- INSERT INTO user_roles (user_id, role_id) 
-- SELECT 'your-user-id', id FROM roles WHERE name = 'admin'; 