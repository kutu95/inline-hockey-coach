import React, { Component } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../src/lib/supabase'

class AuthErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { 
      hasError: false, 
      error: null,
      isLoggingOut: false 
    }
  }

  static getDerivedStateFromError(error) {
    // Check if this is an auth-related error
    const isAuthError = error?.message?.includes('auth') || 
                       error?.message?.includes('unauthorized') ||
                       error?.message?.includes('forbidden') ||
                       error?.message?.includes('access denied') ||
                       error?.message?.includes('user not found') ||
                       error?.message?.includes('invalid token') ||
                       error?.message?.includes('expired') ||
                       error?.code === 'PGRST116' ||
                       error?.status === 401 ||
                       error?.status === 403 ||
                       error?.status === 406

    if (isAuthError) {
      return { hasError: true, error }
    }
    
    // For non-auth errors, let them bubble up
    return { hasError: false, error: null }
  }

  componentDidCatch(error, errorInfo) {
    console.error('AuthErrorBoundary caught an error:', error, errorInfo)
    
    // If this is an auth error, handle it gracefully
    if (this.state.hasError) {
      // Clear any cached auth data
      localStorage.removeItem('supabase.auth.token')
      sessionStorage.removeItem('supabase.auth.token')
    }
  }

  handleLogout = async () => {
    this.setState({ isLoggingOut: true })
    
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

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
    // Force a page reload to reinitialize auth
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
          <div className="sm:mx-auto sm:w-full sm:max-w-md">
            <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
              <div className="text-center">
                {/* Error Icon */}
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                  <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                
                <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
                  Access Denied
                </h2>
                
                <p className="mt-2 text-sm text-gray-600">
                  Your session has expired or you no longer have access to this resource.
                </p>
                
                {this.state.error && (
                  <div className="mt-4 p-3 bg-gray-100 rounded-md">
                    <p className="text-xs text-gray-500">
                      Error: {this.state.error.message || 'Unknown error occurred'}
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-6 space-y-4">
                <button
                  onClick={this.handleRetry}
                  disabled={this.state.isLoggingOut}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {this.state.isLoggingOut ? 'Logging out...' : 'Try Again'}
                </button>
                
                <button
                  onClick={this.handleLogout}
                  disabled={this.state.isLoggingOut}
                  className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {this.state.isLoggingOut ? 'Logging out...' : 'Logout & Login Again'}
                </button>
                
                <Link
                  to="/login"
                  className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Go to Login Page
                </Link>
              </div>

              <div className="mt-6">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">Need help?</span>
                  </div>
                </div>
                
                <div className="mt-4 text-center">
                  <p className="text-xs text-gray-500">
                    If this problem persists, please contact your administrator or try clearing your browser cache.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default AuthErrorBoundary 