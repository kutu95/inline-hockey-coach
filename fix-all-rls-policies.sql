-- Fix All RLS Policies - Comprehensive Solution
-- This script fixes infinite recursion in all table policies

-- First, disable RLS on all tables to clean up policies
ALTER TABLE players DISABLE ROW LEVEL SECURITY;
ALTER TABLE squads DISABLE ROW LEVEL SECURITY;
ALTER TABLE player_squads DISABLE ROW LEVEL SECURITY;
ALTER TABLE sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE session_attendance DISABLE ROW LEVEL SECURITY;
ALTER TABLE drills DISABLE ROW LEVEL SECURITY;
ALTER TABLE clubs DISABLE ROW LEVEL SECURITY;
ALTER TABLE roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies to avoid conflicts
-- Players table policies
DROP POLICY IF EXISTS "Coaches can view their own players" ON players;
DROP POLICY IF EXISTS "Coaches can insert their own players" ON players;
DROP POLICY IF EXISTS "Coaches can update their own players" ON players;
DROP POLICY IF EXISTS "Coaches can delete their own players" ON players;
DROP POLICY IF EXISTS "Players are viewable by authenticated users" ON players;
DROP POLICY IF EXISTS "Coaches and admins can manage players" ON players;

-- Squads table policies
DROP POLICY IF EXISTS "Coaches can view their own squads" ON squads;
DROP POLICY IF EXISTS "Coaches can insert their own squads" ON squads;
DROP POLICY IF EXISTS "Coaches can update their own squads" ON squads;
DROP POLICY IF EXISTS "Coaches can delete their own squads" ON squads;
DROP POLICY IF EXISTS "Squads are viewable by authenticated users" ON squads;
DROP POLICY IF EXISTS "Coaches and admins can manage squads" ON squads;

-- Player squads table policies
DROP POLICY IF EXISTS "Coaches can view player-squad assignments" ON player_squads;
DROP POLICY IF EXISTS "Coaches can insert player-squad assignments" ON player_squads;
DROP POLICY IF EXISTS "Coaches can delete player-squad assignments" ON player_squads;
DROP POLICY IF EXISTS "Player squads are viewable by authenticated users" ON player_squads;
DROP POLICY IF EXISTS "Coaches and admins can manage player squads" ON player_squads;

-- Sessions table policies
DROP POLICY IF EXISTS "Coaches can view their own sessions" ON sessions;
DROP POLICY IF EXISTS "Coaches can insert their own sessions" ON sessions;
DROP POLICY IF EXISTS "Coaches can update their own sessions" ON sessions;
DROP POLICY IF EXISTS "Coaches can delete their own sessions" ON sessions;
DROP POLICY IF EXISTS "Sessions are viewable by authenticated users" ON sessions;
DROP POLICY IF EXISTS "Coaches and admins can manage sessions" ON sessions;

-- Session attendance table policies
DROP POLICY IF EXISTS "Coaches can view attendance for their sessions" ON session_attendance;
DROP POLICY IF EXISTS "Coaches can insert attendance for their sessions" ON session_attendance;
DROP POLICY IF EXISTS "Coaches can update attendance for their sessions" ON session_attendance;
DROP POLICY IF EXISTS "Coaches can delete attendance for their sessions" ON session_attendance;
DROP POLICY IF EXISTS "Session attendance is viewable by authenticated users" ON session_attendance;
DROP POLICY IF EXISTS "Coaches and admins can manage session attendance" ON session_attendance;

-- Drills table policies
DROP POLICY IF EXISTS "Coaches can view their own drills" ON drills;
DROP POLICY IF EXISTS "Coaches can insert their own drills" ON drills;
DROP POLICY IF EXISTS "Coaches can update their own drills" ON drills;
DROP POLICY IF EXISTS "Coaches can delete their own drills" ON drills;
DROP POLICY IF EXISTS "Drills are viewable by authenticated users" ON drills;
DROP POLICY IF EXISTS "Coaches and admins can manage drills" ON drills;

-- Clubs table policies
DROP POLICY IF EXISTS "Coaches can view their own clubs" ON clubs;
DROP POLICY IF EXISTS "Coaches can insert their own clubs" ON clubs;
DROP POLICY IF EXISTS "Coaches can update their own clubs" ON clubs;
DROP POLICY IF EXISTS "Coaches can delete their own clubs" ON clubs;

-- Roles and user_roles policies (already handled in previous script)
DROP POLICY IF EXISTS "Admins can view all roles" ON roles;
DROP POLICY IF EXISTS "Admins can view all user roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can insert user roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can update user roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can delete user roles" ON user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON user_roles;
DROP POLICY IF EXISTS "Authenticated users can view roles" ON roles;
DROP POLICY IF EXISTS "Authenticated users can view all user roles" ON user_roles;
DROP POLICY IF EXISTS "Authenticated users can manage user roles" ON user_roles;

-- Re-enable RLS on all tables
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE squads ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_squads ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE drills ENABLE ROW LEVEL SECURITY;
ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Create simplified, non-recursive policies

-- =====================================================
-- PLAYERS TABLE POLICIES
-- =====================================================

-- Allow users to view their own players (based on coach_id)
CREATE POLICY "Users can view their own players" ON players
    FOR SELECT USING (auth.uid() = coach_id);

-- Allow users to insert their own players
CREATE POLICY "Users can insert their own players" ON players
    FOR INSERT WITH CHECK (auth.uid() = coach_id);

-- Allow users to update their own players
CREATE POLICY "Users can update their own players" ON players
    FOR UPDATE USING (auth.uid() = coach_id);

-- Allow users to delete their own players
CREATE POLICY "Users can delete their own players" ON players
    FOR DELETE USING (auth.uid() = coach_id);

-- =====================================================
-- SQUADS TABLE POLICIES
-- =====================================================

-- Allow users to view their own squads
CREATE POLICY "Users can view their own squads" ON squads
    FOR SELECT USING (auth.uid() = coach_id);

-- Allow users to insert their own squads
CREATE POLICY "Users can insert their own squads" ON squads
    FOR INSERT WITH CHECK (auth.uid() = coach_id);

-- Allow users to update their own squads
CREATE POLICY "Users can update their own squads" ON squads
    FOR UPDATE USING (auth.uid() = coach_id);

-- Allow users to delete their own squads
CREATE POLICY "Users can delete their own squads" ON squads
    FOR DELETE USING (auth.uid() = coach_id);

-- =====================================================
-- PLAYER_SQUADS TABLE POLICIES
-- =====================================================

-- Allow users to view player-squad assignments for their players and squads
CREATE POLICY "Users can view player-squad assignments" ON player_squads
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM players p 
            JOIN squads s ON p.coach_id = s.coach_id 
            WHERE p.id = player_squads.player_id 
            AND s.id = player_squads.squad_id 
            AND p.coach_id = auth.uid()
        )
    );

-- Allow users to insert player-squad assignments
CREATE POLICY "Users can insert player-squad assignments" ON player_squads
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM players p 
            JOIN squads s ON p.coach_id = s.coach_id 
            WHERE p.id = player_squads.player_id 
            AND s.id = player_squads.squad_id 
            AND p.coach_id = auth.uid()
        )
    );

-- Allow users to delete player-squad assignments
CREATE POLICY "Users can delete player-squad assignments" ON player_squads
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM players p 
            JOIN squads s ON p.coach_id = s.coach_id 
            WHERE p.id = player_squads.player_id 
            AND s.id = player_squads.squad_id 
            AND p.coach_id = auth.uid()
        )
    );

-- =====================================================
-- SESSIONS TABLE POLICIES
-- =====================================================

-- Allow users to view their own sessions
CREATE POLICY "Users can view their own sessions" ON sessions
    FOR SELECT USING (auth.uid() = coach_id);

-- Allow users to insert their own sessions
CREATE POLICY "Users can insert their own sessions" ON sessions
    FOR INSERT WITH CHECK (auth.uid() = coach_id);

-- Allow users to update their own sessions
CREATE POLICY "Users can update their own sessions" ON sessions
    FOR UPDATE USING (auth.uid() = coach_id);

-- Allow users to delete their own sessions
CREATE POLICY "Users can delete their own sessions" ON sessions
    FOR DELETE USING (auth.uid() = coach_id);

-- =====================================================
-- SESSION_ATTENDANCE TABLE POLICIES
-- =====================================================

-- Allow users to view attendance for their sessions
CREATE POLICY "Users can view attendance for their sessions" ON session_attendance
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM sessions 
            WHERE sessions.id = session_attendance.session_id 
            AND sessions.coach_id = auth.uid()
        )
    );

-- Allow users to insert attendance for their sessions
CREATE POLICY "Users can insert attendance for their sessions" ON session_attendance
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM sessions 
            WHERE sessions.id = session_attendance.session_id 
            AND sessions.coach_id = auth.uid()
        )
    );

-- Allow users to update attendance for their sessions
CREATE POLICY "Users can update attendance for their sessions" ON session_attendance
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM sessions 
            WHERE sessions.id = session_attendance.session_id 
            AND sessions.coach_id = auth.uid()
        )
    );

-- Allow users to delete attendance for their sessions
CREATE POLICY "Users can delete attendance for their sessions" ON session_attendance
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM sessions 
            WHERE sessions.id = session_attendance.session_id 
            AND sessions.coach_id = auth.uid()
        )
    );

-- =====================================================
-- DRILLS TABLE POLICIES
-- =====================================================

-- Allow users to view their own drills
CREATE POLICY "Users can view their own drills" ON drills
    FOR SELECT USING (auth.uid() = coach_id);

-- Allow users to insert their own drills
CREATE POLICY "Users can insert their own drills" ON drills
    FOR INSERT WITH CHECK (auth.uid() = coach_id);

-- Allow users to update their own drills
CREATE POLICY "Users can update their own drills" ON drills
    FOR UPDATE USING (auth.uid() = coach_id);

-- Allow users to delete their own drills
CREATE POLICY "Users can delete their own drills" ON drills
    FOR DELETE USING (auth.uid() = coach_id);

-- =====================================================
-- CLUBS TABLE POLICIES
-- =====================================================

-- Allow users to view their own clubs
CREATE POLICY "Users can view their own clubs" ON clubs
    FOR SELECT USING (auth.uid() = coach_id);

-- Allow users to insert their own clubs
CREATE POLICY "Users can insert their own clubs" ON clubs
    FOR INSERT WITH CHECK (auth.uid() = coach_id);

-- Allow users to update their own clubs
CREATE POLICY "Users can update their own clubs" ON clubs
    FOR UPDATE USING (auth.uid() = coach_id);

-- Allow users to delete their own clubs
CREATE POLICY "Users can delete their own clubs" ON clubs
    FOR DELETE USING (auth.uid() = coach_id);

-- =====================================================
-- ROLES AND USER_ROLES POLICIES (from previous fix)
-- =====================================================

-- For roles table: Allow all authenticated users to view roles
CREATE POLICY "Authenticated users can view roles" ON roles
    FOR SELECT USING (auth.role() = 'authenticated');

-- For user_roles table: Allow users to view their own roles
CREATE POLICY "Users can view their own roles" ON user_roles
    FOR SELECT USING (auth.uid() = user_id);

-- For user_roles table: Allow all authenticated users to manage roles (for development)
CREATE POLICY "Authenticated users can view all user roles" ON user_roles
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage user roles" ON user_roles
    FOR ALL USING (auth.role() = 'authenticated');

-- Test the setup
SELECT 'All RLS policies fixed. Testing...' as status;

-- Test if we can query players
SELECT 'Players table accessible:' as test, COUNT(*) as count FROM players WHERE coach_id = auth.uid();

-- Test if we can query squads
SELECT 'Squads table accessible:' as test, COUNT(*) as count FROM squads WHERE coach_id = auth.uid();

-- Test if we can query roles
SELECT 'Roles table accessible:' as test, COUNT(*) as count FROM roles; 