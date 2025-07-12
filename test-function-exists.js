// Test if Edge Function exists
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://iktybklkggzmcynibhbl.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlrdHlia2xnZ3ptY3luaWJoYmwiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTczNDU5NzI5MCwiZXhwIjoyMDUwMTczMjkwfQ.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testFunctionExists() {
  try {
    console.log('Testing if Edge Function exists...')
    
    // Try to invoke the function
    const { data, error } = await supabase.functions.invoke('send-invitation-email', {
      body: { test: true }
    })

    console.log('Function response:', { data, error })
    
    if (error) {
      console.error('Error details:', {
        message: error.message,
        status: error.status,
        statusText: error.statusText
      })
      
      // Try to get more details about the error
      if (error.context) {
        console.error('Response status:', error.context.status)
        console.error('Response statusText:', error.context.statusText)
      }
    }
  } catch (err) {
    console.error('Exception:', err)
  }
}

testFunctionExists() 