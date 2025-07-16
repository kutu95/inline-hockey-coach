-- Assign contextual roles for john@streamtime.com.au
-- This script assigns the user to their specific organization

-- First, let's find the user ID and their organization
DO $$
DECLARE
    user_uuid UUID;
    org_uuid UUID;
BEGIN
    -- Get user ID
    SELECT id INTO user_uuid FROM auth.users WHERE email = 'john@streamtime.com.au';
    
    -- Get the organization where the user should have access
    -- (You'll need to replace this with the actual organization ID)
    SELECT id INTO org_uuid FROM organizations WHERE name = 'Your Organization Name' LIMIT 1;
    
    -- Check if we found the user and organization
    IF user_uuid IS NULL THEN
        RAISE EXCEPTION 'User john@streamtime.com.au not found';
    END IF;
    
    IF org_uuid IS NULL THEN
        RAISE EXCEPTION 'Organization not found. Please update the organization name in this script.';
    END IF;
    
    -- Update the user's organization
    UPDATE users SET organization_id = org_uuid WHERE id = user_uuid;
    
    RAISE NOTICE 'Assigned user % to organization %', user_uuid, org_uuid;
END $$;

-- Show the user's organization after assignment
SELECT 
    u.email,
    o.name as organization_name
FROM auth.users u
LEFT JOIN organizations o ON u.organization_id = o.id
WHERE u.email = 'john@streamtime.com.au';

-- Also show superadmin role
SELECT 
    u.email,
    'superadmin' as role_name,
    'system-wide' as scope
FROM auth.users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles r ON ur.role_id = r.id
WHERE u.email = 'john@streamtime.com.au' AND r.name = 'superadmin'; 