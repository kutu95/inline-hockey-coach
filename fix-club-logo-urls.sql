-- Fix club logo URLs after moving files to correct organization folder
-- Run this AFTER running the fix-club-logos-storage.cjs script

-- First, let's see what the current logo URLs look like
SELECT 'Current logo URLs:' as info;
SELECT 
    id,
    name,
    logo_url,
    organization_id
FROM clubs 
WHERE logo_url IS NOT NULL
ORDER BY name;

-- Update the logo URLs to point to the correct organization folder
-- Replace the coach ID (f5021231-1b0e-491e-8909-d981016f08b2) with the organization ID
UPDATE clubs 
SET logo_url = REPLACE(
    logo_url, 
    'club-logos/f5021231-1b0e-491e-8909-d981016f08b2/', 
    'club-logos/00000000-0000-0000-0000-000000000001/'
)
WHERE logo_url LIKE '%club-logos/f5021231-1b0e-491e-8909-d981016f08b2/%';

-- Verify the changes
SELECT 'Updated logo URLs:' as info;
SELECT 
    id,
    name,
    logo_url,
    organization_id
FROM clubs 
WHERE logo_url IS NOT NULL
ORDER BY name;

-- Note: After this update, the logo URLs will still be signed URLs that may be expired
-- The Clubs component will need to regenerate new signed URLs when it loads
-- The getSignedUrl function should now work correctly since the file paths will match

