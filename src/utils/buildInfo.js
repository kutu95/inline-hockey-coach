// Build information utility
// This file gets updated during the build process

// Try to get build time from environment variables first (for deployment platforms)
const getBuildTimeFromEnv = () => {
  // Check for various environment variable formats
  return (typeof process !== 'undefined' && process.env?.BUILD_TIME) || 
         (typeof process !== 'undefined' && process.env?.VERCEL_BUILD_TIME) || 
         (typeof process !== 'undefined' && process.env?.NETLIFY_BUILD_TIME) ||
         (typeof process !== 'undefined' && process.env?.BUILD_TIMESTAMP) ||
         new Date().toISOString()
}

// Safe environment variable access for browser compatibility
const getEnvVar = (varName, fallback = 'unknown') => {
  return (typeof process !== 'undefined' && process.env?.[varName]) || fallback
}

export const BUILD_INFO = {
  buildTime: '2025-07-24T03:12:12.424Z',
  buildDate: '7/26/2025',
  version: '1.0.29',
  environment: getEnvVar('NODE_ENV', 'development'),
  commitHash: getEnvVar('VERCEL_GIT_COMMIT_SHA') || 
              getEnvVar('NETLIFY_COMMIT_REF') || 
              getEnvVar('GIT_COMMIT_SHA') || 
              'unknown',
  branch: getEnvVar('VERCEL_GIT_COMMIT_REF') || 
          getEnvVar('NETLIFY_BRANCH') || 
          getEnvVar('GIT_BRANCH') || 
          'unknown'
}

export const getBuildTime = () => {
  return BUILD_INFO.buildTime
}

export const getBuildDate = () => {
  return BUILD_INFO.buildDate
}

export const getFormattedBuildTime = () => {
  try {
    const buildTime = new Date(BUILD_INFO.buildTime)
    return buildTime.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    })
  } catch (error) {
    console.error('Error formatting build time:', error)
    return 'Unknown'
  }
}

export const getRelativeBuildTime = () => {
  try {
    const buildTime = new Date(BUILD_INFO.buildTime)
    const now = new Date()
    const diffInSeconds = Math.floor((now - buildTime) / 1000)
    
    if (diffInSeconds < 60) {
      return 'Just now'
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60)
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600)
      return `${hours} hour${hours > 1 ? 's' : ''} ago`
    } else {
      const days = Math.floor(diffInSeconds / 86400)
      return `${days} day${days > 1 ? 's' : ''} ago`
    }
  } catch (error) {
    console.error('Error calculating relative build time:', error)
    return 'Unknown'
  }
}

export const getBuildInfo = () => {
  return {
    ...BUILD_INFO,
    formattedTime: getFormattedBuildTime(),
    relativeTime: getRelativeBuildTime()
  }
} 