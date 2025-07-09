-- Fix sessions table column issues
-- This migration addresses the column name mismatches and missing columns

-- First, let's see what columns currently exist and fix them
DO $$ 
BEGIN
  -- Check if 'time' column exists and rename it to 'start_time'
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'time') THEN
    -- If start_time doesn't exist, rename time to start_time
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'start_time') THEN
      ALTER TABLE sessions RENAME COLUMN time TO start_time;
    ELSE
      -- If both exist, drop the 'time' column
      ALTER TABLE sessions DROP COLUMN time;
    END IF;
  END IF;
  
  -- Add missing columns if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'title') THEN
    ALTER TABLE sessions ADD COLUMN title TEXT NOT NULL DEFAULT 'Untitled Session';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'description') THEN
    ALTER TABLE sessions ADD COLUMN description TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'date') THEN
    ALTER TABLE sessions ADD COLUMN date DATE NOT NULL DEFAULT CURRENT_DATE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'start_time') THEN
    ALTER TABLE sessions ADD COLUMN start_time TIME NOT NULL DEFAULT '09:00:00';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'duration_minutes') THEN
    ALTER TABLE sessions ADD COLUMN duration_minutes INTEGER NOT NULL DEFAULT 60 CHECK (duration_minutes > 0);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'location') THEN
    ALTER TABLE sessions ADD COLUMN location TEXT NOT NULL DEFAULT 'Main Arena';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'coach_id') THEN
    ALTER TABLE sessions ADD COLUMN coach_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'created_at') THEN
    ALTER TABLE sessions ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'updated_at') THEN
    ALTER TABLE sessions ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
END $$;

-- Enable RLS
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Coaches can view their own sessions" ON sessions;
DROP POLICY IF EXISTS "Coaches can insert their own sessions" ON sessions;
DROP POLICY IF EXISTS "Coaches can update their own sessions" ON sessions;
DROP POLICY IF EXISTS "Coaches can delete their own sessions" ON sessions;

-- Create RLS policies
CREATE POLICY "Coaches can view their own sessions" ON sessions
  FOR SELECT USING (auth.uid() = coach_id);

CREATE POLICY "Coaches can insert their own sessions" ON sessions
  FOR INSERT WITH CHECK (auth.uid() = coach_id);

CREATE POLICY "Coaches can update their own sessions" ON sessions
  FOR UPDATE USING (auth.uid() = coach_id);

CREATE POLICY "Coaches can delete their own sessions" ON sessions
  FOR DELETE USING (auth.uid() = coach_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sessions_coach_id ON sessions(coach_id);
CREATE INDEX IF NOT EXISTS idx_sessions_date ON sessions(date);
CREATE INDEX IF NOT EXISTS idx_sessions_date_time ON sessions(date, start_time);

-- Create or replace the update_updated_at_column function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_sessions_updated_at ON sessions;

-- Create trigger for updated_at
CREATE TRIGGER update_sessions_updated_at 
  BEFORE UPDATE ON sessions 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column(); 