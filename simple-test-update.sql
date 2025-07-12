-- Simple test to verify organization updates
-- Run this in your Supabase SQL editor

-- Check current state
SELECT 'BEFORE UPDATE:' as status;
SELECT id, name, description FROM organizations WHERE id = '00000000-0000-0000-0000-000000000001';

-- Perform update
UPDATE organizations 
SET name = 'WA', description = 'Default organization for existing data'
WHERE id = '00000000-0000-0000-0000-000000000001';

-- Check after update
SELECT 'AFTER UPDATE:' as status;
SELECT id, name, description FROM organizations WHERE id = '00000000-0000-0000-0000-000000000001';

-- Reset to original
UPDATE organizations 
SET name = 'Default Organization', description = 'Default organization for existing data'
WHERE id = '00000000-0000-0000-0000-000000000001';

SELECT 'RESET COMPLETE' as status; 