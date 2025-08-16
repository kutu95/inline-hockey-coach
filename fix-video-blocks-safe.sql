-- Fix Video Blocks Support - SAFE VERSION
-- This script safely adds video support by checking and fixing existing data first

-- 1. First, let's see what block_type values currently exist
SELECT 'Current block_type values:' as info;
SELECT DISTINCT block_type, COUNT(*) as count
FROM session_notes_blocks 
GROUP BY block_type
ORDER BY block_type;

-- 2. Check if there are any invalid block_type values
SELECT 'Checking for invalid block_type values...' as info;
SELECT id, block_type, content
FROM session_notes_blocks 
WHERE block_type NOT IN ('text', 'drill', 'video');

-- 3. Add video_id column to session_notes_blocks
ALTER TABLE session_notes_blocks 
ADD COLUMN IF NOT EXISTS video_id UUID REFERENCES game_videos(id) ON DELETE SET NULL;

-- 4. Check existing constraints
SELECT 'Existing constraints:' as info;
SELECT conname, pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conrelid = 'session_notes_blocks'::regclass 
AND contype = 'c';

-- 5. Drop existing constraint if it exists
DO $$
DECLARE
    constraint_name text;
BEGIN
    -- Find the existing constraint name
    SELECT conname INTO constraint_name
    FROM pg_constraint 
    WHERE conrelid = 'session_notes_blocks'::regclass 
    AND contype = 'c';
    
    -- If constraint exists, drop it
    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE session_notes_blocks DROP CONSTRAINT ' || quote_ident(constraint_name);
        RAISE NOTICE 'Dropped existing constraint: %', constraint_name;
    END IF;
END $$;

-- 6. Clean up any invalid block_type values by converting them to 'text'
UPDATE session_notes_blocks 
SET block_type = 'text' 
WHERE block_type NOT IN ('text', 'drill', 'video');

-- 7. Now safely add the constraint
ALTER TABLE session_notes_blocks 
ADD CONSTRAINT session_notes_blocks_block_type_check 
CHECK (block_type IN ('text', 'drill', 'video'));

-- 8. Update the get_session_with_planning function to include video data
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
                    'video_id', snb.video_id,
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
                    END,
                    'video', CASE 
                        WHEN snb.video_id IS NOT NULL THEN (
                            SELECT json_build_object(
                                'id', gv.id,
                                'title', gv.title,
                                'description', gv.description,
                                'file_name', gv.file_name,
                                'file_size', gv.file_size,
                                'mime_type', gv.mime_type,
                                'storage_path', gv.storage_path,
                                'duration_seconds', gv.duration_seconds,
                                'created_at', gv.created_at
                            )
                            FROM game_videos gv WHERE gv.id = snb.video_id
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

-- 9. Update the save_session_planning function to handle video blocks
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
    -- Verify the session belongs to the current user (supporting both single tenant and organization)
    IF NOT EXISTS (
        SELECT 1 FROM sessions 
        WHERE id = session_uuid 
        AND (
            created_by = auth.uid() 
            OR organization_id IN (
                SELECT organization_id FROM user_roles 
                WHERE user_id = auth.uid() 
                AND role IN ('admin', 'coach', 'superadmin')
            )
        )
    ) THEN
        RAISE EXCEPTION 'Access denied: You can only edit sessions you created or have permission for';
    END IF;

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
                video_id,
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
                CASE 
                    WHEN block_data->>'video_id' IS NOT NULL 
                    THEN (block_data->>'video_id')::uuid 
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

-- 10. Grant execute permissions
GRANT EXECUTE ON FUNCTION get_session_with_planning(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION save_session_planning(UUID, JSON, JSON) TO authenticated;

-- 11. Verify the changes
SELECT 'Video support added to session_notes_blocks' as status;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'session_notes_blocks' 
AND column_name IN ('video_id', 'block_type')
ORDER BY column_name;

-- 12. Show final constraint
SELECT 'Final constraint:' as info;
SELECT conname, pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conrelid = 'session_notes_blocks'::regclass 
AND contype = 'c';

-- 13. Final verification of block_type values
SELECT 'Final block_type values:' as info;
SELECT DISTINCT block_type, COUNT(*) as count
FROM session_notes_blocks 
GROUP BY block_type
ORDER BY block_type;
