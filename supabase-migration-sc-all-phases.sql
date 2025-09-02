-- Update sc_plans table to support all 6 phases (PHASE_0 through PHASE_5)
-- This migration updates the existing constraint to allow all phases

-- Drop the existing constraint if it exists
ALTER TABLE sc_plans DROP CONSTRAINT IF EXISTS sc_plans_phase_check;

-- Add the new constraint that allows all phases
ALTER TABLE sc_plans ADD CONSTRAINT sc_plans_phase_check
  CHECK (phase IN ('PHASE_0', 'PHASE_I', 'PHASE_II', 'PHASE_III', 'PHASE_IV', 'PHASE_V'));

-- Add a comment to document the phases
COMMENT ON COLUMN sc_plans.phase IS 'Training phase: PHASE_0 (Pre-Season Prep), PHASE_I (Foundation), PHASE_II (Transition), PHASE_III (Peak Power), PHASE_IV (Competition), PHASE_V (Recovery)';
