-- =====================================================
-- MATCH MANAGEMENT - MAKE SESSION OPTIONAL
-- =====================================================
-- 
-- This migration makes the session_id field optional in the matches table
-- to support standalone matches that aren't tied to a specific session.
--
-- =====================================================

-- Make session_id optional in matches table
ALTER TABLE matches ALTER COLUMN session_id DROP NOT NULL;

-- Remove the unique constraint on session_id since we can have multiple matches without sessions
ALTER TABLE matches DROP CONSTRAINT IF EXISTS matches_session_id_key;

-- Add a new unique constraint that only applies when session_id is not null
-- This ensures one match per session, but allows multiple standalone matches
CREATE UNIQUE INDEX IF NOT EXISTS matches_session_id_unique 
ON matches (session_id) 
WHERE session_id IS NOT NULL;

-- Add organization_id column if it doesn't exist (for multi-tenant support)
ALTER TABLE matches ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Add index for organization_id for better query performance
CREATE INDEX IF NOT EXISTS idx_matches_organization_id ON matches(organization_id);

-- Update RLS policies to include organization-based access
DROP POLICY IF EXISTS "Users can view matches in their organization" ON matches;
DROP POLICY IF EXISTS "Users can insert matches in their organization" ON matches;
DROP POLICY IF EXISTS "Users can update matches in their organization" ON matches;
DROP POLICY IF EXISTS "Users can delete matches in their organization" ON matches;

-- Create new RLS policies that handle both session-based and organization-based access
CREATE POLICY "Users can view relevant matches" ON matches
FOR SELECT USING (
  auth.role() = 'authenticated' AND (
    -- Superadmin can see all matches
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'superadmin'
    ) OR
    -- Users can see matches in their organization
    organization_id IN (
      SELECT organization_id FROM user_roles 
      WHERE user_id = auth.uid()
    ) OR
    -- Users can see matches for sessions they have access to
    session_id IN (
      SELECT s.id FROM sessions s
      JOIN user_roles ur ON s.organization_id = ur.organization_id
      WHERE ur.user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can insert matches in their organization" ON matches
FOR INSERT WITH CHECK (
  auth.role() = 'authenticated' AND (
    -- Superadmin can create matches anywhere
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'superadmin'
    ) OR
    -- Users can create matches in their organization
    organization_id IN (
      SELECT organization_id FROM user_roles 
      WHERE user_id = auth.uid()
    ) OR
    -- Users can create matches for sessions they have access to
    (session_id IS NOT NULL AND session_id IN (
      SELECT s.id FROM sessions s
      JOIN user_roles ur ON s.organization_id = ur.organization_id
      WHERE ur.user_id = auth.uid()
    ))
  )
);

CREATE POLICY "Users can update matches in their organization" ON matches
FOR UPDATE USING (
  auth.role() = 'authenticated' AND (
    -- Superadmin can update all matches
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'superadmin'
    ) OR
    -- Users can update matches in their organization
    organization_id IN (
      SELECT organization_id FROM user_roles 
      WHERE user_id = auth.uid()
    ) OR
    -- Users can update matches for sessions they have access to
    session_id IN (
      SELECT s.id FROM sessions s
      JOIN user_roles ur ON s.organization_id = ur.organization_id
      WHERE ur.user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can delete matches in their organization" ON matches
FOR DELETE USING (
  auth.role() = 'authenticated' AND (
    -- Superadmin can delete all matches
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'superadmin'
    ) OR
    -- Users can delete matches in their organization
    organization_id IN (
      SELECT organization_id FROM user_roles 
      WHERE user_id = auth.uid()
    ) OR
    -- Users can delete matches for sessions they have access to
    session_id IN (
      SELECT s.id FROM sessions s
      JOIN user_roles ur ON s.organization_id = ur.organization_id
      WHERE ur.user_id = auth.uid()
    )
  )
);

-- Update match_events RLS policies to handle organization-based access
DROP POLICY IF EXISTS "Users can view match events in their organization" ON match_events;
DROP POLICY IF EXISTS "Users can insert match events in their organization" ON match_events;
DROP POLICY IF EXISTS "Users can update match events in their organization" ON match_events;
DROP POLICY IF EXISTS "Users can delete match events in their organization" ON match_events;

CREATE POLICY "Users can view relevant match events" ON match_events
FOR SELECT USING (
  auth.role() = 'authenticated' AND (
    -- Superadmin can see all match events
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'superadmin'
    ) OR
    -- Users can see match events for matches they have access to
    match_id IN (
      SELECT m.id FROM matches m
      WHERE (
        m.organization_id IN (
          SELECT organization_id FROM user_roles 
          WHERE user_id = auth.uid()
        ) OR
        m.session_id IN (
          SELECT s.id FROM sessions s
          JOIN user_roles ur ON s.organization_id = ur.organization_id
          WHERE ur.user_id = auth.uid()
        )
      )
    )
  )
);

CREATE POLICY "Users can insert match events in their organization" ON match_events
FOR INSERT WITH CHECK (
  auth.role() = 'authenticated' AND (
    -- Superadmin can create match events anywhere
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'superadmin'
    ) OR
    -- Users can create match events for matches they have access to
    match_id IN (
      SELECT m.id FROM matches m
      WHERE (
        m.organization_id IN (
          SELECT organization_id FROM user_roles 
          WHERE user_id = auth.uid()
        ) OR
        m.session_id IN (
          SELECT s.id FROM sessions s
          JOIN user_roles ur ON s.organization_id = ur.organization_id
          WHERE ur.user_id = auth.uid()
        )
      )
    )
  )
);

CREATE POLICY "Users can update match events in their organization" ON match_events
FOR UPDATE USING (
  auth.role() = 'authenticated' AND (
    -- Superadmin can update all match events
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'superadmin'
    ) OR
    -- Users can update match events for matches they have access to
    match_id IN (
      SELECT m.id FROM matches m
      WHERE (
        m.organization_id IN (
          SELECT organization_id FROM user_roles 
          WHERE user_id = auth.uid()
        ) OR
        m.session_id IN (
          SELECT s.id FROM sessions s
          JOIN user_roles ur ON s.organization_id = ur.organization_id
          WHERE ur.user_id = auth.uid()
        )
      )
    )
  )
);

CREATE POLICY "Users can delete match events in their organization" ON match_events
FOR DELETE USING (
  auth.role() = 'authenticated' AND (
    -- Superadmin can delete all match events
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'superadmin'
    ) OR
    -- Users can delete match events for matches they have access to
    match_id IN (
      SELECT m.id FROM matches m
      WHERE (
        m.organization_id IN (
          SELECT organization_id FROM user_roles 
          WHERE user_id = auth.uid()
        ) OR
        m.session_id IN (
          SELECT s.id FROM sessions s
          JOIN user_roles ur ON s.organization_id = ur.organization_id
          WHERE ur.user_id = auth.uid()
        )
      )
    )
  )
);

-- Update match_player_status RLS policies to handle organization-based access
DROP POLICY IF EXISTS "Users can view match player status in their organization" ON match_player_status;
DROP POLICY IF EXISTS "Users can insert match player status in their organization" ON match_player_status;
DROP POLICY IF EXISTS "Users can update match player status in their organization" ON match_player_status;
DROP POLICY IF EXISTS "Users can delete match player status in their organization" ON match_player_status;

CREATE POLICY "Users can view relevant match player status" ON match_player_status
FOR SELECT USING (
  auth.role() = 'authenticated' AND (
    -- Superadmin can see all match player status
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'superadmin'
    ) OR
    -- Users can see match player status for matches they have access to
    match_id IN (
      SELECT m.id FROM matches m
      WHERE (
        m.organization_id IN (
          SELECT organization_id FROM user_roles 
          WHERE user_id = auth.uid()
        ) OR
        m.session_id IN (
          SELECT s.id FROM sessions s
          JOIN user_roles ur ON s.organization_id = ur.organization_id
          WHERE ur.user_id = auth.uid()
        )
      )
    )
  )
);

CREATE POLICY "Users can insert match player status in their organization" ON match_player_status
FOR INSERT WITH CHECK (
  auth.role() = 'authenticated' AND (
    -- Superadmin can create match player status anywhere
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'superadmin'
    ) OR
    -- Users can create match player status for matches they have access to
    match_id IN (
      SELECT m.id FROM matches m
      WHERE (
        m.organization_id IN (
          SELECT organization_id FROM user_roles 
          WHERE user_id = auth.uid()
        ) OR
        m.session_id IN (
          SELECT s.id FROM sessions s
          JOIN user_roles ur ON s.organization_id = ur.organization_id
          WHERE ur.user_id = auth.uid()
        )
      )
    )
  )
);

CREATE POLICY "Users can update match player status in their organization" ON match_player_status
FOR UPDATE USING (
  auth.role() = 'authenticated' AND (
    -- Superadmin can update all match player status
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'superadmin'
    ) OR
    -- Users can update match player status for matches they have access to
    match_id IN (
      SELECT m.id FROM matches m
      WHERE (
        m.organization_id IN (
          SELECT organization_id FROM user_roles 
          WHERE user_id = auth.uid()
        ) OR
        m.session_id IN (
          SELECT s.id FROM sessions s
          JOIN user_roles ur ON s.organization_id = ur.organization_id
          WHERE ur.user_id = auth.uid()
        )
      )
    )
  )
);

CREATE POLICY "Users can delete match player status in their organization" ON match_player_status
FOR DELETE USING (
  auth.role() = 'authenticated' AND (
    -- Superadmin can delete all match player status
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'superadmin'
    ) OR
    -- Users can delete match player status for matches they have access to
    match_id IN (
      SELECT m.id FROM matches m
      WHERE (
        m.organization_id IN (
          SELECT organization_id FROM user_roles 
          WHERE user_id = auth.uid()
        ) OR
        m.session_id IN (
          SELECT s.id FROM sessions s
          JOIN user_roles ur ON s.organization_id = ur.organization_id
          WHERE ur.user_id = auth.uid()
        )
      )
    )
  )
);
