// Test script to verify invitation flow
// Run this in the browser console

console.log('=== Invitation Flow Test ===')

// Check environment variables
const resendApiKey = import.meta.env.VITE_RESEND_API_KEY
const siteUrl = import.meta.env.VITE_SITE_URL || 'http://localhost:5173'

console.log('Resend API Key configured:', !!resendApiKey)
console.log('Site URL:', siteUrl)

// Test the invitation URL generation
const testToken = 'test-token-123'
const invitationUrl = `${siteUrl}/accept-invitation?token=${testToken}`
console.log('Test invitation URL:', invitationUrl)

// Check if the URL looks correct
if (invitationUrl.includes('%')) {
  console.warn('⚠️ URL contains % character - this might cause issues')
}

console.log('=== Current Invitation Flow ===')
console.log('1. ✅ Invitation record created in database')
console.log('2. ✅ Token generated')
console.log('3. ❌ Email sending fails (CORS issue)')
console.log('4. ✅ Fallback shows invitation link in browser')
console.log('5. 📋 Manual sharing of link required')

console.log('=== To Test ===')
console.log('1. Go to a player page')
console.log('2. Click "Send Invitation"')
console.log('3. Copy the link from the alert')
console.log('4. Share the link with the player')

console.log('=== End Test ===') 