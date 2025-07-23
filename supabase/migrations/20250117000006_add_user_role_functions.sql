-- Add missing user role functions for session templates RLS policies

-- Create user_has_any_role function
CREATE OR REPLACE FUNCTION user_has_any_role(user_uuid UUID, role_names TEXT[])
RETURNS BOOLEAN AS $$
DECLARE
  user_role_count INTEGER;
BEGIN
  -- Count how many of the specified roles the user has
  SELECT COUNT(*)
  INTO user_role_count
  FROM user_roles ur
  JOIN roles r ON ur.role_id = r.id
  WHERE ur.user_id = user_uuid
  AND r.name = ANY(role_names);
  
  -- Return true if user has at least one of the specified roles
  RETURN user_role_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION user_has_any_role(UUID, TEXT[]) TO authenticated;

-- Create user_has_role function for single role checks
CREATE OR REPLACE FUNCTION user_has_role(user_uuid UUID, role_name TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  user_role_count INTEGER;
BEGIN
  -- Count how many of the specified role the user has
  SELECT COUNT(*)
  INTO user_role_count
  FROM user_roles ur
  JOIN roles r ON ur.role_id = r.id
  WHERE ur.user_id = user_uuid
  AND r.name = role_name;
  
  -- Return true if user has the specified role
  RETURN user_role_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION user_has_role(UUID, TEXT) TO authenticated; 