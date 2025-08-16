-- Fix sessions table structure
-- This checks if created_by column exists and adds it if needed

-- 1. Check current sessions table structure
SELECT 'Current sessions table columns:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'sessions'
ORDER BY ordinal_position;

-- 2. Check if created_by column exists
SELECT 'Checking for created_by column:' as info;
SELECT EXISTS(
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sessions' 
    AND column_name = 'created_by'
) as created_by_exists;

-- 3. Add created_by column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sessions' 
        AND column_name = 'created_by'
    ) THEN
        ALTER TABLE sessions ADD COLUMN created_by UUID REFERENCES auth.users(id);
        RAISE NOTICE 'Added created_by column to sessions table';
    ELSE
        RAISE NOTICE 'created_by column already exists in sessions table';
    END IF;
END $$;

-- 4. Update existing sessions to have a created_by value if they don't have one
-- Use the first user in the system as a fallback
UPDATE sessions 
SET created_by = (
    SELECT id FROM auth.users LIMIT 1
)
WHERE created_by IS NULL;

-- 5. Make created_by NOT NULL after setting values
ALTER TABLE sessions 
ALTER COLUMN created_by SET NOT NULL;

-- 6. Verify the final structure
SELECT 'Final sessions table columns:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'sessions'
ORDER BY ordinal_position;
