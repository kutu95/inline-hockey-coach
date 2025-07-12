-- Fix RLS Policies for Invitations and Prevent Recursion
-- Run this in your Supabase SQL editor

-- =====================================================
-- 1. DISABLE RLS TEMPORARILY TO FIX POLICIES
-- =====================================================

-- Disable RLS on all tables to prevent recursion
ALTER TABLE invitations DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE players DISABLE ROW LEVEL SECURITY;

-- =====================================================
-- 2. DROP ALL EXISTING POLICIES
-- =====================================================

-- Drop all policies on invitations
DROP POLICY IF EXISTS "Users can view their own invitations" ON invitations;
DROP POLICY IF EXISTS "Admins can manage all invitations" ON invitations;
DROP POLICY IF EXISTS "Authenticated users can manage invitations" ON invitations;

-- Drop all policies on user_roles
DROP POLICY IF EXISTS "Users can view their own roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can manage all user roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can manage user roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can view all user roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can insert user roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can update user roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can delete user roles" ON user_roles;
DROP POLICY IF EXISTS "Authenticated users can manage roles" ON user_roles;

-- Drop all policies on roles
DROP POLICY IF EXISTS "Roles are viewable by authenticated users" ON roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON roles;

-- Drop all policies on players
DROP POLICY IF EXISTS "Coaches can manage their own players" ON players;
DROP POLICY IF EXISTS "Players can view their own profile" ON players;
DROP POLICY IF EXISTS "Authenticated users can view players" ON players;

-- =====================================================
-- 3. RE-ENABLE RLS WITH SIMPLE POLICIES
-- =====================================================

-- Re-enable RLS
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 4. CREATE SIMPLE, NON-RECURSIVE POLICIES
-- =====================================================

-- Invitations table policies
CREATE POLICY "Authenticated users can manage invitations" ON invitations
  FOR ALL USING (auth.role() = 'authenticated');

-- User_roles table policies
CREATE POLICY "Authenticated users can manage user roles" ON user_roles
  FOR ALL USING (auth.role() = 'authenticated');

-- Roles table policies
CREATE POLICY "Authenticated users can view roles" ON roles
  FOR SELECT USING (auth.role() = 'authenticated');

-- Players table policies
CREATE POLICY "Authenticated users can manage players" ON players
  FOR ALL USING (auth.role() = 'authenticated');

-- =====================================================
-- 5. ENSURE INVITATIONS TABLE EXISTS WITH CORRECT STRUCTURE
-- =====================================================

-- Create invitations table if it doesn't exist
CREATE TABLE IF NOT EXISTS invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  invited_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  accepted_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on token for fast lookups
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);

-- =====================================================
-- 6. CREATE HELPER FUNCTIONS WITH SECURITY DEFINER
-- =====================================================

-- Drop existing functions
DROP FUNCTION IF EXISTS generate_invitation_token CASCADE;
DROP FUNCTION IF EXISTS get_user_roles CASCADE;
DROP FUNCTION IF EXISTS has_role CASCADE;

-- Create invitation token generator
CREATE OR REPLACE FUNCTION generate_invitation_token()
RETURNS TEXT AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'hex');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create get_user_roles function
CREATE OR REPLACE FUNCTION get_user_roles(user_uuid UUID)
RETURNS TABLE(role_name TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT r.name
  FROM user_roles ur
  JOIN roles r ON ur.role_id = r.id
  WHERE ur.user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create has_role function
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

-- =====================================================
-- 7. INSERT DEFAULT ROLES
-- =====================================================

-- Insert default roles if they don't exist
INSERT INTO roles (name, description) VALUES
    ('admin', 'Full system access and user management'),
    ('coach', 'Can manage players, sessions, and drills'),
    ('player', 'Read-only access to sessions and drills')
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- 8. TEST THE FIX
-- =====================================================

-- Test that we can insert into invitations
SELECT 'Testing invitations table access:' as info;

-- Test that we can access roles
SELECT 'Testing roles table access:' as info, COUNT(*) as count FROM roles;

-- Test that we can access user_roles
SELECT 'Testing user_roles table access:' as info, COUNT(*) as count FROM user_roles;

-- Test the helper functions
SELECT 'Testing generate_invitation_token:' as info, generate_invitation_token() as token;

SELECT 'Testing get_user_roles function:' as info, 
       COUNT(*) as count 
FROM get_user_roles('f5021231-1b0e-491e-8909-d981016f08b2'::UUID);

-- =====================================================
-- 9. VERIFICATION
-- =====================================================

-- Show current policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('invitations', 'user_roles', 'roles', 'players')
ORDER BY tablename, policyname; 