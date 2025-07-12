// Debug script to test Edge Function
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://iktybklkggzmcynibhbl.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlrdHlia2xnZ3ptY3luaWJoYmwiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTczNDU5NzI5MCwiZXhwIjoyMDUwMTczMjkwfQ.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8'

const supabase = createClient(supabaseUrl, supabaseKey)

async function debugEdgeFunction() {
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

    console.log('Response data:', data)
    console.log('Response error:', error)
    
    if (error) {
      console.error('Error details:', {
        message: error.message,
        status: error.status,
        statusText: error.statusText,
        details: error.details
      })
    }
  } catch (err) {
    console.error('Exception:', err)
  }
}

debugEdgeFunction() 