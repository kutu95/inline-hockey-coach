-- Temporarily disable RLS to test if UI updates work
-- This will help us determine if RLS is the issue

-- Disable RLS on organizations
ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;

-- Set the organization to a known state
UPDATE organizations 
SET name = 'WAILH', description = 'WA Inline Hockey League'
WHERE id = '00000000-0000-0000-0000-000000000001';

-- Check the current state
SELECT 'Current organization state (RLS disabled):' as status;
SELECT id, name, description, updated_at 
FROM organizations 
WHERE id = '00000000-0000-0000-0000-000000000001';

SELECT 'RLS disabled - try updating the organization in the UI now!' as status; 