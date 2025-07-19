-- Check if user_roles table exists and has data
SELECT COUNT(*) as total_user_roles FROM user_roles;

-- Check the structure of user_roles table
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'user_roles';

-- Check if there are any user_roles for a specific user
-- Replace with an actual user ID from your auth.users table
SELECT * FROM user_roles LIMIT 5;

-- Check if roles table exists and has data
SELECT COUNT(*) as total_roles FROM roles;

-- Check the structure of roles table
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'roles';

-- Check what roles exist
SELECT * FROM roles;

-- Check if RLS is enabled on these tables
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename IN ('user_roles', 'roles');

-- Test a simple query without any conditions
SELECT * FROM user_roles LIMIT 1; 