-- Fix Session Planner RLS Policies and RPC Functions
-- Run this in your Supabase SQL Editor to fix the save functionality

-- Drop existing policies
DROP POLICY IF EXISTS "Coaches can view session notes blocks for their sessions" ON session_notes_blocks;
DROP POLICY IF EXISTS "Coaches can insert session notes blocks for their sessions" ON session_notes_blocks;
DROP POLICY IF EXISTS "Coaches can update session notes blocks for their sessions" ON session_notes_blocks;
DROP POLICY IF EXISTS "Coaches can delete session notes blocks for their sessions" ON session_notes_blocks;

DROP POLICY IF EXISTS "Coaches can view session drills for their sessions" ON session_drills;
DROP POLICY IF EXISTS "Coaches can insert session drills for their sessions" ON session_drills;
DROP POLICY IF EXISTS "Coaches can update session drills for their sessions" ON session_drills;
DROP POLICY IF EXISTS "Coaches can delete session drills for their sessions" ON session_drills;

-- Create new RLS policies for session_notes_blocks (supporting both single tenant and organization)
CREATE POLICY "Users can view session notes blocks for their sessions" ON session_notes_blocks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sessions 
      WHERE sessions.id = session_notes_blocks.session_id 
      AND (
        sessions.coach_id = auth.uid() 
        OR 
        (sessions.organization_id IS NOT NULL AND sessions.organization_id IN (
          SELECT organization_id FROM user_roles 
          WHERE user_id = auth.uid() 
          AND organization_id IS NOT NULL
        ))
      )
    )
  );

CREATE POLICY "Users can insert session notes blocks for their sessions" ON session_notes_blocks
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM sessions 
      WHERE sessions.id = session_notes_blocks.session_id 
      AND (
        sessions.coach_id = auth.uid() 
        OR 
        (sessions.organization_id IS NOT NULL AND sessions.organization_id IN (
          SELECT organization_id FROM user_roles 
          WHERE user_id = auth.uid() 
          AND organization_id IS NOT NULL
        ))
      )
    )
  );

CREATE POLICY "Users can update session notes blocks for their sessions" ON session_notes_blocks
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM sessions 
      WHERE sessions.id = session_notes_blocks.session_id 
      AND (
        sessions.coach_id = auth.uid() 
        OR 
        (sessions.organization_id IS NOT NULL AND sessions.organization_id IN (
          SELECT organization_id FROM user_roles 
          WHERE user_id = auth.uid() 
          AND organization_id IS NOT NULL
        ))
      )
    )
  );

CREATE POLICY "Users can delete session notes blocks for their sessions" ON session_notes_blocks
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM sessions 
      WHERE sessions.id = session_notes_blocks.session_id 
      AND (
        sessions.coach_id = auth.uid() 
        OR 
        (sessions.organization_id IS NOT NULL AND sessions.organization_id IN (
          SELECT organization_id FROM user_roles 
          WHERE user_id = auth.uid() 
          AND organization_id IS NOT NULL
        ))
      )
    )
  );

-- Create new RLS policies for session_drills (supporting both single tenant and organization)
CREATE POLICY "Users can view session drills for their sessions" ON session_drills
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sessions 
      WHERE sessions.id = session_drills.session_id 
      AND (
        sessions.coach_id = auth.uid() 
        OR 
        (sessions.organization_id IS NOT NULL AND sessions.organization_id IN (
          SELECT organization_id FROM user_roles 
          WHERE user_id = auth.uid() 
          AND organization_id IS NOT NULL
        ))
      )
    )
  );

CREATE POLICY "Users can insert session drills for their sessions" ON session_drills
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM sessions 
      WHERE sessions.id = session_drills.session_id 
      AND (
        sessions.coach_id = auth.uid() 
        OR 
        (sessions.organization_id IS NOT NULL AND sessions.organization_id IN (
          SELECT organization_id FROM user_roles 
          WHERE user_id = auth.uid() 
          AND organization_id IS NOT NULL
        ))
      )
    )
  );

CREATE POLICY "Users can update session drills for their sessions" ON session_drills
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM sessions 
      WHERE sessions.id = session_drills.session_id 
      AND (
        sessions.coach_id = auth.uid() 
        OR 
        (sessions.organization_id IS NOT NULL AND sessions.organization_id IN (
          SELECT organization_id FROM user_roles 
          WHERE user_id = auth.uid() 
          AND organization_id IS NOT NULL
        ))
      )
    )
  );

CREATE POLICY "Users can delete session drills for their sessions" ON session_drills
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM sessions 
      WHERE sessions.id = session_drills.session_id 
      AND (
        sessions.coach_id = auth.uid() 
        OR 
        (sessions.organization_id IS NOT NULL AND sessions.organization_id IN (
          SELECT organization_id FROM user_roles 
          WHERE user_id = auth.uid() 
          AND organization_id IS NOT NULL
        ))
      )
    )
  );

-- Update the save_session_planning function to support both single tenant and organization
CREATE OR REPLACE FUNCTION save_session_planning(
    session_uuid UUID,
    notes_blocks_data JSON,
    session_drills_data JSON
)
RETURNS BOOLEAN AS $$
DECLARE
    block_data JSON;
    drill_data JSON;
    block_record RECORD;
    drill_record RECORD;
BEGIN
    -- Verify the session belongs to the current user (supporting both single tenant and organization)
    IF NOT EXISTS (
        SELECT 1 FROM sessions 
        WHERE id = session_uuid 
        AND (
            coach_id = auth.uid() 
            OR 
            (organization_id IS NOT NULL AND organization_id IN (
                SELECT organization_id FROM user_roles 
                WHERE user_id = auth.uid() 
                AND organization_id IS NOT NULL
            ))
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

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the get_session_pdf_data function to support both single tenant and organization
CREATE OR REPLACE FUNCTION get_session_pdf_data(session_uuid UUID)
RETURNS JSON AS $$
DECLARE
    pdf_data JSON;
BEGIN
    -- Verify the session belongs to the current user (supporting both single tenant and organization)
    IF NOT EXISTS (
        SELECT 1 FROM sessions 
        WHERE id = session_uuid 
        AND (
            coach_id = auth.uid() 
            OR 
            (organization_id IS NOT NULL AND organization_id IN (
                SELECT organization_id FROM user_roles 
                WHERE user_id = auth.uid() 
                AND organization_id IS NOT NULL
            ))
        )
    ) THEN
        RETURN NULL;
    END IF;

    SELECT json_build_object(
        'session', json_build_object(
            'title', s.title,
            'date', s.date,
            'start_time', s.start_time,
            'duration_minutes', s.duration_minutes,
            'location', s.location,
            'description', s.description
        ),
        'planning_content', (
            SELECT json_agg(
                CASE 
                    WHEN snb.block_type = 'drill' AND snb.drill_id IS NOT NULL THEN
                        json_build_object(
                            'type', 'drill',
                            'content', json_build_object(
                                'title', d.title,
                                'description', d.description,
                                'short_description', d.short_description,
                                'min_players', d.min_players,
                                'max_players', d.max_players,
                                'features', d.features,
                                'image_url', d.image_url,
                                'session_notes', snb.content
                            )
                        )
                    ELSE
                        json_build_object(
                            'type', snb.block_type,
                            'content', snb.content
                        )
                END
                ORDER BY snb.order_index
            )
            FROM session_notes_blocks snb
            LEFT JOIN drills d ON d.id = snb.drill_id
            WHERE snb.session_id = session_uuid
        ),
        'session_drills', (
            SELECT json_agg(
                json_build_object(
                    'drill', json_build_object(
                        'title', d.title,
                        'description', d.description,
                        'short_description', d.short_description,
                        'min_players', d.min_players,
                        'max_players', d.max_players,
                        'features', d.features,
                        'image_url', d.image_url
                    ),
                    'duration_minutes', sd.duration_minutes,
                    'notes', sd.notes,
                    'order_index', sd.order_index
                )
                ORDER BY sd.order_index
            )
            FROM session_drills sd
            JOIN drills d ON d.id = sd.drill_id
            WHERE sd.session_id = session_uuid
        )
    ) INTO pdf_data
    FROM sessions s
    WHERE s.id = session_uuid;

    RETURN pdf_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 