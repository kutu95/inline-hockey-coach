-- Migration to support individual players for S&C program access
-- This allows players to register independently without being part of a club/organization

-- 1. Create a default "Individual Players" organization
INSERT INTO organizations (id, name, description, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Individual Players',
  'Default organization for individual players accessing the S&C program',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- 2. Add player_type column to distinguish between club and individual players
ALTER TABLE players ADD COLUMN IF NOT EXISTS player_type TEXT DEFAULT 'club' 
  CHECK (player_type IN ('club', 'individual'));

-- 3. Make organization_id nullable for individual players
ALTER TABLE players ALTER COLUMN organization_id DROP NOT NULL;

-- 4. Make club_id nullable for individual players  
ALTER TABLE players ALTER COLUMN club_id DROP NOT NULL;

-- 5. Update RLS policies to handle individual players
DROP POLICY IF EXISTS "Players are viewable by authenticated users" ON players;
CREATE POLICY "Players are viewable by authenticated users" ON players
  FOR SELECT USING (
    is_superadmin(auth.uid()) OR
    (user_id = auth.uid()) OR  -- Players can view their own profile
    (organization_id IS NOT NULL AND organization_id = get_user_organization(auth.uid())) OR
    (player_type = 'individual' AND organization_id = '00000000-0000-0000-0000-000000000001')
  );

DROP POLICY IF EXISTS "Coaches and admins can manage players" ON players;
CREATE POLICY "Coaches and admins can manage players" ON players
  FOR ALL USING (
    is_superadmin(auth.uid()) OR
    (user_id = auth.uid()) OR  -- Players can manage their own profile
    (organization_id IS NOT NULL AND organization_id = get_user_organization(auth.uid())) OR
    (player_type = 'individual' AND organization_id = '00000000-0000-0000-0000-000000000001')
  );

-- 6. Create function to get individual player organization
CREATE OR REPLACE FUNCTION get_individual_player_organization()
RETURNS UUID AS $$
BEGIN
  RETURN '00000000-0000-0000-0000-000000000001';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Update get_user_organization function to handle individual players
CREATE OR REPLACE FUNCTION get_user_organization(user_uuid UUID)
RETURNS UUID AS $$
BEGIN
  -- Check if user is an individual player
  IF EXISTS (
    SELECT 1 FROM players 
    WHERE user_id = user_uuid 
    AND player_type = 'individual'
    AND organization_id = '00000000-0000-0000-0000-000000000001'
  ) THEN
    RETURN '00000000-0000-0000-0000-000000000001';
  END IF;
  
  -- For club players, return their organization
  RETURN (
    SELECT organization_id FROM players 
    WHERE user_id = user_uuid 
    AND organization_id IS NOT NULL
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Add index for individual players
CREATE INDEX IF NOT EXISTS idx_players_individual ON players(player_type, organization_id) 
WHERE player_type = 'individual';

-- 9. Add comment to document the change
COMMENT ON COLUMN players.player_type IS 'Type of player: club (part of organization) or individual (S&C program only)';
COMMENT ON COLUMN players.organization_id IS 'Organization ID - can be NULL for individual players who use default individual organization';

-- 10. Update existing players to have club type (if not already set)
UPDATE players SET player_type = 'club' WHERE player_type IS NULL;
