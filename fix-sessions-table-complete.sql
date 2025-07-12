-- Comprehensive fix for sessions table
-- This script will ensure the sessions table has the correct structure and triggers

-- 1. Check and add updated_at column if it doesn't exist
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

-- 2. Check and add created_at column if it doesn't exist
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

-- 3. Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_sessions_updated_at ON sessions;
DROP TRIGGER IF EXISTS set_sessions_created_at ON sessions;

-- 4. Create the updated_at trigger function
CREATE OR REPLACE FUNCTION update_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Create the created_at trigger function
CREATE OR REPLACE FUNCTION set_sessions_created_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.created_at IS NULL THEN
        NEW.created_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Create the triggers
CREATE TRIGGER update_sessions_updated_at
    BEFORE UPDATE ON sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_sessions_updated_at();

CREATE TRIGGER set_sessions_created_at
    BEFORE INSERT ON sessions
    FOR EACH ROW
    EXECUTE FUNCTION set_sessions_created_at();

-- 7. Verify the table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'sessions' 
ORDER BY ordinal_position;

-- 8. Verify the triggers exist
SELECT 
    trigger_name, 
    event_manipulation, 
    action_timing, 
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'sessions' 
ORDER BY trigger_name; 