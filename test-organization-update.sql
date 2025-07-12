-- Test script to check if organization updates are working
-- Run this in your Supabase SQL editor

-- Check current organizations
SELECT 'Current organizations:' as status;
SELECT id, name, description, logo_url, created_at, updated_at 
FROM organizations 
ORDER BY name;

-- Try to update the default organization
UPDATE organizations 
SET name = 'Test Update', description = 'This is a test update'
WHERE id = '00000000-0000-0000-0000-000000000001';

-- Check if the update worked
SELECT 'After update:' as status;
SELECT id, name, description, logo_url, created_at, updated_at 
FROM organizations 
ORDER BY name;

-- Reset back to original
UPDATE organizations 
SET name = 'Default Organization', description = 'Default organization for existing data'
WHERE id = '00000000-0000-0000-0000-000000000001';

SELECT 'Reset complete' as status; 