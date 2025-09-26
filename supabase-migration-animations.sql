-- Create animations table for storing soccer animations
-- Run this in your Supabase SQL editor

-- Create the animations table
CREATE TABLE IF NOT EXISTS animations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  sport TEXT NOT NULL DEFAULT 'soccer',
  animation_data JSONB NOT NULL, -- Stores keyframes, settings, etc.
  field_settings JSONB NOT NULL, -- Stores field dimensions, background, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_animations_user_id ON animations(user_id);
CREATE INDEX IF NOT EXISTS idx_animations_sport ON animations(sport);
CREATE INDEX IF NOT EXISTS idx_animations_created_at ON animations(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE animations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (with IF NOT EXISTS equivalent using DO blocks)
-- Drop existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Users can view own animations" ON animations;
DROP POLICY IF EXISTS "Users can insert own animations" ON animations;
DROP POLICY IF EXISTS "Users can update own animations" ON animations;
DROP POLICY IF EXISTS "Users can delete own animations" ON animations;

-- Users can view their own animations
CREATE POLICY "Users can view own animations" ON animations
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own animations
CREATE POLICY "Users can insert own animations" ON animations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own animations
CREATE POLICY "Users can update own animations" ON animations
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own animations
CREATE POLICY "Users can delete own animations" ON animations
  FOR DELETE USING (auth.uid() = user_id);

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_animations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_animations_updated_at ON animations;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_animations_updated_at
  BEFORE UPDATE ON animations
  FOR EACH ROW
  EXECUTE FUNCTION update_animations_updated_at();