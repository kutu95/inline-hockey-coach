-- Fix Session Attendance RLS Policies
-- This script updates the RLS policies for session_attendance to support multi-tenant organization-based access

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Coaches can view attendance for their sessions" ON session_attendance;
DROP POLICY IF EXISTS "Coaches can insert attendance for their sessions" ON session_attendance;
DROP POLICY IF EXISTS "Coaches can update attendance for their sessions" ON session_attendance;
DROP POLICY IF EXISTS "Coaches can delete attendance for their sessions" ON session_attendance;

DROP POLICY IF EXISTS "Users can view attendance for their sessions" ON session_attendance;
DROP POLICY IF EXISTS "Users can insert attendance for their sessions" ON session_attendance;
DROP POLICY IF EXISTS "Users can update attendance for their sessions" ON session_attendance;
DROP POLICY IF EXISTS "Users can delete attendance for their sessions" ON session_attendance;

-- Create new RLS policies for session_attendance (organization-based access only)
CREATE POLICY "Users can view attendance for their sessions" ON session_attendance
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sessions 
      WHERE sessions.id = session_attendance.session_id 
      AND sessions.organization_id IN (
        SELECT organization_id FROM user_roles 
        WHERE user_id = auth.uid() 
        AND organization_id IS NOT NULL
      )
    )
  );

CREATE POLICY "Users can insert attendance for their sessions" ON session_attendance
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM sessions 
      WHERE sessions.id = session_attendance.session_id 
      AND sessions.organization_id IN (
        SELECT organization_id FROM user_roles 
        WHERE user_id = auth.uid() 
        AND organization_id IS NOT NULL
      )
    )
  );

CREATE POLICY "Users can update attendance for their sessions" ON session_attendance
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM sessions 
      WHERE sessions.id = session_attendance.session_id 
      AND sessions.organization_id IN (
        SELECT organization_id FROM user_roles 
        WHERE user_id = auth.uid() 
        AND organization_id IS NOT NULL
      )
    )
  );

CREATE POLICY "Users can delete attendance for their sessions" ON session_attendance
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM sessions 
      WHERE sessions.id = session_attendance.session_id 
      AND sessions.organization_id IN (
        SELECT organization_id FROM user_roles 
        WHERE user_id = auth.uid() 
        AND organization_id IS NOT NULL
      )
    )
  );

-- Also update sessions table RLS policies to support organization-based access only
DROP POLICY IF EXISTS "Coaches can view their own sessions" ON sessions;
DROP POLICY IF EXISTS "Coaches can insert their own sessions" ON sessions;
DROP POLICY IF EXISTS "Coaches can update their own sessions" ON sessions;
DROP POLICY IF EXISTS "Coaches can delete their own sessions" ON sessions;

CREATE POLICY "Users can view their organization sessions" ON sessions
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM user_roles 
      WHERE user_id = auth.uid() 
      AND organization_id IS NOT NULL
    )
  );

CREATE POLICY "Users can insert their organization sessions" ON sessions
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_roles 
      WHERE user_id = auth.uid() 
      AND organization_id IS NOT NULL
    )
  );

CREATE POLICY "Users can update their organization sessions" ON sessions
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM user_roles 
      WHERE user_id = auth.uid() 
      AND organization_id IS NOT NULL
    )
  );

CREATE POLICY "Users can delete their organization sessions" ON sessions
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM user_roles 
      WHERE user_id = auth.uid() 
      AND organization_id IS NOT NULL
    )
  );
