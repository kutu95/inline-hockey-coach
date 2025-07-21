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

async function checkAnimationData() {
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
    } else {
      console.log('✅ Drill media links found:', drillMediaData)
    }
    
    // 3. Check media_attachments for animation data
    console.log('\n3. Checking media_attachments for animation data...')
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
      .eq('file_type', 'animation')
    
    if (mediaError) {
      console.error('❌ Error fetching media_attachments:', mediaError)
    } else {
      console.log('✅ Animation media attachments found:', mediaData)
    }
    
    // 4. Check specific animation for this drill
    console.log('\n4. Checking specific animation for this drill...')
    const { data: specificMediaData, error: specificMediaError } = await supabase
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
      .eq('file_type', 'animation')
      .in('id', drillMediaData?.map(dm => dm.media_id) || [])
    
    if (specificMediaError) {
      console.error('❌ Error fetching specific media:', specificMediaError)
    } else {
      console.log('✅ Specific animation for drill:', specificMediaData)
    }
    
    // 5. Check if animation_data_path column exists
    console.log('\n5. Checking schema for animation_data_path column...')
    const { data: schemaData, error: schemaError } = await supabase
      .rpc('check_column_exists', { 
        table_name: 'media_attachments', 
        column_name: 'animation_data_path' 
      })
    
    if (schemaError) {
      console.log('⚠️  Could not check schema directly, but this is normal')
    } else {
      console.log('✅ Schema check result:', schemaData)
    }
    
    // 6. Check all animation media to see the pattern
    console.log('\n6. Checking all animation media attachments...')
    const { data: allAnimationData, error: allAnimationError } = await supabase
      .from('media_attachments')
      .select(`
        id,
        title,
        file_type,
        storage_path,
        animation_data_path,
        is_editable,
        created_at
      `)
      .eq('file_type', 'animation')
      .order('created_at', { ascending: false })
      .limit(5)
    
    if (allAnimationError) {
      console.error('❌ Error fetching all animation data:', allAnimationError)
    } else {
      console.log('✅ All animation media (latest 5):', allAnimationData)
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

checkAnimationData() 