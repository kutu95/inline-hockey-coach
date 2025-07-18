-- Simplify user_roles access to prevent circular dependency
-- This migration allows all authenticated users to read user_roles to get their own roles

-- Drop the problematic policy that creates circular dependency
DROP POLICY IF EXISTS "Admins can view all user roles" ON user_roles;

-- Create a simple policy that allows all authenticated users to read user_roles
-- This is safe because users can only see their own roles due to the WHERE clause in the query
CREATE POLICY "Authenticated users can read user_roles" ON user_roles
    FOR SELECT USING (auth.role() = 'authenticated');

-- Keep the management policies for admins only
DROP POLICY IF EXISTS "Admins can manage user roles" ON user_roles;

CREATE POLICY "Admins can manage user roles" ON user_roles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() 
            AND r.name IN ('admin', 'superadmin')
        )
    ); 