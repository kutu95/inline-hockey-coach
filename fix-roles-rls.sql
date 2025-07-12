-- Fix RLS policies for roles table
-- Run this in your Supabase SQL editor

-- Drop the existing policy that's too restrictive
DROP POLICY IF EXISTS "Roles are viewable by authenticated users" ON roles;

-- Create a more permissive policy that allows authenticated users to read roles
CREATE POLICY "Roles are viewable by authenticated users" ON roles
  FOR SELECT USING (auth.role() = 'authenticated');

-- Also create a policy for admins to manage roles
CREATE POLICY "Admins can manage roles" ON roles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() AND r.name = 'admin'
    )
  );

-- Test the access
SELECT 'Testing roles access:' as info, COUNT(*) as count FROM roles;

-- Test the full query that the app uses
SELECT 
  ur.role_id,
  r.name,
  r.description
FROM user_roles ur
JOIN roles r ON ur.role_id = r.id
WHERE ur.user_id = 'f5021231-1b0e-491e-8909-d981016f08b2'::UUID; 