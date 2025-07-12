// Test Edge Function with service role authentication
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://iktybklkggzmcynibhbl.supabase.co'
// This should be your service role key, not the anon key
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlrdHlia2xnZ3ptY3luaWJoYmwiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNzM0NTk3MjkwLCJleHAiOjIwNTAxNzMyOTB9.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testWithServiceRole() {
  try {
    console.log('Testing Edge Function with service role...')
    
    const { data, error } = await supabase.functions.invoke('send-invitation-email', {
      body: {
        email: 'test@example.com',
        token: 'test-token',
        playerName: 'Test Player',
        invitedBy: 'Test Coach'
      }
    })

    console.log('Response:', { data, error })
    
    if (error) {
      console.error('Error details:', {
        message: error.message,
        status: error.status,
        statusText: error.statusText
      })
    }
  } catch (err) {
    console.error('Exception:', err)
  }
}

testWithServiceRole() 