-- Drop the existing players table if it exists
DROP TABLE IF EXISTS public.players CASCADE;

-- Create the players table with the correct structure
CREATE TABLE public.players (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    age INTEGER NOT NULL,
    position TEXT NOT NULL,
    jersey_number INTEGER NOT NULL,
    phone TEXT,
    email TEXT,
    emergency_contact TEXT,
    emergency_phone TEXT,
    notes TEXT,
    coach_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;

-- Create policy to allow coaches to view their own players
CREATE POLICY "Coaches can view their own players" ON public.players
    FOR SELECT USING (auth.uid() = coach_id);

-- Create policy to allow coaches to insert their own players
CREATE POLICY "Coaches can insert their own players" ON public.players
    FOR INSERT WITH CHECK (auth.uid() = coach_id);

-- Create policy to allow coaches to update their own players
CREATE POLICY "Coaches can update their own players" ON public.players
    FOR UPDATE USING (auth.uid() = coach_id);

-- Create policy to allow coaches to delete their own players
CREATE POLICY "Coaches can delete their own players" ON public.players
    FOR DELETE USING (auth.uid() = coach_id);

-- Create an index on coach_id for better performance
CREATE INDEX idx_players_coach_id ON public.players(coach_id);

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
    BEFORE UPDATE ON public.players 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column(); 