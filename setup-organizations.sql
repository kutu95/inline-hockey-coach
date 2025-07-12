-- Setup script for organizations
-- This script will create initial organizations and assign existing users

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
  
  -- Assign all existing users to the default organization
  UPDATE users 
  SET organization_id = default_org_id 
  WHERE organization_id IS NULL;
  
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
  
  -- Assign all existing invitations to the default organization
  UPDATE invitations 
  SET organization_id = default_org_id 
  WHERE organization_id IS NULL;
  
  RAISE NOTICE 'Assigned all existing data to organization ID: %', default_org_id;
END $$;

-- Create a superadmin user (if you want to create one)
-- Replace 'your-email@example.com' with the actual superadmin email
-- INSERT INTO user_roles (user_id, role_id)
-- SELECT u.id, r.id
-- FROM users u, roles r
-- WHERE u.email = 'your-email@example.com' AND r.role_name = 'superadmin'
-- ON CONFLICT DO NOTHING; 