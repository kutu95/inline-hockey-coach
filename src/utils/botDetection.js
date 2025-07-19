// Simple bot detection utility
export class BotDetector {
  constructor() {
    this.suspiciousPatterns = []
    this.userBehavior = {
      mouseMovements: 0,
      keyStrokes: 0,
      timeOnPage: 0,
      lastActivity: Date.now()
    }
  }

  // Track user behavior
  trackMouseMovement() {
    this.userBehavior.mouseMovements++
    this.userBehavior.lastActivity = Date.now()
  }

  trackKeyStroke() {
    this.userBehavior.keyStrokes++
    this.userBehavior.lastActivity = Date.now()
  }

  // Check for suspicious patterns
  isSuspicious() {
    const now = Date.now()
    const timeSinceLastActivity = now - this.userBehavior.lastActivity
    
    // Suspicious if no user interaction for too long
    if (timeSinceLastActivity > 30000 && this.userBehavior.mouseMovements === 0) {
      return true
    }

    // Suspicious if form submitted too quickly (less than 2 seconds)
    if (this.userBehavior.timeOnPage < 2000) {
      return true
    }

    // Suspicious if no mouse movements at all
    if (this.userBehavior.mouseMovements === 0 && this.userBehavior.keyStrokes > 0) {
      return true
    }

    return false
  }

  // Get bot probability score (0-1)
  getBotProbability() {
    let score = 0

    // No mouse movements
    if (this.userBehavior.mouseMovements === 0) {
      score += 0.3
    }

    // Very fast form submission
    if (this.userBehavior.timeOnPage < 1000) {
      score += 0.4
    }

    // No user interaction for extended period
    const timeSinceLastActivity = Date.now() - this.userBehavior.lastActivity
    if (timeSinceLastActivity > 60000) {
      score += 0.2
    }

    // Unusual typing patterns (too fast or too slow)
    if (this.userBehavior.keyStrokes > 0) {
      const avgTimePerKey = this.userBehavior.timeOnPage / this.userBehavior.keyStrokes
      if (avgTimePerKey < 50 || avgTimePerKey > 5000) {
        score += 0.1
      }
    }

    return Math.min(score, 1)
  }

  // Reset tracking data
  reset() {
    this.userBehavior = {
      mouseMovements: 0,
      keyStrokes: 0,
      timeOnPage: 0,
      lastActivity: Date.now()
    }
  }

  // Start tracking time on page
  startTracking() {
    this.userBehavior.timeOnPage = 0
    this.interval = setInterval(() => {
      this.userBehavior.timeOnPage += 100
    }, 100)
  }

  // Stop tracking
  stopTracking() {
    if (this.interval) {
      clearInterval(this.interval)
      this.interval = null
    }
  }
}

// Create a global bot detector instance
export const botDetector = new BotDetector()

// Utility function to check browser capabilities (bots often lack these)
export const checkBrowserCapabilities = () => {
  const capabilities = {
    hasLocalStorage: typeof localStorage !== 'undefined',
    hasSessionStorage: typeof sessionStorage !== 'undefined',
    hasCookies: navigator.cookieEnabled,
    hasJavaScript: true,
    hasUserAgent: navigator.userAgent.length > 0,
    hasLanguage: navigator.language.length > 0,
    hasPlatform: navigator.platform.length > 0,
    hasScreen: window.screen && window.screen.width > 0,
    hasHistory: typeof history !== 'undefined',
    hasLocation: typeof location !== 'undefined'
  }

  // Calculate capability score
  const capabilityScore = Object.values(capabilities).filter(Boolean).length / Object.keys(capabilities).length
  
  return {
    capabilities,
    score: capabilityScore,
    isSuspicious: capabilityScore < 0.7 // Suspicious if missing too many capabilities
  }
}

// Check for common bot user agents
export const checkUserAgent = () => {
  const userAgent = navigator.userAgent.toLowerCase()
  const botSignatures = [
    'bot', 'crawler', 'spider', 'scraper', 'curl', 'wget', 'python', 'java',
    'phantomjs', 'headless', 'selenium', 'webdriver', 'automation'
  ]

  const isBot = botSignatures.some(signature => userAgent.includes(signature))
  
  return {
    userAgent,
    isBot,
    confidence: isBot ? 0.9 : 0.1
  }
}

// Comprehensive bot detection
export const detectBot = () => {
  const browserCheck = checkBrowserCapabilities()
  const userAgentCheck = checkUserAgent()
  const behaviorCheck = botDetector.getBotProbability()

  const overallScore = (
    browserCheck.score * 0.3 +
    (1 - userAgentCheck.confidence) * 0.3 +
    (1 - behaviorCheck) * 0.4
  )

  return {
    isBot: overallScore < 0.5,
    score: overallScore,
    details: {
      browser: browserCheck,
      userAgent: userAgentCheck,
      behavior: behaviorCheck
    }
  }
} 