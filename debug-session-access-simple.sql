-- Simple Session Access Debug
-- Run this in your Supabase SQL Editor

-- 1. Check the specific session
SELECT 'Session Details:' as info;
SELECT 
    id,
    title,
    organization_id,
    created_at
FROM sessions 
WHERE id = 'ec2737ea-beb2-480b-8037-d405e58225a9';

-- 2. Check current user
SELECT 'Current User ID:' as info;
SELECT auth.uid() as user_id;

-- 3. Check if user has access to this organization through players table
SELECT 'User Organization Access (Players):' as info;
SELECT 
    p.organization_id,
    p.first_name,
    p.last_name
FROM players p
WHERE p.user_id = auth.uid();

-- 4. Check if there's a get_user_organization function
SELECT 'get_user_organization function exists:' as info;
SELECT EXISTS (
    SELECT 1 FROM information_schema.routines 
    WHERE routine_name = 'get_user_organization'
) as function_exists;

-- 5. Test the exact access check that's failing in the function
SELECT 'Access Check Test:' as info;
SELECT 
    EXISTS (
        SELECT 1 FROM sessions s
        WHERE s.id = 'ec2737ea-beb2-480b-8037-d405e58225a9'
        AND s.organization_id IN (
            SELECT p.organization_id 
            FROM players p 
            WHERE p.user_id = auth.uid()
            AND p.organization_id IS NOT NULL
        )
    ) as has_access;

-- 6. Check what organizations the user can access
SELECT 'User Accessible Organizations:' as info;
SELECT DISTINCT
    p.organization_id,
    o.name as org_name
FROM players p
JOIN organizations o ON p.organization_id = o.id
WHERE p.user_id = auth.uid();
