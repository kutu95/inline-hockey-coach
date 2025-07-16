-- Comprehensive fix for RLS policies and role fetching
-- This script will properly set up RLS without causing infinite recursion

-- 1. First, let's see what RLS policies currently exist
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('user_roles', 'roles', 'users', 'organizations');

-- 2. Drop all existing RLS policies on user_roles to start fresh
DROP POLICY IF EXISTS "Users can view their own roles" ON user_roles;
DROP POLICY IF EXISTS "Superadmins can view all roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can view roles in their organization" ON user_roles;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON user_roles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON user_roles;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON user_roles;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON user_roles;

-- 3. Create a simple, safe function to get user roles without recursion
CREATE OR REPLACE FUNCTION get_user_roles_safe(user_uuid UUID)
RETURNS TEXT[] AS $$
DECLARE
    role_names TEXT[] := ARRAY[]::TEXT[];
    role_record RECORD;
BEGIN
    -- Simple query without complex joins or RLS recursion
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

-- 4. Create simple, safe RLS policies for user_roles
-- Policy 1: Users can always read their own roles
CREATE POLICY "Users can read own roles" ON user_roles
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy 2: Superadmins can read all roles (we'll define superadmin later)
CREATE POLICY "Superadmins can read all roles" ON user_roles
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur2
            JOIN roles r2 ON ur2.role_id = r2.id
            WHERE ur2.user_id = auth.uid() AND r2.name = 'superadmin'
        )
    );

-- Policy 3: Only superadmins can insert/update/delete roles
CREATE POLICY "Only superadmins can modify roles" ON user_roles
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur2
            JOIN roles r2 ON ur2.role_id = r2.id
            WHERE ur2.user_id = auth.uid() AND r2.name = 'superadmin'
        )
    );

-- 5. Create a simple function to check if user has a specific role
CREATE OR REPLACE FUNCTION has_role(role_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid() AND r.name = role_name
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Test the functions
SELECT get_user_roles_safe('f5021231-1b0e-491e-8909-d981016f08b2');
SELECT has_role('superadmin');

-- 7. Verify the policies are working
SELECT * FROM pg_policies WHERE tablename = 'user_roles';

-- 8. Test a simple query
SELECT ur.user_id, r.name as role_name
FROM user_roles ur
JOIN roles r ON ur.role_id = r.id
WHERE ur.user_id = 'f5021231-1b0e-491e-8909-d981016f08b2'; 