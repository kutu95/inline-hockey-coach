import React, { useState, useEffect } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { supabase } from '../src/lib/supabase'
import { useAuth } from '../src/contexts/AuthContext'
import { getFormattedBuildTime, getRelativeBuildTime, getBuildInfo } from '../src/utils/buildInfo'

const Dashboard = () => {
  const [organizations, setOrganizations] = useState([])
  const [loading, setLoading] = useState(true)
  const { user, userRoles, hasRole, signOut } = useAuth()

  useEffect(() => {
    // Only superadmin should access the dashboard
    if (userRoles.length > 0 && !hasRole('superadmin')) {
      setLoading(false)
      return
    }

    const fetchOrganizations = async () => {
      if (!hasRole('superadmin')) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const { data, error } = await supabase
          .from('organizations')
          .select('*')
          .order('name')

        if (error) {
          console.error('Error fetching organizations:', error)
        } else {
          setOrganizations(data || [])
        }
      } catch (err) {
        console.error('Error in fetchOrganizations:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchOrganizations()
  }, [userRoles, hasRole])

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'superadmin':
        return 'bg-purple-100 text-purple-800'
      case 'admin':
        return 'bg-blue-100 text-blue-800'
      case 'coach':
        return 'bg-green-100 text-green-800'
      case 'player':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  // Show loading while determining user roles
  if (userRoles.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  // Only superadmin should access the dashboard
  if (!hasRole('superadmin')) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecting to your organization...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center space-x-4">
              <img
                src="/Backcheck_small.png"
                alt="Backcheck Logo"
                className="h-8 w-auto"
              />
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                Superadmin Dashboard
              </h1>
            </div>
            <div className="flex flex-col items-end space-y-2">
              <button
                onClick={handleSignOut}
                className="text-red-600 hover:text-red-800 text-sm font-medium transition duration-150 ease-in-out"
              >
                Sign out
              </button>
            </div>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Welcome, Superadmin!
            </h2>
            <p className="text-gray-600 mb-2">
              You are signed in as: <span className="font-medium">{user?.email}</span>
            </p>
            {userRoles.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="text-sm text-gray-600">Roles:</span>
                {userRoles.map(role => (
                  <span
                    key={role}
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(role)}`}
                  >
                    {role}
                  </span>
                ))}
              </div>
            )}
            
            {/* Build Information */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Last updated: {getRelativeBuildTime()}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span title={getFormattedBuildTime()}>
                    {getFormattedBuildTime()}
                  </span>
                </div>
              </div>
              
              {/* Detailed Build Info (expandable) */}
              <details className="mt-2">
                <summary className="cursor-pointer text-xs text-gray-400 hover:text-gray-600">
                  <svg className="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                  Build Details
                </summary>
                <div className="mt-2 text-xs text-gray-400 space-y-1">
                  <div>Version: {getBuildInfo().version}</div>
                  <div>Environment: {getBuildInfo().environment}</div>
                  <div>Branch: {getBuildInfo().branch}</div>
                  <div>Commit: {getBuildInfo().commitHash.substring(0, 8)}</div>
                </div>
              </details>
            </div>
          </div>

          {/* Organizations Section */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                Organizations
              </h2>
              <Link
                to="/organisations"
                className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors duration-200"
              >
                Manage Organizations
              </Link>
            </div>
            
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : organizations.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {organizations.map(org => (
                  <Link
                    key={org.id}
                    to={`/organisations/${org.id}`}
                    className="bg-white border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors duration-200"
                  >
                    <div className="flex items-center space-x-3 mb-3">
                      {org.logo_url ? (
                        <img 
                          src={org.logo_url} 
                          alt={`${org.name} logo`}
                          className="w-8 h-8 object-contain rounded"
                        />
                      ) : (
                        <div className="w-8 h-8 bg-gray-200 rounded flex items-center justify-center">
                          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                        </div>
                      )}
                      <h3 className="text-lg font-semibold text-gray-900">
                        {org.name}
                      </h3>
                    </div>
                    <p className="text-gray-600 text-sm">
                      {org.description || 'No description available'}
                    </p>
                    <div className="mt-3 flex items-center text-sm text-gray-500">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      View Organization
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
                <div className="text-gray-400 mb-4">
                  <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No Organizations Found
                </h3>
                <p className="text-gray-600 mb-4">
                  There are no organizations in the system yet.
                </p>
                <Link
                  to="/organisations"
                  className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors duration-200"
                >
                  Create First Organization
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard