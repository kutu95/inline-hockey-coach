-- Create squads table
CREATE TABLE IF NOT EXISTS squads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  coach_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create player_squads junction table for many-to-many relationship
CREATE TABLE IF NOT EXISTS player_squads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  squad_id UUID NOT NULL REFERENCES squads(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(player_id, squad_id)
);

-- Add RLS policies for squads table
ALTER TABLE squads ENABLE ROW LEVEL SECURITY;

-- Policy: Coaches can only see their own squads
CREATE POLICY "Coaches can view their own squads" ON squads
  FOR SELECT USING (auth.uid() = coach_id);

-- Policy: Coaches can insert their own squads
CREATE POLICY "Coaches can insert their own squads" ON squads
  FOR INSERT WITH CHECK (auth.uid() = coach_id);

-- Policy: Coaches can update their own squads
CREATE POLICY "Coaches can update their own squads" ON squads
  FOR UPDATE USING (auth.uid() = coach_id);

-- Policy: Coaches can delete their own squads
CREATE POLICY "Coaches can delete their own squads" ON squads
  FOR DELETE USING (auth.uid() = coach_id);

-- Add RLS policies for player_squads table
ALTER TABLE player_squads ENABLE ROW LEVEL SECURITY;

-- Policy: Coaches can view player-squad assignments for their players and squads
CREATE POLICY "Coaches can view player-squad assignments" ON player_squads
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM players p 
      JOIN squads s ON p.coach_id = s.coach_id 
      WHERE p.id = player_squads.player_id 
      AND s.id = player_squads.squad_id 
      AND p.coach_id = auth.uid()
    )
  );

-- Policy: Coaches can insert player-squad assignments
CREATE POLICY "Coaches can insert player-squad assignments" ON player_squads
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM players p 
      JOIN squads s ON p.coach_id = s.coach_id 
      WHERE p.id = player_squads.player_id 
      AND s.id = player_squads.squad_id 
      AND p.coach_id = auth.uid()
    )
  );

-- Policy: Coaches can delete player-squad assignments
CREATE POLICY "Coaches can delete player-squad assignments" ON player_squads
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM players p 
      JOIN squads s ON p.coach_id = s.coach_id 
      WHERE p.id = player_squads.player_id 
      AND s.id = player_squads.squad_id 
      AND p.coach_id = auth.uid()
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_squads_coach_id ON squads(coach_id);
CREATE INDEX IF NOT EXISTS idx_player_squads_player_id ON player_squads(player_id);
CREATE INDEX IF NOT EXISTS idx_player_squads_squad_id ON player_squads(squad_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_squads_updated_at 
  BEFORE UPDATE ON squads 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column(); 