-- Complete Database Functions Setup for Role Management
-- Run this in your Supabase SQL editor to ensure all functions are properly configured

-- First, ensure the roles and user_roles tables exist
CREATE TABLE IF NOT EXISTS roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, role_id)
);

-- Insert default roles if they don't exist
INSERT INTO roles (name, description) VALUES
    ('admin', 'Full system access and user management'),
    ('coach', 'Can manage players, sessions, and drills'),
    ('player', 'Can view sessions and drills')
ON CONFLICT (name) DO NOTHING;

-- Enable RLS on both tables
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Admins can view all roles" ON roles;
DROP POLICY IF EXISTS "Admins can view all user roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can insert user roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can update user roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can delete user roles" ON user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON user_roles;

-- RLS policies for roles table
CREATE POLICY "Admins can view all roles" ON roles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.name = 'admin'
        )
    );

-- RLS policies for user_roles table
CREATE POLICY "Admins can view all user roles" ON user_roles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.name = 'admin'
        )
    );

CREATE POLICY "Admins can insert user roles" ON user_roles
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.name = 'admin'
        )
    );

CREATE POLICY "Admins can update user roles" ON user_roles
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.name = 'admin'
        )
    );

CREATE POLICY "Admins can delete user roles" ON user_roles
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.name = 'admin'
        )
    );

CREATE POLICY "Users can view their own roles" ON user_roles
    FOR SELECT USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_roles_name ON roles(name);

-- Drop existing functions to avoid conflicts
DROP FUNCTION IF EXISTS get_user_roles(UUID) CASCADE;
DROP FUNCTION IF EXISTS user_has_role(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS user_has_any_role(UUID, TEXT[]) CASCADE;
DROP FUNCTION IF EXISTS user_has_all_roles(UUID, TEXT[]) CASCADE;

-- Create the get_user_roles function (returns TEXT array)
CREATE OR REPLACE FUNCTION get_user_roles(user_uuid UUID)
RETURNS TEXT[] AS $$
DECLARE
    role_names TEXT[];
BEGIN
    -- Get role names for the user
    SELECT ARRAY_AGG(r.name) INTO role_names
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = user_uuid;
    
    -- Return empty array if no roles found
    RETURN COALESCE(role_names, ARRAY[]::TEXT[]);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check if user has a specific role
CREATE OR REPLACE FUNCTION user_has_role(user_uuid UUID, role_name TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    has_role BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = user_uuid AND r.name = role_name
    ) INTO has_role;
    
    RETURN has_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check if user has any of the specified roles
CREATE OR REPLACE FUNCTION user_has_any_role(user_uuid UUID, role_names TEXT[])
RETURNS BOOLEAN AS $$
DECLARE
    has_any_role BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = user_uuid AND r.name = ANY(role_names)
    ) INTO has_any_role;
    
    RETURN has_any_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check if user has all of the specified roles
CREATE OR REPLACE FUNCTION user_has_all_roles(user_uuid UUID, role_names TEXT[])
RETURNS BOOLEAN AS $$
DECLARE
    user_role_count INTEGER;
    required_role_count INTEGER;
BEGIN
    -- Count how many of the required roles the user has
    SELECT COUNT(*) INTO user_role_count
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = user_uuid AND r.name = ANY(role_names);
    
    -- Count how many roles are required
    SELECT array_length(role_names, 1) INTO required_role_count;
    
    RETURN user_role_count = required_role_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_user_roles(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION user_has_role(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION user_has_any_role(UUID, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION user_has_all_roles(UUID, TEXT[]) TO authenticated;

-- Test the functions (optional - remove these lines after testing)
-- SELECT 'Testing get_user_roles function:' as info;
-- SELECT get_user_roles(auth.uid()) as user_roles;
-- SELECT user_has_role(auth.uid(), 'admin') as is_admin;
-- SELECT user_has_any_role(auth.uid(), ARRAY['admin', 'coach']) as has_any_role; 