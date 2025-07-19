import { createClient } from '@supabase/supabase-js'

// Replace with your actual Supabase URL and anon key
const supabaseUrl = 'YOUR_SUPABASE_URL'
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testQueries() {
  const userId = 'ccfb0c14-4f05-477f-bca8-f49f1f2e4325' // Replace with actual user ID
  
  console.log('Testing database queries...')
  
  try {
    // Test 1: Simple user_roles query
    console.log('1. Testing user_roles query...')
    const start1 = Date.now()
    const { data: userRolesData, error: userRolesError } = await supabase
      .from('user_roles')
      .select('role_id')
      .eq('user_id', userId)
    const end1 = Date.now()
    
    console.log(`user_roles query took ${end1 - start1}ms`)
    console.log('Result:', { data: userRolesData, error: userRolesError })
    
    if (userRolesError) {
      console.error('user_roles query failed:', userRolesError)
      return
    }
    
    if (!userRolesData || userRolesData.length === 0) {
      console.log('No roles found for user')
      return
    }
    
    // Test 2: Roles query
    console.log('2. Testing roles query...')
    const roleIds = userRolesData.map(ur => ur.role_id)
    const start2 = Date.now()
    const { data: rolesData, error: rolesError } = await supabase
      .from('roles')
      .select('name')
      .in('id', roleIds)
    const end2 = Date.now()
    
    console.log(`roles query took ${end2 - start2}ms`)
    console.log('Result:', { data: rolesData, error: rolesError })
    
    if (rolesError) {
      console.error('roles query failed:', rolesError)
      return
    }
    
    const roles = rolesData?.map(r => r.name).filter(Boolean) || []
    console.log('Final roles:', roles)
    
  } catch (error) {
    console.error('Test failed:', error)
  }
}

testQueries() 