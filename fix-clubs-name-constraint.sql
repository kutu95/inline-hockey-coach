-- Fix clubs table name constraint to be unique within organization, not globally
-- This allows multiple organizations to have clubs with the same name

-- Drop the existing global unique constraint on name
ALTER TABLE clubs DROP CONSTRAINT IF EXISTS clubs_name_key;

-- Create a composite unique constraint on (name, organization_id)
-- This ensures club names are unique within each organization
ALTER TABLE clubs ADD CONSTRAINT clubs_name_organization_unique 
  UNIQUE (name, organization_id);

-- Add a comment to document the change
COMMENT ON CONSTRAINT clubs_name_organization_unique ON clubs 
IS 'Ensures club names are unique within each organization, not globally across all organizations';
