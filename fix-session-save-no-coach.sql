-- Fix Session Planner Save Functionality (No Coach Check)
-- Run this in your Supabase SQL Editor

-- Update the save_session_planning function to only check organization access
CREATE OR REPLACE FUNCTION save_session_planning(
    session_uuid UUID,
    notes_blocks_data JSON,
    session_drills_data JSON
)
RETURNS BOOLEAN AS $$
DECLARE
    block_data JSON;
    drill_data JSON;
    session_exists BOOLEAN;
BEGIN
    -- Check if session exists and user has organization access
    SELECT EXISTS (
        SELECT 1 FROM sessions 
        WHERE id = session_uuid 
        AND organization_id IN (
            SELECT organization_id FROM user_roles 
            WHERE user_id = auth.uid() 
            AND organization_id IS NOT NULL
        )
    ) INTO session_exists;

    -- If session doesn't exist or user doesn't have access, return FALSE
    IF NOT session_exists THEN
        RAISE NOTICE 'Session access denied for session % and user %', session_uuid, auth.uid();
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
                    WHEN block_data->>'drill_id' IS NOT NULL 
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

    -- Return TRUE to indicate success
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error saving session plan: %', SQLERRM;
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop all existing policies first
DROP POLICY IF EXISTS "Users can view session notes blocks for their sessions" ON session_notes_blocks;
DROP POLICY IF EXISTS "Users can insert session notes blocks for their sessions" ON session_notes_blocks;
DROP POLICY IF EXISTS "Users can update session notes blocks for their sessions" ON session_notes_blocks;
DROP POLICY IF EXISTS "Users can delete session notes blocks for their sessions" ON session_notes_blocks;
DROP POLICY IF EXISTS "Coaches can view session notes blocks for their sessions" ON session_notes_blocks;
DROP POLICY IF EXISTS "Coaches can insert session notes blocks for their sessions" ON session_notes_blocks;
DROP POLICY IF EXISTS "Coaches can update session notes blocks for their sessions" ON session_notes_blocks;
DROP POLICY IF EXISTS "Coaches can delete session notes blocks for their sessions" ON session_notes_blocks;
DROP POLICY IF EXISTS "Allow all operations on session notes blocks" ON session_notes_blocks;

DROP POLICY IF EXISTS "Users can view session drills for their sessions" ON session_drills;
DROP POLICY IF EXISTS "Users can insert session drills for their sessions" ON session_drills;
DROP POLICY IF EXISTS "Users can update session drills for their sessions" ON session_drills;
DROP POLICY IF EXISTS "Users can delete session drills for their sessions" ON session_drills;
DROP POLICY IF EXISTS "Coaches can view session drills for their sessions" ON session_drills;
DROP POLICY IF EXISTS "Coaches can insert session drills for their sessions" ON session_drills;
DROP POLICY IF EXISTS "Coaches can update session drills for their sessions" ON session_drills;
DROP POLICY IF EXISTS "Coaches can delete session drills for their sessions" ON session_drills;
DROP POLICY IF EXISTS "Allow all operations on session drills" ON session_drills;

-- Create simpler policies for testing
CREATE POLICY "Allow all operations on session notes blocks" ON session_notes_blocks
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on session drills" ON session_drills
  FOR ALL USING (true) WITH CHECK (true); 