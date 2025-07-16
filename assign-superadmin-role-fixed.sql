-- Assign superadmin role to specific user
-- Run this in your Supabase SQL editor
-- Replace 'f5021231-1b0e-491e-8909-d981016f08b2' with your actual user ID if different

-- First, ensure the superadmin role exists
INSERT INTO roles (name, description) VALUES
    ('superadmin', 'Can administer all organizations')
ON CONFLICT (name) DO NOTHING;

-- Get the superadmin role ID
DO $$
DECLARE
    superadmin_role_id UUID;
    current_user_id UUID := 'f5021231-1b0e-491e-8909-d981016f08b2'; -- Your user ID from the logs
BEGIN
    -- Get the superadmin role ID
    SELECT id INTO superadmin_role_id FROM roles WHERE name = 'superadmin';
    
    -- Check if user already has superadmin role
    IF NOT EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = current_user_id AND r.name = 'superadmin'
    ) THEN
        -- Assign superadmin role to current user
        INSERT INTO user_roles (user_id, role_id)
        VALUES (current_user_id, superadmin_role_id);
        
        RAISE NOTICE 'Superadmin role assigned to user %', current_user_id;
    ELSE
        RAISE NOTICE 'User % already has superadmin role', current_user_id;
    END IF;
END $$;

-- Verify the assignment
SELECT 'Verifying superadmin role assignment...' as info;
SELECT 
    u.email,
    r.name as role_name,
    ur.created_at
FROM auth.users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles r ON ur.role_id = r.id
WHERE u.id = 'f5021231-1b0e-491e-8909-d981016f08b2' AND r.name = 'superadmin';

-- Test the get_user_roles function with the specific user ID
SELECT 'Testing get_user_roles function after assignment...' as info;
SELECT get_user_roles('f5021231-1b0e-491e-8909-d981016f08b2') as user_roles;

-- Also show all roles for this user
SELECT 'All roles for this user:' as info;
SELECT 
    ur.id,
    r.name as role_name,
    r.description,
    ur.created_at
FROM user_roles ur
JOIN roles r ON ur.role_id = r.id
WHERE ur.user_id = 'f5021231-1b0e-491e-8909-d981016f08b2'; 