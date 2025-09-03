-- Debug Session Access Issues
-- Run this in your Supabase SQL Editor to diagnose why session save is failing

-- 1. Check if the session exists and its organization_id
SELECT 'Session Info:' as info;
SELECT 
    id,
    title,
    organization_id,
    created_at
FROM sessions 
WHERE id = 'ec2737ea-beb2-480b-8037-d405e58225a9';

-- 2. Check the current authenticated user
SELECT 'Current User:' as info;
SELECT auth.uid() as current_user_id;

-- 3. Check the structure of user_roles table
SELECT 'User Roles Table Structure:' as info;
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_roles'
ORDER BY ordinal_position;

-- 4. Check user roles for the current user
SELECT 'User Roles:' as info;
SELECT 
    ur.user_id,
    ur.role_id,
    r.name as role_name,
    r.description as role_description
FROM user_roles ur
JOIN roles r ON ur.role_id = r.id
WHERE ur.user_id = auth.uid();

-- 5. Check if there's a get_user_organization function
SELECT 'Available Functions:' as info;
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_name LIKE '%organization%'
AND routine_schema = 'public';

-- 6. Check if the user has any organization access through other means
SELECT 'User Organization Access:' as info;
SELECT 
    'players table' as source,
    organization_id
FROM players 
WHERE user_id = auth.uid()
UNION ALL
SELECT 
    'clubs table' as source,
    organization_id
FROM clubs 
WHERE id IN (
    SELECT club_id FROM players WHERE user_id = auth.uid()
)
UNION ALL
SELECT 
    'squads table' as source,
    organization_id
FROM squads 
WHERE id IN (
    SELECT squad_id FROM player_squads ps
    JOIN players p ON ps.player_id = p.id
    WHERE p.user_id = auth.uid()
);

-- 7. Check the specific organization from the session
SELECT 'Session Organization Details:' as info;
SELECT 
    o.id,
    o.name,
    o.description,
    o.created_at
FROM organizations o
WHERE o.id = (
    SELECT organization_id 
    FROM sessions 
    WHERE id = 'ec2737ea-beb2-480b-8037-d405e58225a9'
);

-- 8. Check if there are any sessions without organization_id
SELECT 'Sessions without organization_id:' as info;
SELECT COUNT(*) as count
FROM sessions 
WHERE organization_id IS NULL;

-- 9. Check if there are any sessions with the specific organization_id
SELECT 'Sessions with organization_id:' as info;
SELECT 
    s.organization_id,
    COUNT(*) as session_count
FROM sessions s
GROUP BY s.organization_id
ORDER BY s.organization_id;

-- 10. Check if there's a get_user_organization function and test it
DO $$
DECLARE
    user_org UUID;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'get_user_organization') THEN
        SELECT get_user_organization(auth.uid()) INTO user_org;
        RAISE NOTICE 'get_user_organization returned: %', user_org;
    ELSE
        RAISE NOTICE 'get_user_organization function does not exist';
    END IF;
END $$;
