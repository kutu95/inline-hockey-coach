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
  
  // Add the updated package.json to the current commit
  console.log('📝 Adding updated package.json to commit...')
  execSync('git add package.json', { stdio: 'inherit' })
  
  console.log('✅ Pre-commit hook completed successfully!')
  
} catch (error) {
  console.error('❌ Pre-commit hook failed:', error.message)
  process.exit(1)
} 