-- Check user_roles table structure
-- This will help us understand what columns exist and fix the function accordingly

-- 1. Check if user_roles table exists
SELECT 'Checking if user_roles table exists:' as info;
SELECT EXISTS(
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'user_roles'
) as table_exists;

-- 2. If table exists, show its structure
SELECT 'user_roles table structure:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'user_roles'
ORDER BY ordinal_position;

-- 3. Check what data exists in user_roles
SELECT 'Sample user_roles data:' as info;
SELECT * FROM user_roles LIMIT 5;

-- 4. Check if there are other role-related tables
SELECT 'Tables with "role" in name:' as info;
SELECT table_name 
FROM information_schema.tables 
WHERE table_name LIKE '%role%'
ORDER BY table_name;

-- 5. Check if there are any functions that reference user_roles
SELECT 'Functions referencing user_roles:' as info;
SELECT routine_name, routine_definition
FROM information_schema.routines 
WHERE routine_definition LIKE '%user_roles%'
AND routine_schema = 'public';
