-- Simple session-squads migration
-- Run this in your Supabase SQL Editor

-- Create session_squads junction table
CREATE TABLE IF NOT EXISTS session_squads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    squad_id UUID NOT NULL REFERENCES squads(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(session_id, squad_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_session_squads_session_id ON session_squads(session_id);
CREATE INDEX IF NOT EXISTS idx_session_squads_squad_id ON session_squads(squad_id);

-- Enable RLS
ALTER TABLE session_squads ENABLE ROW LEVEL SECURITY;

-- Simple policy for now - allow all operations (you can tighten this later)
CREATE POLICY "Allow all operations on session_squads" ON session_squads
    FOR ALL USING (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_session_squads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_session_squads_updated_at
    BEFORE UPDATE ON session_squads
    FOR EACH ROW
    EXECUTE FUNCTION update_session_squads_updated_at(); 