-- Assign superadmin role to current user
-- Run this in your Supabase SQL editor

-- First, ensure the superadmin role exists
INSERT INTO roles (name, description) VALUES
    ('superadmin', 'Can administer all organizations')
ON CONFLICT (name) DO NOTHING;

-- Get the superadmin role ID
DO $$
DECLARE
    superadmin_role_id UUID;
    current_user_id UUID;
BEGIN
    -- Get the superadmin role ID
    SELECT id INTO superadmin_role_id FROM roles WHERE name = 'superadmin';
    
    -- Get current user ID
    current_user_id := auth.uid();
    
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
WHERE u.id = auth.uid() AND r.name = 'superadmin';

-- Test the get_user_roles function again
SELECT 'Testing get_user_roles function after assignment...' as info;
SELECT get_user_roles(auth.uid()) as user_roles; 