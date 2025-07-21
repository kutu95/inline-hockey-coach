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

async function checkDrillStructure() {
  const drillId = 'd6a4c9dd-09aa-4315-a032-b19b1346d14e'
  
  console.log('🔍 Checking drill structure and data...')
  console.log('=' .repeat(60))
  
  try {
    // 1. Try to get all columns from drills table
    console.log('\n1. Checking drills table structure...')
    const { data: drillData, error: drillError } = await supabase
      .from('drills')
      .select('*')
      .eq('id', drillId)
      .single()
    
    if (drillError) {
      console.error('❌ Error fetching drill:', drillError)
      
      // Try with just id to see if the table exists
      const { data: allDrills, error: allDrillsError } = await supabase
        .from('drills')
        .select('id')
        .limit(1)
      
      if (allDrillsError) {
        console.error('❌ Drills table error:', allDrillsError)
        return
      } else {
        console.log('✅ Drills table exists, but column structure is different')
        console.log('Available drills:', allDrills)
      }
    } else {
      console.log('✅ Drill found with all columns:', drillData)
    }
    
    // 2. Check drill_media links
    console.log('\n2. Checking drill_media links...')
    const { data: drillMediaData, error: drillMediaError } = await supabase
      .from('drill_media')
      .select('*')
      .eq('drill_id', drillId)
    
    if (drillMediaError) {
      console.error('❌ Error fetching drill_media:', drillMediaError)
      return
    } else {
      console.log('✅ Drill media links found:', drillMediaData)
    }
    
    if (!drillMediaData || drillMediaData.length === 0) {
      console.log('❌ No media attachments found for this drill')
      return
    }
    
    // 3. Check media_attachments for animation data
    console.log('\n3. Checking media_attachments for animation data...')
    const mediaIds = drillMediaData.map(dm => dm.media_id)
    
    const { data: mediaData, error: mediaError } = await supabase
      .from('media_attachments')
      .select('*')
      .in('id', mediaIds)
      .eq('file_type', 'animation')
    
    if (mediaError) {
      console.error('❌ Error fetching media_attachments:', mediaError)
      return
    } else {
      console.log('✅ Animation media attachments found:', mediaData)
    }
    
    if (!mediaData || mediaData.length === 0) {
      console.log('❌ No animation media attachments found for this drill')
      return
    }
    
    // 4. Check if animation_data_path is populated
    console.log('\n4. Checking animation_data_path values...')
    mediaData.forEach((media, index) => {
      console.log(`\nAnimation ${index + 1}:`)
      console.log(`  - ID: ${media.id}`)
      console.log(`  - Title: ${media.title}`)
      console.log(`  - File: ${media.file_name}`)
      console.log(`  - Storage path: ${media.storage_path}`)
      console.log(`  - Animation data path: ${media.animation_data_path || 'NULL'}`)
      console.log(`  - Is editable: ${media.is_editable}`)
      console.log(`  - Frame count: ${media.frame_count}`)
      console.log(`  - Frame rate: ${media.frame_rate}`)
      console.log(`  - Created: ${media.created_at}`)
      
      if (media.animation_data_path) {
        console.log(`  ✅ Has animation data path - can be loaded for editing`)
      } else {
        console.log(`  ❌ Missing animation data path - cannot be loaded for editing`)
      }
    })
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

checkDrillStructure() 