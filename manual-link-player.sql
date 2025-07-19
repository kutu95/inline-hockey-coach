-- Manual script to link a specific player to a user account
-- Replace the values below with actual data

-- Example: Link a player to a user by email
-- UPDATE players 
-- SET user_id = (SELECT id FROM auth.users WHERE email = 'player-email@example.com')
-- WHERE email = 'player-email@example.com';

-- Example: Link a player to a user by player ID and user ID
-- UPDATE players 
-- SET user_id = 'user-uuid-here'
-- WHERE id = 'player-uuid-here';

-- Example: Link a player to a user by name and email
-- UPDATE players 
-- SET user_id = (SELECT id FROM auth.users WHERE email = 'user-email@example.com')
-- WHERE first_name = 'John' 
--   AND last_name = 'Doe' 
--   AND email = 'player-email@example.com';

-- Check current user accounts
SELECT 
  id,
  email,
  created_at,
  raw_user_meta_data
FROM auth.users 
ORDER BY created_at DESC
LIMIT 20;

-- Check current player records
SELECT 
  id,
  first_name,
  last_name,
  email,
  user_id
FROM players 
WHERE email IS NOT NULL 
  AND email != ''
ORDER BY first_name, last_name; 