-- Fix the save_session_planning function to use the correct organization access check
-- Run this in your Supabase SQL Editor

-- Update the save_session_planning function to check organization access through players table
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
BEGIN
    -- Get the user's organization from the players table
    SELECT p.organization_id INTO user_org_id
    FROM players p
    WHERE p.user_id = auth.uid()
    LIMIT 1;
    
    -- If user has no organization, try to get it from the session's organization
    IF user_org_id IS NULL THEN
        SELECT s.organization_id INTO user_org_id
        FROM sessions s
        WHERE s.id = session_uuid;
    END IF;
    
    -- Verify the session belongs to the user's organization
    IF NOT EXISTS (
        SELECT 1 FROM sessions 
        WHERE id = session_uuid 
        AND organization_id = user_org_id
    ) THEN
        RAISE NOTICE 'Session access denied: session_org=%, user_org=%', 
            (SELECT organization_id FROM sessions WHERE id = session_uuid), 
            user_org_id;
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

-- Test the updated function
SELECT 'Testing updated function...' as info;
SELECT save_session_planning(
    'ec2737ea-beb2-480b-8037-d405e58225a9'::UUID,
    '[]'::JSON,
    '[]'::JSON
) as test_result;

