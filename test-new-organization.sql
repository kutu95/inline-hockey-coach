-- Test creating a new organization and updating it
-- This will help us determine if the issue is with the specific organization or a general problem

-- Create a new test organization
INSERT INTO organizations (id, name, description, logo_url)
VALUES (
    gen_random_uuid(),
    'Test Organization',
    'This is a test organization',
    NULL
);

-- Get the ID of the new organization
SELECT 'New organization created:' as status;
SELECT id, name, description, created_at, updated_at 
FROM organizations 
WHERE name = 'Test Organization'
ORDER BY created_at DESC
LIMIT 1;

-- Try to update the new organization
UPDATE organizations 
SET name = 'Updated Test Organization', description = 'This organization was updated'
WHERE name = 'Test Organization';

-- Check if the update worked
SELECT 'After update:' as status;
SELECT id, name, description, created_at, updated_at 
FROM organizations 
WHERE name LIKE '%Test Organization%'
ORDER BY created_at DESC;

-- Clean up - delete the test organization
DELETE FROM organizations WHERE name LIKE '%Test Organization%';

SELECT 'Test complete!' as status; 