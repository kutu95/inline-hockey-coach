// Test script to check email configuration
// Run this in the browser console to verify your email setup

console.log('=== Email Configuration Test ===')

// Check environment variables
const resendApiKey = import.meta.env.VITE_RESEND_API_KEY
const siteUrl = import.meta.env.VITE_SITE_URL || 'http://localhost:5173'

console.log('Resend API Key configured:', !!resendApiKey)
console.log('Site URL:', siteUrl)

if (!resendApiKey) {
  console.error('❌ VITE_RESEND_API_KEY is not configured!')
  console.log('To fix this:')
  console.log('1. Sign up at https://resend.com')
  console.log('2. Get your API key from the dashboard')
  console.log('3. Add VITE_RESEND_API_KEY=your_api_key to your .env file')
} else {
  console.log('✅ Resend API Key is configured')
}

console.log('=== End Test ===') 