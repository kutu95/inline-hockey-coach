// Email service using Resend
import { supabase } from './supabase.js'

const RESEND_API_KEY = import.meta.env.VITE_RESEND_API_KEY
const SITE_URL = import.meta.env.VITE_SITE_URL || 'http://localhost:5173'

export const sendInvitationEmail = async (email, invitationToken, playerName, invitedBy) => {
  // Try to use Supabase Edge Function first (server-side)
  try {
    console.log('Attempting to use Edge Function for server-side email sending...')
    
    const { data, error } = await supabase.functions.invoke('send-invitation-email', {
      body: {
        email,
        token: invitationToken,
        playerName,
        invitedBy
      }
    })

    if (error) {
      console.error('Edge Function error:', error)
      throw new Error(`Edge function error: ${error.message}`)
    }

    console.log('Edge Function success:', data)
    return data
    } catch (edgeFunctionError) {
    console.error('Edge Function failed:', edgeFunctionError)
    
    // Show manual invitation link as fallback
    const invitationUrl = `${SITE_URL}/accept-invitation?token=${invitationToken}`
    alert(`Server-side email sending failed. Please copy this invitation link and send it manually:\n\n${invitationUrl}`)
    return { success: true, manual: true }
  }
}

export const sendPasswordResetEmail = async (email, resetToken) => {
  if (!RESEND_API_KEY) {
    throw new Error('Resend API key not configured')
  }

  const resetUrl = `${SITE_URL}/reset-password?token=${resetToken}`
  
  const emailContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reset Your Password - Inline Hockey Coach</title>
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
          <h2>Reset Your Password</h2>
          <p>Hello!</p>
          <p>You requested to reset your password for your Inline Hockey Coach account.</p>
          <p>Click the button below to set a new password:</p>
          <div style="text-align: center;">
            <a href="${resetUrl}" class="button">Reset Password</a>
          </div>
          <p style="margin-top: 20px; font-size: 14px; color: #6b7280;">
            This link will expire in 1 hour. If you didn't request this reset, you can safely ignore this email.
          </p>
        </div>
        <div class="footer">
          <p>This is an automated message from Inline Hockey Coach</p>
        </div>
      </div>
    </body>
    </html>
  `

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Inline Hockey Coach <noreply@inlinehockeycoach.com>',
        to: [email],
        subject: 'Reset Your Password - Inline Hockey Coach',
        html: emailContent,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Failed to send email: ${error.message}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Error sending password reset email:', error)
    throw error
  }
} 