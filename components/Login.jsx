import { useState } from 'react'
import { supabase } from '../src/lib/supabase'
import { useAuth } from '../src/contexts/AuthContext'

const Login = () => {
  const [isResetPassword, setIsResetPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const { signIn, resetPassword } = useAuth()



  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    try {
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
                <p>Need an account? Contact your coach for an invitation.</p>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

export default Login