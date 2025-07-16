-- Temporarily disable RLS on user_roles table for testing
-- This will allow role fetching to work while we fix the RLS policies

-- Disable RLS on user_roles table
ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'user_roles';

-- Test the role fetching for your user (replace with your actual user ID)
SELECT ur.user_id, r.name as role_name
FROM user_roles ur
JOIN roles r ON ur.role_id = r.id
WHERE ur.user_id = 'f5021231-1b0e-491e-8909-d981016f08b2';

-- To re-enable RLS later, run:
-- ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY; 