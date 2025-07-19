-- Script to link a player record to a user account
-- Replace 'player-email@example.com' with the actual player's email

-- First, let's see what players exist
SELECT 
  id,
  first_name,
  last_name,
  email,
  user_id
FROM players 
WHERE email IS NOT NULL;

-- Then, let's see what users exist
SELECT 
  id,
  email,
  created_at
FROM auth.users 
ORDER BY created_at DESC
LIMIT 10;

-- Now link a player to a user (replace with actual email)
-- UPDATE players 
-- SET user_id = (SELECT id FROM auth.users WHERE email = 'player-email@example.com')
-- WHERE email = 'player-email@example.com';

-- After linking, verify the connection
-- SELECT 
--   p.id as player_id,
--   p.first_name,
--   p.last_name,
--   p.email as player_email,
--   p.user_id,
--   u.email as user_email
-- FROM players p
-- LEFT JOIN auth.users u ON p.user_id = u.id
-- WHERE p.email = 'player-email@example.com'; 