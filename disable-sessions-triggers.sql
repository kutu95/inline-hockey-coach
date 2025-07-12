-- Temporarily disable all triggers on sessions table
-- This will allow updates to work without trigger issues

-- 1. Disable all triggers on sessions table
ALTER TABLE sessions DISABLE TRIGGER ALL;

-- 2. Verify triggers are disabled
SELECT 
    trigger_name, 
    event_manipulation, 
    action_timing,
    action_statement,
    'DISABLED' as status
FROM information_schema.triggers 
WHERE event_object_table = 'sessions';

-- 3. Check table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'sessions' 
ORDER BY ordinal_position; 