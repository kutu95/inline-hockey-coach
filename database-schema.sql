-- Players table schema for Inline Hockey Coach app
-- Run this in your Supabase SQL editor

-- Create the players table
CREATE TABLE IF NOT EXISTS players (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  age INTEGER NOT NULL CHECK (age > 0 AND age < 100),
  position TEXT NOT NULL,
  jersey_number INTEGER NOT NULL CHECK (jersey_number >= 0 AND jersey_number <= 99),
  phone TEXT,
  email TEXT,
  emergency_contact TEXT,
  emergency_phone TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_players_coach_id ON players(coach_id);
CREATE INDEX IF NOT EXISTS idx_players_created_at ON players(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE players ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only see their own players
CREATE POLICY "Users can view own players" ON players
  FOR SELECT USING (auth.uid() = coach_id);

-- Users can insert their own players
CREATE POLICY "Users can insert own players" ON players
  FOR INSERT WITH CHECK (auth.uid() = coach_id);

-- Users can update their own players
CREATE POLICY "Users can update own players" ON players
  FOR UPDATE USING (auth.uid() = coach_id);

-- Users can delete their own players
CREATE POLICY "Users can delete own players" ON players
  FOR DELETE USING (auth.uid() = coach_id);

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create a trigger to automatically update the updated_at column
CREATE TRIGGER update_players_updated_at
  BEFORE UPDATE ON players
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Optional: Insert some sample data (remove this in production)
-- INSERT INTO players (coach_id, first_name, last_name, age, position, jersey_number, phone, email, emergency_contact, emergency_phone, notes)
-- VALUES 
--   ('your-user-id-here', 'John', 'Doe', 16, 'Forward', 10, '555-0123', 'john.doe@email.com', 'Jane Doe', '555-0124', 'Strong skater, good team player'),
--   ('your-user-id-here', 'Mike', 'Smith', 15, 'Defense', 5, '555-0125', 'mike.smith@email.com', 'Sarah Smith', '555-0126', 'Excellent defensive skills'),
--   ('your-user-id-here', 'Alex', 'Johnson', 17, 'Goalie', 1, '555-0127', 'alex.johnson@email.com', 'Bob Johnson', '555-0128', 'Great reflexes, team captain'); 