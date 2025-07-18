-- Fix infinite recursion in RLS policies
-- The issue is that the is_superadmin function calls user_roles table
-- which has RLS policies that cause infinite recursion

-- First, let's make the is_superadmin function bypass RLS
CREATE OR REPLACE FUNCTION is_superadmin(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Use SECURITY DEFINER to bypass RLS
  RETURN EXISTS (
    SELECT 1 
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = user_uuid AND r.name = 'superadmin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Also update the get_user_roles_safe function to be more robust
CREATE OR REPLACE FUNCTION get_user_roles_safe(user_uuid UUID)
RETURNS TEXT[] AS $$
BEGIN
  -- Use SECURITY DEFINER to bypass RLS
  RETURN ARRAY(
    SELECT r.name
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = user_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Simplify the user_roles RLS policies to prevent recursion
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can view all user roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can insert user roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can update user roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can delete user roles" ON user_roles;
DROP POLICY IF EXISTS "Superadmins can manage all user roles" ON user_roles;
DROP POLICY IF EXISTS "Authenticated users can read user_roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can manage user roles" ON user_roles;
DROP POLICY IF EXISTS "Users can read own roles" ON user_roles;
DROP POLICY IF EXISTS "Superadmins can read all roles" ON user_roles;
DROP POLICY IF EXISTS "Only superadmins can modify roles" ON user_roles;
DROP POLICY IF EXISTS "Authenticated users can view all user roles" ON user_roles;
DROP POLICY IF EXISTS "Authenticated users can manage user roles" ON user_roles;
DROP POLICY IF EXISTS "Admins and superadmins can view all user roles" ON user_roles;
DROP POLICY IF EXISTS "Admins and superadmins can insert user roles" ON user_roles;
DROP POLICY IF EXISTS "Admins and superadmins can update user roles" ON user_roles;
DROP POLICY IF EXISTS "Admins and superadmins can delete user roles" ON user_roles;

-- Create simple, non-recursive policies
CREATE POLICY "Allow all authenticated users to read user_roles" ON user_roles
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow superadmins to manage user_roles" ON user_roles
  FOR ALL USING (
    auth.role() = 'authenticated' AND 
    is_superadmin(auth.uid())
  );

-- Update the get_user_organization function to be more robust
CREATE OR REPLACE FUNCTION get_user_organization(user_uuid UUID)
RETURNS UUID AS $$
BEGIN
  -- For admin users, get their organization from the players table
  -- For superadmins, return the first organization
  IF is_superadmin(user_uuid) THEN
    RETURN (
      SELECT id FROM organizations LIMIT 1
    );
  ELSE
    -- Get organization from players table where user is the coach
    RETURN (
      SELECT organization_id 
      FROM players 
      WHERE coach_id = user_uuid 
      LIMIT 1
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 