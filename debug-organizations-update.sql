-- Debug script to check why organization updates aren't working
-- Run this in your Supabase SQL editor

-- 1. Check current organization data
SELECT 'Current organization data:' as status;
SELECT id, name, description, logo_url, created_at, updated_at 
FROM organizations 
WHERE id = '00000000-0000-0000-0000-000000000001';

-- 2. Check if there are any triggers on the organizations table
SELECT 'Triggers on organizations table:' as status;
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'organizations';

-- 3. Check if there are any constraints that might prevent updates
SELECT 'Constraints on organizations table:' as status;
SELECT 
    constraint_name,
    constraint_type,
    table_name
FROM information_schema.table_constraints 
WHERE table_name = 'organizations';

-- 4. Check current RLS policies
SELECT 'Current RLS policies:' as status;
SELECT 
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'organizations';

-- 5. Test a direct update with explicit role check
SELECT 'Testing direct update with role check...' as status;

-- Temporarily disable RLS to test
ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;

-- Try the update
UPDATE organizations 
SET name = 'Direct Test Update', description = 'Direct test update'
WHERE id = '00000000-0000-0000-0000-000000000001';

-- Check result
SELECT 'After direct update:' as status;
SELECT id, name, description, updated_at 
FROM organizations 
WHERE id = '00000000-0000-0000-0000-000000000001';

-- Reset to a known state
UPDATE organizations 
SET name = 'WA', description = 'WA Inline Hockey Organization'
WHERE id = '00000000-0000-0000-0000-000000000001';

-- Re-enable RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Re-create the superadmin policy
DROP POLICY IF EXISTS "Superadmins can do everything" ON organizations;
CREATE POLICY "Superadmins can do everything" ON organizations
    FOR ALL USING (
        auth.role() = 'superadmin'
    );

SELECT 'Debug complete! Organization should now be named "WA"' as status; 