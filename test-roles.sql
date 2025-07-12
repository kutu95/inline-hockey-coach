-- Test script to debug role fetching
-- Run this in your Supabase SQL editor

-- Check if the tables exist and have data
SELECT 'roles table count:' as info, COUNT(*) as count FROM roles;

SELECT 'user_roles table count:' as info, COUNT(*) as count FROM user_roles;

-- Check the specific user's roles
SELECT 
  'user_roles for specific user:' as info,
  ur.user_id,
  ur.role_id,
  r.name as role_name
FROM user_roles ur
JOIN roles r ON ur.role_id = r.id
WHERE ur.user_id = 'f5021231-1b0e-491e-8909-d981016f08b2'::UUID;

-- Test the exact query that the app is using
SELECT 
  ur.role_id,
  r.name,
  r.description
FROM user_roles ur
JOIN roles r ON ur.role_id = r.id
WHERE ur.user_id = 'f5021231-1b0e-491e-8909-d981016f08b2'::UUID;

-- Check RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename IN ('roles', 'user_roles');

-- Test if the current user can access the tables
SELECT 'Current user can access roles:' as info, COUNT(*) as count FROM roles;

SELECT 'Current user can access user_roles:' as info, COUNT(*) as count FROM user_roles; 