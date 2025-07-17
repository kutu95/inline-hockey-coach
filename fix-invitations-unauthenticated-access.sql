-- Fix Invitations RLS to Allow Unauthenticated Access for Accept Invitation Flow
-- Run this in your Supabase SQL editor

-- 1. Drop the existing restrictive policy
DROP POLICY IF EXISTS "Authenticated users can manage invitations" ON invitations;

-- 2. Allow unauthenticated users to read invitations by token
CREATE POLICY "Anyone can read invitations by token" ON invitations
  FOR SELECT USING (true);

-- 3. Allow authenticated users to manage invitations
CREATE POLICY "Authenticated users can manage invitations" ON invitations
  FOR ALL USING (auth.role() = 'authenticated');

-- 4. Show current policies on invitations table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'invitations'
ORDER BY policyname; 