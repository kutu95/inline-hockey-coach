-- Strength & Conditioning Baseline and Progress Tracking Schema (Safe Version)
-- This migration adds tables to store user profiles, baseline tests, and progress tracking
-- Handles existing policies gracefully with DROP IF EXISTS

-- 1. User profiles table for S&C program participants
CREATE TABLE IF NOT EXISTS sc_user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  birthdate DATE,
  height_cm INTEGER CHECK (height_cm > 0 AND height_cm < 300),
  weight_kg DECIMAL(5,2) CHECK (weight_kg > 0 AND weight_kg < 500),
  max_hr INTEGER CHECK (max_hr > 0 AND max_hr < 250),
  resting_hr INTEGER CHECK (resting_hr > 0 AND resting_hr < 150),
  training_experience TEXT CHECK (training_experience IN ('beginner', 'intermediate', 'advanced')),
  injury_history TEXT,
  medical_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 2. Baseline tests table for storing test results
CREATE TABLE IF NOT EXISTS sc_baseline_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  test_type TEXT NOT NULL CHECK (test_type IN (
    'aerobic_run_2_4km',
    'aerobic_walk_1_6km', 
    'movement_overhead_squat',
    'movement_ankle_wall_test',
    'movement_single_leg_balance',
    'strength_squat_max',
    'strength_bench_max',
    'strength_deadlift_max'
  )),
  test_date DATE NOT NULL,
  result_value DECIMAL(10,2), -- Time in minutes, distance in cm, weight in kg, etc.
  result_unit TEXT, -- 'minutes', 'cm', 'kg', 'seconds', etc.
  result_notes TEXT,
  test_conditions JSONB, -- Store additional test-specific data
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Progress tracking table for monitoring improvements over time
CREATE TABLE IF NOT EXISTS sc_progress_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phase TEXT NOT NULL CHECK (phase IN ('PHASE_0', 'PHASE_I', 'PHASE_II', 'PHASE_III', 'PHASE_IV', 'PHASE_V')),
  metric_type TEXT NOT NULL CHECK (metric_type IN (
    'aerobic_time',
    'aerobic_distance', 
    'strength_weight',
    'strength_reps',
    'mobility_score',
    'body_weight',
    'body_fat_percentage'
  )),
  metric_name TEXT NOT NULL, -- Human-readable name like "2.4km Run Time"
  value DECIMAL(10,2) NOT NULL,
  unit TEXT NOT NULL,
  test_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Program enrollment tracking table
CREATE TABLE IF NOT EXISTS sc_program_enrollment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_phase TEXT NOT NULL DEFAULT 'PHASE_0' CHECK (current_phase IN ('PHASE_0', 'PHASE_I', 'PHASE_II', 'PHASE_III', 'PHASE_IV', 'PHASE_V')),
  phase_started_at TIMESTAMPTZ,
  phase_completed_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  enrollment_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 5. Data consent tracking table
CREATE TABLE IF NOT EXISTS sc_data_consent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL CHECK (consent_type IN (
    'program_participation',
    'baseline_data', 
    'health_metrics',
    'progress_tracking',
    'training_data',
    'data_sharing'
  )),
  granted BOOLEAN NOT NULL,
  granted_at TIMESTAMPTZ,
  withdrawn_at TIMESTAMPTZ,
  consent_version TEXT NOT NULL DEFAULT '1.0',
  ip_address INET,
  user_agent TEXT,
  retention_period INTERVAL DEFAULT INTERVAL '2 years',
  auto_delete_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, consent_type)
);

-- 6. Heart rate zones table for storing calculated zones
CREATE TABLE IF NOT EXISTS sc_hr_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  max_hr INTEGER NOT NULL,
  resting_hr INTEGER,
  zone_1_min INTEGER, -- 50-60% of max HR
  zone_1_max INTEGER,
  zone_2_min INTEGER, -- 60-70% of max HR
  zone_2_max INTEGER,
  zone_3_min INTEGER, -- 70-80% of max HR
  zone_3_max INTEGER,
  zone_4_min INTEGER, -- 80-90% of max HR
  zone_4_max INTEGER,
  zone_5_min INTEGER, -- 90-100% of max HR
  zone_5_max INTEGER,
  calculation_method TEXT CHECK (calculation_method IN ('measured', 'estimated', 'manual')),
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, calculated_at)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sc_user_profiles_user_id ON sc_user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_sc_baseline_tests_user_id ON sc_baseline_tests(user_id);
CREATE INDEX IF NOT EXISTS idx_sc_baseline_tests_test_type ON sc_baseline_tests(test_type);
CREATE INDEX IF NOT EXISTS idx_sc_baseline_tests_test_date ON sc_baseline_tests(test_date);
CREATE INDEX IF NOT EXISTS idx_sc_progress_tracking_user_id ON sc_progress_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_sc_progress_tracking_phase ON sc_progress_tracking(phase);
CREATE INDEX IF NOT EXISTS idx_sc_progress_tracking_metric_type ON sc_progress_tracking(metric_type);
CREATE INDEX IF NOT EXISTS idx_sc_progress_tracking_test_date ON sc_progress_tracking(test_date);
CREATE INDEX IF NOT EXISTS idx_sc_program_enrollment_user_id ON sc_program_enrollment(user_id);
CREATE INDEX IF NOT EXISTS idx_sc_program_enrollment_current_phase ON sc_program_enrollment(current_phase);
CREATE INDEX IF NOT EXISTS idx_sc_program_enrollment_is_active ON sc_program_enrollment(is_active);
CREATE INDEX IF NOT EXISTS idx_sc_data_consent_user_id ON sc_data_consent(user_id);
CREATE INDEX IF NOT EXISTS idx_sc_data_consent_consent_type ON sc_data_consent(consent_type);
CREATE INDEX IF NOT EXISTS idx_sc_data_consent_granted ON sc_data_consent(granted);
CREATE INDEX IF NOT EXISTS idx_sc_data_consent_auto_delete_at ON sc_data_consent(auto_delete_at);
CREATE INDEX IF NOT EXISTS idx_sc_hr_zones_user_id ON sc_hr_zones(user_id);
CREATE INDEX IF NOT EXISTS idx_sc_hr_zones_calculated_at ON sc_hr_zones(calculated_at);

-- Enable Row Level Security (RLS)
ALTER TABLE sc_user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sc_baseline_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE sc_progress_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE sc_program_enrollment ENABLE ROW LEVEL SECURITY;
ALTER TABLE sc_data_consent ENABLE ROW LEVEL SECURITY;
ALTER TABLE sc_hr_zones ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist, then create new ones
-- sc_user_profiles policies
DROP POLICY IF EXISTS "Users can view own profile" ON sc_user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON sc_user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON sc_user_profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON sc_user_profiles;

CREATE POLICY "Users can view own profile" ON sc_user_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON sc_user_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON sc_user_profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own profile" ON sc_user_profiles
  FOR DELETE USING (auth.uid() = user_id);

-- sc_baseline_tests policies
DROP POLICY IF EXISTS "Users can view own baseline tests" ON sc_baseline_tests;
DROP POLICY IF EXISTS "Users can insert own baseline tests" ON sc_baseline_tests;
DROP POLICY IF EXISTS "Users can update own baseline tests" ON sc_baseline_tests;
DROP POLICY IF EXISTS "Users can delete own baseline tests" ON sc_baseline_tests;

CREATE POLICY "Users can view own baseline tests" ON sc_baseline_tests
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own baseline tests" ON sc_baseline_tests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own baseline tests" ON sc_baseline_tests
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own baseline tests" ON sc_baseline_tests
  FOR DELETE USING (auth.uid() = user_id);

-- sc_progress_tracking policies
DROP POLICY IF EXISTS "Users can view own progress" ON sc_progress_tracking;
DROP POLICY IF EXISTS "Users can insert own progress" ON sc_progress_tracking;
DROP POLICY IF EXISTS "Users can update own progress" ON sc_progress_tracking;
DROP POLICY IF EXISTS "Users can delete own progress" ON sc_progress_tracking;

CREATE POLICY "Users can view own progress" ON sc_progress_tracking
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress" ON sc_progress_tracking
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress" ON sc_progress_tracking
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own progress" ON sc_progress_tracking
  FOR DELETE USING (auth.uid() = user_id);

-- sc_program_enrollment policies
DROP POLICY IF EXISTS "Users can view own enrollment" ON sc_program_enrollment;
DROP POLICY IF EXISTS "Users can insert own enrollment" ON sc_program_enrollment;
DROP POLICY IF EXISTS "Users can update own enrollment" ON sc_program_enrollment;
DROP POLICY IF EXISTS "Users can delete own enrollment" ON sc_program_enrollment;

CREATE POLICY "Users can view own enrollment" ON sc_program_enrollment
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own enrollment" ON sc_program_enrollment
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own enrollment" ON sc_program_enrollment
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own enrollment" ON sc_program_enrollment
  FOR DELETE USING (auth.uid() = user_id);

-- sc_data_consent policies
DROP POLICY IF EXISTS "Users can view own consent" ON sc_data_consent;
DROP POLICY IF EXISTS "Users can insert own consent" ON sc_data_consent;
DROP POLICY IF EXISTS "Users can update own consent" ON sc_data_consent;
DROP POLICY IF EXISTS "Users can delete own consent" ON sc_data_consent;

CREATE POLICY "Users can view own consent" ON sc_data_consent
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own consent" ON sc_data_consent
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own consent" ON sc_data_consent
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own consent" ON sc_data_consent
  FOR DELETE USING (auth.uid() = user_id);

-- sc_hr_zones policies
DROP POLICY IF EXISTS "Users can view own HR zones" ON sc_hr_zones;
DROP POLICY IF EXISTS "Users can insert own HR zones" ON sc_hr_zones;
DROP POLICY IF EXISTS "Users can update own HR zones" ON sc_hr_zones;
DROP POLICY IF EXISTS "Users can delete own HR zones" ON sc_hr_zones;

CREATE POLICY "Users can view own HR zones" ON sc_hr_zones
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own HR zones" ON sc_hr_zones
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own HR zones" ON sc_hr_zones
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own HR zones" ON sc_hr_zones
  FOR DELETE USING (auth.uid() = user_id);

-- Create function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_sc_profile_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist, then create new ones
DROP TRIGGER IF EXISTS update_sc_user_profiles_updated_at ON sc_user_profiles;
DROP TRIGGER IF EXISTS update_sc_program_enrollment_updated_at ON sc_program_enrollment;
DROP TRIGGER IF EXISTS update_sc_data_consent_updated_at ON sc_data_consent;

-- Create triggers for updated_at columns
CREATE TRIGGER update_sc_user_profiles_updated_at
  BEFORE UPDATE ON sc_user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_sc_profile_updated_at();

CREATE TRIGGER update_sc_program_enrollment_updated_at
  BEFORE UPDATE ON sc_program_enrollment
  FOR EACH ROW
  EXECUTE FUNCTION update_sc_profile_updated_at();

CREATE TRIGGER update_sc_data_consent_updated_at
  BEFORE UPDATE ON sc_data_consent
  FOR EACH ROW
  EXECUTE FUNCTION update_sc_profile_updated_at();

-- Create function to calculate age from birthdate
CREATE OR REPLACE FUNCTION calculate_age(birth_date DATE)
RETURNS INTEGER AS $$
BEGIN
  RETURN EXTRACT(YEAR FROM AGE(birth_date));
END;
$$ LANGUAGE plpgsql;

-- Create function to calculate HR zones from max HR
CREATE OR REPLACE FUNCTION calculate_hr_zones(max_hr INTEGER, resting_hr INTEGER DEFAULT NULL)
RETURNS TABLE (
  zone_1_min INTEGER,
  zone_1_max INTEGER,
  zone_2_min INTEGER,
  zone_2_max INTEGER,
  zone_3_min INTEGER,
  zone_3_max INTEGER,
  zone_4_min INTEGER,
  zone_4_max INTEGER,
  zone_5_min INTEGER,
  zone_5_max INTEGER
) AS $$
BEGIN
  RETURN QUERY SELECT
    ROUND(max_hr * 0.50)::INTEGER as zone_1_min,
    ROUND(max_hr * 0.60)::INTEGER as zone_1_max,
    ROUND(max_hr * 0.60)::INTEGER as zone_2_min,
    ROUND(max_hr * 0.70)::INTEGER as zone_2_max,
    ROUND(max_hr * 0.70)::INTEGER as zone_3_min,
    ROUND(max_hr * 0.80)::INTEGER as zone_3_max,
    ROUND(max_hr * 0.80)::INTEGER as zone_4_min,
    ROUND(max_hr * 0.90)::INTEGER as zone_4_max,
    ROUND(max_hr * 0.90)::INTEGER as zone_5_min,
    ROUND(max_hr * 1.00)::INTEGER as zone_5_max;
END;
$$ LANGUAGE plpgsql;

-- Add comments to document the tables
COMMENT ON TABLE sc_user_profiles IS 'User profiles for S&C program participants with basic health metrics';
COMMENT ON TABLE sc_baseline_tests IS 'Baseline test results for establishing starting fitness levels';
COMMENT ON TABLE sc_progress_tracking IS 'Progress tracking data to monitor improvements over time';
COMMENT ON TABLE sc_program_enrollment IS 'Program enrollment tracking and current phase management';
COMMENT ON TABLE sc_data_consent IS 'Data consent tracking for GDPR compliance and user privacy';
COMMENT ON TABLE sc_hr_zones IS 'Calculated heart rate zones for training intensity guidance';

COMMENT ON COLUMN sc_user_profiles.birthdate IS 'User birthdate for age calculation';
COMMENT ON COLUMN sc_user_profiles.max_hr IS 'Maximum heart rate (measured or estimated)';
COMMENT ON COLUMN sc_user_profiles.training_experience IS 'User experience level: beginner, intermediate, advanced';
COMMENT ON COLUMN sc_baseline_tests.test_type IS 'Type of baseline test performed';
COMMENT ON COLUMN sc_baseline_tests.result_value IS 'Test result value (time, distance, weight, etc.)';
COMMENT ON COLUMN sc_baseline_tests.test_conditions IS 'Additional test-specific data stored as JSON';
COMMENT ON COLUMN sc_progress_tracking.phase IS 'Training phase when test was performed';
COMMENT ON COLUMN sc_progress_tracking.metric_type IS 'Type of metric being tracked';
COMMENT ON COLUMN sc_program_enrollment.current_phase IS 'Current training phase the user is in';
COMMENT ON COLUMN sc_program_enrollment.phase_started_at IS 'When the current phase was started';
COMMENT ON COLUMN sc_program_enrollment.phase_completed_at IS 'When the current phase was completed';
COMMENT ON COLUMN sc_program_enrollment.is_active IS 'Whether the user is actively enrolled in the program';
COMMENT ON COLUMN sc_data_consent.consent_type IS 'Type of consent: program_participation, baseline_data, health_metrics, etc.';
COMMENT ON COLUMN sc_data_consent.granted IS 'Whether consent was granted (true) or withdrawn (false)';
COMMENT ON COLUMN sc_data_consent.granted_at IS 'When consent was initially granted';
COMMENT ON COLUMN sc_data_consent.withdrawn_at IS 'When consent was withdrawn (if applicable)';
COMMENT ON COLUMN sc_data_consent.consent_version IS 'Version of the consent form when consent was given';
COMMENT ON COLUMN sc_data_consent.retention_period IS 'How long to retain data after consent withdrawal';
COMMENT ON COLUMN sc_data_consent.auto_delete_at IS 'Automatic deletion timestamp for data retention compliance';
COMMENT ON COLUMN sc_hr_zones.calculation_method IS 'How HR zones were calculated: measured, estimated, or manual';
