-- Quick setup for roles system
-- Run this in your Supabase SQL Editor

-- Create roles table if it doesn't exist
CREATE TABLE IF NOT EXISTS roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default roles if they don't exist
INSERT INTO roles (name, description) VALUES
    ('admin', 'Full system access and user management'),
    ('coach', 'Can manage players, sessions, and drills'),
    ('player', 'Read-only access to sessions and drills')
ON CONFLICT (name) DO NOTHING;

-- Create user_roles table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, role_id)
);

-- Enable RLS
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Create basic policies
CREATE POLICY "Roles are viewable by authenticated users" ON roles
    FOR SELECT USING (auth.role() = 'authenticated');

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

-- Assign admin role to the current user (replace with your user ID)
-- Get your user ID from: SELECT id FROM auth.users WHERE email = 'john@streamtime.com.au';
-- Then run: INSERT INTO user_roles (user_id, role_id) SELECT 'your-user-id', id FROM roles WHERE name = 'admin';

-- For now, let's assign admin role to the first user in the system
INSERT INTO user_roles (user_id, role_id)
SELECT 
    (SELECT id FROM auth.users LIMIT 1),
    (SELECT id FROM roles WHERE name = 'admin')
ON CONFLICT (user_id, role_id) DO NOTHING; 