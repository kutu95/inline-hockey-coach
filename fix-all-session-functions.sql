-- Comprehensive fix for all session-related database functions
-- This script removes all complex functions and creates simple, working versions

-- 1. Drop ALL existing session-related functions to ensure clean slate
DROP FUNCTION IF EXISTS save_session_planning(UUID, JSON, JSON);
DROP FUNCTION IF EXISTS save_session_planning(UUID, JSON, JSON, UUID);
DROP FUNCTION IF EXISTS save_session_planning(UUID, JSON, JSON, UUID, UUID);
DROP FUNCTION IF EXISTS get_session_with_planning(UUID);

-- 2. Create the simple, working get_session_with_planning function
CREATE OR REPLACE FUNCTION get_session_with_planning(session_uuid UUID)
RETURNS JSON AS $$
DECLARE
    session_data JSON;
    notes_blocks JSON;
    session_drills_data JSON;
BEGIN
    -- Get session data
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
                        WHEN snb.drill_id IS NOT NULL THEN (
                            SELECT json_build_object(
                                'id', d.id,
                                'title', d.title,
                                'description', d.description,
                                'short_description', d.short_description,
                                'min_players', d.min_players,
                                'max_players', d.max_players,
                                'features', d.features,
                                'image_url', d.image_url
                            )
                            FROM drills d WHERE d.id = snb.drill_id
                        )
                        ELSE NULL
                    END
                )
                ORDER BY snb.order_index
            )
            FROM session_notes_blocks snb
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

-- 3. Create the simple, working save_session_planning function
CREATE OR REPLACE FUNCTION save_session_planning(
    session_uuid UUID,
    notes_blocks_data JSON,
    session_drills_data JSON
)
RETURNS BOOLEAN AS $$
DECLARE
    block_data JSON;
    drill_data JSON;
BEGIN
    -- Clear existing planning data
    DELETE FROM session_notes_blocks WHERE session_id = session_uuid;
    DELETE FROM session_drills WHERE session_id = session_uuid;

    -- Insert new notes blocks
    IF notes_blocks_data IS NOT NULL THEN
        FOR block_data IN SELECT * FROM json_array_elements(notes_blocks_data)
        LOOP
            INSERT INTO session_notes_blocks (
                session_id,
                block_type,
                content,
                drill_id,
                order_index
            ) VALUES (
                session_uuid,
                (block_data->>'block_type')::text,
                block_data->>'content',
                CASE 
                    WHEN block_data->>'drill_id' IS NOT NULL 
                    THEN (block_data->>'drill_id')::uuid 
                    ELSE NULL 
                END,
                (block_data->>'order_index')::integer
            );
        END LOOP;
    END IF;

    -- Insert new session drills
    IF session_drills_data IS NOT NULL THEN
        FOR drill_data IN SELECT * FROM json_array_elements(session_drills_data)
        LOOP
            INSERT INTO session_drills (
                session_id,
                drill_id,
                order_index,
                duration_minutes,
                notes
            ) VALUES (
                session_uuid,
                (drill_data->>'drill_id')::uuid,
                (drill_data->>'order_index')::integer,
                (drill_data->>'duration_minutes')::integer,
                drill_data->>'notes'
            );
        END LOOP;
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Grant execute permissions
GRANT EXECUTE ON FUNCTION get_session_with_planning(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION save_session_planning(UUID, JSON, JSON) TO authenticated;

-- 5. Verify the functions were created
SELECT 'Functions created successfully' as status;
SELECT routine_name, routine_type, data_type
FROM information_schema.routines 
WHERE routine_name IN ('get_session_with_planning', 'save_session_planning')
AND routine_schema = 'public'
ORDER BY routine_name;

-- 6. Test that the functions work
SELECT 'Testing functions...' as test_status;
SELECT get_session_with_planning('00000000-0000-0000-0000-000000000000'::UUID) as get_test;
SELECT save_session_planning(
    '00000000-0000-0000-0000-000000000000'::UUID,
    '[]'::JSON,
    '[]'::JSON
) as save_test;
