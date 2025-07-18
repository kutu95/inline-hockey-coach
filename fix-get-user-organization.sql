-- Fix the get_user_organization function to properly look up user's organization
CREATE OR REPLACE FUNCTION get_user_organization(user_uuid UUID)
RETURNS UUID AS $$
DECLARE
  user_org_id UUID;
BEGIN
  -- First try to get organization from user_roles table
  SELECT organization_id INTO user_org_id
  FROM user_roles ur
  WHERE ur.user_id = user_uuid
  AND ur.organization_id IS NOT NULL
  LIMIT 1;
  
  -- If found, return it
  IF user_org_id IS NOT NULL THEN
    RETURN user_org_id;
  END IF;
  
  -- Fallback: return the first organization (for backward compatibility)
  RETURN (
    SELECT id FROM organizations LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 