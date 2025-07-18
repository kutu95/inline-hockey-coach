-- Migration to add missing RPC functions for user role management

-- Drop existing functions that are safe to drop (no dependencies)
DROP FUNCTION IF EXISTS assign_user_role(TEXT, UUID);
DROP FUNCTION IF EXISTS assign_user_role(UUID, TEXT);
DROP FUNCTION IF EXISTS remove_user_role(TEXT, UUID);
DROP FUNCTION IF EXISTS remove_user_role(UUID, TEXT);
DROP FUNCTION IF EXISTS get_user_roles_safe(UUID);

-- Note: is_superadmin function has dependencies and parameter defaults
-- that cannot be changed with CREATE OR REPLACE, so we'll leave it as is

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

-- Function to assign a role to a user (admin only) - with superadmin protection
CREATE OR REPLACE FUNCTION assign_user_role(role_name TEXT, user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    target_role_id UUID;
    current_user_has_permission BOOLEAN;
    current_user_is_superadmin BOOLEAN;
BEGIN
    -- Check if current user is superadmin
    SELECT EXISTS (
        SELECT 1 
        FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND r.name = 'superadmin'
    ) INTO current_user_is_superadmin;
    
    -- Check if current user is admin or superadmin
    SELECT EXISTS (
        SELECT 1 
        FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND r.name IN ('admin', 'superadmin')
    ) INTO current_user_has_permission;
    
    IF NOT current_user_has_permission THEN
        RAISE EXCEPTION 'Insufficient permissions';
    END IF;
    
    -- Security check: Only superadmins can assign superadmin role
    IF role_name = 'superadmin' AND NOT current_user_is_superadmin THEN
        RAISE EXCEPTION 'Only superadmins can assign the superadmin role';
    END IF;
    
    -- Security check: Users cannot assign roles to themselves (except superadmins)
    IF user_uuid = auth.uid() AND NOT current_user_is_superadmin THEN
        RAISE EXCEPTION 'Users cannot assign roles to themselves';
    END IF;
    
    -- Get role ID from roles table
    SELECT r.id INTO target_role_id 
    FROM roles r 
    WHERE r.name = role_name;
    
    IF target_role_id IS NULL THEN
        RAISE EXCEPTION 'Role not found: %', role_name;
    END IF;
    
    -- Check if user already has this role
    IF EXISTS (
        SELECT 1 
        FROM user_roles ur
        WHERE ur.user_id = user_uuid 
        AND ur.role_id = target_role_id
    ) THEN
        RETURN TRUE; -- Already assigned
    END IF;
    
    -- Assign the role
    INSERT INTO user_roles (user_id, role_id)
    VALUES (user_uuid, target_role_id);
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to assign role: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to remove a role from a user (admin only) - with superadmin protection
CREATE OR REPLACE FUNCTION remove_user_role(role_name TEXT, user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    target_role_id UUID;
    current_user_has_permission BOOLEAN;
    current_user_is_superadmin BOOLEAN;
BEGIN
    -- Check if current user is superadmin
    SELECT EXISTS (
        SELECT 1 
        FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND r.name = 'superadmin'
    ) INTO current_user_is_superadmin;
    
    -- Check if current user is admin or superadmin
    SELECT EXISTS (
        SELECT 1 
        FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND r.name IN ('admin', 'superadmin')
    ) INTO current_user_has_permission;
    
    IF NOT current_user_has_permission THEN
        RAISE EXCEPTION 'Insufficient permissions';
    END IF;
    
    -- Security check: Only superadmins can remove superadmin role
    IF role_name = 'superadmin' AND NOT current_user_is_superadmin THEN
        RAISE EXCEPTION 'Only superadmins can remove the superadmin role';
    END IF;
    
    -- Security check: Users cannot remove roles from themselves (except superadmins)
    IF user_uuid = auth.uid() AND NOT current_user_is_superadmin THEN
        RAISE EXCEPTION 'Users cannot remove roles from themselves';
    END IF;
    
    -- Get role ID from roles table
    SELECT r.id INTO target_role_id 
    FROM roles r 
    WHERE r.name = role_name;
    
    IF target_role_id IS NULL THEN
        RAISE EXCEPTION 'Role not found: %', role_name;
    END IF;
    
    -- Remove the role
    DELETE FROM user_roles ur
    WHERE ur.user_id = user_uuid 
    AND ur.role_id = target_role_id;
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to remove role: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions on the functions
GRANT EXECUTE ON FUNCTION get_user_roles_safe(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION assign_user_role(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION remove_user_role(TEXT, UUID) TO authenticated; 