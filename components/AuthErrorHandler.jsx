import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../src/contexts/AuthContext'
import { supabase } from '../src/lib/supabase'

const AuthErrorHandler = () => {
  const { authError, clearAuthError } = useAuth()

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      // Force a page reload to clear all state
      window.location.href = '/login'
    } catch (error) {
      console.error('Error during logout:', error)
      // Even if logout fails, redirect to login
      window.location.href = '/login'
    }
  }

  const handleRetry = () => {
    clearAuthError()
    // Force a page reload to reinitialize auth
    window.location.reload()
  }

  if (!authError) {
    return null
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3 text-center">
          {/* Error Icon */}
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          
          <h3 className="text-lg font-medium text-gray-900 mt-4">
            Access Denied
          </h3>
          
          <div className="mt-2 px-7 py-3">
            <p className="text-sm text-gray-500">
              Your session has expired or you no longer have access to this resource.
            </p>
            
            {authError.message && (
              <div className="mt-3 p-2 bg-gray-100 rounded text-xs text-gray-600">
                {authError.message}
              </div>
            )}
          </div>
          
          <div className="items-center px-4 py-3 space-y-2">
            <button
              onClick={handleRetry}
              className="w-full px-4 py-2 bg-indigo-600 text-white text-base font-medium rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              Try Again
            </button>
            
            <button
              onClick={handleLogout}
              className="w-full px-4 py-2 bg-gray-300 text-gray-700 text-base font-medium rounded-md shadow-sm hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Logout & Login Again
            </button>
            
            <Link
              to="/login"
              className="w-full block px-4 py-2 bg-white border border-gray-300 text-gray-700 text-base font-medium rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Go to Login Page
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AuthErrorHandler 