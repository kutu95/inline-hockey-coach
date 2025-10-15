-- Add selected_game_days field to sc_plans table
-- This stores the array of day indices (0=Monday, 6=Sunday) for selected game days

ALTER TABLE sc_plans ADD COLUMN IF NOT EXISTS selected_game_days INTEGER[] DEFAULT '{6}';

-- Add a comment to explain the field
COMMENT ON COLUMN sc_plans.selected_game_days IS 'Array of day indices for selected game days: 0=Monday, 1=Tuesday, 2=Wednesday, 3=Thursday, 4=Friday, 5=Saturday, 6=Sunday';

-- Add a check constraint to ensure valid array length (0-3 days)
ALTER TABLE sc_plans ADD CONSTRAINT sc_plans_selected_game_days_check 
  CHECK (array_length(selected_game_days, 1) IS NULL OR 
         (array_length(selected_game_days, 1) >= 0 AND 
          array_length(selected_game_days, 1) <= 3));
