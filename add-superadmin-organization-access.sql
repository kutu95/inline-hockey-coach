-- Add superadmin organization access with contextual permissions
-- This script gives superadmins read access for debugging but not automatic admin rights

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

-- 2. Create a function to get user's actual organization roles
CREATE OR REPLACE FUNCTION get_user_organization_roles(user_uuid UUID DEFAULT auth.uid())
RETURNS TABLE(organization_id UUID, role_name TEXT) AS $$
BEGIN
  -- Return explicit organization roles
  RETURN QUERY
  SELECT ou.organization_id, r.name as role_name
  FROM organization_users ou
  JOIN roles r ON ou.role_id = r.id
  WHERE ou.user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create a function to check if user has admin access to an organization
CREATE OR REPLACE FUNCTION has_organization_admin_access(org_id UUID, user_uuid UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  -- Superadmins have read access to all organizations for debugging
  -- But they only have admin access to organizations where they have explicit admin role
  RETURN EXISTS (
    SELECT 1 FROM organization_users ou
    JOIN roles r ON ou.role_id = r.id
    WHERE ou.user_id = user_uuid 
    AND ou.organization_id = org_id 
    AND r.name IN ('admin', 'superadmin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create a function to check if user has read access to an organization
CREATE OR REPLACE FUNCTION has_organization_read_access(org_id UUID, user_uuid UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  -- Superadmins can read all organizations for debugging
  -- Regular users can only read organizations where they have explicit access
  RETURN is_superadmin(user_uuid) OR EXISTS (
    SELECT 1 FROM organization_users ou
    WHERE ou.user_id = user_uuid AND ou.organization_id = org_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Update RLS policies to allow superadmins read access but not automatic admin access
-- Update players table policies
DROP POLICY IF EXISTS "Users can view their own players" ON players;
CREATE POLICY "Users can view their own players" ON players
  FOR SELECT USING (
    has_organization_read_access(organization_id)
  );

-- Update clubs table policies  
DROP POLICY IF EXISTS "Users can view their own clubs" ON clubs;
CREATE POLICY "Users can view their own clubs" ON clubs
  FOR SELECT USING (
    has_organization_read_access(organization_id)
  );

-- Update squads table policies
DROP POLICY IF EXISTS "Users can view their own squads" ON squads;
CREATE POLICY "Users can view their own squads" ON squads
  FOR SELECT USING (
    has_organization_read_access(organization_id)
  );

-- Update sessions table policies
DROP POLICY IF EXISTS "Users can view their own sessions" ON sessions;
CREATE POLICY "Users can view their own sessions" ON sessions
  FOR SELECT USING (
    has_organization_read_access(organization_id)
  );

-- 6. Test the functions
SELECT is_superadmin('f5021231-1b0e-491e-8909-d981016f08b2');
SELECT * FROM get_user_organization_roles('f5021231-1b0e-491e-8909-d981016f08b2');

-- 7. Show all organizations (superadmin should see all for debugging)
SELECT id, name FROM organizations; 