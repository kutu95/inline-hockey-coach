-- Complete fix for sessions table triggers
-- This script will remove all problematic triggers and recreate them properly

-- 1. First, let's see what triggers currently exist
SELECT 
    trigger_name, 
    event_manipulation, 
    action_timing, 
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'sessions';

-- 2. Drop ALL existing triggers on sessions table
DROP TRIGGER IF EXISTS update_sessions_updated_at ON sessions;
DROP TRIGGER IF EXISTS set_sessions_created_at ON sessions;
DROP TRIGGER IF EXISTS update_updated_at_column ON sessions;
DROP TRIGGER IF EXISTS update_created_at_column ON sessions;

-- 3. Drop the trigger functions
DROP FUNCTION IF EXISTS update_sessions_updated_at();
DROP FUNCTION IF EXISTS set_sessions_created_at();
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP FUNCTION IF EXISTS update_created_at_column();

-- 4. Check if updated_at column exists, if not add it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sessions' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE sessions ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE 'Added updated_at column to sessions table';
    ELSE
        RAISE NOTICE 'updated_at column already exists in sessions table';
    END IF;
END $$;

-- 5. Check if created_at column exists, if not add it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sessions' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE sessions ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE 'Added created_at column to sessions table';
    ELSE
        RAISE NOTICE 'created_at column already exists in sessions table';
    END IF;
END $$;

-- 6. Create a simple trigger function for updated_at
CREATE OR REPLACE FUNCTION update_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Create a simple trigger function for created_at
CREATE OR REPLACE FUNCTION set_sessions_created_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.created_at IS NULL THEN
        NEW.created_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Create the triggers
CREATE TRIGGER update_sessions_updated_at
    BEFORE UPDATE ON sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_sessions_updated_at();

CREATE TRIGGER set_sessions_created_at
    BEFORE INSERT ON sessions
    FOR EACH ROW
    EXECUTE FUNCTION set_sessions_created_at();

-- 9. Verify the table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'sessions' 
ORDER BY ordinal_position;

-- 10. Verify the triggers exist
SELECT 
    trigger_name, 
    event_manipulation, 
    action_timing, 
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'sessions' 
ORDER BY trigger_name; 