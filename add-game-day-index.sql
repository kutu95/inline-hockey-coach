-- Add game_day_index field to sc_plans table
-- This allows users to specify which day of the week their games are on

ALTER TABLE sc_plans ADD COLUMN IF NOT EXISTS game_day_index INTEGER DEFAULT 6;

-- Add a comment to explain the field
COMMENT ON COLUMN sc_plans.game_day_index IS 'Day of the week for games: 0=Monday, 1=Tuesday, 2=Wednesday, 3=Thursday, 4=Friday, 5=Saturday, 6=Sunday';

-- Add a check constraint to ensure valid day indices
ALTER TABLE sc_plans ADD CONSTRAINT sc_plans_game_day_index_check 
  CHECK (game_day_index >= 0 AND game_day_index <= 6);
