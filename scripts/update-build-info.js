#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Get current timestamp
const now = new Date()
const buildTime = now.toISOString()
const buildDate = now.toLocaleDateString()

// Read package.json to get current version
const packageJsonPath = path.join(__dirname, '../package.json')
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
const currentVersion = packageJson.version

// Read the build info file
const buildInfoPath = path.join(__dirname, '../src/utils/buildInfo.js')
let buildInfoContent = fs.readFileSync(buildInfoPath, 'utf8')

// Replace the build time and date
buildInfoContent = buildInfoContent.replace(
  /buildTime: getBuildTimeFromEnv\(\)/,
  `buildTime: '${buildTime}'`
)

buildInfoContent = buildInfoContent.replace(
  /buildDate: '.*?'/,
  `buildDate: '${buildDate}'`
)

// Replace the version
buildInfoContent = buildInfoContent.replace(
  /version: '.*?'/,
  `version: '${currentVersion}'`
)

// Write the updated content back
fs.writeFileSync(buildInfoPath, buildInfoContent)

console.log(`✅ Build info updated: ${buildTime} | Version: ${currentVersion}`) 