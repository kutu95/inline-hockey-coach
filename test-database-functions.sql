-- Test Database Functions
-- Run this in your Supabase SQL editor to verify functions are working

-- Test 1: Check if functions exist
SELECT 
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('get_user_roles', 'user_has_role', 'user_has_any_role', 'user_has_all_roles')
ORDER BY routine_name;

-- Test 2: Check if roles table has data
SELECT 'Roles table data:' as test_info;
SELECT * FROM roles ORDER BY name;

-- Test 3: Check if user_roles table has data
SELECT 'User roles table data:' as test_info;
SELECT 
    ur.user_id,
    r.name as role_name,
    ur.created_at
FROM user_roles ur
JOIN roles r ON ur.role_id = r.id
ORDER BY ur.user_id, r.name;

-- Test 4: Test get_user_roles function (replace with your user ID)
-- Replace 'your-user-id-here' with an actual user ID from your system
SELECT 'Testing get_user_roles function:' as test_info;
SELECT get_user_roles('your-user-id-here'::UUID) as user_roles;

-- Test 5: Test user_has_role function
SELECT 'Testing user_has_role function:' as test_info;
SELECT user_has_role('your-user-id-here'::UUID, 'admin') as is_admin;
SELECT user_has_role('your-user-id-here'::UUID, 'coach') as is_coach;
SELECT user_has_role('your-user-id-here'::UUID, 'player') as is_player;

-- Test 6: Test user_has_any_role function
SELECT 'Testing user_has_any_role function:' as test_info;
SELECT user_has_any_role('your-user-id-here'::UUID, ARRAY['admin', 'coach']) as has_any_role;

-- Test 7: Test user_has_all_roles function
SELECT 'Testing user_has_all_roles function:' as test_info;
SELECT user_has_all_roles('your-user-id-here'::UUID, ARRAY['admin', 'coach']) as has_all_roles;

-- Test 8: Check current user's roles (if authenticated)
SELECT 'Current user roles:' as test_info;
SELECT get_user_roles(auth.uid()) as current_user_roles;
SELECT user_has_role(auth.uid(), 'admin') as current_user_is_admin; 