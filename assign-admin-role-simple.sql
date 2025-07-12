-- Simple script to assign admin role to a user
-- Replace 'your-user-id-here' with the actual user ID

-- First, ensure the admin role exists
INSERT INTO roles (name, description) VALUES
    ('admin', 'Full system access and user management')
ON CONFLICT (name) DO NOTHING;

-- Assign admin role to the specified user
INSERT INTO user_roles (user_id, role_id)
SELECT 
    'your-user-id-here'::UUID as user_id,
    r.id as role_id
FROM roles r
WHERE r.name = 'admin'
ON CONFLICT (user_id, role_id) DO NOTHING;

-- Verify the assignment
SELECT 
    'Admin role assignment verification:' as info,
    ur.user_id,
    r.name as role_name,
    ur.created_at
FROM user_roles ur
JOIN roles r ON ur.role_id = r.id
WHERE ur.user_id = 'your-user-id-here'::UUID
AND r.name = 'admin'; 