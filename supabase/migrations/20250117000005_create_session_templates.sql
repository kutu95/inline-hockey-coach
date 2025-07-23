-- Create Session Templates Migration
-- This creates the session_templates table and related structures

-- 1. Create session_templates table with proper foreign key to auth.users
CREATE TABLE IF NOT EXISTS session_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
  author_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create session_template_blocks table
CREATE TABLE IF NOT EXISTS session_template_blocks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID REFERENCES session_templates(id) ON DELETE CASCADE NOT NULL,
  block_type TEXT NOT NULL CHECK (block_type IN ('text', 'heading', 'drill')),
  content TEXT,
  drill_id UUID REFERENCES drills(id) ON DELETE SET NULL,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create indexes
CREATE INDEX IF NOT EXISTS idx_session_templates_author_id ON session_templates(author_id);
CREATE INDEX IF NOT EXISTS idx_session_templates_organization_id ON session_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_session_templates_created_at ON session_templates(created_at);
CREATE INDEX IF NOT EXISTS idx_session_template_blocks_template_id ON session_template_blocks(template_id);
CREATE INDEX IF NOT EXISTS idx_session_template_blocks_order ON session_template_blocks(template_id, order_index);

-- 4. Enable RLS
ALTER TABLE session_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_template_blocks ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies for session_templates
-- View: All coaches, admins, and superadmins can view templates
CREATE POLICY "Users can view session templates" ON session_templates
  FOR SELECT USING (
    -- Personal templates (no organization)
    (organization_id IS NULL AND author_id = auth.uid())
    OR
    -- Organization templates - visible to all users in the organization
    (organization_id IS NOT NULL AND organization_id = get_user_organization(auth.uid()))
  );

-- Insert: Coaches, admins, and superadmins can create templates
CREATE POLICY "Users can create session templates" ON session_templates
  FOR INSERT WITH CHECK (
    -- Personal templates
    (organization_id IS NULL AND author_id = auth.uid())
    OR
    -- Organization templates
    (organization_id IS NOT NULL AND organization_id = get_user_organization(auth.uid()))
  );

-- Update: Only author or admins/superadmins can edit templates
CREATE POLICY "Users can update session templates" ON session_templates
  FOR UPDATE USING (
    -- Personal templates - only author
    (organization_id IS NULL AND author_id = auth.uid())
    OR
    -- Organization templates - author or admins/superadmins
    (organization_id IS NOT NULL AND (
      author_id = auth.uid()
      OR user_has_any_role(auth.uid(), ARRAY['admin', 'superadmin'])
    ))
  );

-- Delete: Only admins and superadmins can delete templates
CREATE POLICY "Users can delete session templates" ON session_templates
  FOR DELETE USING (
    -- Personal templates - only author (for now, could be changed to admin only)
    (organization_id IS NULL AND author_id = auth.uid())
    OR
    -- Organization templates - only admins and superadmins
    (organization_id IS NOT NULL AND user_has_any_role(auth.uid(), ARRAY['admin', 'superadmin']))
  );

-- 6. Create RLS policies for session_template_blocks
-- View: Same as templates
CREATE POLICY "Users can view session template blocks" ON session_template_blocks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM session_templates st
      WHERE st.id = session_template_blocks.template_id
      AND (
        (st.organization_id IS NULL AND st.author_id = auth.uid())
        OR
        (st.organization_id IS NOT NULL AND st.organization_id = get_user_organization(auth.uid()))
      )
    )
  );

-- Insert: Same as templates
CREATE POLICY "Users can insert session template blocks" ON session_template_blocks
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM session_templates st
      WHERE st.id = session_template_blocks.template_id
      AND (
        (st.organization_id IS NULL AND st.author_id = auth.uid())
        OR
        (st.organization_id IS NOT NULL AND st.organization_id = get_user_organization(auth.uid()))
      )
    )
  );

-- Update: Same as templates
CREATE POLICY "Users can update session template blocks" ON session_template_blocks
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM session_templates st
      WHERE st.id = session_template_blocks.template_id
      AND (
        (st.organization_id IS NULL AND st.author_id = auth.uid())
        OR
        (st.organization_id IS NOT NULL AND (
          st.author_id = auth.uid()
          OR user_has_any_role(auth.uid(), ARRAY['admin', 'superadmin'])
        ))
      )
    )
  );

-- Delete: Same as templates
CREATE POLICY "Users can delete session template blocks" ON session_template_blocks
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM session_templates st
      WHERE st.id = session_template_blocks.template_id
      AND (
        (st.organization_id IS NULL AND st.author_id = auth.uid())
        OR
        (st.organization_id IS NOT NULL AND user_has_any_role(auth.uid(), ARRAY['admin', 'superadmin']))
      )
    )
  );

-- 7. Create triggers for updated_at
CREATE OR REPLACE FUNCTION update_session_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_session_templates_updated_at
  BEFORE UPDATE ON session_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_session_templates_updated_at();

CREATE OR REPLACE FUNCTION update_session_template_blocks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_session_template_blocks_updated_at
  BEFORE UPDATE ON session_template_blocks
  FOR EACH ROW
  EXECUTE FUNCTION update_session_template_blocks_updated_at();

-- 8. Create function to get template with blocks
CREATE OR REPLACE FUNCTION get_template_with_blocks(template_uuid UUID)
RETURNS TABLE (
  template JSON,
  template_blocks JSON
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    to_json(st.*) as template,
    COALESCE(
      (SELECT json_agg(
        json_build_object(
          'id', stb.id,
          'template_id', stb.template_id,
          'block_type', stb.block_type,
          'content', stb.content,
          'drill_id', stb.drill_id,
          'order_index', stb.order_index,
          'created_at', stb.created_at,
          'updated_at', stb.updated_at
        ) ORDER BY stb.order_index
      ) FROM session_template_blocks stb WHERE stb.template_id = template_uuid),
      '[]'::json
    ) as template_blocks
  FROM session_templates st
  WHERE st.id = template_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Create function to save template with blocks
CREATE OR REPLACE FUNCTION save_template_with_blocks(
  template_uuid UUID,
  template_data JSON,
  template_blocks_data JSON
)
RETURNS UUID AS $$
DECLARE
  saved_template_id UUID;
  block_data JSON;
BEGIN
  -- Update or insert template
  IF template_uuid IS NOT NULL THEN
    -- Update existing template
    UPDATE session_templates SET
      title = (template_data->>'title')::TEXT,
      description = (template_data->>'description')::TEXT,
      duration_minutes = (template_data->>'duration_minutes')::INTEGER,
      updated_at = NOW()
    WHERE id = template_uuid;
    
    saved_template_id := template_uuid;
  ELSE
    -- Insert new template
    INSERT INTO session_templates (
      title,
      description,
      duration_minutes,
      author_id,
      organization_id
    ) VALUES (
      (template_data->>'title')::TEXT,
      (template_data->>'description')::TEXT,
      (template_data->>'duration_minutes')::INTEGER,
      (template_data->>'author_id')::UUID,
      CASE 
        WHEN template_data->>'organization_id' IS NOT NULL 
        THEN (template_data->>'organization_id')::UUID 
        ELSE NULL 
      END
    ) RETURNING id INTO saved_template_id;
  END IF;

  -- Delete existing blocks
  DELETE FROM session_template_blocks WHERE template_id = saved_template_id;

  -- Insert new blocks
  FOR block_data IN SELECT * FROM json_array_elements(template_blocks_data)
  LOOP
    INSERT INTO session_template_blocks (
      template_id,
      block_type,
      content,
      drill_id,
      order_index
    ) VALUES (
      saved_template_id,
      (block_data->>'block_type')::TEXT,
      (block_data->>'content')::TEXT,
      CASE 
        WHEN block_data->>'drill_id' IS NOT NULL 
        THEN (block_data->>'drill_id')::UUID 
        ELSE NULL 
      END,
      (block_data->>'order_index')::INTEGER
    );
  END LOOP;

  RETURN saved_template_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 