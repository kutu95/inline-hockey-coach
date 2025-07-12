-- Migration to add level field to drills
-- This adds a level column to track drill difficulty: beginner, intermediate, advanced

-- Add level column to drills table with default value
ALTER TABLE drills ADD COLUMN IF NOT EXISTS level TEXT DEFAULT 'beginner';

-- Add constraint to ensure level is one of the valid options
ALTER TABLE drills ADD CONSTRAINT check_drill_level 
    CHECK (level IN ('beginner', 'intermediate', 'advanced'));

-- Update existing drills to have a default level if they don't have one
UPDATE drills SET level = 'beginner' WHERE level IS NULL; 