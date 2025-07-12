-- Setup script for organizations
-- This script will create initial organizations and assign existing data

-- Create a default organization for existing data
INSERT INTO organizations (id, name, description, contact_email, website_url)
VALUES (
  gen_random_uuid(),
  'WA Inline Hockey',
  'Western Australia Inline Hockey Association',
  'admin@wainlinehockey.com',
  'https://wainlinehockey.com'
)
ON CONFLICT DO NOTHING;

-- Get the default organization ID
DO $$
DECLARE
  default_org_id UUID;
BEGIN
  -- Get the first organization (or create one if none exists)
  SELECT id INTO default_org_id FROM organizations LIMIT 1;
  
  -- If no organization exists, create one
  IF default_org_id IS NULL THEN
    INSERT INTO organizations (id, name, description, contact_email, website_url)
    VALUES (
      gen_random_uuid(),
      'WA Inline Hockey',
      'Western Australia Inline Hockey Association',
      'admin@wainlinehockey.com',
      'https://wainlinehockey.com'
    );
    SELECT id INTO default_org_id FROM organizations LIMIT 1;
  END IF;
  
  -- Assign all existing players to the default organization
  UPDATE players 
  SET organization_id = default_org_id 
  WHERE organization_id IS NULL;
  
  -- Assign all existing clubs to the default organization
  UPDATE clubs 
  SET organization_id = default_org_id 
  WHERE organization_id IS NULL;
  
  -- Assign all existing squads to the default organization
  UPDATE squads 
  SET organization_id = default_org_id 
  WHERE organization_id IS NULL;
  
  -- Assign all existing sessions to the default organization
  UPDATE sessions 
  SET organization_id = default_org_id 
  WHERE organization_id IS NULL;
  
  -- Assign all existing drills to the default organization
  UPDATE drills 
  SET organization_id = default_org_id 
  WHERE organization_id IS NULL;
  
  -- Assign all existing invitations to the default organization (if table exists)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invitations') THEN
    UPDATE invitations 
    SET organization_id = default_org_id 
    WHERE organization_id IS NULL;
  END IF;
  
  RAISE NOTICE 'Assigned all existing data to organization ID: %', default_org_id;
END $$;

-- Create a superadmin user (replace with your email)
-- Uncomment and modify the email below to create a superadmin
/*
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM auth.users u, roles r
WHERE u.email = 'your-email@example.com' AND r.name = 'superadmin'
ON CONFLICT DO NOTHING;
*/ 