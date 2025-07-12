// Simple test to check Edge Function status
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://iktybklkggzmcynibhbl.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlrdHlia2xnZ3ptY3luaWJoYmwiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTczNDU5NzI5MCwiZXhwIjoyMDUwMTczMjkwfQ.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testFunction() {
  try {
    console.log('Testing Edge Function...')
    
    const { data, error } = await supabase.functions.invoke('send-invitation-email', {
      body: {
        email: 'test@example.com',
        token: 'test-token',
        playerName: 'Test Player',
        invitedBy: 'Test Coach'
      }
    })

    if (error) {
      console.error('Error:', error)
    } else {
      console.log('Success:', data)
    }
  } catch (err) {
    console.error('Exception:', err)
  }
}

testFunction() 