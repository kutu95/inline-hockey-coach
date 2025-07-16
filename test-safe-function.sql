-- Test if the safe function exists and works
SELECT routine_name, routine_type, data_type
FROM information_schema.routines 
WHERE routine_name = 'get_user_roles_safe';

-- Test the function directly
SELECT get_user_roles_safe('f5021231-1b0e-491e-8909-d981016f08b2');

-- Check if RLS is still disabled on user_roles
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'user_roles';

-- Simple test query to see if data is accessible
SELECT COUNT(*) FROM user_roles WHERE user_id = 'f5021231-1b0e-491e-8909-d981016f08b2'; 