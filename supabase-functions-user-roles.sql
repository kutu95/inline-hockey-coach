-- Database functions for user roles (server-side)
-- Run this in your Supabase SQL editor

-- Function to get user roles (server-side)
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

-- Function to check if user has a specific role
CREATE OR REPLACE FUNCTION user_has_role(user_uuid UUID, role_name TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    has_role BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = user_uuid AND r.name = role_name
    ) INTO has_role;
    
    RETURN has_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has any of the specified roles
CREATE OR REPLACE FUNCTION user_has_any_role(user_uuid UUID, role_names TEXT[])
RETURNS BOOLEAN AS $$
DECLARE
    has_any_role BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = user_uuid AND r.name = ANY(role_names)
    ) INTO has_any_role;
    
    RETURN has_any_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has all of the specified roles
CREATE OR REPLACE FUNCTION user_has_all_roles(user_uuid UUID, role_names TEXT[])
RETURNS BOOLEAN AS $$
DECLARE
    user_role_count INTEGER;
    required_role_count INTEGER;
BEGIN
    -- Count how many of the required roles the user has
    SELECT COUNT(*) INTO user_role_count
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = user_uuid AND r.name = ANY(role_names);
    
    -- Count how many roles are required
    SELECT array_length(role_names, 1) INTO required_role_count;
    
    RETURN user_role_count = required_role_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_user_roles(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION user_has_role(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION user_has_any_role(UUID, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION user_has_all_roles(UUID, TEXT[]) TO authenticated; 