import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    console.log('=== API route called ===')

    const { email, token, playerName, invitedBy } = req.body
    console.log('Received data:', { email, token, playerName, invitedBy })

    if (!email || !token || !playerName || !invitedBy) {
      console.log('Missing required fields')
      return res.status(400).json({ error: 'Missing required fields' })
    }

    // Check if Resend is properly initialized
    if (!process.env.RESEND_API_KEY) {
      console.error('RESEND_API_KEY is not set in environment variables')
      return res.status(500).json({ error: 'Email service is not configured' })
    }

    const SITE_URL = process.env.SITE_URL || 'http://localhost:5173'
    const invitationUrl = `${SITE_URL}/accept-invitation?token=${token}`
    console.log('Invitation URL generated:', invitationUrl)
    
    try {
      console.log('Attempting to send email via Resend with config:', {
        from: 'Backcheck <noreply@landlife.au>',
        to: email,
        subject: "You've been invited to join Backcheck"
      })

      const emailResult = await resend.emails.send({
        from: 'Backcheck <noreply@landlife.au>',
        to: email,
        subject: "You've been invited to join Backcheck",
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>You've been invited to join Backcheck</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #4f46e5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
              .button { display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
              .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
              .logo { max-width: 200px; height: auto; margin-bottom: 10px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <img src="https://www.backcheck.au/Backcheck_large.png" alt="Backcheck Logo" class="logo" />
                <h1>Backcheck</h1>
              </div>
              <div class="content">
                <h2>You've been invited!</h2>
                <p>Hello!</p>
                <p>You've been invited by <strong>${invitedBy}</strong> to join the Backcheck platform.</p>
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
                <p>This is an automated message from Backcheck</p>
              </div>
            </div>
          </body>
          </html>
        `
      })
      
      console.log('Email send result:', emailResult)
      res.json({ 
        success: true, 
        message: 'Invitation sent successfully',
        emailData: emailResult
      })
    } catch (emailError) {
      console.error('Email Error:', {
        error: emailError,
        message: emailError.message,
        name: emailError.name,
        stack: emailError.stack,
        code: emailError.code
      })
      res.status(500).json({ 
        error: 'Failed to send invitation email',
        details: emailError.message
      })
    }
  } catch (error) {
    console.error('Request Error:', {
      error,
      message: error.message,
      name: error.name,
      stack: error.stack
    })
    res.status(400).json({ error: error.message })
  }
} 