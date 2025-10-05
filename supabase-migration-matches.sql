-- =====================================================
-- MATCH MANAGEMENT DATABASE MIGRATION
-- =====================================================
-- 
-- INSTRUCTIONS:
-- 1. Copy this entire file
-- 2. Go to Supabase Dashboard > SQL Editor
-- 3. Paste and click "Run"
-- 4. This will create all required tables for Match Management (two-team games)
--
-- =====================================================

-- =====================================================
-- SECTION 1: CREATE MATCH TABLES
-- =====================================================

-- Create matches table for tracking two-team games
CREATE TABLE IF NOT EXISTS matches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE NOT NULL,
  home_squad_id UUID REFERENCES squads(id) ON DELETE CASCADE NOT NULL,
  away_squad_id UUID REFERENCES squads(id) ON DELETE CASCADE NOT NULL,
  match_date DATE NOT NULL,
  match_time TIME NOT NULL,
  venue TEXT,
  is_active BOOLEAN DEFAULT true,
  match_start_time TIMESTAMP WITH TIME ZONE,
  current_play_start_time TIMESTAMP WITH TIME ZONE,
  total_play_time_seconds INTEGER DEFAULT 0,
  current_period INTEGER DEFAULT 1,
  goals_home INTEGER DEFAULT 0,
  goals_away INTEGER DEFAULT 0,
  game_end_time TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(session_id) -- One match per session
);

-- Create match_events table for tracking all match events
CREATE TABLE IF NOT EXISTS match_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE NOT NULL,
  event_type TEXT NOT NULL, -- 'play_start', 'play_stop', 'player_on', 'player_off', 'goal_home', 'goal_away', 'game_end'
  player_id UUID REFERENCES players(id) ON DELETE CASCADE, -- NULL for non-player events
  team_side TEXT NOT NULL, -- 'home' or 'away'
  event_time TIMESTAMP WITH TIME ZONE NOT NULL,
  game_time_seconds INTEGER NOT NULL, -- Game time when event occurred (0-3600 for 60min game)
  play_time_seconds INTEGER NOT NULL, -- Total play time when event occurred
  metadata JSONB, -- Additional event data (goal scorer, etc.)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create match_player_status table for tracking player positions during matches
CREATE TABLE IF NOT EXISTS match_player_status (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE NOT NULL,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE NOT NULL,
  team_side TEXT NOT NULL, -- 'home' or 'away'
  status TEXT NOT NULL, -- 'bench' or 'rink'
  status_start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status_start_game_time INTEGER NOT NULL, -- Game time when status changed
  status_start_play_time INTEGER NOT NULL, -- Play time when status changed
  total_rink_time_seconds INTEGER DEFAULT 0, -- Total accumulated rink time
  current_shift_time_seconds INTEGER DEFAULT 0, -- Time in current shift/bench
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(match_id, player_id)
);

-- =====================================================
-- SECTION 2: CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Indexes for matches table
CREATE INDEX IF NOT EXISTS idx_matches_session_id ON matches(session_id);
CREATE INDEX IF NOT EXISTS idx_matches_home_squad_id ON matches(home_squad_id);
CREATE INDEX IF NOT EXISTS idx_matches_away_squad_id ON matches(away_squad_id);
CREATE INDEX IF NOT EXISTS idx_matches_match_date ON matches(match_date);
CREATE INDEX IF NOT EXISTS idx_matches_is_active ON matches(is_active);

-- Indexes for match_events table
CREATE INDEX IF NOT EXISTS idx_match_events_match_id ON match_events(match_id);
CREATE INDEX IF NOT EXISTS idx_match_events_event_type ON match_events(event_type);
CREATE INDEX IF NOT EXISTS idx_match_events_player_id ON match_events(player_id);
CREATE INDEX IF NOT EXISTS idx_match_events_team_side ON match_events(team_side);
CREATE INDEX IF NOT EXISTS idx_match_events_event_time ON match_events(event_time);

-- Indexes for match_player_status table
CREATE INDEX IF NOT EXISTS idx_match_player_status_match_id ON match_player_status(match_id);
CREATE INDEX IF NOT EXISTS idx_match_player_status_player_id ON match_player_status(player_id);
CREATE INDEX IF NOT EXISTS idx_match_player_status_team_side ON match_player_status(team_side);
CREATE INDEX IF NOT EXISTS idx_match_player_status_status ON match_player_status(status);

-- =====================================================
-- SECTION 3: CREATE TRIGGERS
-- =====================================================

-- Create function to automatically update the updated_at timestamp for matches
CREATE OR REPLACE FUNCTION update_matches_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update the updated_at column for matches
CREATE TRIGGER update_matches_updated_at 
    BEFORE UPDATE ON matches 
    FOR EACH ROW 
    EXECUTE FUNCTION update_matches_updated_at_column();

-- Create function to automatically update the updated_at timestamp for match_player_status
CREATE OR REPLACE FUNCTION update_match_player_status_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update the updated_at column for match_player_status
CREATE TRIGGER update_match_player_status_updated_at 
    BEFORE UPDATE ON match_player_status 
    FOR EACH ROW 
    EXECUTE FUNCTION update_match_player_status_updated_at_column();

-- =====================================================
-- SECTION 4: ENABLE ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS for all tables
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_player_status ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for matches table
CREATE POLICY "Authenticated users can view matches" ON matches
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert matches" ON matches
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update matches" ON matches
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete matches" ON matches
  FOR DELETE USING (auth.role() = 'authenticated');

-- Create RLS policies for match_events table
CREATE POLICY "Authenticated users can view match events" ON match_events
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert match events" ON match_events
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update match events" ON match_events
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete match events" ON match_events
  FOR DELETE USING (auth.role() = 'authenticated');

-- Create RLS policies for match_player_status table
CREATE POLICY "Authenticated users can view match player status" ON match_player_status
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert match player status" ON match_player_status
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update match player status" ON match_player_status
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete match player status" ON match_player_status
  FOR DELETE USING (auth.role() = 'authenticated');

-- =====================================================
-- SECTION 5: ADD COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE matches IS 'Stores match information for two-team games';
COMMENT ON TABLE match_events IS 'Records all events that occur during a match';
COMMENT ON TABLE match_player_status IS 'Tracks player positions (bench/rink) during matches';

COMMENT ON COLUMN matches.home_squad_id IS 'Squad ID for the home team';
COMMENT ON COLUMN matches.away_squad_id IS 'Squad ID for the away team';
COMMENT ON COLUMN matches.goals_home IS 'Goals scored by home team';
COMMENT ON COLUMN matches.goals_away IS 'Goals scored by away team';

COMMENT ON COLUMN match_events.team_side IS 'Which team the event relates to: home or away';
COMMENT ON COLUMN match_events.event_type IS 'Type of event: play_start, play_stop, player_on, player_off, goal_home, goal_away, game_end';

COMMENT ON COLUMN match_player_status.team_side IS 'Which team the player belongs to: home or away';
COMMENT ON COLUMN match_player_status.status IS 'Current player status: bench or rink';
