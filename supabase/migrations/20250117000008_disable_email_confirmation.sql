-- Migration to disable email confirmation for invited users
-- This ensures that users who sign up through invitations don't need email confirmation

-- Create a function to automatically confirm invited users' emails
CREATE OR REPLACE FUNCTION confirm_invited_user_email()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if this user was created through an invitation
  -- We can identify this by checking if they have a player record with their email
  IF EXISTS (
    SELECT 1 FROM public.players 
    WHERE email = NEW.email 
    AND user_id IS NULL
  ) THEN
    -- This is an invited user, mark them as confirmed immediately
    UPDATE auth.users 
    SET email_confirmed_at = NOW(),
        updated_at = NOW()
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger to automatically confirm invited users when they sign up
DROP TRIGGER IF EXISTS trigger_confirm_invited_user_email ON auth.users;
CREATE TRIGGER trigger_confirm_invited_user_email
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION confirm_invited_user_email();

-- Note: This approach automatically confirms invited users' emails
-- The client-side code should also use emailConfirm: false in the signUp call
-- This provides a double layer of protection against email confirmation issues 