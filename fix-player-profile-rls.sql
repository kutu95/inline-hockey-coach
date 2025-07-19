-- Fix RLS policies to allow players to access their own profile
-- This updates the existing policies to work without coach_id field

-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "Users can view own players" ON players;
DROP POLICY IF EXISTS "Users can insert own players" ON players;
DROP POLICY IF EXISTS "Users can update own players" ON players;
DROP POLICY IF EXISTS "Users can delete own players" ON players;
DROP POLICY IF EXISTS "Coaches can view their own players" ON players;
DROP POLICY IF EXISTS "Coaches can insert their own players" ON players;
DROP POLICY IF EXISTS "Coaches can update their own players" ON players;
DROP POLICY IF EXISTS "Coaches can delete their own players" ON players;

-- Create new policies that work with user_id and organization-based access
CREATE POLICY "Users can view own players" ON players
  FOR SELECT USING (
    auth.uid() = user_id OR
    is_superadmin(auth.uid()) OR
    (organization_id IS NOT NULL AND organization_id = get_user_organization(auth.uid()))
  );

CREATE POLICY "Users can insert own players" ON players
  FOR INSERT WITH CHECK (
    is_superadmin(auth.uid()) OR
    (organization_id IS NOT NULL AND organization_id = get_user_organization(auth.uid()))
  );

CREATE POLICY "Users can update own players" ON players
  FOR UPDATE USING (
    auth.uid() = user_id OR
    is_superadmin(auth.uid()) OR
    (organization_id IS NOT NULL AND organization_id = get_user_organization(auth.uid()))
  );

CREATE POLICY "Users can delete own players" ON players
  FOR DELETE USING (
    is_superadmin(auth.uid()) OR
    (organization_id IS NOT NULL AND organization_id = get_user_organization(auth.uid()))
  ); 