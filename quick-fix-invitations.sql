-- Quick Fix for Invitations - Temporarily Disable RLS
-- Run this in your Supabase SQL editor to get invitations working immediately

-- =====================================================
-- TEMPORARILY DISABLE RLS ON PROBLEMATIC TABLES
-- =====================================================

-- Disable RLS on tables that are causing recursion
ALTER TABLE invitations DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE roles DISABLE ROW LEVEL SECURITY;

-- =====================================================
-- ENSURE INVITATIONS TABLE EXISTS
-- =====================================================

-- Create invitations table if it doesn't exist
CREATE TABLE IF NOT EXISTS invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  invited_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  accepted_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);

-- =====================================================
-- CREATE HELPER FUNCTION
-- =====================================================

-- Create invitation token generator
CREATE OR REPLACE FUNCTION generate_invitation_token()
RETURNS TEXT AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'hex');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- INSERT DEFAULT ROLES
-- =====================================================

-- Insert default roles if they don't exist
INSERT INTO roles (name, description) VALUES
    ('admin', 'Full system access and user management'),
    ('coach', 'Can manage players, sessions, and drills'),
    ('player', 'Read-only access to sessions and drills')
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- TEST THE FIX
-- =====================================================

-- Test that we can generate tokens
SELECT 'Testing generate_invitation_token:' as info, generate_invitation_token() as token;

-- Test that we can access roles
SELECT 'Testing roles table access:' as info, COUNT(*) as count FROM roles;

-- Test that we can access user_roles
SELECT 'Testing user_roles table access:' as info, COUNT(*) as count FROM user_roles;

-- =====================================================
-- NOTE: This is a temporary fix
-- =====================================================
-- 
-- IMPORTANT: This disables RLS on these tables, which means:
-- 1. All authenticated users can access these tables
-- 2. This is less secure but will get invitations working
-- 3. You should re-enable RLS with proper policies later
--
-- To re-enable RLS later, run:
-- ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
-- Then create proper policies that don't cause recursion 