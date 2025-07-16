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
    SELECT id INTO org_uuid FROM organizations WHERE name = 'WAILH' LIMIT 1;
    
    -- Check if we found the user and organization
    IF user_uuid IS NULL THEN
        RAISE EXCEPTION 'User john@streamtime.com.au not found';
    END IF;
    
    IF org_uuid IS NULL THEN
        RAISE EXCEPTION 'Organization not found. Please update the organization name in this script.';
    END IF;
    
    -- Link the user to the organization by updating their player record
    UPDATE players 
    SET organization_id = org_uuid
    WHERE email = 'john@streamtime.com.au';
    
    RAISE NOTICE 'Assigned user % to organization %', user_uuid, org_uuid;
END $$;

-- Show the user's organization after assignment
SELECT 
    p.email,
    o.name as organization_name
FROM players p
LEFT JOIN organizations o ON p.organization_id = o.id
WHERE p.email = 'john@streamtime.com.au';

-- Also show superadmin role
SELECT 
    u.email,
    'superadmin' as role_name,
    'system-wide' as scope
FROM auth.users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles r ON ur.role_id = r.id
WHERE u.email = 'john@streamtime.com.au' AND r.name = 'superadmin'; 