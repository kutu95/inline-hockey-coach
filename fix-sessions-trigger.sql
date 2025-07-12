-- Fix sessions table triggers for updated_at field
-- This script ensures the sessions table has proper triggers

-- First, check if the updated_at column exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sessions' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE sessions ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_sessions_updated_at ON sessions;

-- Create the trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER update_sessions_updated_at
    BEFORE UPDATE ON sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_sessions_updated_at();

-- Verify the trigger exists
SELECT 
    trigger_name, 
    event_manipulation, 
    action_timing, 
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'sessions' 
AND trigger_name = 'update_sessions_updated_at'; 