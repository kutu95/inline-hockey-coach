-- Fix Organizations RLS Policies - No Recursion
-- This script fixes the RLS policies for the organizations table to avoid infinite recursion

-- Drop the existing problematic policies
DROP POLICY IF EXISTS "Users can view their own organization" ON organizations;
DROP POLICY IF EXISTS "Users can manage their own organization" ON organizations;
DROP POLICY IF EXISTS "Superadmins can manage all organizations" ON organizations;
DROP POLICY IF EXISTS "Authenticated users can view organizations" ON organizations;

-- Create a simple policy that allows superadmins to manage all organizations
CREATE POLICY "Superadmins can manage all organizations" ON organizations
    FOR ALL USING (
        auth.role() = 'superadmin'
    );

-- For now, allow all authenticated users to view organizations
-- This is a temporary fix until we can implement proper organization-based access
CREATE POLICY "Authenticated users can view organizations" ON organizations
    FOR SELECT USING (
        auth.uid() IS NOT NULL
    );

-- Success message
SELECT 'Organizations RLS policies fixed - no recursion!' as status; 