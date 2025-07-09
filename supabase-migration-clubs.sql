-- Migration script to add clubs and update position values
-- This preserves existing data while adding club functionality

-- Create clubs table
CREATE TABLE IF NOT EXISTS public.clubs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    coach_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security for clubs
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;

-- Create policies for clubs
CREATE POLICY "Coaches can view their own clubs" ON public.clubs
    FOR SELECT USING (auth.uid() = coach_id);

CREATE POLICY "Coaches can insert their own clubs" ON public.clubs
    FOR INSERT WITH CHECK (auth.uid() = coach_id);

CREATE POLICY "Coaches can update their own clubs" ON public.clubs
    FOR UPDATE USING (auth.uid() = coach_id);

CREATE POLICY "Coaches can delete their own clubs" ON public.clubs
    FOR DELETE USING (auth.uid() = coach_id);

-- Add club_id column to players table
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES public.clubs(id) ON DELETE SET NULL;

-- Create index on club_id for better performance
CREATE INDEX IF NOT EXISTS idx_players_club_id ON public.players(club_id);

-- Update position values to be either "Goalie" or "Skater"
-- First, update existing positions to "Skater" if they're not "Goalie"
UPDATE public.players 
SET position = 'Skater' 
WHERE position NOT IN ('Goalie', 'Skater');

-- Add constraint to ensure position is either "Goalie" or "Skater"
ALTER TABLE public.players ADD CONSTRAINT check_position 
CHECK (position IN ('Goalie', 'Skater'));

-- Create a function to automatically update the updated_at timestamp for clubs
CREATE OR REPLACE FUNCTION update_clubs_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create a trigger to automatically update the updated_at column for clubs
CREATE TRIGGER update_clubs_updated_at 
    BEFORE UPDATE ON public.clubs 
    FOR EACH ROW 
    EXECUTE FUNCTION update_clubs_updated_at_column(); 