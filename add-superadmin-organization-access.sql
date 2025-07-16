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

-- 2. Create a function to get user's organization
CREATE OR REPLACE FUNCTION get_user_organization(user_uuid UUID DEFAULT auth.uid())
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT organization_id 
    FROM users 
    WHERE id = user_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create a function to check if user has access to an organization
CREATE OR REPLACE FUNCTION has_organization_access(org_id UUID, user_uuid UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  -- Superadmins can access all organizations for debugging
  -- Regular users can only access their own organization
  RETURN is_superadmin(user_uuid) OR get_user_organization(user_uuid) = org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Update RLS policies to allow superadmins read access but not automatic admin access
-- Update players table policies
DROP POLICY IF EXISTS "Users can view players in their organization" ON players;
CREATE POLICY "Users can view players in their organization" ON players
  FOR SELECT USING (
    has_organization_access(organization_id)
  );

-- Update clubs table policies  
DROP POLICY IF EXISTS "Users can view clubs in their organization" ON clubs;
CREATE POLICY "Users can view clubs in their organization" ON clubs
  FOR SELECT USING (
    has_organization_access(organization_id)
  );

-- Update squads table policies
DROP POLICY IF EXISTS "Users can view squads in their organization" ON squads;
CREATE POLICY "Users can view squads in their organization" ON squads
  FOR SELECT USING (
    has_organization_access(organization_id)
  );

-- Update sessions table policies
DROP POLICY IF EXISTS "Users can view sessions in their organization" ON sessions;
CREATE POLICY "Users can view sessions in their organization" ON sessions
  FOR SELECT USING (
    has_organization_access(organization_id)
  );

-- Update drills table policies
DROP POLICY IF EXISTS "Users can view drills in their organization" ON drills;
CREATE POLICY "Users can view drills in their organization" ON drills
  FOR SELECT USING (
    has_organization_access(organization_id)
  );

-- 5. Test the functions
SELECT is_superadmin('f5021231-1b0e-491e-8909-d981016f08b2');
SELECT get_user_organization('f5021231-1b0e-491e-8909-d981016f08b2');

-- 6. Show all organizations (superadmin should see all for debugging)
SELECT id, name FROM organizations; 