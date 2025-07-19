// Simple client-side rate limiting utility
class RateLimiter {
  constructor(maxAttempts = 5, windowMs = 15 * 60 * 1000) { // 5 attempts per 15 minutes
    this.maxAttempts = maxAttempts
    this.windowMs = windowMs
    this.attempts = new Map()
  }

  isAllowed(key) {
    const now = Date.now()
    const userAttempts = this.attempts.get(key) || []
    
    // Remove old attempts outside the time window
    const recentAttempts = userAttempts.filter(timestamp => now - timestamp < this.windowMs)
    
    if (recentAttempts.length >= this.maxAttempts) {
      return false
    }
    
    // Add current attempt
    recentAttempts.push(now)
    this.attempts.set(key, recentAttempts)
    
    return true
  }

  getRemainingAttempts(key) {
    const now = Date.now()
    const userAttempts = this.attempts.get(key) || []
    const recentAttempts = userAttempts.filter(timestamp => now - timestamp < this.windowMs)
    
    return Math.max(0, this.maxAttempts - recentAttempts.length)
  }

  getTimeUntilReset(key) {
    const now = Date.now()
    const userAttempts = this.attempts.get(key) || []
    
    if (userAttempts.length === 0) return 0
    
    const oldestAttempt = Math.min(...userAttempts)
    const resetTime = oldestAttempt + this.windowMs
    
    return Math.max(0, resetTime - now)
  }

  clear(key) {
    this.attempts.delete(key)
  }
}

// Create a global rate limiter instance
export const loginRateLimiter = new RateLimiter(5, 15 * 60 * 1000) // 5 attempts per 15 minutes
export const passwordResetRateLimiter = new RateLimiter(3, 60 * 60 * 1000) // 3 attempts per hour

export default RateLimiter 