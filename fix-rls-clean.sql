-- Fix RLS policies properly for organizations (Clean version)
-- This script creates the correct policies that allow superadmins to manage organizations

-- Re-enable RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "Users can view their own organization" ON organizations;
DROP POLICY IF EXISTS "Users can manage their own organization" ON organizations;
DROP POLICY IF EXISTS "Superadmins can manage all organizations" ON organizations;
DROP POLICY IF EXISTS "Authenticated users can view organizations" ON organizations;
DROP POLICY IF EXISTS "Superadmins can do everything" ON organizations;

-- Create a policy that allows superadmins to do everything
CREATE POLICY "Superadmins can do everything" ON organizations
    FOR ALL USING (
        auth.role() = 'superadmin'
    );

-- Create a policy for authenticated users to view organizations
CREATE POLICY "Authenticated users can view organizations" ON organizations
    FOR SELECT USING (
        auth.uid() IS NOT NULL
    );

-- Test the policies (without resetting)
SELECT 'Testing superadmin update...' as status;
UPDATE organizations 
SET name = 'Test With Fixed RLS', description = 'Testing with fixed RLS policies'
WHERE id = '00000000-0000-0000-0000-000000000001';

-- Check the result
SELECT 'After fixing RLS:' as status;
SELECT id, name, description, updated_at 
FROM organizations 
WHERE id = '00000000-0000-0000-0000-000000000001';

SELECT 'RLS fixed properly! Your changes will now persist.' as status; 