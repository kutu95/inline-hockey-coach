-- Create organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  logo_url TEXT,
  website_url TEXT,
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add organization_id to existing tables
ALTER TABLE players ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE squads ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE drills ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE invitations ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_players_organization_id ON players(organization_id);
CREATE INDEX IF NOT EXISTS idx_clubs_organization_id ON clubs(organization_id);
CREATE INDEX IF NOT EXISTS idx_squads_organization_id ON squads(organization_id);
CREATE INDEX IF NOT EXISTS idx_sessions_organization_id ON sessions(organization_id);
CREATE INDEX IF NOT EXISTS idx_drills_organization_id ON drills(organization_id);
CREATE INDEX IF NOT EXISTS idx_invitations_organization_id ON invitations(organization_id);

-- Add superadmin role to roles table
INSERT INTO roles (name, description) 
VALUES ('superadmin', 'Can administer all organizations')
ON CONFLICT (name) DO NOTHING;

-- Create function to get user's organization
CREATE OR REPLACE FUNCTION get_user_organization(user_uuid UUID)
RETURNS UUID AS $$
BEGIN
  -- For now, return the first organization (default)
  -- This can be enhanced later to store user-organization relationships
  RETURN (
    SELECT id FROM organizations LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check if user is superadmin
CREATE OR REPLACE FUNCTION is_superadmin(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = user_uuid AND r.name = 'superadmin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update RLS policies for multi-tenant access
-- Players table
DROP POLICY IF EXISTS "Players are viewable by authenticated users" ON players;
CREATE POLICY "Players are viewable by authenticated users" ON players
  FOR SELECT USING (
    is_superadmin(auth.uid()) OR
    (organization_id IS NOT NULL AND organization_id = get_user_organization(auth.uid()))
  );

DROP POLICY IF EXISTS "Coaches and admins can manage players" ON players;
CREATE POLICY "Coaches and admins can manage players" ON players
  FOR ALL USING (
    is_superadmin(auth.uid()) OR
    (organization_id IS NOT NULL AND organization_id = get_user_organization(auth.uid()))
  );

-- Clubs table
DROP POLICY IF EXISTS "Clubs are viewable by authenticated users" ON clubs;
CREATE POLICY "Clubs are viewable by authenticated users" ON clubs
  FOR SELECT USING (
    is_superadmin(auth.uid()) OR
    (organization_id IS NOT NULL AND organization_id = get_user_organization(auth.uid()))
  );

DROP POLICY IF EXISTS "Coaches and admins can manage clubs" ON clubs;
CREATE POLICY "Coaches and admins can manage clubs" ON clubs
  FOR ALL USING (
    is_superadmin(auth.uid()) OR
    (organization_id IS NOT NULL AND organization_id = get_user_organization(auth.uid()))
  );

-- Squads table
DROP POLICY IF EXISTS "Squads are viewable by authenticated users" ON squads;
CREATE POLICY "Squads are viewable by authenticated users" ON squads
  FOR SELECT USING (
    is_superadmin(auth.uid()) OR
    (organization_id IS NOT NULL AND organization_id = get_user_organization(auth.uid()))
  );

DROP POLICY IF EXISTS "Coaches and admins can manage squads" ON squads;
CREATE POLICY "Coaches and admins can manage squads" ON squads
  FOR ALL USING (
    is_superadmin(auth.uid()) OR
    (organization_id IS NOT NULL AND organization_id = get_user_organization(auth.uid()))
  );

-- Sessions table
DROP POLICY IF EXISTS "Sessions are viewable by authenticated users" ON sessions;
CREATE POLICY "Sessions are viewable by authenticated users" ON sessions
  FOR SELECT USING (
    is_superadmin(auth.uid()) OR
    (organization_id IS NOT NULL AND organization_id = get_user_organization(auth.uid()))
  );

DROP POLICY IF EXISTS "Coaches and admins can manage sessions" ON sessions;
CREATE POLICY "Coaches and admins can manage sessions" ON sessions
  FOR ALL USING (
    is_superadmin(auth.uid()) OR
    (organization_id IS NOT NULL AND organization_id = get_user_organization(auth.uid()))
  );

-- Drills table
DROP POLICY IF EXISTS "Drills are viewable by authenticated users" ON drills;
CREATE POLICY "Drills are viewable by authenticated users" ON drills
  FOR SELECT USING (
    is_superadmin(auth.uid()) OR
    (organization_id IS NOT NULL AND organization_id = get_user_organization(auth.uid()))
  );

DROP POLICY IF EXISTS "Coaches and admins can manage drills" ON drills;
CREATE POLICY "Coaches and admins can manage drills" ON drills
  FOR ALL USING (
    is_superadmin(auth.uid()) OR
    (organization_id IS NOT NULL AND organization_id = get_user_organization(auth.uid()))
  );

-- Invitations table (if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invitations') THEN
    DROP POLICY IF EXISTS "Users can view invitations in their organization" ON invitations;
    CREATE POLICY "Users can view invitations in their organization" ON invitations
      FOR SELECT USING (
        is_superadmin(auth.uid()) OR
        (organization_id IS NOT NULL AND organization_id = get_user_organization(auth.uid()))
      );

    DROP POLICY IF EXISTS "Admins can manage invitations in their organization" ON invitations;
    CREATE POLICY "Admins can manage invitations in their organization" ON invitations
      FOR ALL USING (
        is_superadmin(auth.uid()) OR
        (organization_id IS NOT NULL AND organization_id = get_user_organization(auth.uid()))
      );
  END IF;
END $$;

-- Organizations table policies
CREATE POLICY "Superadmins can manage all organizations" ON organizations
  FOR ALL USING (is_superadmin(auth.uid()));

CREATE POLICY "Users can view their own organization" ON organizations
  FOR SELECT USING (
    is_superadmin(auth.uid()) OR
    id = get_user_organization(auth.uid())
  );

-- Enable RLS on organizations table
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY; 