-- Migration to configure authentication settings for invitation-based registration
-- This ensures that users who sign up through invitations don't need email confirmation

-- Note: This migration documents the required Supabase dashboard settings
-- These settings need to be configured manually in the Supabase dashboard

/*
REQUIRED SUPABASE DASHBOARD CONFIGURATION:

1. Go to Authentication > Settings in your Supabase dashboard
2. Under "Email Auth" section:
   - Set "Enable email confirmations" to OFF
   - This will disable email confirmation for all new sign-ups
   
3. Alternative approach (if you want to keep email confirmation for regular sign-ups):
   - Keep "Enable email confirmations" ON
   - Use the emailConfirm: false option in the signUp call (already implemented in AcceptInvitation.jsx)
   
4. Under "Site URL" section:
   - Set the correct production URL (e.g., https://your-app.vercel.app)
   - Add localhost:5173 for development
   
5. Under "Redirect URLs" section:
   - Add your production URL + /accept-invitation
   - Add localhost:5173/accept-invitation for development
*/

-- Create a function to mark users as email confirmed when they sign up through invitation
CREATE OR REPLACE FUNCTION mark_invited_user_confirmed()
RETURNS TRIGGER AS $$
BEGIN
  -- If this is a new user signing up through invitation, mark them as confirmed
  -- This function can be called after successful invitation acceptance
  UPDATE auth.users 
  SET email_confirmed_at = NOW(),
      updated_at = NOW()
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger to automatically confirm invited users
-- This trigger will fire when a user is created through the invitation flow
CREATE OR REPLACE FUNCTION handle_invited_user_confirmation()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if this user was created through an invitation
  -- We can identify this by checking if they have a player record with their email
  IF EXISTS (
    SELECT 1 FROM public.players 
    WHERE email = NEW.email 
    AND user_id IS NULL
  ) THEN
    -- This is an invited user, mark them as confirmed
    UPDATE auth.users 
    SET email_confirmed_at = NOW(),
        updated_at = NOW()
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: The trigger approach above is complex and may not be necessary
-- The simpler approach is to use emailConfirm: false in the signUp call (already implemented)
-- and configure the Supabase dashboard settings as documented above 