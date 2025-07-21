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

async function checkDatabaseSchema() {
  console.log('🔍 Checking database schema...')
  console.log('=' .repeat(60))
  
  try {
    // Check what tables exist in the public schema
    console.log('\n1. Checking existing tables in public schema...')
    const { data: tablesData, error: tablesError } = await supabase
      .rpc('get_tables')
    
    if (tablesError) {
      console.log('⚠️  Could not get tables list directly, trying alternative approach...')
      
      // Try to query information_schema
      const { data: schemaData, error: schemaError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .order('table_name')
      
      if (schemaError) {
        console.error('❌ Error fetching schema information:', schemaError)
      } else {
        console.log('✅ Tables found in public schema:', schemaData?.map(t => t.table_name))
      }
    } else {
      console.log('✅ Tables found:', tablesData)
    }
    
    // Try to check if specific tables exist by attempting to query them
    const tablesToCheck = [
      'drills',
      'sessions', 
      'media_attachments',
      'drill_media',
      'session_media',
      'players',
      'organizations',
      'user_roles',
      'roles'
    ]
    
    console.log('\n2. Checking specific tables...')
    for (const tableName of tablesToCheck) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1)
        
        if (error) {
          console.log(`❌ Table '${tableName}' does not exist:`, error.message)
        } else {
          console.log(`✅ Table '${tableName}' exists`)
        }
      } catch (err) {
        console.log(`❌ Table '${tableName}' does not exist:`, err.message)
      }
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

checkDatabaseSchema() 