-- Remove coach_id field and simplify sessions table
-- This migration removes the confusing coach_id field and simplifies the system to be purely organization-based

-- 1. First, let's see what currently exists
SELECT 'Current sessions table structure:' as info;
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'sessions' 
ORDER BY ordinal_position;

-- 2. Drop ALL existing RLS policies that depend on coach_id FIRST
-- Drop sessions table policies
DROP POLICY IF EXISTS "Sessions - view own" ON sessions;
DROP POLICY IF EXISTS "Sessions - insert own" ON sessions;
DROP POLICY IF EXISTS "Sessions - update own" ON sessions;
DROP POLICY IF EXISTS "Sessions - delete own" ON sessions;
DROP POLICY IF EXISTS "Coaches can view their own sessions" ON sessions;
DROP POLICY IF EXISTS "Coaches can insert their own sessions" ON sessions;
DROP POLICY IF EXISTS "Coaches can update their own sessions" ON sessions;
DROP POLICY IF EXISTS "Coaches can delete their own sessions" ON sessions;
DROP POLICY IF EXISTS "Users can view sessions in their organization" ON sessions;
DROP POLICY IF EXISTS "Users can insert sessions in their organization" ON sessions;
DROP POLICY IF EXISTS "Users can update sessions in their organization" ON sessions;
DROP POLICY IF EXISTS "Users can delete sessions in their organization" ON sessions;

-- Drop session_attendance table policies
DROP POLICY IF EXISTS "Session attendance - view own" ON session_attendance;
DROP POLICY IF EXISTS "Session attendance - insert own" ON session_attendance;
DROP POLICY IF EXISTS "Session attendance - update own" ON session_attendance;
DROP POLICY IF EXISTS "Session attendance - delete own" ON session_attendance;

-- Drop session_squads table policies
DROP POLICY IF EXISTS "Coaches can manage session-squad relationships for their sessions" ON session_squads;
DROP POLICY IF EXISTS "Superadmins can manage session-squad relationships for their organizations" ON session_squads;
DROP POLICY IF EXISTS "Admins can manage session-squad relationships for their organizations" ON session_squads;

-- Drop session_notes_blocks table policies
DROP POLICY IF EXISTS "Coaches can view session notes blocks for their sessions" ON session_notes_blocks;
DROP POLICY IF EXISTS "Coaches can insert session notes blocks for their sessions" ON session_notes_blocks;
DROP POLICY IF EXISTS "Coaches can update session notes blocks for their sessions" ON session_notes_blocks;
DROP POLICY IF EXISTS "Coaches can delete session notes blocks for their sessions" ON session_notes_blocks;
DROP POLICY IF EXISTS "Users can view session notes blocks for their sessions" ON session_notes_blocks;
DROP POLICY IF EXISTS "Users can insert session notes blocks for their sessions" ON session_notes_blocks;
DROP POLICY IF EXISTS "Users can update session notes blocks for their sessions" ON session_notes_blocks;
DROP POLICY IF EXISTS "Users can delete session notes blocks for their sessions" ON session_notes_blocks;
DROP POLICY IF EXISTS "Allow all operations on session notes blocks" ON session_notes_blocks;

-- Drop session_drills table policies
DROP POLICY IF EXISTS "Coaches can view session drills for their sessions" ON session_drills;
DROP POLICY IF EXISTS "Coaches can insert session drills for their sessions" ON session_drills;
DROP POLICY IF EXISTS "Coaches can update session drills for their sessions" ON session_drills;
DROP POLICY IF EXISTS "Coaches can delete session drills for their sessions" ON session_drills;
DROP POLICY IF EXISTS "Users can view session drills for their sessions" ON session_drills;
DROP POLICY IF EXISTS "Users can insert session drills for their sessions" ON session_drills;
DROP POLICY IF EXISTS "Users can update session drills for their sessions" ON session_drills;
DROP POLICY IF EXISTS "Users can delete session drills for their sessions" ON session_drills;
DROP POLICY IF EXISTS "Allow all operations on session drills" ON session_drills;

-- 3. Now we can safely remove the coach_id column
ALTER TABLE sessions DROP COLUMN IF EXISTS coach_id;

-- 4. Drop related indexes
DROP INDEX IF EXISTS idx_sessions_coach_id;

-- 5. Update sessions table to ensure organization_id is required
-- (This assumes you want all sessions to belong to an organization)
ALTER TABLE sessions ALTER COLUMN organization_id SET NOT NULL;

-- 6. Create simplified RLS policies for sessions (organization-based only)
CREATE POLICY "Users can view sessions in their organization" ON sessions
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM user_roles 
      WHERE user_id = auth.uid() 
      AND organization_id IS NOT NULL
    )
  );

CREATE POLICY "Users can insert sessions in their organization" ON sessions
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_roles 
      WHERE user_id = auth.uid() 
      AND organization_id IS NOT NULL
    )
  );

CREATE POLICY "Users can update sessions in their organization" ON sessions
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM user_roles 
      WHERE user_id = auth.uid() 
      AND organization_id IS NOT NULL
    )
  );

CREATE POLICY "Users can delete sessions in their organization" ON sessions
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM user_roles 
      WHERE user_id = auth.uid() 
      AND organization_id IS NOT NULL
    )
  );

-- 7. Create simplified RLS policies for session_attendance (organization-based only)
CREATE POLICY "Users can manage session attendance in their organization" ON session_attendance
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM sessions s
      WHERE s.id = session_attendance.session_id
      AND s.organization_id IN (
        SELECT organization_id FROM user_roles 
        WHERE user_id = auth.uid() 
        AND organization_id IS NOT NULL
      )
    )
  );

-- 8. Create simplified RLS policies for session_squads (organization-based only)
CREATE POLICY "Users can manage session-squad relationships in their organization" ON session_squads
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM sessions s
      WHERE s.id = session_squads.session_id
      AND s.organization_id IN (
        SELECT organization_id FROM user_roles 
        WHERE user_id = auth.uid() 
        AND organization_id IS NOT NULL
      )
    )
  );

-- 9. Create simplified RLS policies for session_notes_blocks (organization-based only)
CREATE POLICY "Users can manage session notes blocks in their organization" ON session_notes_blocks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM sessions s
      WHERE s.id = session_notes_blocks.session_id
      AND s.organization_id IN (
        SELECT organization_id FROM user_roles 
        WHERE user_id = auth.uid() 
        AND organization_id IS NOT NULL
      )
    )
  );

-- 10. Create simplified RLS policies for session_drills (organization-based only)
CREATE POLICY "Users can manage session drills in their organization" ON session_drills
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM sessions s
      WHERE s.id = session_drills.session_id
      AND s.organization_id IN (
        SELECT organization_id FROM user_roles 
        WHERE user_id = auth.uid() 
        AND organization_id IS NOT NULL
      )
    )
  );

-- 11. Update save_session_planning function (remove coach_id check)
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
    -- Verify the session belongs to the user's organization
    IF NOT EXISTS (
        SELECT 1 FROM sessions 
        WHERE id = session_uuid 
        AND organization_id IN (
            SELECT organization_id FROM user_roles 
            WHERE user_id = auth.uid() 
            AND organization_id IS NOT NULL
        )
    ) THEN
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

    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error saving session plan: %', SQLERRM;
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Update get_session_with_planning function (remove coach_id check)
CREATE OR REPLACE FUNCTION get_session_with_planning(session_uuid UUID)
RETURNS JSON AS $$
DECLARE
    session_data JSON;
    notes_blocks JSON;
    session_drills JSON;
BEGIN
    -- Verify the session belongs to the user's organization
    IF NOT EXISTS (
        SELECT 1 FROM sessions 
        WHERE id = session_uuid 
        AND organization_id IN (
            SELECT organization_id FROM user_roles 
            WHERE user_id = auth.uid() 
            AND organization_id IS NOT NULL
        )
    ) THEN
        RETURN NULL;
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

-- 13. Test the updated function
SELECT 'Testing updated function...' as info;
SELECT save_session_planning(
    'ec2737ea-beb2-480b-8037-d405e58225a9'::UUID,
    '[]'::JSON,
    '[]'::JSON
) as test_result;

-- 14. Show final table structure
SELECT 'Final sessions table structure:' as info;
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'sessions' 
ORDER BY ordinal_position;
