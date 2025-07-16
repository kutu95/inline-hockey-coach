-- Add superadmin organization access
-- This script gives superadmins automatic access to all organizations

-- 1. Create a function to check if user is superadmin
CREATE OR REPLACE FUNCTION is_superadmin(user_uuid UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = user_uuid AND r.name = 'superadmin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create a function to get user's organization access
CREATE OR REPLACE FUNCTION get_user_organization_access(user_uuid UUID DEFAULT auth.uid())
RETURNS UUID[] AS $$
DECLARE
  org_ids UUID[] := ARRAY[]::UUID[];
BEGIN
  -- If user is superadmin, return all organization IDs
  IF is_superadmin(user_uuid) THEN
    SELECT array_agg(id) INTO org_ids FROM organizations;
  ELSE
    -- Otherwise, return organizations where user has explicit access
    SELECT array_agg(organization_id) INTO org_ids 
    FROM organization_users 
    WHERE user_id = user_uuid;
  END IF;
  
  RETURN COALESCE(org_ids, ARRAY[]::UUID[]);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Update RLS policies to allow superadmins access to all organizations
-- Update players table policies
DROP POLICY IF EXISTS "Users can view their own players" ON players;
CREATE POLICY "Users can view their own players" ON players
  FOR SELECT USING (
    auth.uid() = coach_id OR 
    is_superadmin() OR
    organization_id = ANY(get_user_organization_access())
  );

-- Update clubs table policies  
DROP POLICY IF EXISTS "Users can view their own clubs" ON clubs;
CREATE POLICY "Users can view their own clubs" ON clubs
  FOR SELECT USING (
    auth.uid() = coach_id OR 
    is_superadmin() OR
    organization_id = ANY(get_user_organization_access())
  );

-- Update squads table policies
DROP POLICY IF EXISTS "Users can view their own squads" ON squads;
CREATE POLICY "Users can view their own squads" ON squads
  FOR SELECT USING (
    auth.uid() = coach_id OR 
    is_superadmin() OR
    organization_id = ANY(get_user_organization_access())
  );

-- Update sessions table policies
DROP POLICY IF EXISTS "Users can view their own sessions" ON sessions;
CREATE POLICY "Users can view their own sessions" ON sessions
  FOR SELECT USING (
    auth.uid() = coach_id OR 
    is_superadmin() OR
    organization_id = ANY(get_user_organization_access())
  );

-- 4. Create a function to check if user has access to a specific organization
CREATE OR REPLACE FUNCTION has_organization_access(org_id UUID, user_uuid UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN is_superadmin(user_uuid) OR org_id = ANY(get_user_organization_access(user_uuid));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Test the functions
SELECT is_superadmin('f5021231-1b0e-491e-8909-d981016f08b2');
SELECT get_user_organization_access('f5021231-1b0e-491e-8909-d981016f08b2');

-- 6. Show all organizations (superadmin should see all)
SELECT id, name FROM organizations; 