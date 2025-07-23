# Push Notifications Setup Guide

This guide will help you set up push notifications for your Backcheck app so you get notified when someone accepts your invitation.

## Prerequisites

1. **VAPID Keys**: You need to generate VAPID (Voluntary Application Server Identification) keys
2. **HTTPS**: Your app must be served over HTTPS (required for push notifications)
3. **Modern Browser**: Users need a browser that supports the Push API

## Step 1: Generate VAPID Keys

### Option A: Using web-push library (Recommended)

1. Install the web-push library:
```bash
npm install web-push
```

2. Generate VAPID keys:
```bash
npx web-push generate-vapid-keys
```

3. You'll get output like:
```
=======================================
Public Key:
BEl62iUYgUivxIkv69yViEuiBIa1lQ...

Private Key:
VkYpKzIxSGR1ZUZpTzZ1eWgzbHA...
=======================================
```

### Option B: Online VAPID Key Generator

Visit: https://web-push-codelab.glitch.me/

## Step 2: Configure Environment Variables

Add these to your `.env` file:

```env
# VAPID Keys for Push Notifications
VITE_VAPID_PUBLIC_KEY=your_public_key_here
VAPID_PRIVATE_KEY=your_private_key_here
VAPID_EMAIL=your-email@example.com
```

## Step 3: Deploy Database Migration

Run the push subscriptions migration:

```sql
-- Run this in your Supabase SQL editor
-- Or use: supabase db push

-- Create push subscriptions table
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);

-- Enable RLS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own push subscriptions" ON push_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own push subscriptions" ON push_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own push subscriptions" ON push_subscriptions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own push subscriptions" ON push_subscriptions
  FOR DELETE USING (auth.uid() = user_id);
```

## Step 4: Deploy Edge Function

1. Deploy the push notification edge function:
```bash
supabase functions deploy send-push-notification
```

2. Set the VAPID private key as a secret:
```bash
supabase secrets set VAPID_PRIVATE_KEY=your_private_key_here
supabase secrets set VAPID_EMAIL=your-email@example.com
```

## Step 5: Update Edge Function with Proper VAPID Implementation

The current edge function has a placeholder for VAPID token generation. You'll need to implement proper JWT signing. Here's a complete implementation:

```typescript
// In supabase/functions/send-push-notification/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { encode as base64url } from "https://deno.land/std@0.208.0/encoding/base64url.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// VAPID configuration
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!
const VAPID_EMAIL = Deno.env.get('VAPID_EMAIL')!

// Generate VAPID token
async function generateVAPIDToken(subscription: any): Promise<string> {
  const header = {
    typ: 'JWT',
    alg: 'ES256'
  }
  
  const payload = {
    aud: new URL(subscription.endpoint).origin,
    exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60, // 12 hours
    sub: `mailto:${VAPID_EMAIL}`
  }

  // Convert private key from base64 to Uint8Array
  const privateKeyBytes = base64url.decode(VAPID_PRIVATE_KEY.replace(/[_-]/g, m => m === '_' ? '+' : '/'))
  
  // Create JWT (simplified - you may want to use a proper JWT library)
  const headerB64 = base64url.encode(JSON.stringify(header))
  const payloadB64 = base64url.encode(JSON.stringify(payload))
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    await crypto.subtle.importKey(
      'pkcs8',
      privateKeyBytes,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['sign']
    ),
    new TextEncoder().encode(`${headerB64}.${payloadB64}`)
  )
  
  return `${headerB64}.${payloadB64}.${base64url.encode(signature)}`
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const { targetUserId, title, body, data = {} } = await req.json()

    if (!targetUserId || !title || !body) {
      throw new Error('Missing required parameters: targetUserId, title, body')
    }

    // Get user's push subscription
    const { data: subscriptionData, error: subscriptionError } = await supabaseClient
      .rpc('get_user_push_subscription', { user_uuid: targetUserId })

    if (subscriptionError || !subscriptionData) {
      throw new Error('User not subscribed to push notifications')
    }

    // Generate VAPID token
    const vapidToken = await generateVAPIDToken(subscriptionData)

    // Send push notification
    const response = await fetch(subscriptionData.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `vapid t=${vapidToken}`,
        'TTL': '86400', // 24 hours
      },
      body: JSON.stringify({
        title,
        body,
        icon: '/Backcheck_large.png',
        badge: '/backcheck-icon.png',
        data,
        requireInteraction: true,
        actions: [
          { action: 'open', title: 'Open App' },
          { action: 'dismiss', title: 'Dismiss' }
        ]
      })
    })

    if (!response.ok) {
      throw new Error(`Failed to send push notification: ${response.statusText}`)
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Push notification sent successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('Error sending push notification:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
```

## Step 6: Test Push Notifications

1. **Install the app** on your Android device:
   - Open Chrome/Edge on your Android device
   - Navigate to your app URL
   - Tap the "Install" prompt or use the browser menu to "Add to Home Screen"

2. **Enable notifications**:
   - Open the installed app
   - Go to Notification Settings (you'll need to add this route)
   - Tap "Enable Push Notifications"
   - Grant permission when prompted

3. **Test the flow**:
   - Send an invitation to someone
   - Have them accept the invitation
   - You should receive a push notification

## Step 7: Add Notification Settings Route

Add this route to your App.jsx:

```jsx
import NotificationSettings from './components/NotificationSettings'

// In your routes
<Route path="/notification-settings" element={<NotificationSettings />} />
```

## Troubleshooting

### Common Issues:

1. **"Push notifications are not supported"**
   - Ensure you're using HTTPS
   - Check that the browser supports Push API
   - Try Chrome or Edge on Android

2. **"Permission denied"**
   - User needs to manually enable notifications in browser settings
   - Guide them to browser settings > Site Settings > Notifications

3. **"Failed to send push notification"**
   - Check VAPID keys are correct
   - Verify edge function is deployed
   - Check Supabase logs for errors

4. **Notifications not appearing**
   - Ensure app is installed as PWA
   - Check service worker is registered
   - Verify subscription is saved in database

### Debug Steps:

1. Check browser console for errors
2. Verify service worker registration
3. Test VAPID key generation
4. Check Supabase function logs
5. Verify database subscription storage

## Security Considerations

- Keep VAPID private key secure
- Use HTTPS in production
- Implement proper user authentication
- Validate notification data
- Rate limit notification sending

## Performance Tips

- Batch notifications when possible
- Use appropriate TTL values
- Monitor notification delivery rates
- Implement retry logic for failed notifications 