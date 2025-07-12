-- Database functions for UserAdmin component
-- These functions bypass RLS issues by using SECURITY DEFINER

-- Function to get all roles (for admin interface)
CREATE OR REPLACE FUNCTION get_all_roles()
RETURNS TABLE(
    id UUID,
    name TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT r.id, r.name, r.description, r.created_at
    FROM roles r
    ORDER BY r.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get all user roles (for admin interface)
CREATE OR REPLACE FUNCTION get_all_user_roles()
RETURNS TABLE(
    user_id UUID,
    role_name TEXT,
    role_description TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT ur.user_id, r.name, r.description
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    ORDER BY ur.user_id, r.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to assign role to user
CREATE OR REPLACE FUNCTION assign_role_to_user(
    target_user_id UUID,
    role_name TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    role_id UUID;
BEGIN
    -- Get the role ID
    SELECT r.id INTO role_id
    FROM roles r
    WHERE r.name = role_name;
    
    IF role_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Insert the role assignment
    INSERT INTO user_roles (user_id, role_id)
    VALUES (target_user_id, role_id)
    ON CONFLICT (user_id, role_id) DO NOTHING;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to remove role from user
CREATE OR REPLACE FUNCTION remove_role_from_user(
    target_user_id UUID,
    role_name TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    role_id UUID;
BEGIN
    -- Get the role ID
    SELECT r.id INTO role_id
    FROM roles r
    WHERE r.name = role_name;
    
    IF role_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Delete the role assignment
    DELETE FROM user_roles
    WHERE user_id = target_user_id AND role_id = role_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_all_roles() TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_user_roles() TO authenticated;
GRANT EXECUTE ON FUNCTION assign_role_to_user(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION remove_role_from_user(UUID, TEXT) TO authenticated;

-- Test the functions
SELECT 'Testing get_all_roles function:' as test;
SELECT * FROM get_all_roles();

SELECT 'Testing get_all_user_roles function:' as test;
SELECT * FROM get_all_user_roles(); 