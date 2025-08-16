# Fix Supabase Password Reset Redirect URLs

## The Problem

Supabase is sending password reset emails with URLs pointing to their own domain:
```
https://iktybklkggzmcynibhbl.supabase.co/backcheck.au#access_token=...
```

Instead of your app domain:
```
https://yourdomain.com/reset-password#access_token=...
```

## The Solution

### 1. Update Supabase Site URL

In your Supabase Dashboard:

1. Go to **Authentication** → **Settings**
2. Under **Site URL**, change from:
   ```
   https://iktybklkggzmcynibhbl.supabase.co/backcheck.au
   ```
   
   To:
   ```
   https://yourdomain.com
   ```
   (or `http://localhost:5173` for development)

### 2. Update Redirect URLs

In the same Authentication Settings:

1. Under **Redirect URLs**, add:
   ```
   https://yourdomain.com/reset-password
   https://yourdomain.com/accept-invitation
   ```

2. For development, also add:
   ```
   http://localhost:5173/reset-password
   http://localhost:5173/accept-invitation
   ```

### 3. Update AuthContext (if needed)

If the above doesn't work, you can also try updating the resetPassword function:

```javascript
const resetPassword = async (email) => {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  })
  return { data, error }
}
```

## Why This Happens

Supabase uses the **Site URL** setting to generate password reset links. If this is set to their default domain, all reset links will point there instead of your app.

## Testing

After making these changes:

1. Request a new password reset
2. Check the email - the link should now point to your domain
3. Clicking the link should take you to `/reset-password` with the token in the hash
4. The ResetPassword component will extract the token and allow password reset

## Alternative: Manual URL Construction

If you can't change the Supabase settings, you can manually construct the correct URL:

1. Copy the token from the Supabase email
2. Navigate to: `https://yourdomain.com/reset-password#access_token=YOUR_TOKEN_HERE`
3. The ResetPassword component will handle it correctly

