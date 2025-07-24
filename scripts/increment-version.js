#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Path to package.json
const packageJsonPath = path.join(__dirname, '..', 'package.json')

try {
  // Read package.json
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
  
  // Parse current version
  const versionParts = packageJson.version.split('.')
  const major = parseInt(versionParts[0])
  const minor = parseInt(versionParts[1])
  const patch = parseInt(versionParts[2])
  
  // Increment minor version
  const newMinor = minor + 1
  const newVersion = `${major}.${newMinor}.${patch}`
  
  // Update version in package.json
  packageJson.version = newVersion
  
  // Write back to package.json
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n')
  
  console.log(`✅ Version incremented from ${versionParts.join('.')} to ${newVersion}`)
  
} catch (error) {
  console.error('❌ Error incrementing version:', error.message)
  process.exit(1)
} 