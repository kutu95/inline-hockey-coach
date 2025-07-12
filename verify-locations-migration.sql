-- Verification script for locations migration
-- Run this in your Supabase SQL editor to verify the migration worked

-- Check if locations table exists
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'locations'
ORDER BY ordinal_position;

-- Check if location_id column was added to sessions
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'sessions' AND column_name = 'location_id';

-- Check RLS policies on locations table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'locations';

-- Check if sample data was inserted
SELECT 
  id,
  name,
  description,
  organization_id,
  created_at
FROM locations 
ORDER BY name;

-- Check if indexes were created
SELECT 
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename = 'locations';

-- Check if trigger was created
SELECT 
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'locations'; 