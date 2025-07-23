-- Fix session templates RLS policies to be simpler and more reliable

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view session templates" ON session_templates;
DROP POLICY IF EXISTS "Users can create session templates" ON session_templates;
DROP POLICY IF EXISTS "Users can update session templates" ON session_templates;
DROP POLICY IF EXISTS "Users can delete session templates" ON session_templates;

DROP POLICY IF EXISTS "Users can view session template blocks" ON session_template_blocks;
DROP POLICY IF EXISTS "Users can insert session template blocks" ON session_template_blocks;
DROP POLICY IF EXISTS "Users can update session template blocks" ON session_template_blocks;
DROP POLICY IF EXISTS "Users can delete session template blocks" ON session_template_blocks;

-- Create simpler RLS policies for session_templates
-- View: Author can view their own templates, or users in the same organization
CREATE POLICY "Users can view session templates" ON session_templates
  FOR SELECT USING (
    -- Personal templates (no organization) - only author
    (organization_id IS NULL AND author_id = auth.uid())
    OR
    -- Organization templates - visible to all users in the organization
    (organization_id IS NOT NULL AND organization_id IN (
      SELECT organization_id FROM players WHERE user_id = auth.uid()
    ))
  );

-- Insert: Users can create templates for their organization or personal templates
CREATE POLICY "Users can create session templates" ON session_templates
  FOR INSERT WITH CHECK (
    -- Personal templates
    (organization_id IS NULL AND author_id = auth.uid())
    OR
    -- Organization templates - user must be in the organization
    (organization_id IS NOT NULL AND organization_id IN (
      SELECT organization_id FROM players WHERE user_id = auth.uid()
    ))
  );

-- Update: Author can edit their own templates
CREATE POLICY "Users can update session templates" ON session_templates
  FOR UPDATE USING (
    author_id = auth.uid()
  );

-- Delete: Author can delete their own templates
CREATE POLICY "Users can delete session templates" ON session_templates
  FOR DELETE USING (
    author_id = auth.uid()
  );

-- Create simpler RLS policies for session_template_blocks
-- View: Same as templates
CREATE POLICY "Users can view session template blocks" ON session_template_blocks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM session_templates st
      WHERE st.id = session_template_blocks.template_id
      AND (
        (st.organization_id IS NULL AND st.author_id = auth.uid())
        OR
        (st.organization_id IS NOT NULL AND st.organization_id IN (
          SELECT organization_id FROM players WHERE user_id = auth.uid()
        ))
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
        (st.organization_id IS NOT NULL AND st.organization_id IN (
          SELECT organization_id FROM players WHERE user_id = auth.uid()
        ))
      )
    )
  );

-- Update: Author can edit blocks for their templates
CREATE POLICY "Users can update session template blocks" ON session_template_blocks
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM session_templates st
      WHERE st.id = session_template_blocks.template_id
      AND st.author_id = auth.uid()
    )
  );

-- Delete: Author can delete blocks for their templates
CREATE POLICY "Users can delete session template blocks" ON session_template_blocks
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM session_templates st
      WHERE st.id = session_template_blocks.template_id
      AND st.author_id = auth.uid()
    )
  ); 