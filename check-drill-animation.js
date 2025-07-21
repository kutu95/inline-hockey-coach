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

async function checkDrillAnimation() {
  const drillId = 'd6a4c9dd-09aa-4315-a032-b19b1346d14e'
  
  console.log('🔍 Checking animation data for drill:', drillId)
  console.log('=' .repeat(60))
  
  try {
    // 1. Check if the drill exists
    console.log('\n1. Checking if drill exists...')
    const { data: drillData, error: drillError } = await supabase
      .from('drills')
      .select('id, name, description, created_at')
      .eq('id', drillId)
      .single()
    
    if (drillError) {
      console.error('❌ Error fetching drill:', drillError)
      return
    } else {
      console.log('✅ Drill found:', drillData)
    }
    
    // 2. Check drill_media links
    console.log('\n2. Checking drill_media links...')
    const { data: drillMediaData, error: drillMediaError } = await supabase
      .from('drill_media')
      .select('id, drill_id, media_id, created_at')
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
      .select(`
        id,
        title,
        description,
        file_type,
        file_name,
        storage_path,
        animation_data_path,
        is_editable,
        frame_count,
        frame_rate,
        duration_seconds,
        created_at,
        updated_at
      `)
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
    
    // 5. Check if the animation data file exists in storage
    console.log('\n5. Checking if animation data files exist in storage...')
    for (const media of mediaData) {
      if (media.animation_data_path) {
        try {
          const { data: fileData, error: fileError } = await supabase.storage
            .from('media')
            .list(media.animation_data_path.split('/').slice(0, -1).join('/'))
          
          if (fileError) {
            console.log(`❌ Error checking storage for ${media.animation_data_path}:`, fileError.message)
          } else {
            const fileName = media.animation_data_path.split('/').pop()
            const fileExists = fileData?.some(file => file.name === fileName)
            console.log(`  ${fileExists ? '✅' : '❌'} Animation data file exists: ${fileName}`)
          }
        } catch (error) {
          console.log(`❌ Error checking storage:`, error.message)
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

checkDrillAnimation() 