-- Simple fix for squads table RLS policies
-- This creates basic policies that avoid circular dependencies and complex joins

-- Drop ALL existing policies on squads table
DROP POLICY IF EXISTS "Users can view relevant squads" ON squads;
DROP POLICY IF EXISTS "Users can insert relevant squads" ON squads;
DROP POLICY IF EXISTS "Users can update relevant squads" ON squads;
DROP POLICY IF EXISTS "Users can delete relevant squads" ON squads;
DROP POLICY IF EXISTS "Coaches can view their own squads" ON squads;
DROP POLICY IF EXISTS "Coaches can insert their own squads" ON squads;
DROP POLICY IF EXISTS "Coaches can update their own squads" ON squads;
DROP POLICY IF EXISTS "Coaches can delete their own squads" ON squads;
DROP POLICY IF EXISTS "Users can view squads in their organization" ON squads;
DROP POLICY IF EXISTS "Users can insert squads in their organization" ON squads;
DROP POLICY IF EXISTS "Users can update squads in their organization" ON squads;
DROP POLICY IF EXISTS "Users can delete squads in their organization" ON squads;

-- Drop any existing policies with the new names to avoid conflicts
DROP POLICY IF EXISTS "Authenticated users can view squads" ON squads;
DROP POLICY IF EXISTS "Authenticated users can insert squads" ON squads;
DROP POLICY IF EXISTS "Authenticated users can update squads" ON squads;
DROP POLICY IF EXISTS "Authenticated users can delete squads" ON squads;

-- Create simple, non-circular policies
-- Policy: Allow all authenticated users to view squads (for now)
CREATE POLICY "Authenticated users can view squads" ON squads
  FOR SELECT USING (auth.role() = 'authenticated');

-- Policy: Allow all authenticated users to insert squads (for now)
CREATE POLICY "Authenticated users can insert squads" ON squads
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Policy: Allow all authenticated users to update squads (for now)
CREATE POLICY "Authenticated users can update squads" ON squads
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Policy: Allow all authenticated users to delete squads (for now)
CREATE POLICY "Authenticated users can delete squads" ON squads
  FOR DELETE USING (auth.role() = 'authenticated');

-- Add a comment to document the simplified approach
COMMENT ON TABLE squads IS 'Squads table - Simplified RLS policies to allow all authenticated users access. This avoids circular dependencies and complex joins that were causing 500 errors.';
