// Debug script to test the Edge Function
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://your-project-ref.supabase.co' // Replace with your project URL
const supabaseKey = 'your-anon-key' // Replace with your anon key

const supabase = createClient(supabaseUrl, supabaseKey)

async function testEdgeFunction() {
  try {
    console.log('Testing Edge Function...')
    
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
      console.error('Error details:', {
        message: error.message,
        status: error.status,
        statusText: error.statusText,
        details: error.details
      })
    } else {
      console.log('Edge Function Success:', data)
    }
  } catch (err) {
    console.error('Unexpected error:', err)
  }
}

testEdgeFunction() 