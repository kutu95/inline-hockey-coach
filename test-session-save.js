import { createClient } from '@supabase/supabase-js'

// Replace with your actual Supabase URL and anon key
const supabaseUrl = 'YOUR_SUPABASE_URL'
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testSessionSave() {
  try {
    // Test data
    const sessionId = '42591181-b475-4b96-b154-ff0a714f5210'
    const notesBlocksData = [
      {
        block_type: 'heading',
        content: 'Test Heading',
        drill_id: null,
        order_index: 0
      },
      {
        block_type: 'text',
        content: 'Test content',
        drill_id: null,
        order_index: 1
      }
    ]
    const sessionDrillsData = []

    console.log('Testing session save...')
    console.log('Session ID:', sessionId)
    console.log('Notes blocks:', notesBlocksData)
    console.log('Session drills:', sessionDrillsData)

    // Test the RPC function
    const { data, error } = await supabase.rpc('save_session_planning', {
      session_uuid: sessionId,
      notes_blocks_data: notesBlocksData,
      session_drills_data: sessionDrillsData
    })

    console.log('RPC Response:', { data, error })

    if (error) {
      console.error('RPC Error:', error)
      return
    }

    // Check if data was actually saved
    const { data: savedBlocks, error: blocksError } = await supabase
      .from('session_notes_blocks')
      .select('*')
      .eq('session_id', sessionId)

    console.log('Saved blocks:', savedBlocks)
    console.log('Blocks error:', blocksError)

    const { data: savedDrills, error: drillsError } = await supabase
      .from('session_drills')
      .select('*')
      .eq('session_id', sessionId)

    console.log('Saved drills:', savedDrills)
    console.log('Drills error:', drillsError)

  } catch (error) {
    console.error('Test failed:', error)
  }
}

// Run the test
testSessionSave() 