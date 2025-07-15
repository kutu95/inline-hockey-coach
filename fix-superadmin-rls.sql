-- Fix RLS policies to allow superadmin users to access user_roles table
-- Run this in your Supabase SQL editor

-- First, ensure the superadmin role exists
INSERT INTO roles (name, description) VALUES
    ('superadmin', 'Can administer all organizations')
ON CONFLICT (name) DO NOTHING;

-- Drop existing policies that are too restrictive
DROP POLICY IF EXISTS "Admins can view all user roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can insert user roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can update user roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can delete user roles" ON user_roles;

-- Create new policies that include superadmin
CREATE POLICY "Admins and superadmins can view all user roles" ON user_roles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'superadmin')
        )
    );

CREATE POLICY "Admins and superadmins can insert user roles" ON user_roles
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'superadmin')
        )
    );

CREATE POLICY "Admins and superadmins can update user roles" ON user_roles
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'superadmin')
        )
    );

CREATE POLICY "Admins and superadmins can delete user roles" ON user_roles
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'superadmin')
        )
    );

-- Also update the roles table policies
DROP POLICY IF EXISTS "Admins can view all roles" ON roles;

CREATE POLICY "Admins and superadmins can view all roles" ON roles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'superadmin')
        )
    );

-- Test the policies
SELECT 'Testing RLS policies for superadmin...' as info;
SELECT 'Current user roles:' as info, get_user_roles(auth.uid()) as user_roles; 