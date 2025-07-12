// Test script to check environment variables in Edge Function
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://iktybklkggzmcynibhbl.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlrdHlia2xnZ3ptY3luaWJoYmwiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTczNDU5NzI5MCwiZXhwIjoyMDUwMTczMjkwfQ.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testEnvVars() {
  try {
    console.log('Testing Edge Function with minimal data...')
    
    // Test with minimal data to see if it's an env var issue
    const { data, error } = await supabase.functions.invoke('send-invitation-email', {
      body: {
        email: 'test@example.com',
        token: 'test-token',
        playerName: 'Test',
        invitedBy: 'Test'
      }
    })

    console.log('Response:', { data, error })
    
    if (error) {
      console.error('Error status:', error.status)
      console.error('Error message:', error.message)
    }
  } catch (err) {
    console.error('Exception:', err)
  }
}

testEnvVars() 