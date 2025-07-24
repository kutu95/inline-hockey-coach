#!/usr/bin/env node

import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

console.log('🔄 Running pre-commit hook...')

try {
  // Run the version increment script
  console.log('📦 Incrementing version...')
  execSync('npm run increment-version', { stdio: 'inherit' })
  
  // Update build info with new version
  console.log('🔧 Updating build info...')
  execSync('npm run update-build-info', { stdio: 'inherit' })
  
  // Add the updated files to the current commit
  console.log('📝 Adding updated files to commit...')
  execSync('git add package.json src/utils/buildInfo.js', { stdio: 'inherit' })
  
  console.log('✅ Pre-commit hook completed successfully!')
  
} catch (error) {
  console.error('❌ Pre-commit hook failed:', error.message)
  process.exit(1)
} 