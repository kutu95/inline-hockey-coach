-- Check what organizations exist in the database
SELECT 
    id,
    name,
    created_at
FROM organizations 
ORDER BY created_at DESC; 