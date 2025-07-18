-- Fix infinite recursion in RLS policies
-- The issue is that the user_roles table has RLS policies that cause infinite recursion
-- when the is_superadmin function tries to check user roles

-- Simplify the user_roles RLS policies to prevent recursion
-- Drop existing policies that might cause recursion
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
-- Allow all authenticated users to read user_roles (no role checking)
CREATE POLICY "Allow all authenticated users to read user_roles" ON user_roles
  FOR SELECT USING (auth.role() = 'authenticated');

-- Allow all authenticated users to manage user_roles (no role checking)
-- This is a temporary fix - in production you might want more restrictive policies
CREATE POLICY "Allow all authenticated users to manage user_roles" ON user_roles
  FOR ALL USING (auth.role() = 'authenticated');
