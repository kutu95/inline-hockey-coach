-- Fix RLS Recursion Issues
-- Run this in your Supabase SQL editor to resolve the infinite recursion error

-- First, create helper functions to avoid recursion
CREATE OR REPLACE FUNCTION is_admin_or_superadmin(user_uuid UUID DEFAULT auth.uid())
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = user_uuid AND r.name IN ('admin', 'superadmin')
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_superadmin(user_uuid UUID DEFAULT auth.uid())
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = user_uuid AND r.name = 'superadmin'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Drop all existing policies that might cause recursion
DROP POLICY IF EXISTS "Admins can view all user roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can insert user roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can update user roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can delete user roles" ON user_roles;
DROP POLICY IF EXISTS "Admins and superadmins can view all user roles" ON user_roles;
DROP POLICY IF EXISTS "Admins and superadmins can insert user roles" ON user_roles;
DROP POLICY IF EXISTS "Admins and superadmins can update user roles" ON user_roles;
DROP POLICY IF EXISTS "Admins and superadmins can delete user roles" ON user_roles;

-- Create safe policies for user_roles table
CREATE POLICY "Users can view their own roles" ON user_roles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Superadmins can manage all user roles" ON user_roles
    FOR ALL USING (is_superadmin());

-- Drop and recreate policies for other tables that might reference user_roles
DROP POLICY IF EXISTS "Admins can view all roles" ON roles;
DROP POLICY IF EXISTS "Admins and superadmins can view all roles" ON roles;

CREATE POLICY "Superadmins can view all roles" ON roles
    FOR SELECT USING (is_superadmin());

-- Fix policies for players table (if it exists)
DROP POLICY IF EXISTS "Admins can view all players" ON players;
DROP POLICY IF EXISTS "Admins and superadmins can view all players" ON players;
DROP POLICY IF EXISTS "Superadmins can manage all players" ON players;

CREATE POLICY "Superadmins can manage all players" ON players
    FOR ALL USING (is_superadmin());

-- Fix policies for drills table (if it exists)
DROP POLICY IF EXISTS "Admins can view all drills" ON drills;
DROP POLICY IF EXISTS "Admins and superadmins can view all drills" ON drills;
DROP POLICY IF EXISTS "Superadmins can manage all drills" ON drills;

CREATE POLICY "Superadmins can manage all drills" ON drills
    FOR ALL USING (is_superadmin());

-- Fix policies for organizations table (if it exists)
DROP POLICY IF EXISTS "Admins can view all organizations" ON organizations;
DROP POLICY IF EXISTS "Admins and superadmins can view all organizations" ON organizations;
DROP POLICY IF EXISTS "Superadmins can manage all organizations" ON organizations;

CREATE POLICY "Superadmins can manage all organizations" ON organizations
    FOR ALL USING (is_superadmin());

-- Fix policies for squads table (if it exists)
DROP POLICY IF EXISTS "Admins can view all squads" ON squads;
DROP POLICY IF EXISTS "Admins and superadmins can view all squads" ON squads;
DROP POLICY IF EXISTS "Superadmins can manage all squads" ON squads;

CREATE POLICY "Superadmins can manage all squads" ON squads
    FOR ALL USING (is_superadmin());

-- Fix policies for clubs table (if it exists)
DROP POLICY IF EXISTS "Admins can view all clubs" ON clubs;
DROP POLICY IF EXISTS "Admins and superadmins can view all clubs" ON clubs;
DROP POLICY IF EXISTS "Superadmins can manage all clubs" ON clubs;

CREATE POLICY "Superadmins can manage all clubs" ON clubs
    FOR ALL USING (is_superadmin());

-- Fix policies for sessions table (if it exists)
DROP POLICY IF EXISTS "Admins can view all sessions" ON sessions;
DROP POLICY IF EXISTS "Admins and superadmins can view all sessions" ON sessions;
DROP POLICY IF EXISTS "Superadmins can manage all sessions" ON sessions;

CREATE POLICY "Superadmins can manage all sessions" ON sessions
    FOR ALL USING (is_superadmin());

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION is_admin_or_superadmin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_superadmin(UUID) TO authenticated;

-- Test the functions
SELECT 'Testing helper functions...' as info;
SELECT 'Current user is superadmin:', is_superadmin() as is_superadmin;
SELECT 'Current user is admin or superadmin:', is_admin_or_superadmin() as is_admin_or_superadmin; 