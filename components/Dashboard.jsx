import { useAuth } from '../src/contexts/AuthContext'
import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from '../src/lib/supabase'

const Dashboard = () => {
  const { user, signOut, userRoles, hasRole, loading } = useAuth()
  const [userOrganization, setUserOrganization] = useState(null)
  const [loadingOrg, setLoadingOrg] = useState(false)


  
  if (loading || (user && userRoles.length === 0 && !loading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading user information...</p>
        </div>
      </div>
    )
  }

  // Fetch user's organization if they're an admin
  useEffect(() => {
    if (userRoles.includes('admin') && !loadingOrg && !userOrganization) {
      fetchUserOrganization()
    }
  }, [userRoles, loadingOrg, userOrganization])

  const fetchUserOrganization = async () => {
    // Prevent duplicate calls
    if (loadingOrg || userOrganization) {
      return
    }
    
    try {
      setLoadingOrg(true)
      const { data: orgId, error } = await supabase.rpc('get_user_organization', {
        user_uuid: user.id
      })
      
      if (error) {
        console.error('Error fetching user organization:', error)
        return
      }
      
      if (orgId) {
        // Fetch organization details
        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', orgId)
          .single()
        
        if (orgError) {
          console.error('Error fetching organization details:', orgError)
          return
        }
        
        setUserOrganization(orgData)
      }
    } catch (err) {
      console.error('Error in fetchUserOrganization:', err)
    } finally {
      setLoadingOrg(false)
    }
  }

  const handleSignOut = async () => {
    try {
      const { error } = await signOut()
      if (error) {
        console.error('Sign out error:', error)
        // Even if there's an error, the local state should be cleared
        // and the user should be redirected to login
      }
    } catch (error) {
      console.error('Error signing out:', error)
      // Even if there's an error, the local state should be cleared
      // and the user should be redirected to login
    }
  }

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800'
      case 'coach':
        return 'bg-blue-100 text-blue-800'
      case 'player':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 space-y-4 sm:space-y-0">
              <div className="flex items-center space-x-4">
                <img 
                  src="/Backcheck_large.png" 
                  alt="Backcheck Logo" 
                  className="h-16 sm:h-24 w-auto object-contain"
                />
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                  Dashboard
                </h1>
              </div>
              <button
                onClick={handleSignOut}
                className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-md transition duration-150 ease-in-out w-full sm:w-auto"
              >
                Sign Out
              </button>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Welcome back!
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
            </div>

            {/* Admin Organization Link */}
            {hasRole('admin') && (
              <div className="mb-6">
                {loadingOrg ? (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="animate-pulse flex items-center space-x-4">
                      <div className="w-12 h-12 bg-blue-200 rounded"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-blue-200 rounded w-3/4"></div>
                        <div className="h-3 bg-blue-200 rounded w-1/2"></div>
                      </div>
                    </div>
                  </div>
                ) : userOrganization ? (
                  <Link
                    to={`/organisations/${userOrganization.id}`}
                    className="bg-blue-50 border border-blue-200 rounded-lg p-4 hover:bg-blue-100 transition-colors duration-200 block"
                  >
                    <div className="flex items-center space-x-4">
                      {userOrganization.logo_url && (
                        <img
                          src={userOrganization.logo_url}
                          alt={`${userOrganization.name} logo`}
                          className="w-12 h-12 object-contain"
                          onError={(e) => {
                            e.target.style.display = 'none'
                          }}
                        />
                      )}
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-blue-900">
                          {userOrganization.name}
                        </h3>
                        <p className="text-blue-700">
                          Manage your organization's players, coaches, and activities
                        </p>
                      </div>
                      <div className="text-blue-600">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </Link>
                ) : (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-center space-x-4">
                      <div className="text-yellow-600">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-yellow-900">
                          Organization Not Found
                        </h3>
                        <p className="text-yellow-700">
                          Unable to load your organization information
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Superadmin-only section */}
              {hasRole('superadmin') && (
                <Link
                  to="/organisations"
                  className="bg-purple-50 border border-purple-200 rounded-lg p-4 hover:bg-purple-100 transition-colors duration-200"
                >
                  <h3 className="text-lg font-semibold text-purple-900 mb-2">
                    Organisations
                  </h3>
                  <p className="text-purple-700">
                    Manage hockey organisations and multi-tenant access
                  </p>
                </Link>
              )}

              {/* Coach access */}
              {hasRole('coach') && (
                <>
                  <Link
                    to="/players"
                    className="bg-blue-50 border border-blue-200 rounded-lg p-4 hover:bg-blue-100 transition-colors duration-200"
                  >
                    <h3 className="text-lg font-semibold text-blue-900 mb-2">
                      Players
                    </h3>
                    <p className="text-blue-700">
                      Manage your team roster and player information
                    </p>
                  </Link>
                  
                  <Link
                    to="/clubs"
                    className="bg-orange-50 border border-orange-200 rounded-lg p-4 hover:bg-orange-100 transition-colors duration-200"
                  >
                    <h3 className="text-lg font-semibold text-orange-900 mb-2">
                      Clubs
                    </h3>
                    <p className="text-orange-700">
                      Manage clubs and assign players to clubs
                    </p>
                  </Link>
                  
                  <Link
                    to="/squads"
                    className="bg-green-50 border border-green-200 rounded-lg p-4 hover:bg-green-100 transition-colors duration-200"
                  >
                    <h3 className="text-lg font-semibold text-green-900 mb-2">
                      Squads
                    </h3>
                    <p className="text-green-700">
                      Create and manage training squads
                    </p>
                  </Link>
                  
                  <Link
                    to="/sessions"
                    className="bg-purple-50 border border-purple-200 rounded-lg p-4 hover:bg-purple-100 transition-colors duration-200"
                  >
                    <h3 className="text-lg font-semibold text-purple-900 mb-2">
                      Sessions
                    </h3>
                    <p className="text-purple-700">
                      Schedule and track practice sessions
                    </p>
                  </Link>
                  
                  <Link
                    to="/drills"
                    className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 hover:bg-indigo-100 transition-colors duration-200"
                  >
                    <h3 className="text-lg font-semibold text-indigo-900 mb-2">
                      Drills
                    </h3>
                    <p className="text-indigo-700">
                      Create and manage training drills
                    </p>
                  </Link>
                  
                  <Link
                    to="/reports"
                    className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 hover:bg-yellow-100 transition-colors duration-200"
                  >
                    <h3 className="text-lg font-semibold text-yellow-900 mb-2">
                      Reports
                    </h3>
                    <p className="text-yellow-700">
                      View and generate reports
                    </p>
                  </Link>
                </>
              )}

              {/* Player access */}
              {hasRole('player') && (
                <>
                  <Link
                    to="/player-profile"
                    className="bg-green-50 border border-green-200 rounded-lg p-4 hover:bg-green-100 transition-colors duration-200"
                  >
                    <h3 className="text-lg font-semibold text-green-900 mb-2">
                      My Profile
                    </h3>
                    <p className="text-green-700">
                      View and update your player information
                    </p>
                  </Link>
                  
                  <Link
                    to="/sessions"
                    className="bg-purple-50 border border-purple-200 rounded-lg p-4 hover:bg-purple-100 transition-colors duration-200"
                  >
                    <h3 className="text-lg font-semibold text-purple-900 mb-2">
                      Sessions
                    </h3>
                    <p className="text-purple-700">
                      View upcoming practice sessions
                    </p>
                  </Link>
                  
                  <Link
                    to="/drills"
                    className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 hover:bg-indigo-100 transition-colors duration-200"
                  >
                    <h3 className="text-lg font-semibold text-indigo-900 mb-2">
                      Drills
                    </h3>
                    <p className="text-indigo-700">
                      Access training drills and resources
                    </p>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard