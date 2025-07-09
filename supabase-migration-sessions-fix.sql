-- Add coach_id column to existing sessions table
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS coach_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add RLS policies for sessions table (if not already enabled)
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Coaches can view their own sessions" ON sessions;
DROP POLICY IF EXISTS "Coaches can insert their own sessions" ON sessions;
DROP POLICY IF EXISTS "Coaches can update their own sessions" ON sessions;
DROP POLICY IF EXISTS "Coaches can delete their own sessions" ON sessions;

-- Create RLS policies for sessions table
CREATE POLICY "Coaches can view their own sessions" ON sessions
  FOR SELECT USING (auth.uid() = coach_id);

CREATE POLICY "Coaches can insert their own sessions" ON sessions
  FOR INSERT WITH CHECK (auth.uid() = coach_id);

CREATE POLICY "Coaches can update their own sessions" ON sessions
  FOR UPDATE USING (auth.uid() = coach_id);

CREATE POLICY "Coaches can delete their own sessions" ON sessions
  FOR DELETE USING (auth.uid() = coach_id);

-- Create indexes for better performance (if they don't exist)
CREATE INDEX IF NOT EXISTS idx_sessions_coach_id ON sessions(coach_id);
CREATE INDEX IF NOT EXISTS idx_sessions_date ON sessions(date);
CREATE INDEX IF NOT EXISTS idx_sessions_date_time ON sessions(date, start_time);

-- Create trigger to update updated_at timestamp (if it doesn't exist)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_sessions_updated_at ON sessions;
CREATE TRIGGER update_sessions_updated_at 
  BEFORE UPDATE ON sessions 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column(); 