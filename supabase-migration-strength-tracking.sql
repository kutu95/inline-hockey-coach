-- Strength Tracking System Migration
-- Enables tracking of weights, sets, reps and progressive overload suggestions

-- 1. Exercise templates table (defines standard exercises)
CREATE TABLE IF NOT EXISTS sc_exercise_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phase TEXT NOT NULL, -- 'PHASE_I', 'PHASE_II', etc.
  session_type TEXT NOT NULL, -- 'STRENGTH_A', 'STRENGTH_B', etc.
  has_gym_access BOOLEAN NOT NULL,
  order_index INTEGER NOT NULL,
  target_sets INTEGER NOT NULL,
  target_reps_min INTEGER NOT NULL,
  target_reps_max INTEGER NOT NULL,
  progression_rule TEXT NOT NULL, -- 'LINEAR', 'DOUBLE_PROGRESSION', 'VOLUME'
  increment_weight DECIMAL(4,2) DEFAULT 2.5, -- kg to add when progressing
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Strength sessions table (individual workout sessions)
CREATE TABLE IF NOT EXISTS sc_strength_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES sc_plan_sessions(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  session_type TEXT NOT NULL, -- 'STRENGTH_A', 'STRENGTH_B'
  phase TEXT NOT NULL, -- 'PHASE_I', 'PHASE_II', etc.
  notes TEXT,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Exercise records table (sets, reps, weights for each exercise)
CREATE TABLE IF NOT EXISTS sc_exercise_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  strength_session_id UUID NOT NULL REFERENCES sc_strength_sessions(id) ON DELETE CASCADE,
  exercise_name TEXT NOT NULL,
  set_number INTEGER NOT NULL,
  reps INTEGER NOT NULL,
  weight DECIMAL(5,2), -- in kg, NULL for bodyweight exercises
  rpe INTEGER CHECK (rpe >= 1 AND rpe <= 10), -- Rate of Perceived Exertion
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. User's personal records (best performance for each exercise)
CREATE TABLE IF NOT EXISTS sc_personal_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_name TEXT NOT NULL,
  best_weight DECIMAL(5,2),
  best_reps INTEGER,
  best_volume DECIMAL(8,2), -- weight * reps
  achieved_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, exercise_name)
);

-- Insert exercise templates for Phase I
INSERT INTO sc_exercise_templates (name, phase, session_type, has_gym_access, order_index, target_sets, target_reps_min, target_reps_max, progression_rule, increment_weight) VALUES
-- Phase I - Gym Access
('Squat', 'PHASE_I', 'STRENGTH_A', true, 1, 3, 5, 5, 'LINEAR', 2.5),
('Bench Press', 'PHASE_I', 'STRENGTH_A', true, 2, 3, 5, 5, 'LINEAR', 2.5),
('Deadlift', 'PHASE_I', 'STRENGTH_A', true, 3, 1, 5, 5, 'LINEAR', 5.0),
('Chin-ups', 'PHASE_I', 'STRENGTH_A', true, 4, 3, 5, 15, 'DOUBLE_PROGRESSION', 2.5),

('Squat', 'PHASE_I', 'STRENGTH_B', true, 1, 3, 5, 5, 'LINEAR', 2.5),
('Overhead Press', 'PHASE_I', 'STRENGTH_B', true, 2, 3, 5, 5, 'LINEAR', 2.5),
('Deadlift', 'PHASE_I', 'STRENGTH_B', true, 3, 1, 5, 5, 'LINEAR', 5.0),
('Chin-ups', 'PHASE_I', 'STRENGTH_B', true, 4, 3, 5, 15, 'DOUBLE_PROGRESSION', 2.5),

-- Phase I - No Gym Access (Bodyweight)
('Goblet Squat', 'PHASE_I', 'STRENGTH_A', false, 1, 3, 8, 12, 'DOUBLE_PROGRESSION', 2.5),
('Push-up', 'PHASE_I', 'STRENGTH_A', false, 2, 3, 5, 20, 'DOUBLE_PROGRESSION', 0),
('Chin-up/Jumping', 'PHASE_I', 'STRENGTH_A', false, 3, 3, 3, 10, 'DOUBLE_PROGRESSION', 0),
('Dip (bench)', 'PHASE_I', 'STRENGTH_A', false, 4, 3, 8, 12, 'DOUBLE_PROGRESSION', 0),
('Bridge (3s)', 'PHASE_I', 'STRENGTH_A', false, 5, 3, 8, 12, 'DOUBLE_PROGRESSION', 0),

('Goblet Squat', 'PHASE_I', 'STRENGTH_B', false, 1, 3, 8, 12, 'DOUBLE_PROGRESSION', 2.5),
('Push-up', 'PHASE_I', 'STRENGTH_B', false, 2, 3, 5, 20, 'DOUBLE_PROGRESSION', 0),
('Chin-up/Jumping', 'PHASE_I', 'STRENGTH_B', false, 3, 3, 3, 10, 'DOUBLE_PROGRESSION', 0),
('Dip (bench)', 'PHASE_I', 'STRENGTH_B', false, 4, 3, 8, 12, 'DOUBLE_PROGRESSION', 0),
('Bridge (3s)', 'PHASE_I', 'STRENGTH_B', false, 5, 3, 8, 12, 'DOUBLE_PROGRESSION', 0);

-- Add RLS policies
ALTER TABLE sc_exercise_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE sc_strength_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sc_exercise_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE sc_personal_records ENABLE ROW LEVEL SECURITY;

-- Exercise templates are public (read-only for users)
CREATE POLICY "Exercise templates are viewable by everyone" ON sc_exercise_templates FOR SELECT USING (true);

-- Users can only access their own strength sessions
CREATE POLICY "Users can manage their own strength sessions" ON sc_strength_sessions
  FOR ALL USING (auth.uid() = user_id);

-- Users can only access exercise records for their own sessions
CREATE POLICY "Users can manage their own exercise records" ON sc_exercise_records
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM sc_strength_sessions 
      WHERE id = sc_exercise_records.strength_session_id 
      AND user_id = auth.uid()
    )
  );

-- Users can only access their own personal records
CREATE POLICY "Users can manage their own personal records" ON sc_personal_records
  FOR ALL USING (auth.uid() = user_id);

-- Add indexes for performance
CREATE INDEX idx_sc_strength_sessions_user_date ON sc_strength_sessions(user_id, date DESC);
CREATE INDEX idx_sc_exercise_records_session ON sc_exercise_records(strength_session_id);
CREATE INDEX idx_sc_personal_records_user_exercise ON sc_personal_records(user_id, exercise_name);
