-- Fix RLS policies for role functions
-- Run this in your Supabase SQL Editor

-- First, let's check if the get_user_roles_safe function exists and has proper permissions
SELECT 'Checking if get_user_roles_safe function exists...' as info;
SELECT 
    routine_name,
    routine_type,
    security_type,
    is_deterministic
FROM information_schema.routines 
WHERE routine_name = 'get_user_roles_safe';

-- Drop and recreate the function with proper permissions
DROP FUNCTION IF EXISTS get_user_roles_safe(UUID) CASCADE;

CREATE OR REPLACE FUNCTION get_user_roles_safe(user_uuid UUID)
RETURNS TEXT[] AS $$
DECLARE
    role_names TEXT[] := ARRAY[]::TEXT[];
    role_record RECORD;
BEGIN
    -- Simple query without complex joins or RLS recursion
    -- This function bypasses RLS by using SECURITY DEFINER
    FOR role_record IN 
        SELECT r.name 
        FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = user_uuid
    LOOP
        role_names := array_append(role_names, role_record.name);
    END LOOP;
    
    RETURN role_names;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_user_roles_safe(UUID) TO authenticated;

-- Also ensure the basic tables have proper RLS policies
-- Check if RLS is enabled on roles table
SELECT 'Checking RLS on roles table...' as info;
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'roles';

-- Check if RLS is enabled on user_roles table
SELECT 'Checking RLS on user_roles table...' as info;
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'user_roles';

-- If RLS is causing issues, we can temporarily disable it for testing
-- ALTER TABLE roles DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY;

-- Or create more permissive policies
DROP POLICY IF EXISTS "Roles are viewable by authenticated users" ON roles;
CREATE POLICY "Roles are viewable by authenticated users" ON roles
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can view their own roles" ON user_roles;
CREATE POLICY "Users can view their own roles" ON user_roles
    FOR SELECT USING (auth.uid() = user_id);

-- Test the function
SELECT 'Testing get_user_roles_safe function...' as info;
SELECT get_user_roles_safe('bf956b83-2c58-4c02-84c0-96d8ca52219a'::UUID) as user_roles;

-- Show current RLS policies
SELECT 'Current RLS policies on roles table:' as info;
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'roles';

SELECT 'Current RLS policies on user_roles table:' as info;
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'user_roles';

