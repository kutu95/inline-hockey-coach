# Email Setup Guide

## Current Issue
The invitation emails are failing due to CORS restrictions when calling the Resend API directly from the browser.

## Solutions

### Option 1: Quick Fix (Recommended)
The invitation system now has a fallback that shows the invitation link in the browser when email sending fails. This allows you to manually share the link with players.

### Option 2: Deploy Edge Function (For Production)
1. Deploy the Supabase Edge Function to handle email sending server-side
2. Set up environment variables in Supabase

### Option 3: Fix Environment Variables
1. Remove the extra `%` from `VITE_SITE_URL` in your `.env` file
2. Ensure your Resend API key is valid

## Current Behavior
When you send an invitation:
1. ✅ Invitation record is created in the database
2. ✅ Token is generated
3. ❌ Email sending fails (CORS issue)
4. ✅ Fallback shows invitation link in browser

## Manual Process (Current Workaround)
1. Send invitation from player page
2. Copy the invitation link from the alert
3. Share the link with the player via email, text, etc.
4. Player clicks link and sets up their account

## To Deploy Edge Function (Optional)
1. Install Supabase CLI: `npm install -g supabase`
2. Login: `supabase login`
3. Link project: `supabase link --project-ref your-project-ref`
4. Deploy function: `supabase functions deploy send-invitation-email`
5. Set environment variables in Supabase dashboard:
   - `RESEND_API_KEY`
   - `SITE_URL`

## Testing
Run the debug script in browser console:
```javascript
// Copy and paste the content of test-email-debug.js
``` 