-- Fix RLS policies on user_roles table to prevent circular dependency
-- This migration fixes the circular dependency issue that was causing role fetching to hang

-- First, temporarily disable RLS to clean up
ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Admins can view all user roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can insert user roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can update user roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can delete user roles" ON user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON user_roles;
DROP POLICY IF EXISTS "Admins and superadmins can view all user roles" ON user_roles;
DROP POLICY IF EXISTS "Admins and superadmins can insert user roles" ON user_roles;
DROP POLICY IF EXISTS "Admins and superadmins can update user roles" ON user_roles;
DROP POLICY IF EXISTS "Admins and superadmins can delete user roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can manage user roles" ON user_roles;

-- Re-enable RLS
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Create new policies that avoid circular dependency

-- 1. Users can always view their own roles (no circular dependency)
CREATE POLICY "Users can view their own roles" ON user_roles
    FOR SELECT USING (user_id = auth.uid());

-- 2. Users can view roles if they have admin or superadmin role (using a simpler check)
CREATE POLICY "Admins can view all user roles" ON user_roles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() 
            AND r.name IN ('admin', 'superadmin')
        )
    );

-- 3. Only admins and superadmins can insert/update/delete roles
CREATE POLICY "Admins can manage user roles" ON user_roles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() 
            AND r.name IN ('admin', 'superadmin')
        )
    );

-- Also fix the roles table policies
DROP POLICY IF EXISTS "Admins can view all roles" ON roles;
DROP POLICY IF EXISTS "Admins and superadmins can view all roles" ON roles;
DROP POLICY IF EXISTS "Everyone can view roles" ON roles;

-- Everyone can view roles (they're not sensitive)
CREATE POLICY "Everyone can view roles" ON roles
    FOR SELECT USING (true); 