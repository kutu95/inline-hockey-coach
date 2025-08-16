-- Assign a basic role to a user who is having access issues
-- Run this in your Supabase SQL Editor

-- First, ensure the basic roles exist
INSERT INTO roles (name, description) VALUES
    ('player', 'Basic user access to view sessions and drills'),
    ('coach', 'Can manage players, sessions, and drills'),
    ('admin', 'Full system access and user management')
ON CONFLICT (name) DO NOTHING;

-- Replace 'bf956b83-2c58-4c02-84c0-96d8ca52219a' with the actual user ID from the logs
-- This is the user who is getting "access denied"
DO $$
DECLARE
    player_role_id UUID;
    target_user_id UUID := 'bf956b83-2c58-4c02-84c0-96d8ca52219a'::UUID;
BEGIN
    -- Get the player role ID
    SELECT id INTO player_role_id FROM roles WHERE name = 'player';
    
    -- Check if user already has any role
    IF NOT EXISTS (
        SELECT 1 FROM user_roles ur
        WHERE ur.user_id = target_user_id
    ) THEN
        -- Assign player role to the user
        INSERT INTO user_roles (user_id, role_id)
        VALUES (target_user_id, player_role_id);
        
        RAISE NOTICE 'Player role assigned to user %', target_user_id;
    ELSE
        RAISE NOTICE 'User % already has roles assigned', target_user_id;
    END IF;
END $$;

-- Verify the assignment
SELECT 'Verifying role assignment...' as info;
SELECT 
    u.email,
    r.name as role_name,
    ur.created_at
FROM auth.users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles r ON ur.role_id = r.id
WHERE u.id = 'bf956b83-2c58-4c02-84c0-96d8ca52219a'::UUID;

-- Test the get_user_roles_safe function
SELECT 'Testing get_user_roles_safe function...' as info;
SELECT get_user_roles_safe('bf956b83-2c58-4c02-84c0-96d8ca52219a'::UUID) as user_roles;

-- Show all users and their roles for debugging
SELECT 'All users and their roles:' as info;
SELECT 
    u.email,
    array_agg(r.name) as roles
FROM auth.users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
LEFT JOIN roles r ON ur.role_id = r.id
GROUP BY u.id, u.email
ORDER BY u.email;

