-- Migration to add missing RPC functions for user role management

-- Function to safely get user roles (with RLS bypass for admins)
CREATE OR REPLACE FUNCTION get_user_roles_safe(user_uuid UUID)
RETURNS TEXT[] AS $$
DECLARE
    user_roles TEXT[];
BEGIN
    -- Check if current user is admin or superadmin
    IF EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND r.name IN ('admin', 'superadmin')
    ) THEN
        -- Admin can see any user's roles
        SELECT ARRAY_AGG(r.name) INTO user_roles
        FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = user_uuid;
    ELSE
        -- Non-admin can only see their own roles
        IF auth.uid() = user_uuid THEN
            SELECT ARRAY_AGG(r.name) INTO user_roles
            FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = user_uuid;
        ELSE
            -- Return empty array for other users
            user_roles := ARRAY[]::TEXT[];
        END IF;
    END IF;
    
    RETURN COALESCE(user_roles, ARRAY[]::TEXT[]);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to assign a role to a user (admin only)
CREATE OR REPLACE FUNCTION assign_user_role(user_uuid UUID, role_name TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    role_id UUID;
BEGIN
    -- Check if current user is admin or superadmin
    IF NOT EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND r.name IN ('admin', 'superadmin')
    ) THEN
        RAISE EXCEPTION 'Insufficient permissions';
    END IF;
    
    -- Get role ID
    SELECT id INTO role_id FROM roles WHERE name = role_name;
    IF role_id IS NULL THEN
        RAISE EXCEPTION 'Role not found: %', role_name;
    END IF;
    
    -- Check if user already has this role
    IF EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = user_uuid AND role_id = role_id
    ) THEN
        RETURN TRUE; -- Already assigned
    END IF;
    
    -- Assign the role
    INSERT INTO user_roles (user_id, role_id)
    VALUES (user_uuid, role_id);
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to assign role: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to remove a role from a user (admin only)
CREATE OR REPLACE FUNCTION remove_user_role(user_uuid UUID, role_name TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    role_id UUID;
BEGIN
    -- Check if current user is admin or superadmin
    IF NOT EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND r.name IN ('admin', 'superadmin')
    ) THEN
        RAISE EXCEPTION 'Insufficient permissions';
    END IF;
    
    -- Get role ID
    SELECT id INTO role_id FROM roles WHERE name = role_name;
    IF role_id IS NULL THEN
        RAISE EXCEPTION 'Role not found: %', role_name;
    END IF;
    
    -- Remove the role
    DELETE FROM user_roles 
    WHERE user_id = user_uuid AND role_id = role_id;
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to remove role: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is superadmin
CREATE OR REPLACE FUNCTION is_superadmin(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = user_uuid
        AND r.name = 'superadmin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions on the functions
GRANT EXECUTE ON FUNCTION get_user_roles_safe(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION assign_user_role(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION remove_user_role(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION is_superadmin(UUID) TO authenticated; 