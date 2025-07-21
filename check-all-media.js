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

async function checkAllMedia() {
  console.log('🔍 Checking all media attachments...')
  console.log('=' .repeat(60))
  
  try {
    // 1. Get all media attachments
    console.log('\n1. Getting all media attachments...')
    const { data: allMedia, error: mediaError } = await supabase
      .from('media_attachments')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (mediaError) {
      console.error('❌ Error fetching media:', mediaError)
      return
    }
    
    console.log(`✅ Found ${allMedia.length} total media attachments`)
    
    if (allMedia.length === 0) {
      console.log('❌ No media attachments found in database')
      console.log('This suggests the save process is completely failing')
      return
    }
    
    // 2. Group by file type
    console.log('\n2. Media attachments by type:')
    const byType = {}
    allMedia.forEach(media => {
      if (!byType[media.file_type]) {
        byType[media.file_type] = []
      }
      byType[media.file_type].push(media)
    })
    
    Object.entries(byType).forEach(([type, items]) => {
      console.log(`  - ${type}: ${items.length} items`)
    })
    
    // 3. Show recent media attachments
    console.log('\n3. Recent media attachments (last 10):')
    allMedia.slice(0, 10).forEach((media, index) => {
      console.log(`\n${index + 1}. ${media.title}`)
      console.log(`   - Type: ${media.file_type}`)
      console.log(`   - File: ${media.file_name}`)
      console.log(`   - Created: ${media.created_at}`)
      console.log(`   - Storage path: ${media.storage_path}`)
      if (media.file_type === 'animation') {
        console.log(`   - Animation data path: ${media.animation_data_path || 'NULL'}`)
        console.log(`   - Is editable: ${media.is_editable}`)
      }
    })
    
    // 4. Check if any are linked to drills
    console.log('\n4. Checking drill links...')
    const { data: drillMedia, error: drillMediaError } = await supabase
      .from('drill_media')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (drillMediaError) {
      console.error('❌ Error fetching drill_media:', drillMediaError)
    } else {
      console.log(`✅ Found ${drillMedia.length} drill-media links`)
      
      if (drillMedia.length > 0) {
        console.log('\nRecent drill-media links:')
        drillMedia.slice(0, 5).forEach((link, index) => {
          console.log(`  ${index + 1}. Drill ${link.drill_id} -> Media ${link.media_id}`)
          console.log(`     Created: ${link.created_at}`)
        })
      }
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

checkAllMedia() 