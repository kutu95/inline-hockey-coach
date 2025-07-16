-- Test and fix the get_user_roles function
-- Run this in your Supabase SQL editor

-- First, check if the function exists
SELECT 
    routine_name, 
    routine_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_name = 'get_user_roles';

-- If the function doesn't exist or is broken, create it
DROP FUNCTION IF EXISTS get_user_roles(UUID) CASCADE;

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

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_user_roles(UUID) TO authenticated;

-- Test the function
SELECT 'Testing get_user_roles function...' as info;
SELECT get_user_roles(auth.uid()) as user_roles;

-- Also check what roles exist in the database
SELECT 'Available roles in database:' as info;
SELECT name, description FROM roles;

-- Check if the current user has any roles assigned
SELECT 'Current user roles in user_roles table:' as info;
SELECT ur.id, r.name as role_name, ur.created_at
FROM user_roles ur
JOIN roles r ON ur.role_id = r.id
WHERE ur.user_id = auth.uid(); 