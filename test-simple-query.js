import { createClient } from '@supabase/supabase-js'

// You'll need to replace these with your actual values
const supabaseUrl = 'YOUR_SUPABASE_URL'
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testBasicQueries() {
  console.log('Testing basic database connectivity...')
  
  try {
    // Test 1: Check if we can connect to Supabase
    console.log('1. Testing basic connection...')
    const { data, error } = await supabase.from('user_roles').select('count')
    console.log('Connection test result:', { data, error })
    
    // Test 2: Check if user_roles table has any data
    console.log('2. Testing user_roles table...')
    const { data: userRolesCount, error: userRolesError } = await supabase
      .from('user_roles')
      .select('*', { count: 'exact', head: true })
    console.log('user_roles count:', { data: userRolesCount, error: userRolesError })
    
    // Test 3: Check if roles table has any data
    console.log('3. Testing roles table...')
    const { data: rolesCount, error: rolesError } = await supabase
      .from('roles')
      .select('*', { count: 'exact', head: true })
    console.log('roles count:', { data: rolesCount, error: rolesError })
    
    // Test 4: Get a few sample records
    console.log('4. Getting sample records...')
    const { data: sampleUserRoles, error: sampleUserRolesError } = await supabase
      .from('user_roles')
      .select('*')
      .limit(3)
    console.log('Sample user_roles:', { data: sampleUserRoles, error: sampleUserRolesError })
    
    const { data: sampleRoles, error: sampleRolesError } = await supabase
      .from('roles')
      .select('*')
      .limit(3)
    console.log('Sample roles:', { data: sampleRoles, error: sampleRolesError })
    
  } catch (error) {
    console.error('Test failed:', error)
  }
}

testBasicQueries() 