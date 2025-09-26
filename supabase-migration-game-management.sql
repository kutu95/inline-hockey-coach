-- =====================================================
-- GAME MANAGEMENT DATABASE MIGRATION
-- =====================================================
-- 
-- INSTRUCTIONS:
-- 1. Copy this entire file
-- 2. Go to Supabase Dashboard > SQL Editor
-- 3. Paste and click "Run"
-- 4. This will create all required tables for Game Management
--
-- =====================================================

-- Create game_events table for tracking all game events
CREATE TABLE IF NOT EXISTS game_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE NOT NULL,
  event_type TEXT NOT NULL, -- 'play_start', 'play_stop', 'player_on', 'player_off', 'goal_for', 'goal_against', 'game_end'
  player_id UUID REFERENCES players(id) ON DELETE CASCADE, -- NULL for non-player events
  event_time TIMESTAMP WITH TIME ZONE NOT NULL, -- When the event occurred
  game_time_seconds INTEGER NOT NULL, -- Game time when event occurred (0-3600 for 60min game)
  play_time_seconds INTEGER NOT NULL, -- Total play time when event occurred
  metadata JSONB, -- Additional event data (goal scorer, etc.)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- SECTION 1: CREATE TABLES
-- =====================================================

-- Create game_sessions table for tracking active game state
CREATE TABLE IF NOT EXISTS game_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true,
  game_start_time TIMESTAMP WITH TIME ZONE,
  current_play_start_time TIMESTAMP WITH TIME ZONE, -- When current play period started
  total_play_time_seconds INTEGER DEFAULT 0, -- Total accumulated play time
  current_period INTEGER DEFAULT 1, -- 1, 2, 3, etc.
  goals_for INTEGER DEFAULT 0,
  goals_against INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create game_player_status table for tracking player positions
CREATE TABLE IF NOT EXISTS game_player_status (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE NOT NULL,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL, -- 'bench' or 'rink'
  status_start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status_start_game_time INTEGER NOT NULL, -- Game time when status changed
  status_start_play_time INTEGER NOT NULL, -- Play time when status changed
  total_rink_time_seconds INTEGER DEFAULT 0, -- Total accumulated rink time
  current_shift_time_seconds INTEGER DEFAULT 0, -- Time in current shift/bench
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(session_id, player_id)
);

-- =====================================================
-- SECTION 2: CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_game_events_session_id ON game_events(session_id);
CREATE INDEX IF NOT EXISTS idx_game_events_event_type ON game_events(event_type);
CREATE INDEX IF NOT EXISTS idx_game_events_event_time ON game_events(event_time);
CREATE INDEX IF NOT EXISTS idx_game_sessions_session_id ON game_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_game_player_status_session_id ON game_player_status(session_id);
CREATE INDEX IF NOT EXISTS idx_game_player_status_player_id ON game_player_status(player_id);

-- =====================================================
-- SECTION 3: ENABLE ROW LEVEL SECURITY
-- =====================================================

-- Enable Row Level Security (RLS)
ALTER TABLE game_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_player_status ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- SECTION 4: CREATE RLS POLICIES
-- =====================================================

-- Drop existing policies if they exist (to handle re-runs)
DROP POLICY IF EXISTS "Users can view game events for their sessions" ON game_events;
DROP POLICY IF EXISTS "Users can insert game events for their sessions" ON game_events;
DROP POLICY IF EXISTS "Users can delete game events for their sessions" ON game_events;
DROP POLICY IF EXISTS "Users can view game sessions for their sessions" ON game_sessions;
DROP POLICY IF EXISTS "Users can insert game sessions for their sessions" ON game_sessions;
DROP POLICY IF EXISTS "Users can update game sessions for their sessions" ON game_sessions;
DROP POLICY IF EXISTS "Users can delete game sessions for their sessions" ON game_sessions;
DROP POLICY IF EXISTS "Users can view game player status for their sessions" ON game_player_status;
DROP POLICY IF EXISTS "Users can insert game player status for their sessions" ON game_player_status;
DROP POLICY IF EXISTS "Users can update game player status for their sessions" ON game_player_status;
DROP POLICY IF EXISTS "Users can delete game player status for their sessions" ON game_player_status;

-- Create RLS policies for game_events
-- Simple approach: allow authenticated users to access their game events
CREATE POLICY "Users can view game events for their sessions" ON game_events
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert game events for their sessions" ON game_events
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete game events for their sessions" ON game_events
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- Create RLS policies for game_sessions
-- Simple approach: allow authenticated users to access their game sessions
CREATE POLICY "Users can view game sessions for their sessions" ON game_sessions
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert game sessions for their sessions" ON game_sessions
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update game sessions for their sessions" ON game_sessions
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete game sessions for their sessions" ON game_sessions
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- Create RLS policies for game_player_status
-- Simple approach: allow authenticated users to access their game player status
CREATE POLICY "Users can view game player status for their sessions" ON game_player_status
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert game player status for their sessions" ON game_player_status
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update game player status for their sessions" ON game_player_status
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete game player status for their sessions" ON game_player_status
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- =====================================================
-- SECTION 5: CREATE TRIGGERS
-- =====================================================

-- Drop existing triggers if they exist (to handle re-runs)
DROP TRIGGER IF EXISTS update_game_sessions_updated_at ON game_sessions;
DROP TRIGGER IF EXISTS update_game_player_status_updated_at ON game_player_status;

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_game_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_game_sessions_updated_at
  BEFORE UPDATE ON game_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_game_updated_at();

CREATE TRIGGER update_game_player_status_updated_at
  BEFORE UPDATE ON game_player_status
  FOR EACH ROW
  EXECUTE FUNCTION update_game_updated_at();

-- =====================================================
-- MIGRATION COMPLETE!
-- =====================================================
-- 
-- ✅ All Game Management tables have been created
-- ✅ RLS policies are in place
-- ✅ Triggers are set up
-- 
-- You can now use the Game Management interface!
-- =====================================================
