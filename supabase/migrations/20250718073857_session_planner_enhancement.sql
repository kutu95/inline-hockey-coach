-- Session Planner Enhancement Migration
-- This migration adds structured session planning with drill integration

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Coaches can view session notes blocks for their sessions" ON session_notes_blocks;
DROP POLICY IF EXISTS "Coaches can insert session notes blocks for their sessions" ON session_notes_blocks;
DROP POLICY IF EXISTS "Coaches can update session notes blocks for their sessions" ON session_notes_blocks;
DROP POLICY IF EXISTS "Coaches can delete session notes blocks for their sessions" ON session_notes_blocks;

DROP POLICY IF EXISTS "Coaches can view session drills for their sessions" ON session_drills;
DROP POLICY IF EXISTS "Coaches can insert session drills for their sessions" ON session_drills;
DROP POLICY IF EXISTS "Coaches can update session drills for their sessions" ON session_drills;
DROP POLICY IF EXISTS "Coaches can delete session drills for their sessions" ON session_drills;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_session_notes_blocks_updated_at ON session_notes_blocks;
DROP TRIGGER IF EXISTS update_session_drills_updated_at ON session_drills;

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS get_session_with_planning(UUID);
DROP FUNCTION IF EXISTS save_session_planning(UUID, JSON, JSON);
DROP FUNCTION IF EXISTS get_session_pdf_data(UUID);
DROP FUNCTION IF EXISTS update_session_notes_blocks_updated_at();
DROP FUNCTION IF EXISTS update_session_drills_updated_at();

-- 1. Add session_notes_blocks table for structured session planning
CREATE TABLE IF NOT EXISTS session_notes_blocks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  block_type TEXT NOT NULL CHECK (block_type IN ('text', 'drill', 'heading', 'list')),
  content TEXT,
  drill_id UUID REFERENCES drills(id) ON DELETE SET NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create session_drills junction table for direct drill references
CREATE TABLE IF NOT EXISTS session_drills (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  drill_id UUID NOT NULL REFERENCES drills(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL DEFAULT 0,
  duration_minutes INTEGER,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(session_id, drill_id)
);

-- 3. Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_session_notes_blocks_session_id ON session_notes_blocks(session_id);
CREATE INDEX IF NOT EXISTS idx_session_notes_blocks_order ON session_notes_blocks(session_id, order_index);
CREATE INDEX IF NOT EXISTS idx_session_drills_session_id ON session_drills(session_id);
CREATE INDEX IF NOT EXISTS idx_session_drills_order ON session_drills(session_id, order_index);

-- 4. Enable RLS for new tables
ALTER TABLE session_notes_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_drills ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies for session_notes_blocks
CREATE POLICY "Coaches can view session notes blocks for their sessions" ON session_notes_blocks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sessions 
      WHERE sessions.id = session_notes_blocks.session_id 
      AND sessions.coach_id = auth.uid()
    )
  );

CREATE POLICY "Coaches can insert session notes blocks for their sessions" ON session_notes_blocks
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM sessions 
      WHERE sessions.id = session_notes_blocks.session_id 
      AND sessions.coach_id = auth.uid()
    )
  );

CREATE POLICY "Coaches can update session notes blocks for their sessions" ON session_notes_blocks
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM sessions 
      WHERE sessions.id = session_notes_blocks.session_id 
      AND sessions.coach_id = auth.uid()
    )
  );

CREATE POLICY "Coaches can delete session notes blocks for their sessions" ON session_notes_blocks
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM sessions 
      WHERE sessions.id = session_notes_blocks.session_id 
      AND sessions.coach_id = auth.uid()
    )
  );

-- 6. Create RLS policies for session_drills
CREATE POLICY "Coaches can view session drills for their sessions" ON session_drills
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sessions 
      WHERE sessions.id = session_drills.session_id 
      AND sessions.coach_id = auth.uid()
    )
  );

CREATE POLICY "Coaches can insert session drills for their sessions" ON session_drills
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM sessions 
      WHERE sessions.id = session_drills.session_id 
      AND sessions.coach_id = auth.uid()
    )
  );

CREATE POLICY "Coaches can update session drills for their sessions" ON session_drills
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM sessions 
      WHERE sessions.id = session_drills.session_id 
      AND sessions.coach_id = auth.uid()
    )
  );

CREATE POLICY "Coaches can delete session drills for their sessions" ON session_drills
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM sessions 
      WHERE sessions.id = session_drills.session_id 
      AND sessions.coach_id = auth.uid()
    )
  );

-- 7. Create triggers for updated_at columns
CREATE OR REPLACE FUNCTION update_session_notes_blocks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_session_notes_blocks_updated_at
    BEFORE UPDATE ON session_notes_blocks
    FOR EACH ROW
    EXECUTE FUNCTION update_session_notes_blocks_updated_at();

CREATE OR REPLACE FUNCTION update_session_drills_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_session_drills_updated_at
    BEFORE UPDATE ON session_drills
    FOR EACH ROW
    EXECUTE FUNCTION update_session_drills_updated_at();

-- 8. Create RPC functions for session planner operations

-- Function to get session with all planning data
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

-- Function to save session planning data
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
    -- Verify the session belongs to the current user
    IF NOT EXISTS (
        SELECT 1 FROM sessions 
        WHERE id = session_uuid AND coach_id = auth.uid()
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

-- Function to generate PDF data for a session
CREATE OR REPLACE FUNCTION get_session_pdf_data(session_uuid UUID)
RETURNS JSON AS $$
DECLARE
    pdf_data JSON;
BEGIN
    -- Verify the session belongs to the current user
    IF NOT EXISTS (
        SELECT 1 FROM sessions 
        WHERE id = session_uuid AND coach_id = auth.uid()
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
