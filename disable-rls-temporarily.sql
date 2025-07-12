-- Temporarily disable RLS on organizations table
-- This will help us determine if RLS is the issue

-- Disable RLS
ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;

-- Test update
UPDATE organizations 
SET name = 'Test Without RLS', description = 'Testing without RLS'
WHERE id = '00000000-0000-0000-0000-000000000001';

-- Check result
SELECT 'After disabling RLS:' as status;
SELECT id, name, description, updated_at 
FROM organizations 
WHERE id = '00000000-0000-0000-0000-000000000001';

SELECT 'RLS disabled - try updating in the UI now!' as status; 