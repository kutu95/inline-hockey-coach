-- Fix Superadmin Access for Session Management
-- Run this in your Supabase SQL Editor

-- 1. First, let's check the current user's roles
SELECT 'Current User Roles:' as info;
SELECT 
    ur.user_id,
    r.name as role_name,
    r.description as role_description
FROM user_roles ur
JOIN roles r ON ur.role_id = r.id
WHERE ur.user_id = auth.uid();

-- 2. Check if superadmin role exists, create if it doesn't
INSERT INTO roles (name, description) 
VALUES ('superadmin', 'Can administer all organizations and data')
ON CONFLICT (name) DO NOTHING;

-- 3. Ensure the current user has superadmin role
INSERT INTO user_roles (user_id, role_id)
SELECT 
    auth.uid(),
    r.id
FROM roles r
WHERE r.name = 'superadmin'
AND NOT EXISTS (
    SELECT 1 FROM user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role_id = r.id
);

-- 4. Create a helper function to check if user is superadmin
CREATE OR REPLACE FUNCTION is_superadmin(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = user_uuid 
        AND r.name = 'superadmin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Update the save_session_planning function to allow superadmin access
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
    is_user_superadmin BOOLEAN;
BEGIN
    -- Check if user is superadmin
    SELECT is_superadmin(auth.uid()) INTO is_user_superadmin;
    
    -- Get the user's organization from the players table (for non-superadmin users)
    SELECT p.organization_id INTO user_org_id
    FROM players p
    WHERE p.user_id = auth.uid()
    LIMIT 1;
    
    -- Get the session's organization
    SELECT s.organization_id INTO session_org_id
    FROM sessions s
    WHERE s.id = session_uuid;
    
    RAISE NOTICE 'User is superadmin: %, User org: %, Session org: %', 
        is_user_superadmin, user_org_id, session_org_id;
    
    -- Superadmins can access any session, regular users need organization access
    IF NOT is_user_superadmin THEN
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

    RAISE NOTICE 'Session plan saved successfully for session % by %s', 
        session_uuid, 
        CASE WHEN is_user_superadmin THEN 'superadmin' ELSE 'regular user' END;
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error saving session plan: %', SQLERRM;
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Update the get_session_with_planning function to also allow superadmin access
CREATE OR REPLACE FUNCTION get_session_with_planning(session_uuid UUID)
RETURNS JSON AS $$
DECLARE
    session_data JSON;
    is_user_superadmin BOOLEAN;
BEGIN
    -- Check if user is superadmin
    SELECT is_superadmin(auth.uid()) INTO is_user_superadmin;
    
    -- Superadmins can access any session, regular users need organization access
    IF NOT is_user_superadmin THEN
        IF NOT EXISTS (
            SELECT 1 FROM sessions 
            WHERE id = session_uuid 
            AND organization_id IN (
                SELECT p.organization_id FROM players p
                WHERE p.user_id = auth.uid()
                AND p.organization_id IS NOT NULL
            )
        ) THEN
            RETURN NULL;
        END IF;
    END IF;

    -- Get session data with planning information
    SELECT json_build_object(
        'session', row_to_json(s),
        'notes_blocks', (
            SELECT json_agg(
                json_build_object(
                    'id', snb.id,
                    'block_type', snb.block_type,
                    'content', snb.content,
                    'drill_id', snb.drill_id,
                    'order_index', snb.order_index,
                    'drill', CASE 
                        WHEN snb.drill_id IS NOT NULL THEN
                            json_build_object(
                                'id', d.id,
                                'title', d.title,
                                'description', d.description,
                                'short_description', d.short_description,
                                'min_players', d.min_players,
                                'max_players', d.max_players,
                                'features', d.features,
                                'image_url', d.image_url
                            )
                        ELSE NULL
                    END
                )
                ORDER BY snb.order_index
            )
            FROM session_notes_blocks snb
            LEFT JOIN drills d ON d.id = snb.drill_id
            WHERE snb.session_id = session_uuid
        ),
        'session_drills', (
            SELECT json_agg(
                json_build_object(
                    'id', sd.id,
                    'drill_id', sd.drill_id,
                    'order_index', sd.order_index,
                    'duration_minutes', sd.duration_minutes,
                    'notes', sd.notes,
                    'drill', json_build_object(
                        'id', d.id,
                        'title', d.title,
                        'description', d.description,
                        'short_description', d.short_description,
                        'min_players', d.min_players,
                        'max_players', d.max_players,
                        'features', d.features,
                        'image_url', d.image_url
                    )
                )
                ORDER BY sd.order_index
            )
            FROM session_drills sd
            JOIN drills d ON d.id = sd.drill_id
            WHERE sd.session_id = session_uuid
        )
    ) INTO session_data
    FROM sessions s
    WHERE s.id = session_uuid;

    RETURN session_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Test the updated function
SELECT 'Testing updated function...' as info;
SELECT save_session_planning(
    'ec2737ea-beb2-480b-8037-d405e58225a9'::UUID,
    '[]'::JSON,
    '[]'::JSON
) as test_result;

-- 8. Verify superadmin status
SELECT 'Superadmin Status:' as info;
SELECT 
    auth.uid() as user_id,
    is_superadmin(auth.uid()) as is_superadmin,
    r.name as role_name
FROM user_roles ur
JOIN roles r ON ur.role_id = r.id
WHERE ur.user_id = auth.uid();
