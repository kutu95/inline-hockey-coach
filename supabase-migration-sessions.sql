-- Create sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
  location TEXT NOT NULL,
  coach_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies for sessions table
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Coaches can only see their own sessions
CREATE POLICY "Coaches can view their own sessions" ON sessions
  FOR SELECT USING (auth.uid() = coach_id);

-- Policy: Coaches can insert their own sessions
CREATE POLICY "Coaches can insert their own sessions" ON sessions
  FOR INSERT WITH CHECK (auth.uid() = coach_id);

-- Policy: Coaches can update their own sessions
CREATE POLICY "Coaches can update their own sessions" ON sessions
  FOR UPDATE USING (auth.uid() = coach_id);

-- Policy: Coaches can delete their own sessions
CREATE POLICY "Coaches can delete their own sessions" ON sessions
  FOR DELETE USING (auth.uid() = coach_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sessions_coach_id ON sessions(coach_id);
CREATE INDEX IF NOT EXISTS idx_sessions_date ON sessions(date);
CREATE INDEX IF NOT EXISTS idx_sessions_date_time ON sessions(date, start_time);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_sessions_updated_at 
  BEFORE UPDATE ON sessions 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column(); 