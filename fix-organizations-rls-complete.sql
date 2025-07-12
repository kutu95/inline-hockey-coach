-- Complete fix for Organizations RLS Policies
-- This script ensures both SELECT and UPDATE operations work for superadmins

-- First, disable RLS temporarily to check if that's the issue
ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;

-- Test if we can update without RLS
UPDATE organizations 
SET name = 'Test Without RLS', description = 'Testing without RLS'
WHERE id = '00000000-0000-0000-0000-000000000001';

-- Check the result
SELECT 'Test without RLS:' as status;
SELECT id, name, description, updated_at FROM organizations WHERE id = '00000000-0000-0000-0000-000000000001';

-- Reset the test
UPDATE organizations 
SET name = 'Default Organization', description = 'Default organization for existing data'
WHERE id = '00000000-0000-0000-0000-000000000001';

-- Now re-enable RLS with proper policies
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view their own organization" ON organizations;
DROP POLICY IF EXISTS "Users can manage their own organization" ON organizations;
DROP POLICY IF EXISTS "Superadmins can manage all organizations" ON organizations;
DROP POLICY IF EXISTS "Authenticated users can view organizations" ON organizations;

-- Create a simple policy that allows superadmins to do everything
CREATE POLICY "Superadmins can do everything" ON organizations
    FOR ALL USING (
        auth.role() = 'superadmin'
    );

-- Create a policy for authenticated users to view organizations
CREATE POLICY "Authenticated users can view organizations" ON organizations
    FOR SELECT USING (
        auth.uid() IS NOT NULL
    );

-- Test the update with RLS enabled
UPDATE organizations 
SET name = 'Test With RLS', description = 'Testing with RLS'
WHERE id = '00000000-0000-0000-0000-000000000001';

-- Check the result
SELECT 'Test with RLS:' as status;
SELECT id, name, description, updated_at FROM organizations WHERE id = '00000000-0000-0000-0000-000000000001';

-- Reset to original
UPDATE organizations 
SET name = 'Default Organization', description = 'Default organization for existing data'
WHERE id = '00000000-0000-0000-0000-000000000001';

SELECT 'RLS fix completed!' as status; 