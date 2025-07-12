-- Verification script to check if session_squads table exists
-- Run this after the migration to verify it worked

-- Check if the table exists
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'session_squads'
ORDER BY ordinal_position;

-- Check if indexes were created
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'session_squads';

-- Check if RLS is enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'session_squads';

-- Test inserting a record (optional - only if you have sessions and squads)
-- INSERT INTO session_squads (session_id, squad_id) 
-- SELECT s.id, sq.id 
-- FROM sessions s, squads sq 
-- LIMIT 1; 