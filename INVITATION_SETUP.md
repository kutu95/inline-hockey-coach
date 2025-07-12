# Invitation-Based User Registration Setup

This guide explains how to set up the invitation-based user registration system for the Inline Hockey Coach application.

## Overview

The application now uses an invitation-based system where:
1. Administrators can invite players by adding them to the system
2. Invited players receive an email with a secure link
3. Players can set up their own account and password
4. Players automatically get the 'player' role and can access their own data

## Database Setup

### 1. Run the Invitation Migration

Execute the following SQL in your Supabase SQL editor:

```sql
-- Run the contents of supabase-migration-invitations.sql
```

This creates:
- `invitations` table for tracking invitations
- `user_id` column in `players` table to link players to auth users
- RLS policies for secure access
- Token generation function

### 2. Verify Role Setup

Ensure you have the 'player' role in your roles table:

```sql
INSERT INTO roles (name, description) VALUES
  ('player', 'Player with basic access')
ON CONFLICT (name) DO NOTHING;
```

## Email Configuration

### 1. Set Up Resend

1. Create a Resend account at [resend.com](https://resend.com)
2. Get your API key from the Resend dashboard
3. Add the API key to your environment variables:

```env
VITE_RESEND_API_KEY=your_resend_api_key_here
VITE_SITE_URL=https://your-domain.com
```

### 2. Configure Email Domain

In your Resend dashboard:
1. Add and verify your domain (e.g., `inlinehockeycoach.com`)
2. Set up the sending domain for emails

## Environment Variables

Add these to your `.env` file:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_RESEND_API_KEY=your_resend_api_key
VITE_SITE_URL=https://your-domain.com
```

## How It Works

### For Administrators:

1. **Add a Player**: Go to Players → Add Player
2. **Fill in Details**: Include the player's email address
3. **Send Invitation**: Check the "Send Account Invitation" box
4. **Submit**: The player will receive an email invitation

### For Players:

1. **Receive Email**: Player gets an invitation email with a secure link
2. **Click Link**: Opens the invitation acceptance page
3. **Set Password**: Player creates their own password
4. **Access Platform**: Player can now log in and view their data

## Security Features

- **Secure Tokens**: Each invitation has a unique, cryptographically secure token
- **Expiration**: Invitations expire after 7 days
- **One-time Use**: Each invitation can only be used once
- **Role Assignment**: Players automatically get the 'player' role
- **Data Isolation**: Players can only see their own data

## Player Access

Once a player accepts an invitation and sets up their account, they can:

- View their own player profile
- See their club and squad information
- Check session schedules and attendance
- Access training materials and drills
- Update their own contact information

## Troubleshooting

### Email Not Sending
- Check your Resend API key is correct
- Verify your domain is configured in Resend
- Check the browser console for errors

### Invitation Link Not Working
- Ensure the token hasn't expired (7 days)
- Check if the invitation was already accepted
- Verify the database migration was run correctly

### Player Can't Access Data
- Check if the player role was assigned correctly
- Verify the user_id is linked to the player record
- Check RLS policies are working correctly

## Testing

1. **Add a Test Player**: Use your own email address
2. **Check Email**: Verify the invitation email is received
3. **Accept Invitation**: Click the link and set up the account
4. **Test Access**: Verify the player can see their data

## Migration from Old System

If you have existing players who need accounts:

1. Add their email addresses to the player records
2. Use the "Send Invitation" feature for each player
3. Players will receive emails to set up their accounts

## API Endpoints

The system uses these Supabase functions:
- `generate_invitation_token()` - Creates secure tokens
- Email sending via Resend API
- Automatic role assignment on invitation acceptance 