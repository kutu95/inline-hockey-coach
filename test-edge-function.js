// Test script for the Edge Function
import { supabase } from './src/lib/supabase.js'

const testEdgeFunction = async () => {
  console.log('Testing Edge Function...')
  
  try {
    const { data, error } = await supabase.functions.invoke('send-invitation-email', {
      body: {
        email: 'test@example.com',
        token: 'test-token-123',
        playerName: 'Test Player',
        invitedBy: 'Test Coach'
      }
    })

    if (error) {
      console.error('Edge Function Error:', error)
      return false
    }

    console.log('Edge Function Response:', data)
    return true
  } catch (error) {
    console.error('Test failed:', error)
    return false
  }
}

// Run the test
testEdgeFunction().then(success => {
  if (success) {
    console.log('✅ Edge Function is working!')
  } else {
    console.log('❌ Edge Function test failed')
  }
}) 