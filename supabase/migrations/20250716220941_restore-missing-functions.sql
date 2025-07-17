-- Restore missing functions that were lost during database reset

-- 1. Create the get_user_roles_safe function
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

-- 2. Create the has_role function
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

-- 3. Grant execute permissions
GRANT EXECUTE ON FUNCTION get_user_roles_safe(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION has_role(TEXT) TO authenticated;

-- 4. Add superadmin role if it doesn't exist
INSERT INTO roles (name, description) VALUES
    ('superadmin', 'Super administrator with full system access')
ON CONFLICT (name) DO NOTHING;
