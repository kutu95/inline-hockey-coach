-- Add is_active field to squads table
-- This migration adds an is_active boolean field to indicate if a squad is currently active

-- Add the is_active column with a default value of true
ALTER TABLE squads 
ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;

-- Add a comment to document the field
COMMENT ON COLUMN squads.is_active IS 'Indicates whether the squad is currently active (true) or inactive (false)';

-- Update RLS policies to include the new field
-- Note: Existing policies should continue to work, but we can add specific policies if needed

-- Optional: Add an index for better query performance when filtering by active status
CREATE INDEX IF NOT EXISTS idx_squads_is_active ON squads(is_active);

-- Optional: Add a policy to allow users to see active/inactive status
-- This assumes existing policies already handle squad access 