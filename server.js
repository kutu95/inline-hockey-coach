import express from 'express'
import cors from 'cors'
import { Resend } from 'resend'
import dotenv from 'dotenv'

dotenv.config()

const app = express()
const port = 3001

// CORS configuration - match Farm Cashbook pattern
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))

app.use(express.json())

// Initialize Resend with API key validation - exactly like Farm Cashbook
const resendApiKey = process.env.RESEND_API_KEY
if (!resendApiKey) {
  console.error('RESEND_API_KEY is not set in environment variables')
}
const resend = resendApiKey ? new Resend(resendApiKey) : null

// Helper function to create a response with CORS headers - match Farm Cashbook
function corsResponse(data, status = 200) {
  return {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
    data
  }
}

// Email sending endpoint - match Farm Cashbook pattern exactly
app.post('/api/send-invitation', async (req, res) => {
  try {
    console.log('=== API route called ===')

    const { email, token, playerName, invitedBy } = req.body
    console.log('Received data:', { email, token, playerName, invitedBy })

    if (!email || !token || !playerName || !invitedBy) {
      console.log('Missing required fields')
      return res.status(400).json({ error: 'Missing required fields' })
    }

    // Check if Resend is properly initialized - exactly like Farm Cashbook
    if (!resend) {
      console.error('Resend API key:', process.env.RESEND_API_KEY ? 'Present' : 'Missing')
      return res.status(500).json({ error: 'Email service is not configured' })
    }

    const SITE_URL = process.env.SITE_URL || 'http://localhost:5173'
    const invitationUrl = `${SITE_URL}/accept-invitation?token=${token}`
    console.log('Invitation URL generated:', invitationUrl)
    
    try {
      // For testing: Send to verified email address, but include intended recipient info
      const verifiedEmail = 'john@streamtime.com.au' // Your verified email
      const isTestMode = email !== verifiedEmail
      
      console.log('Attempting to send email via Resend with config:', {
        from: 'Inline Hockey Coach <noreply@landlife.au>',
        to: isTestMode ? verifiedEmail : email,
        subject: isTestMode ? `TEST: Invitation for ${email} - Inline Hockey Coach` : 'You\'ve been invited to join Inline Hockey Coach'
      })

      const emailResult = await resend.emails.send({
        from: 'Inline Hockey Coach <noreply@landlife.au>',
        to: isTestMode ? verifiedEmail : email,
        subject: isTestMode ? `TEST: Invitation for ${email} - Inline Hockey Coach` : 'You\'ve been invited to join Inline Hockey Coach',
        html: `
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
                ${isTestMode ? `
                  <div style="background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
                    <strong>🧪 TEST MODE</strong><br>
                    This email was sent to you (${verifiedEmail}) for testing purposes.<br>
                    <strong>Intended recipient:</strong> ${email}<br>
                    <strong>Player:</strong> ${playerName}
                  </div>
                ` : ''}
                <h2>You've been invited!</h2>
                <p>Hello${isTestMode ? ` (${email})` : ''}!</p>
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
})

app.listen(port, () => {
  console.log(`Email server running on http://localhost:${port}`)
  console.log('Resend API key:', resendApiKey ? 'Present' : 'Missing')
}) 