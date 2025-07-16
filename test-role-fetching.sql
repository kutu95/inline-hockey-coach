-- Test script to verify role fetching works with RLS disabled

-- 1. Check if RLS is disabled on user_roles
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'user_roles';

-- 2. Check if the user exists and has roles
SELECT ur.user_id, ur.role_id, r.name as role_name
FROM user_roles ur
JOIN roles r ON ur.role_id = r.id
WHERE ur.user_id = 'f5021231-1b0e-491e-8909-d981016f08b2';

-- 3. Test the get_user_roles function directly
SELECT get_user_roles('f5021231-1b0e-491e-8909-d981016f08b2');

-- 4. Check if the function exists and is working
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_name = 'get_user_roles';

-- 5. Simple query without joins to test basic access
SELECT role_id 
FROM user_roles 
WHERE user_id = 'f5021231-1b0e-491e-8909-d981016f08b2'; 