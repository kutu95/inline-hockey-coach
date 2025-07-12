// Detailed debug script for Edge Function
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://iktybklkggzmcynibhbl.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlrdHlia2xnZ3ptY3luaWJoYmwiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTczNDU5NzI5MCwiZXhwIjoyMDUwMTczMjkwfQ.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8'

const supabase = createClient(supabaseUrl, supabaseKey)

async function debugEdgeFunctionDetailed() {
  try {
    console.log('=== Detailed Edge Function Debug ===')
    
    // Test 1: Check if function exists with minimal data
    console.log('\n1. Testing with minimal data...')
    const { data: data1, error: error1 } = await supabase.functions.invoke('send-invitation-email', {
      body: { test: true }
    })
    
    console.log('Result 1:', { data: data1, error: error1 })
    
    if (error1) {
      console.error('Error 1 details:', {
        message: error1.message,
        status: error1.status,
        statusText: error1.statusText,
        context: error1.context
      })
    }
    
    // Test 2: Check with proper data structure
    console.log('\n2. Testing with proper data structure...')
    const { data: data2, error: error2 } = await supabase.functions.invoke('send-invitation-email', {
      body: {
        email: 'test@example.com',
        token: 'test-token',
        playerName: 'Test Player',
        invitedBy: 'Test Coach'
      }
    })
    
    console.log('Result 2:', { data: data2, error: error2 })
    
    if (error2) {
      console.error('Error 2 details:', {
        message: error2.message,
        status: error2.status,
        statusText: error2.statusText,
        context: error2.context
      })
    }
    
    // Test 3: Try to get function info
    console.log('\n3. Checking function status...')
    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/send-invitation-email`, {
        method: 'OPTIONS',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        }
      })
      console.log('Function status check:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      })
    } catch (fetchError) {
      console.error('Function status check failed:', fetchError)
    }
    
  } catch (err) {
    console.error('Exception:', err)
  }
}

debugEdgeFunctionDetailed() 