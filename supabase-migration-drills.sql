-- Create drills table
CREATE TABLE drills (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    coach_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    short_description TEXT,
    description TEXT,
    min_players INTEGER NOT NULL DEFAULT 1,
    max_players INTEGER,
    features TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies for drills table
ALTER TABLE drills ENABLE ROW LEVEL SECURITY;

-- Policy: Coaches can view their own drills
CREATE POLICY "Coaches can view their own drills" ON drills
    FOR SELECT USING (coach_id = auth.uid());

-- Policy: Coaches can insert their own drills
CREATE POLICY "Coaches can insert their own drills" ON drills
    FOR INSERT WITH CHECK (coach_id = auth.uid());

-- Policy: Coaches can update their own drills
CREATE POLICY "Coaches can update their own drills" ON drills
    FOR UPDATE USING (coach_id = auth.uid());

-- Policy: Coaches can delete their own drills
CREATE POLICY "Coaches can delete their own drills" ON drills
    FOR DELETE USING (coach_id = auth.uid());

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_drills_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_drills_updated_at
    BEFORE UPDATE ON drills
    FOR EACH ROW
    EXECUTE FUNCTION update_drills_updated_at();

-- Add constraint to ensure max_players is greater than or equal to min_players
ALTER TABLE drills ADD CONSTRAINT check_player_count 
    CHECK (max_players IS NULL OR max_players >= min_players);

-- Add constraint to ensure min_players is at least 1
ALTER TABLE drills ADD CONSTRAINT check_min_players 
    CHECK (min_players >= 1); 