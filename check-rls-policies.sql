-- Check RLS policies on user_roles table
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
WHERE tablename = 'user_roles';

-- Check RLS policies on roles table
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
WHERE tablename = 'roles';

-- Check if RLS is enabled on these tables
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename IN ('user_roles', 'roles');

-- Test a simple query to see if it works
SELECT COUNT(*) FROM user_roles;

-- Test with auth.uid() to see if that's the issue
SELECT COUNT(*) FROM user_roles WHERE user_id = auth.uid(); 