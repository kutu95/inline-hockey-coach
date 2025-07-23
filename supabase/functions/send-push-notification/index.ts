import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
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

    // Send push notification
    const response = await fetch(subscriptionData.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `vapid t=${generateVAPIDToken(subscriptionData)}`,
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
          {
            action: 'open',
            title: 'Open App'
          },
          {
            action: 'dismiss',
            title: 'Dismiss'
          }
        ]
      })
    })

    if (!response.ok) {
      throw new Error(`Failed to send push notification: ${response.statusText}`)
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Push notification sent successfully' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error sending push notification:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})

// Generate VAPID token for authentication
function generateVAPIDToken(subscription: any): string {
  // This is a simplified version - you'll need to implement proper VAPID token generation
  // For production, use a library like 'web-push' or implement the VAPID spec
  const header = {
    typ: 'JWT',
    alg: 'ES256'
  }
  
  const payload = {
    aud: new URL(subscription.endpoint).origin,
    exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60, // 12 hours
    sub: 'mailto:your-email@example.com' // Your VAPID email
  }

  // Note: This is a placeholder - you need to implement actual JWT signing
  // with your VAPID private key
  return 'placeholder-vapid-token'
} 