-- Simple fix for clubs table RLS policies
-- This creates basic policies that avoid circular dependencies and complex joins

-- Drop ALL existing policies on clubs table
DROP POLICY IF EXISTS "Users can view clubs in their organization" ON clubs;
DROP POLICY IF EXISTS "Users can insert clubs in their organization" ON clubs;
DROP POLICY IF EXISTS "Users can update clubs in their organization" ON clubs;
DROP POLICY IF EXISTS "Users can delete clubs in their organization" ON clubs;
DROP POLICY IF EXISTS "Coaches can view their own clubs" ON clubs;
DROP POLICY IF EXISTS "Coaches can insert their own clubs" ON clubs;
DROP POLICY IF EXISTS "Coaches can update their own clubs" ON clubs;
DROP POLICY IF EXISTS "Coaches can delete their own clubs" ON clubs;

-- Drop any existing policies with the new names to avoid conflicts
DROP POLICY IF EXISTS "Authenticated users can view clubs" ON clubs;
DROP POLICY IF EXISTS "Authenticated users can insert clubs" ON clubs;
DROP POLICY IF EXISTS "Authenticated users can update clubs" ON clubs;
DROP POLICY IF EXISTS "Authenticated users can delete clubs" ON clubs;

-- Create simple, non-circular policies
-- Policy: Allow all authenticated users to view clubs (for now)
CREATE POLICY "Authenticated users can view clubs" ON clubs
  FOR SELECT USING (auth.role() = 'authenticated');

-- Policy: Allow all authenticated users to insert clubs (for now)
CREATE POLICY "Authenticated users can insert clubs" ON clubs
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Policy: Allow all authenticated users to update clubs (for now)
CREATE POLICY "Authenticated users can update clubs" ON clubs
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Policy: Allow all authenticated users to delete clubs (for now)
CREATE POLICY "Authenticated users can delete clubs" ON clubs
  FOR DELETE USING (auth.role() = 'authenticated');

-- Add a comment to document the simplified approach
COMMENT ON TABLE clubs IS 'Clubs table - Simplified RLS policies to allow all authenticated users access. This avoids circular dependencies and complex joins that were causing 500 errors.';
