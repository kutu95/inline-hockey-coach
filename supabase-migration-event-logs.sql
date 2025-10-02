-- =====================================================
-- EVENT LOGS TABLE MIGRATION
-- =====================================================
-- This migration creates the event_logs table for tracking user activities
-- Only accessible by superadmin users

-- Create event_logs table
CREATE TABLE IF NOT EXISTS event_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT, -- Browser session identifier
  event_type TEXT NOT NULL, -- Type of event (auth_login, page_access, data_create, etc.)
  level TEXT NOT NULL DEFAULT 'info', -- Log level (info, warn, error, debug)
  details JSONB, -- Event details and metadata
  user_agent TEXT, -- Browser user agent
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address INET, -- IP address (if available)
  page_url TEXT, -- URL where event occurred
  page_title TEXT, -- Page title where event occurred
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_event_logs_user_id ON event_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_event_logs_event_type ON event_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_event_logs_timestamp ON event_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_event_logs_level ON event_logs(level);
CREATE INDEX IF NOT EXISTS idx_event_logs_session_id ON event_logs(session_id);

-- Create RLS policies - only superadmins can access event logs
ALTER TABLE event_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Only superadmins can view event logs
CREATE POLICY "Superadmins can view event logs" ON event_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role_id IN (
        SELECT id FROM roles WHERE name = 'superadmin'
      )
    )
  );

-- Policy: System can insert event logs (for authenticated users)
CREATE POLICY "Users can insert their own event logs" ON event_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Policy: Only superadmins can update event logs (for maintenance)
CREATE POLICY "Superadmins can update event logs" ON event_logs
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role_id IN (
        SELECT id FROM roles WHERE name = 'superadmin'
      )
    )
  );

-- Policy: Only superadmins can delete event logs
CREATE POLICY "Superadmins can delete event logs" ON event_logs
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role_id IN (
        SELECT id FROM roles WHERE name = 'superadmin'
      )
    )
  );

-- Create a function to clean up old event logs (optional - for maintenance)
CREATE OR REPLACE FUNCTION cleanup_old_event_logs()
RETURNS void AS $$
BEGIN
  -- Delete logs older than 90 days (adjust as needed)
  DELETE FROM event_logs 
  WHERE created_at < NOW() - INTERVAL '90 days';
  
  -- Log the cleanup action
  INSERT INTO event_logs (user_id, event_type, level, details, message)
  VALUES (
    NULL, -- System action
    'system_event',
    'info',
    jsonb_build_object(
      'message', 'Cleaned up old event logs',
      'cutoff_date', (NOW() - INTERVAL '90 days')::text
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to get event log statistics (for superadmin dashboard)
CREATE OR REPLACE FUNCTION get_event_log_stats(
  start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() - INTERVAL '7 days',
  end_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS TABLE (
  event_type TEXT,
  event_count BIGINT,
  unique_users BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    el.event_type,
    COUNT(*) as event_count,
    COUNT(DISTINCT el.user_id) as unique_users
  FROM event_logs el
  WHERE el.timestamp BETWEEN start_date AND end_date
  GROUP BY el.event_type
  ORDER BY event_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions on functions to authenticated users
GRANT EXECUTE ON FUNCTION cleanup_old_event_logs() TO authenticated;
GRANT EXECUTE ON FUNCTION get_event_log_stats(TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE) TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE event_logs IS 'Stores user activity logs for superadmin monitoring';
COMMENT ON COLUMN event_logs.event_type IS 'Type of event: auth_login, page_access, data_create, data_update, data_delete, system_event';
COMMENT ON COLUMN event_logs.level IS 'Log level: info, warn, error, debug';
COMMENT ON COLUMN event_logs.details IS 'JSONB object containing event-specific details and metadata';
COMMENT ON COLUMN event_logs.session_id IS 'Browser session identifier for tracking user sessions';
