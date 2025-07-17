# Email Confirmation Fix for Invited Users

## Problem
When users accept invitations and create accounts, they get "Email not confirmed" errors because:
1. Supabase requires email confirmation by default
2. The invitation was already sent to their verified email address
3. Supabase sends an additional confirmation email that points to the wrong URL

## Solution

### 1. Code Changes (Already Applied)
The `AcceptInvitation.jsx` component has been updated to disable email confirmation:

```javascript
const { data: authData, error: authError } = await supabase.auth.signUp({
  email: player.email,
  password: password,
  options: {
    emailConfirm: false // Disable email confirmation for invited users
  }
})
```

### 2. Supabase Dashboard Configuration

#### Option A: Disable Email Confirmation Globally (Recommended)
1. Go to your Supabase dashboard
2. Navigate to **Authentication > Settings**
3. Under **Email Auth** section:
   - Set **"Enable email confirmations"** to **OFF**
   - This disables email confirmation for all new sign-ups

#### Option B: Keep Email Confirmation for Regular Sign-ups
1. Keep **"Enable email confirmations"** **ON**
2. The code change above will handle invited users specifically
3. Regular sign-ups will still require email confirmation

### 3. Environment Variables

#### For Production (Vercel)
Set these environment variables in your Vercel dashboard:

```
SITE_URL=https://your-app.vercel.app
RESEND_API_KEY=your_resend_api_key
```

#### For Development (.env file)
```
VITE_SITE_URL=http://localhost:5173
VITE_API_BASE_URL=http://localhost:3001
RESEND_API_KEY=your_resend_api_key
```

### 4. Supabase Site URL Configuration

In your Supabase dashboard:
1. Go to **Authentication > Settings**
2. Under **Site URL**:
   - Set to your production URL (e.g., `https://your-app.vercel.app`)
   - Add `http://localhost:5173` for development
3. Under **Redirect URLs**:
   - Add `https://your-app.vercel.app/accept-invitation`
   - Add `http://localhost:5173/accept-invitation`

### 5. Testing the Fix

1. **Test the invitation flow**:
   - Send an invitation to a new email
   - Click the invitation link
   - Set a password
   - Should be able to log in immediately without email confirmation

2. **Test regular sign-up** (if keeping email confirmation):
   - Go to `/login` and try to sign up with a new email
   - Should receive confirmation email (if enabled)

## Migration File

A migration file has been created: `supabase-migration-disable-email-confirmation.sql`

This file documents the required Supabase dashboard settings and provides additional database functions if needed.

## Summary

The main fix is:
1. ✅ **Code change**: Disable email confirmation in `AcceptInvitation.jsx`
2. 🔧 **Dashboard setting**: Disable email confirmation in Supabase dashboard
3. 🌐 **Environment variables**: Set correct SITE_URL for production
4. 🔗 **Redirect URLs**: Configure Supabase redirect URLs

This ensures that invited users can create accounts and log in immediately without the unnecessary email confirmation step. 