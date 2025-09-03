import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../src/lib/supabase'
import { useAuth } from '../src/contexts/AuthContext'
import { loginRateLimiter, passwordResetRateLimiter } from '../src/utils/rateLimiter'
import { botDetector, detectBot } from '../src/utils/botDetection'

const Login = () => {
  const [isResetPassword, setIsResetPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [recaptchaToken, setRecaptchaToken] = useState('')

  const { signIn, resetPassword } = useAuth()

  // Load reCAPTCHA script and start bot detection
  useEffect(() => {
    const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY
    
    // Only load reCAPTCHA if site key is configured
    if (siteKey) {
      const script = document.createElement('script')
      script.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`
      script.async = true
      script.defer = true
      script.onerror = () => {
        console.warn('Failed to load reCAPTCHA script')
      }
      document.head.appendChild(script)
    }

    // Start bot detection tracking
    botDetector.startTracking()

    // Add event listeners for user behavior tracking
    const handleMouseMove = () => botDetector.trackMouseMovement()
    const handleKeyPress = () => botDetector.trackKeyStroke()

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('keypress', handleKeyPress)

    return () => {
      // Only remove script if it was added
      if (siteKey) {
        const existingScript = document.querySelector(`script[src*="recaptcha"]`)
        if (existingScript) {
          document.head.removeChild(existingScript)
        }
      }
      botDetector.stopTracking()
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('keypress', handleKeyPress)
    }
  }, [])

  // Execute reCAPTCHA
  const executeRecaptcha = async () => {
    // Check if reCAPTCHA is configured
    const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY
    if (!siteKey) {
      console.warn('reCAPTCHA site key not configured, skipping verification')
      return 'no-recaptcha-configured'
    }

    if (typeof window.grecaptcha !== 'undefined') {
      try {
        const token = await window.grecaptcha.execute(siteKey, { action: 'login' })
        setRecaptchaToken(token)
        return token
      } catch (error) {
        console.error('reCAPTCHA error:', error)
        // Fallback: allow login without reCAPTCHA if it fails
        return 'recaptcha-failed'
      }
    }
    
    // Fallback: allow login without reCAPTCHA if script hasn't loaded
    console.warn('reCAPTCHA script not loaded, allowing login without verification')
    return 'recaptcha-not-loaded'
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    try {
      // Check rate limiting
      const rateLimiter = isResetPassword ? passwordResetRateLimiter : loginRateLimiter
      const identifier = email || 'anonymous'
      
      if (!rateLimiter.isAllowed(identifier)) {
        const timeUntilReset = rateLimiter.getTimeUntilReset(identifier)
        const minutes = Math.ceil(timeUntilReset / (1000 * 60))
        setError(`Too many attempts. Please try again in ${minutes} minutes.`)
        setLoading(false)
        return
      }

      // Check for suspicious bot behavior (only in production or if explicitly enabled)
      const isDevelopment = import.meta.env.DEV
      if (!isDevelopment) {
        const botDetection = detectBot()
        if (botDetection.isBot) {
          console.warn('Bot detected:', botDetection)
          setError('Suspicious activity detected. Please try again.')
          setLoading(false)
          return
        }
      }

      // Execute reCAPTCHA before authentication
      const token = await executeRecaptcha()
      if (token === null) {
        setError('Security verification failed. Please try again.')
        setLoading(false)
        return
      }

      if (isResetPassword) {
        console.log('Attempting password reset for:', email)
        const { error } = await resetPassword(email)
        if (error) {
          console.error('Password reset error:', error)
          setError(error.message)
        } else {
          console.log('Password reset email sent successfully')
          setMessage('Password reset email sent! Check your inbox.')
        }
      } else {
        console.log('Attempting to sign in with:', { email, password: '***' })
        const { error } = await signIn(email, password)
        if (error) {
          console.error('Sign in error:', error)
          setError(error.message)
        } else {
          console.log('Sign in successful')
          // Clear rate limiting on successful login
          loginRateLimiter.clear(identifier)
        }
      }
    } catch (err) {
      console.error('Unexpected error during authentication:', err)
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setEmail('')
    setPassword('')
    setError('')
    setMessage('')
    setIsResetPassword(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-2xl sm:text-3xl font-extrabold text-gray-900">
            {isResetPassword ? 'Reset Password' : 'Sign In'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {isResetPassword 
              ? 'Enter your email to receive a password reset link'
              : 'Sign in to your account'
            }
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {/* Honeypot field to catch bots */}
          <div className="hidden">
            <input
              type="text"
              name="website"
              tabIndex="-1"
              autoComplete="off"
              style={{ position: 'absolute', left: '-9999px' }}
            />
          </div>
          
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            
            {!isResetPassword && (
              <div>
                <label htmlFor="password" className="sr-only">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            )}
          </div>
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}
          {message && (
            <div className="rounded-md bg-green-50 p-4">
              <div className="text-sm text-green-700">{message}</div>
            </div>
          )}
          <div className="flex flex-col sm:flex-row sm:justify-end space-y-3 sm:space-y-0 sm:space-x-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto group relative flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : null}
              {loading 
                ? 'Processing...' 
                : isResetPassword 
                  ? 'Send Reset Link' 
                  : 'Sign In'
              }
            </button>
          </div>
          <div className="flex flex-col sm:flex-row sm:justify-between items-center mt-4 space-y-2 sm:space-y-0">
            {!isResetPassword && (
              <button
                type="button"
                onClick={() => setIsResetPassword(true)}
                className="font-medium text-indigo-600 hover:text-indigo-500 text-sm"
              >
                Forgot your password?
              </button>
            )}
            <div className="text-sm text-center text-gray-600">
              {isResetPassword ? (
                <button
                  type="button"
                  onClick={resetForm}
                  className="font-medium text-indigo-600 hover:text-indigo-500"
                >
                  Back to sign in
                </button>
              ) : (
                <div className="text-center">
                  <p className="text-gray-600 mb-3">
                    Need an account? Contact your coach for an invitation to the platform. 
                    To register as an individual unaffiliated player, click the link below.
                  </p>
                  <Link
                    to="/individual-players"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-200"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Register as Individual Player
                  </Link>
                </div>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

export default Login