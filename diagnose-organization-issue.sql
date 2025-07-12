-- Diagnostic script to check why organization updates aren't working
-- Run this in your Supabase SQL editor

-- 1. Check current organization data
SELECT 'Current organization data:' as status;
SELECT id, name, description, logo_url, created_at, updated_at 
FROM organizations 
ORDER BY name;

-- 2. Check if RLS is enabled
SELECT 'RLS status:' as status;
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'organizations';

-- 3. Check current RLS policies
SELECT 'Current RLS policies:' as status;
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'organizations';

-- 4. Check if the user has superadmin role
SELECT 'User roles check:' as status;
SELECT 
    auth.uid() as current_user_id,
    auth.role() as current_role,
    auth.email() as current_email;

-- 5. Test direct update without RLS
SELECT 'Testing direct update...' as status;
-- Temporarily disable RLS
ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;

-- Try update
UPDATE organizations 
SET name = 'Direct Test', description = 'Direct update test'
WHERE id = '00000000-0000-0000-0000-000000000001';

-- Check result
SELECT 'After direct update:' as status;
SELECT id, name, description, updated_at 
FROM organizations 
WHERE id = '00000000-0000-0000-0000-000000000001';

-- Reset
UPDATE organizations 
SET name = 'Default Organization', description = 'Default organization for existing data'
WHERE id = '00000000-0000-0000-0000-000000000001';

-- Re-enable RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

SELECT 'Diagnostic complete!' as status; 