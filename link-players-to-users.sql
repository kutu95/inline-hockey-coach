-- Link existing player records to user accounts
-- This script matches players to users by email address

-- First, let's see which players have emails that match user accounts
SELECT 
  p.id as player_id,
  p.first_name,
  p.last_name,
  p.email as player_email,
  p.user_id as current_user_id,
  u.id as auth_user_id,
  u.email as auth_email
FROM players p
LEFT JOIN auth.users u ON p.email = u.email
WHERE p.email IS NOT NULL 
  AND p.email != ''
  AND u.id IS NOT NULL
ORDER BY p.first_name, p.last_name;

-- Now update the player records to link them to their user accounts
UPDATE players 
SET user_id = (
  SELECT id 
  FROM auth.users 
  WHERE email = players.email
)
WHERE email IS NOT NULL 
  AND email != ''
  AND user_id IS NULL
  AND EXISTS (
    SELECT 1 
    FROM auth.users 
    WHERE email = players.email
  );

-- Verify the updates
SELECT 
  p.id as player_id,
  p.first_name,
  p.last_name,
  p.email,
  p.user_id,
  u.email as auth_email
FROM players p
LEFT JOIN auth.users u ON p.user_id = u.id
WHERE p.user_id IS NOT NULL
ORDER BY p.first_name, p.last_name;

-- Show players that still need to be linked (have email but no user_id)
SELECT 
  id,
  first_name,
  last_name,
  email
FROM players 
WHERE email IS NOT NULL 
  AND email != ''
  AND user_id IS NULL
ORDER BY first_name, last_name; 