-- Complete Database Migration for Inline Hockey Coach App
-- Run this entire file in your Supabase SQL Editor

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
-- 2. CLUBS TABLE
-- =====================================================

-- Create clubs table
CREATE TABLE IF NOT EXISTS clubs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    logo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 3. PLAYERS TABLE
-- =====================================================

-- Create players table
CREATE TABLE IF NOT EXISTS players (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    birthdate DATE,
    jersey_number INTEGER,
    photo_url TEXT,
    club_id UUID REFERENCES clubs(id) ON DELETE SET NULL,
    accreditations TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 4. SQUADS TABLE
-- =====================================================

-- Create squads table
CREATE TABLE IF NOT EXISTS squads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    year INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create player_squads junction table
CREATE TABLE IF NOT EXISTS player_squads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    squad_id UUID NOT NULL REFERENCES squads(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(player_id, squad_id)
);

-- =====================================================
-- 5. SESSIONS TABLE
-- =====================================================

-- Create sessions table
CREATE TABLE IF NOT EXISTS sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    session_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    location TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 6. SESSION ATTENDANCE TABLE
-- =====================================================

-- Create session_attendance table
CREATE TABLE IF NOT EXISTS session_attendance (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    attended BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(session_id, player_id)
);

-- =====================================================
-- 7. DRILLS TABLE
-- =====================================================

-- Create drills table
CREATE TABLE IF NOT EXISTS drills (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    difficulty TEXT,
    duration_minutes INTEGER,
    features TEXT[] DEFAULT '{}',
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 8. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE squads ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_squads ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE drills ENABLE ROW LEVEL SECURITY;

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

-- Clubs policies
CREATE POLICY "Clubs are viewable by authenticated users" ON clubs
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Coaches and admins can manage clubs" ON clubs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'coach')
        )
    );

-- Players policies
CREATE POLICY "Players are viewable by authenticated users" ON players
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Coaches and admins can manage players" ON players
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'coach')
        )
    );

-- Squads policies
CREATE POLICY "Squads are viewable by authenticated users" ON squads
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Coaches and admins can manage squads" ON squads
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'coach')
        )
    );

-- Player squads policies
CREATE POLICY "Player squads are viewable by authenticated users" ON player_squads
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Coaches and admins can manage player squads" ON player_squads
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'coach')
        )
    );

-- Sessions policies
CREATE POLICY "Sessions are viewable by authenticated users" ON sessions
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Coaches and admins can manage sessions" ON sessions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'coach')
        )
    );

-- Session attendance policies
CREATE POLICY "Session attendance is viewable by authenticated users" ON session_attendance
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Coaches and admins can manage session attendance" ON session_attendance
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'coach')
        )
    );

-- Drills policies
CREATE POLICY "Drills are viewable by authenticated users" ON drills
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Coaches and admins can manage drills" ON drills
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'coach')
        )
    );

-- =====================================================
-- 9. HELPER FUNCTIONS
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
-- 10. TRIGGERS FOR UPDATED_AT
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_clubs_updated_at BEFORE UPDATE ON clubs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_players_updated_at BEFORE UPDATE ON players
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_squads_updated_at BEFORE UPDATE ON squads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_session_attendance_updated_at BEFORE UPDATE ON session_attendance
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_drills_updated_at BEFORE UPDATE ON drills
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 11. STORAGE BUCKETS SETUP
-- =====================================================

-- Create storage buckets for file uploads
INSERT INTO storage.buckets (id, name, public) VALUES
    ('player-photos', 'player-photos', false),
    ('club-logos', 'club-logos', false),
    ('drill-images', 'drill-images', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for player photos
CREATE POLICY "Player photos are viewable by authenticated users" ON storage.objects
    FOR SELECT USING (bucket_id = 'player-photos' AND auth.role() = 'authenticated');

CREATE POLICY "Coaches and admins can upload player photos" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'player-photos' AND
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'coach')
        )
    );

CREATE POLICY "Coaches and admins can update player photos" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'player-photos' AND
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'coach')
        )
    );

CREATE POLICY "Coaches and admins can delete player photos" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'player-photos' AND
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'coach')
        )
    );

-- Storage policies for club logos
CREATE POLICY "Club logos are viewable by authenticated users" ON storage.objects
    FOR SELECT USING (bucket_id = 'club-logos' AND auth.role() = 'authenticated');

CREATE POLICY "Coaches and admins can upload club logos" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'club-logos' AND
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'coach')
        )
    );

CREATE POLICY "Coaches and admins can update club logos" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'club-logos' AND
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'coach')
        )
    );

CREATE POLICY "Coaches and admins can delete club logos" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'club-logos' AND
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'coach')
        )
    );

-- Storage policies for drill images
CREATE POLICY "Drill images are viewable by authenticated users" ON storage.objects
    FOR SELECT USING (bucket_id = 'drill-images' AND auth.role() = 'authenticated');

CREATE POLICY "Coaches and admins can upload drill images" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'drill-images' AND
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'coach')
        )
    );

CREATE POLICY "Coaches and admins can update drill images" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'drill-images' AND
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'coach')
        )
    );

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
-- 12. INITIAL DATA (OPTIONAL)
-- =====================================================

-- Insert some sample clubs
INSERT INTO clubs (name) VALUES
    ('Hockey Club A'),
    ('Hockey Club B'),
    ('Hockey Club C')
ON CONFLICT DO NOTHING;

-- Insert some sample squads
INSERT INTO squads (name, year) VALUES
    ('U12 Boys', 2024),
    ('U14 Girls', 2024),
    ('U16 Boys', 2024),
    ('Senior Men', 2024)
ON CONFLICT DO NOTHING;

-- Insert some sample drills
INSERT INTO drills (name, description, category, difficulty, duration_minutes, features) VALUES
    ('Passing Practice', 'Basic passing drills for beginners', 'Passing', 'Beginner', 15, ARRAY['Passing', 'Teamwork']),
    ('Shooting Accuracy', 'Improve shooting accuracy and power', 'Shooting', 'Intermediate', 20, ARRAY['Shooting', 'Accuracy']),
    ('Defensive Positioning', 'Learn proper defensive positioning', 'Defense', 'Intermediate', 25, ARRAY['Defense', 'Positioning']),
    ('Goalie Training', 'Specialized goalie training drills', 'Goalie', 'Advanced', 30, ARRAY['Goalie', 'Reflexes'])
ON CONFLICT DO NOTHING;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- To assign admin role to your first user, run this after the migration:
-- 1. Get your user ID from Supabase Dashboard → Authentication → Users
-- 2. Replace 'your-user-id' with your actual user ID
-- INSERT INTO user_roles (user_id, role_id) 
-- SELECT 'your-user-id', id FROM roles WHERE name = 'admin'; 