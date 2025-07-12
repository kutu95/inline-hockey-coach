// Test script for email API
import { sendInvitationEmail } from './src/lib/email.js'

async function testEmailAPI() {
  console.log('Testing email API...')
  
  try {
    const result = await sendInvitationEmail(
      'test@resend.dev',
      'test-token-123',
      'Test Player',
      'john@streamtime.com.au'
    )
    
    console.log('Email API test result:', result)
  } catch (error) {
    console.error('Email API test failed:', error)
  }
}

testEmailAPI() 