-- Check the default organization specifically
-- This will help us understand why updates aren't working on the default organization

-- 1. Check the current state of the default organization
SELECT 'Current default organization:' as status;
SELECT id, name, description, logo_url, created_at, updated_at 
FROM organizations 
WHERE id = '00000000-0000-0000-0000-000000000001';

-- 2. Check if there are any triggers specifically affecting this organization
SELECT 'Triggers that might affect organizations:' as status;
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'organizations';

-- 3. Check if there are any constraints on the organizations table
SELECT 'Constraints on organizations table:' as status;
SELECT 
    constraint_name,
    constraint_type,
    table_name
FROM information_schema.table_constraints 
WHERE table_name = 'organizations';

-- 4. Try to update the default organization with a different approach
SELECT 'Trying update with explicit timestamp...' as status;
UPDATE organizations 
SET 
    name = 'WAILH Updated',
    description = 'WAILH Organization Updated',
    updated_at = NOW()
WHERE id = '00000000-0000-0000-0000-000000000001';

-- 5. Check if the update worked
SELECT 'After explicit update:' as status;
SELECT id, name, description, logo_url, created_at, updated_at 
FROM organizations 
WHERE id = '00000000-0000-0000-0000-000000000001';

-- 6. Check if there are any foreign key constraints that might be affecting this
SELECT 'Foreign key constraints:' as status;
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name = 'organizations';

SELECT 'Check complete!' as status; 