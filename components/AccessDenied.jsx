import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../src/contexts/AuthContext'

const AccessDenied = () => {
  const { user, userRoles, signOut } = useAuth()

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="bg-white shadow rounded-lg p-8">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
            
            <div className="text-left mb-6">
              <p className="text-gray-600 mb-4">
                You don't have the necessary permissions to access this page.
              </p>
              
              {user && (
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <p className="text-sm text-gray-700 mb-2">
                    <strong>Current User:</strong> {user.email}
                  </p>
                  <p className="text-sm text-gray-700">
                    <strong>Roles:</strong> {userRoles.length > 0 ? userRoles.join(', ') : 'None'}
                  </p>
                </div>
              )}
              
              <p className="text-gray-600 text-sm">
                If you believe this is an error, please contact your administrator or try signing out and back in.
              </p>
            </div>
            
            <div className="space-y-3">
              {userRoles.includes('superadmin') && (
                <Link
                  to="/dashboard"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-md transition duration-150 ease-in-out block"
                >
                  Go to Dashboard
                </Link>
              )}
              
              {userRoles.includes('admin') || userRoles.includes('coach') || userRoles.includes('player') ? (
                <Link
                  to="/dashboard"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-md transition duration-150 ease-in-out block"
                >
                  Go to Dashboard
                </Link>
              ) : (
                <Link
                  to="/login"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-md transition duration-150 ease-in-out block"
                >
                  Go to Login
                </Link>
              )}
              
              <button
                onClick={handleSignOut}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-md transition duration-150 ease-in-out"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AccessDenied 