-- Assign contextual roles for john@streamtime.com.au
-- This script assigns the user appropriate roles for their specific organization

-- First, let's find the user ID and their organization
DO $$
DECLARE
    user_uuid UUID;
    org_uuid UUID;
    admin_role_id UUID;
    coach_role_id UUID;
    player_role_id UUID;
BEGIN
    -- Get user ID
    SELECT id INTO user_uuid FROM auth.users WHERE email = 'john@streamtime.com.au';
    
    -- Get the organization where the user should have admin access
    -- (You'll need to replace this with the actual organization ID)
    SELECT id INTO org_uuid FROM organizations WHERE name = 'Your Organization Name' LIMIT 1;
    
    -- Get role IDs
    SELECT id INTO admin_role_id FROM roles WHERE name = 'admin';
    SELECT id INTO coach_role_id FROM roles WHERE name = 'coach';
    SELECT id INTO player_role_id FROM roles WHERE name = 'player';
    
    -- Check if we found the user and organization
    IF user_uuid IS NULL THEN
        RAISE EXCEPTION 'User john@streamtime.com.au not found';
    END IF;
    
    IF org_uuid IS NULL THEN
        RAISE EXCEPTION 'Organization not found. Please update the organization name in this script.';
    END IF;
    
    -- Remove any existing organization roles for this user
    DELETE FROM organization_users WHERE user_id = user_uuid;
    
    -- Assign admin role to the specific organization
    INSERT INTO organization_users (user_id, organization_id, role_id)
    VALUES (user_uuid, org_uuid, admin_role_id);
    
    -- Assign coach role to the specific organization
    INSERT INTO organization_users (user_id, organization_id, role_id)
    VALUES (user_uuid, org_uuid, coach_role_id);
    
    -- Assign player role to the specific organization
    INSERT INTO organization_users (user_id, organization_id, role_id)
    VALUES (user_uuid, org_uuid, player_role_id);
    
    RAISE NOTICE 'Assigned admin, coach, and player roles to user % for organization %', user_uuid, org_uuid;
END $$;

-- Show the user's roles after assignment
SELECT 
    u.email,
    o.name as organization_name,
    r.name as role_name
FROM auth.users u
JOIN organization_users ou ON u.id = ou.user_id
JOIN organizations o ON ou.organization_id = o.id
JOIN roles r ON ou.role_id = r.id
WHERE u.email = 'john@streamtime.com.au'
ORDER BY o.name, r.name;

-- Also show superadmin role
SELECT 
    u.email,
    'superadmin' as role_name,
    'system-wide' as scope
FROM auth.users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles r ON ur.role_id = r.id
WHERE u.email = 'john@streamtime.com.au' AND r.name = 'superadmin'; 