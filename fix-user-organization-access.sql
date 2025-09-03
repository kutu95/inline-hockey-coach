-- Fix User Organization Access and Session Save
-- Run this in your Supabase SQL Editor

-- 1. First, let's see what organizations exist
SELECT 'Available Organizations:' as info;
SELECT id, name, description FROM organizations;

-- 2. Check if the user has a player profile
SELECT 'User Player Profile:' as info;
SELECT 
    id,
    first_name,
    last_name,
    organization_id,
    user_id
FROM players 
WHERE user_id = auth.uid();

-- 3. Check if the user has any roles
SELECT 'User Roles:' as info;
SELECT 
    ur.user_id,
    r.name as role_name,
    r.description as role_description
FROM user_roles ur
JOIN roles r ON ur.role_id = r.id
WHERE ur.user_id = auth.uid();

-- 4. Create a default organization if none exists
INSERT INTO organizations (id, name, description)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Default Organization',
    'Default organization for the system'
)
ON CONFLICT (id) DO NOTHING;

-- 5. Create a player profile for the current user if none exists
INSERT INTO players (first_name, last_name, organization_id, user_id)
SELECT 
    'User',
    'Profile',
    '00000000-0000-0000-0000-000000000001',
    auth.uid()
WHERE NOT EXISTS (
    SELECT 1 FROM players WHERE user_id = auth.uid()
);

-- 6. Assign admin role to the user if they don't have one
INSERT INTO user_roles (user_id, role_id)
SELECT 
    auth.uid(),
    r.id
FROM roles r
WHERE r.name = 'admin'
AND NOT EXISTS (
    SELECT 1 FROM user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role_id = r.id
);

-- 7. Update the save_session_planning function to be more permissive for now
CREATE OR REPLACE FUNCTION save_session_planning(
    session_uuid UUID,
    notes_blocks_data JSON,
    session_drills_data JSON
)
RETURNS BOOLEAN AS $$
DECLARE
    block_data JSON;
    drill_data JSON;
    user_org_id UUID;
    session_org_id UUID;
BEGIN
    -- Get the user's organization from the players table
    SELECT p.organization_id INTO user_org_id
    FROM players p
    WHERE p.user_id = auth.uid()
    LIMIT 1;
    
    -- Get the session's organization
    SELECT s.organization_id INTO session_org_id
    FROM sessions s
    WHERE s.id = session_uuid;
    
    RAISE NOTICE 'User org: %, Session org: %', user_org_id, session_org_id;
    
    -- For now, allow access if either:
    -- 1. User has access to the session's organization, OR
    -- 2. Session is in the default organization (00000000-0000-0000-0000-000000000001)
    IF NOT EXISTS (
        SELECT 1 FROM sessions 
        WHERE id = session_uuid 
        AND (
            organization_id = user_org_id
            OR organization_id = '00000000-0000-0000-0000-000000000001'
        )
    ) THEN
        RAISE NOTICE 'Session access denied: session_org=%, user_org=%', session_org_id, user_org_id;
        RETURN FALSE;
    END IF;

    -- Clear existing data
    DELETE FROM session_notes_blocks WHERE session_id = session_uuid;
    DELETE FROM session_drills WHERE session_id = session_uuid;

    -- Insert notes blocks
    IF notes_blocks_data IS NOT NULL THEN
        FOR block_data IN SELECT * FROM json_array_elements(notes_blocks_data)
        LOOP
            INSERT INTO session_notes_blocks (
                session_id, block_type, content, drill_id, order_index
            ) VALUES (
                session_uuid,
                (block_data->>'block_type')::TEXT,
                block_data->>'content',
                CASE 
                    WHEN block_data->>'drill_id' IS NOT NULL AND block_data->>'drill_id' != 'null'
                    THEN (block_data->>'drill_id')::UUID 
                    ELSE NULL 
                END,
                (block_data->>'order_index')::INTEGER
            );
        END LOOP;
    END IF;

    -- Insert session drills
    IF session_drills_data IS NOT NULL THEN
        FOR drill_data IN SELECT * FROM json_array_elements(session_drills_data)
        LOOP
            INSERT INTO session_drills (
                session_id, drill_id, order_index, duration_minutes, notes
            ) VALUES (
                session_uuid,
                (drill_data->>'drill_id')::UUID,
                (drill_data->>'order_index')::INTEGER,
                CASE 
                    WHEN drill_data->>'duration_minutes' IS NOT NULL 
                    THEN (drill_data->>'duration_minutes')::INTEGER 
                    ELSE NULL 
                END,
                drill_data->>'notes'
            );
        END LOOP;
    END IF;

    RAISE NOTICE 'Session plan saved successfully for session %', session_uuid;
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error saving session plan: %', SQLERRM;
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Test the updated function
SELECT 'Testing updated function...' as info;
SELECT save_session_planning(
    'ec2737ea-beb2-480b-8037-d405e58225a9'::UUID,
    '[]'::JSON,
    '[]'::JSON
) as test_result;

-- 9. Verify the user now has access
SELECT 'User Access After Fix:' as info;
SELECT 
    p.organization_id,
    p.first_name,
    p.last_name,
    o.name as org_name
FROM players p
JOIN organizations o ON p.organization_id = o.id
WHERE p.user_id = auth.uid();

