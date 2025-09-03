-- Fix RLS policies to remove coach_id references and use organization_id
-- This script updates the existing policies to work with the current multi-tenant schema

-- =====================================================
-- 1. DROP ALL EXISTING POLICIES FIRST
-- =====================================================

-- Drop ALL policies on players table
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'players') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON players';
    END LOOP;
END $$;

-- Drop ALL policies on clubs table
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'clubs') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON clubs';
    END LOOP;
END $$;

-- Drop ALL policies on squads table
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'squads') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON squads';
    END LOOP;
END $$;

-- Drop ALL policies on sessions table
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'sessions') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON sessions';
    END LOOP;
END $$;

-- Drop ALL policies on drills table
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'drills') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON drills';
    END LOOP;
END $$;

-- =====================================================
-- 2. CHECK AND CREATE REQUIRED FUNCTIONS
-- =====================================================

-- Check if get_user_organization function exists, create if not
CREATE OR REPLACE FUNCTION get_user_organization(user_uuid UUID DEFAULT auth.uid())
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT organization_id 
    FROM players 
    WHERE user_id = user_uuid
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if is_superadmin function exists, create if not
CREATE OR REPLACE FUNCTION is_superadmin(user_uuid UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = user_uuid AND r.name = 'superadmin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 3. PLAYERS TABLE POLICIES
-- =====================================================

-- Create new policies that work with organization_id and user_id
CREATE POLICY "Users can view players in their organization" ON players
  FOR SELECT USING (
    is_superadmin(auth.uid()) OR
    (organization_id IS NOT NULL AND organization_id = get_user_organization(auth.uid())) OR
    auth.uid() = user_id
  );

CREATE POLICY "Users can insert players in their organization" ON players
  FOR INSERT WITH CHECK (
    is_superadmin(auth.uid()) OR
    (organization_id IS NOT NULL AND organization_id = get_user_organization(auth.uid()))
  );

CREATE POLICY "Users can update players in their organization" ON players
  FOR UPDATE USING (
    is_superadmin(auth.uid()) OR
    (organization_id IS NOT NULL AND organization_id = get_user_organization(auth.uid())) OR
    auth.uid() = user_id
  );

CREATE POLICY "Users can delete players in their organization" ON players
  FOR DELETE USING (
    is_superadmin(auth.uid()) OR
    (organization_id IS NOT NULL AND organization_id = get_user_organization(auth.uid()))
  );

-- =====================================================
-- 4. CLUBS TABLE POLICIES
-- =====================================================

-- Create new policies that work with organization_id
CREATE POLICY "Users can view clubs in their organization" ON clubs
  FOR SELECT USING (
    is_superadmin(auth.uid()) OR
    (organization_id IS NOT NULL AND organization_id = get_user_organization(auth.uid()))
  );

CREATE POLICY "Users can insert clubs in their organization" ON clubs
  FOR INSERT WITH CHECK (
    is_superadmin(auth.uid()) OR
    (organization_id IS NOT NULL AND organization_id = get_user_organization(auth.uid()))
  );

CREATE POLICY "Users can update clubs in their organization" ON clubs
  FOR UPDATE USING (
    is_superadmin(auth.uid()) OR
    (organization_id IS NOT NULL AND organization_id = get_user_organization(auth.uid()))
  );

CREATE POLICY "Users can delete clubs in their organization" ON clubs
  FOR DELETE USING (
    is_superadmin(auth.uid()) OR
    (organization_id IS NOT NULL AND organization_id = get_user_organization(auth.uid()))
  );

-- =====================================================
-- 5. SQUADS TABLE POLICIES
-- =====================================================

-- Create new policies that work with organization_id
CREATE POLICY "Users can view squads in their organization" ON squads
  FOR SELECT USING (
    is_superadmin(auth.uid()) OR
    (organization_id IS NOT NULL AND organization_id = get_user_organization(auth.uid()))
  );

CREATE POLICY "Users can insert squads in their organization" ON squads
  FOR INSERT WITH CHECK (
    is_superadmin(auth.uid()) OR
    (organization_id IS NOT NULL AND organization_id = get_user_organization(auth.uid()))
  );

CREATE POLICY "Users can update squads in their organization" ON squads
  FOR UPDATE USING (
    is_superadmin(auth.uid()) OR
    (organization_id IS NOT NULL AND organization_id = get_user_organization(auth.uid()))
  );

CREATE POLICY "Users can delete squads in their organization" ON squads
  FOR DELETE USING (
    is_superadmin(auth.uid()) OR
    (organization_id IS NOT NULL AND organization_id = get_user_organization(auth.uid()))
  );

-- =====================================================
-- 6. SESSIONS TABLE POLICIES
-- =====================================================

-- Create new policies that work with organization_id
CREATE POLICY "Users can view sessions in their organization" ON sessions
  FOR SELECT USING (
    is_superadmin(auth.uid()) OR
    (organization_id IS NOT NULL AND organization_id = get_user_organization(auth.uid()))
  );

CREATE POLICY "Users can insert sessions in their organization" ON sessions
  FOR INSERT WITH CHECK (
    is_superadmin(auth.uid()) OR
    (organization_id IS NOT NULL AND organization_id = get_user_organization(auth.uid()))
  );

CREATE POLICY "Users can update sessions in their organization" ON sessions
  FOR UPDATE USING (
    is_superadmin(auth.uid()) OR
    (organization_id IS NOT NULL AND organization_id = get_user_organization(auth.uid()))
  );

CREATE POLICY "Users can delete sessions in their organization" ON sessions
  FOR DELETE USING (
    is_superadmin(auth.uid()) OR
    (organization_id IS NOT NULL AND organization_id = get_user_organization(auth.uid()))
  );

-- =====================================================
-- 7. DRILLS TABLE POLICIES
-- =====================================================

-- Create new policies that work with organization_id
CREATE POLICY "Users can view drills in their organization" ON drills
  FOR SELECT USING (
    is_superadmin(auth.uid()) OR
    (organization_id IS NOT NULL AND organization_id = get_user_organization(auth.uid()))
  );

CREATE POLICY "Users can insert drills in their organization" ON drills
  FOR INSERT WITH CHECK (
    is_superadmin(auth.uid()) OR
    (organization_id IS NOT NULL AND organization_id = get_user_organization(auth.uid()))
  );

CREATE POLICY "Users can update drills in their organization" ON drills
  FOR UPDATE USING (
    is_superadmin(auth.uid()) OR
    (organization_id IS NOT NULL AND organization_id = get_user_organization(auth.uid()))
  );

CREATE POLICY "Users can delete drills in their organization" ON drills
  FOR DELETE USING (
    is_superadmin(auth.uid()) OR
    (organization_id IS NOT NULL AND organization_id = get_user_organization(auth.uid()))
  );

-- =====================================================
-- 8. VERIFY CHANGES
-- =====================================================

-- Check current policies on players table
SELECT 
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'players'
ORDER BY policyname;

-- Check current policies on clubs table
SELECT 
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'clubs'
ORDER BY policyname;

-- Check current policies on squads table
SELECT 
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'squads'
ORDER BY policyname;

-- Check current policies on sessions table
SELECT 
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'sessions'
ORDER BY policyname;

-- Check current policies on drills table
SELECT 
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'drills'
ORDER BY policyname;
