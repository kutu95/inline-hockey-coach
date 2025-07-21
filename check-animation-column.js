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

async function checkAnimationColumn() {
  console.log('🔍 Checking if animation_data_path column exists...')
  console.log('=' .repeat(60))
  
  try {
    // Try to query the animation_data_path column
    const { data, error } = await supabase
      .from('media_attachments')
      .select('id, title, animation_data_path, is_editable')
      .limit(1)
    
    if (error) {
      if (error.message.includes('animation_data_path')) {
        console.log('❌ animation_data_path column does NOT exist')
        console.log('This column needs to be added for animation editing to work')
        return false
      } else {
        console.error('❌ Error querying media_attachments:', error)
        return false
      }
    } else {
      console.log('✅ animation_data_path column EXISTS')
      console.log('Sample data structure:', data)
      return true
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
    return false
  }
}

checkAnimationColumn() 