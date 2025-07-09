-- Add hand field to players table
ALTER TABLE players ADD COLUMN hand TEXT CHECK (hand IN ('left', 'right', '') OR hand IS NULL);

-- Add comment to document the field
COMMENT ON COLUMN players.hand IS 'Player''s dominant hand: left, right, or blank'; 