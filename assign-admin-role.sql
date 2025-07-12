-- Assign admin role to your user
-- Run this in your Supabase SQL editor

-- First, make sure the admin role exists
INSERT INTO roles (name, description) VALUES
    ('admin', 'Full system access and user management')
ON CONFLICT (name) DO NOTHING;

-- Get the admin role ID and assign it to the user
DO $$
DECLARE
    admin_role_id UUID;
    target_user_id UUID := 'f5021231-1b0e-491e-8909-d981016f08b2'::UUID;
BEGIN
    -- Get the admin role ID
    SELECT id INTO admin_role_id FROM roles WHERE name = 'admin';
    
    -- Insert the user-role assignment if it doesn't exist
    INSERT INTO user_roles (user_id, role_id) VALUES
        (target_user_id, admin_role_id)
    ON CONFLICT ON CONSTRAINT user_roles_user_id_role_id_key DO NOTHING;
    
    RAISE NOTICE 'Admin role assigned to user %', target_user_id;
END $$;

-- Verify the assignment
SELECT 
    'User role assignment:' as info,
    ur.user_id,
    r.name as role_name
FROM user_roles ur
JOIN roles r ON ur.role_id = r.id
WHERE ur.user_id = 'f5021231-1b0e-491e-8909-d981016f08b2'::UUID;

-- Test the get_user_roles function
SELECT 'User roles from function:' as info, role_name 
FROM get_user_roles('f5021231-1b0e-491e-8909-d981016f08b2'::UUID); 