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

async function checkAllAnimations() {
  const drillId = 'd6a4c9dd-09aa-4315-a032-b19b1346d14e'
  
  console.log('🔍 Checking all animation media attachments...')
  console.log('=' .repeat(60))
  
  try {
    // 1. Get all animation media attachments
    console.log('\n1. Getting all animation media attachments...')
    const { data: allAnimations, error: animationsError } = await supabase
      .from('media_attachments')
      .select('*')
      .eq('file_type', 'animation')
      .order('created_at', { ascending: false })
    
    if (animationsError) {
      console.error('❌ Error fetching animations:', animationsError)
      return
    }
    
    console.log(`✅ Found ${allAnimations.length} animation media attachments`)
    
    if (allAnimations.length === 0) {
      console.log('❌ No animation media attachments found in database')
      return
    }
    
    // 2. Check each animation and see if it's linked to any drill
    console.log('\n2. Checking drill links for each animation...')
    for (const animation of allAnimations) {
      console.log(`\n--- Animation: ${animation.title} ---`)
      console.log(`  - ID: ${animation.id}`)
      console.log(`  - Created: ${animation.created_at}`)
      console.log(`  - Storage path: ${animation.storage_path}`)
      console.log(`  - Animation data path: ${animation.animation_data_path || 'NULL'}`)
      console.log(`  - Is editable: ${animation.is_editable}`)
      
      // Check if this animation is linked to any drill
      const { data: drillLinks, error: linksError } = await supabase
        .from('drill_media')
        .select('drill_id, created_at')
        .eq('media_id', animation.id)
      
      if (linksError) {
        console.log(`  ❌ Error checking drill links:`, linksError.message)
      } else if (drillLinks && drillLinks.length > 0) {
        console.log(`  ✅ Linked to ${drillLinks.length} drill(s):`)
        for (const link of drillLinks) {
          console.log(`    - Drill ID: ${link.drill_id}`)
          if (link.drill_id === drillId) {
            console.log(`    🎯 THIS IS THE TARGET DRILL!`)
          }
        }
      } else {
        console.log(`  ❌ Not linked to any drill (orphaned)`)
      }
      
      // Check if this animation was created around the same time as the drill
      const drillCreatedAt = '2025-07-09T16:14:36.40474+00:00'
      const animationCreatedAt = new Date(animation.created_at)
      const drillCreatedAtDate = new Date(drillCreatedAt)
      const timeDiff = Math.abs(animationCreatedAt - drillCreatedAtDate) / (1000 * 60 * 60) // hours
      
      if (timeDiff < 24) { // Within 24 hours
        console.log(`  ⏰ Created within 24 hours of drill (${timeDiff.toFixed(1)} hours difference)`)
      }
    }
    
    // 3. Check for any orphaned animations that might belong to this drill
    console.log('\n3. Looking for potential orphaned animations...')
    const orphanedAnimations = allAnimations.filter(animation => {
      // This would need to be checked in the loop above, but for now let's look for recent ones
      const animationCreatedAt = new Date(animation.created_at)
      const drillCreatedAtDate = new Date('2025-07-09T16:14:36.40474+00:00')
      const timeDiff = Math.abs(animationCreatedAt - drillCreatedAtDate) / (1000 * 60 * 60) // hours
      return timeDiff < 24 // Within 24 hours
    })
    
    if (orphanedAnimations.length > 0) {
      console.log(`\n⚠️  Found ${orphanedAnimations.length} animation(s) created around the same time as the drill:`)
      orphanedAnimations.forEach(animation => {
        console.log(`  - ${animation.title} (${animation.id})`)
        console.log(`    Created: ${animation.created_at}`)
        console.log(`    Has animation data: ${animation.animation_data_path ? 'YES' : 'NO'}`)
      })
    }
    
    // 4. Check if there are any errors in the save process by looking at recent animations
    console.log('\n4. Checking for potential save errors...')
    const recentAnimations = allAnimations.filter(animation => {
      const animationCreatedAt = new Date(animation.created_at)
      const now = new Date()
      const daysDiff = (now - animationCreatedAt) / (1000 * 60 * 60 * 24)
      return daysDiff < 7 // Within last 7 days
    })
    
    if (recentAnimations.length > 0) {
      console.log(`\n📅 Recent animations (last 7 days):`)
      recentAnimations.forEach(animation => {
        console.log(`  - ${animation.title}`)
        console.log(`    Animation data path: ${animation.animation_data_path || 'MISSING'}`)
        console.log(`    Is editable: ${animation.is_editable}`)
        if (!animation.animation_data_path) {
          console.log(`    ❌ This animation was saved before the animation_data_path column was added`)
        }
      })
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

checkAllAnimations() 