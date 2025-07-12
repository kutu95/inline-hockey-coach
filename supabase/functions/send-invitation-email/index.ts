import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

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
    // Allow anonymous access - no authentication required
    const { email, token, playerName, invitedBy } = await req.json()

    if (!email || !token || !playerName || !invitedBy) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'Resend API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const SITE_URL = Deno.env.get('SITE_URL') || 'http://localhost:5173'
    const invitationUrl = `${SITE_URL}/accept-invitation?token=${token}`
    
    const emailContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>You've been invited to join Inline Hockey Coach</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4f46e5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎯 Inline Hockey Coach</h1>
          </div>
          <div class="content">
            <h2>You've been invited!</h2>
            <p>Hello!</p>
            <p>You've been invited by <strong>${invitedBy}</strong> to join the Inline Hockey Coach platform.</p>
            <p>As a player, you'll be able to:</p>
            <ul>
              <li>View your player profile and details</li>
              <li>See your club and squad information</li>
              <li>Check session schedules and attendance</li>
              <li>Access training materials and drills</li>
            </ul>
            <p>To get started, click the button below to set up your account:</p>
            <div style="text-align: center;">
              <a href="${invitationUrl}" class="button">Accept Invitation</a>
            </div>
            <p style="margin-top: 20px; font-size: 14px; color: #6b7280;">
              This invitation will expire in 7 days. If you have any questions, please contact your coach.
            </p>
          </div>
          <div class="footer">
            <p>This is an automated message from Inline Hockey Coach</p>
          </div>
        </div>
      </body>
      </html>
    `

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Inline Hockey Coach <noreply@inlinehockeycoach.com>',
        to: [email],
        subject: 'You\'ve been invited to join Inline Hockey Coach',
        html: emailContent,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      return new Response(
        JSON.stringify({ error: `Failed to send email: ${error.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const result = await response.json()
    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}) 