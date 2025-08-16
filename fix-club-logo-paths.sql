-- Fix club logo URLs to point to the correct file paths
-- This will update the database to use the correct organization ID folder

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

-- Also update the Easy Street logo to use the correct organization folder
UPDATE clubs 
SET logo_url = REPLACE(
    logo_url, 
    'club-logos/ccfb0c14-4f05-477f-bca8-f49f1f2e4325/', 
    'club-logos/00000000-0000-0000-0000-000000000001/'
)
WHERE logo_url LIKE '%club-logos/ccfb0c14-4f05-477f-bca8-f49f1f2e4325/%';

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

