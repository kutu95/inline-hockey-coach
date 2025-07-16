// Email service using Vercel serverless functions
const SITE_URL = import.meta.env.VITE_SITE_URL || 'http://localhost:5173'
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'

export const sendInvitationEmail = async (email, invitationToken, playerName, invitedBy) => {
  try {
    console.log('Attempting to send invitation email via Vercel API...')
    
    const response = await fetch(`${API_BASE_URL}/api/send-invitation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        token: invitationToken,
        playerName,
        invitedBy
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('API error:', errorData)
      throw new Error(`API error: ${errorData.error || errorData.message}`)
    }

    const result = await response.json()
    console.log('Email sent successfully:', result)
    return result
  } catch (error) {
    console.error('Email sending failed:', error)
    
    // Show manual invitation link as fallback
    const invitationUrl = `${SITE_URL}/accept-invitation?token=${invitationToken}`
    alert(`Email sending failed. Please copy this invitation link and send it manually:\n\n${invitationUrl}`)
    return { success: true, manual: true }
  }
}

export const sendPasswordResetEmail = async (email, resetToken) => {
  try {
    console.log('Attempting to send password reset email via Vercel API...')
    
    const response = await fetch(`${API_BASE_URL}/api/send-invitation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        token: resetToken,
        playerName: 'User',
        invitedBy: 'System'
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('API error:', errorData)
      throw new Error(`API error: ${errorData.error || errorData.message}`)
    }

    const result = await response.json()
    console.log('Password reset email sent successfully:', result)
    return result
  } catch (error) {
    console.error('Password reset email failed:', error)
    
    // Show manual reset link as fallback
    const resetUrl = `${SITE_URL}/reset-password?token=${resetToken}`
    alert(`Email sending failed. Please copy this reset link and send it manually:\n\n${resetUrl}`)
    return { success: true, manual: true }
  }
} 