-- Setup script for roles and user_roles tables
-- Run this in your Supabase SQL editor

-- First, create the roles table if it doesn't exist
CREATE TABLE IF NOT EXISTS roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create the user_roles table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, role_id)
);

-- Insert default roles if they don't exist
INSERT INTO roles (name, description) VALUES
  ('admin', 'Administrator with full access'),
  ('coach', 'Coach with limited administrative access'),
  ('player', 'Player with basic access')
ON CONFLICT (name) DO NOTHING;

-- Enable RLS on both tables
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for roles table
DROP POLICY IF EXISTS "Roles are viewable by authenticated users" ON roles;
CREATE POLICY "Roles are viewable by authenticated users" ON roles
  FOR SELECT USING (auth.role() = 'authenticated');

-- Create RLS policies for user_roles table
DROP POLICY IF EXISTS "Users can view their own roles" ON user_roles;
CREATE POLICY "Users can view their own roles" ON user_roles
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage all user roles" ON user_roles;
CREATE POLICY "Admins can manage all user roles" ON user_roles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() AND r.name = 'admin'
    )
  );

-- Assign admin role to the specified user (replace with your user ID)
-- Replace 'f5021231-1b0e-491e-8909-d981016f08b2' with your actual user ID
INSERT INTO user_roles (user_id, role_id)
SELECT 
  'f5021231-1b0e-491e-8909-d981016f08b2'::UUID as user_id,
  id as role_id
FROM roles 
WHERE name = 'admin'
ON CONFLICT (user_id, role_id) DO NOTHING;

-- Verify the setup
SELECT 
  u.email,
  r.name as role_name
FROM auth.users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles r ON ur.role_id = r.id
WHERE u.id = 'f5021231-1b0e-491e-8909-d981016f08b2'::UUID; 