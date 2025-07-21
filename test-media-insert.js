import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testMediaInsert() {
  console.log('🧪 Testing media attachment insert...')
  console.log('=' .repeat(60))
  
  try {
    // Test data for a simple media attachment
    const testMediaData = {
      title: 'Test Animation',
      description: 'Test animation for debugging',
      file_type: 'animation',
      file_name: 'test-animation.webm',
      file_size: 1024,
      mime_type: 'video/webm',
      storage_path: 'media/test-animation.webm',
      animation_data_path: 'animations/test-animation-data.json',
      duration_seconds: 5,
      frame_count: 25,
      frame_rate: 5,
      is_editable: true
    }
    
    console.log('\n1. Attempting to insert test media attachment...')
    console.log('Test data:', testMediaData)
    
    const { data: insertData, error: insertError } = await supabase
      .from('media_attachments')
      .insert(testMediaData)
      .select()
      .single()
    
    if (insertError) {
      console.error('❌ Insert failed:', insertError)
      console.log('\nPossible issues:')
      console.log('- RLS policies blocking insert')
      console.log('- Missing required columns')
      console.log('- Data type mismatches')
      console.log('- Authentication issues')
      return
    }
    
    console.log('✅ Insert successful!')
    console.log('Inserted data:', insertData)
    
    // Clean up - delete the test record
    console.log('\n2. Cleaning up test record...')
    const { error: deleteError } = await supabase
      .from('media_attachments')
      .delete()
      .eq('id', insertData.id)
    
    if (deleteError) {
      console.error('❌ Cleanup failed:', deleteError)
    } else {
      console.log('✅ Test record cleaned up successfully')
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

testMediaInsert() 