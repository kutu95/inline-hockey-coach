// Debug script to test email configuration
// Run this in the browser console

console.log('=== Email Debug Test ===')

// Check environment variables
const resendApiKey = import.meta.env.VITE_RESEND_API_KEY
const siteUrl = import.meta.env.VITE_SITE_URL || 'http://localhost:5173'

console.log('Resend API Key:', resendApiKey ? 'Configured' : 'NOT CONFIGURED')
console.log('Site URL:', siteUrl)

// Test the fetch request
async function testResendAPI() {
  if (!resendApiKey) {
    console.error('❌ No Resend API key configured')
    return
  }

  try {
    console.log('Testing Resend API...')
    
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Inline Hockey Coach <noreply@inlinehockeycoach.com>',
        to: ['test@example.com'],
        subject: 'Test Email',
        html: '<p>This is a test email</p>',
      }),
    })

    console.log('Response status:', response.status)
    console.log('Response ok:', response.ok)
    
    if (!response.ok) {
      const error = await response.json()
      console.error('❌ API Error:', error)
    } else {
      const result = await response.json()
      console.log('✅ API Success:', result)
    }
  } catch (error) {
    console.error('❌ Fetch Error:', error)
    console.log('This might be due to:')
    console.log('1. Invalid API key')
    console.log('2. CORS issues (try from server-side)')
    console.log('3. Network connectivity')
  }
}

// Run the test
testResendAPI()

console.log('=== End Debug Test ===') 