-- Test script to debug player profile access
-- Run this in your Supabase SQL Editor to check the current state

-- 1. Check if user_id column exists in players table
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'players' 
  AND column_name = 'user_id';

-- 2. Check if coach_id column still exists (should be removed)
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'players' 
  AND column_name = 'coach_id';

-- 3. Check current RLS policies on players table
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'players';

-- 4. Check if there are any player records
SELECT 
  id,
  first_name,
  last_name,
  email,
  user_id,
  organization_id
FROM players 
LIMIT 5;

-- 5. Check if there are any users with 'player' role
SELECT 
  u.id as user_id,
  u.email,
  r.name as role_name
FROM auth.users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles r ON ur.role_id = r.id
WHERE r.name = 'player'
LIMIT 5;

-- 6. Test the get_user_organization function
SELECT get_user_organization(auth.uid()) as current_user_org;

-- 7. Test if current user can see any players
SELECT 
  id,
  first_name,
  last_name,
  email,
  user_id,
  organization_id
FROM players 
WHERE auth.uid() = user_id
   OR is_superadmin(auth.uid())
   OR (organization_id IS NOT NULL AND organization_id = get_user_organization(auth.uid())); 