import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../src/contexts/AuthContext'
import { supabase } from '../src/lib/supabase'

const RoleBasedRedirect = () => {
  const { user, userRoles, loading } = useAuth()
  const [userOrganization, setUserOrganization] = useState(null)
  const [fetchingOrg, setFetchingOrg] = useState(false)

  // Fetch user's organization if they have any role (admin, coach, player)
  useEffect(() => {
    const fetchUserOrganization = async () => {
      if (user && !fetchingOrg) {
        try {
          setFetchingOrg(true)
          
          // For superadmins, we don't need to fetch organization
          if (userRoles.includes('superadmin')) {
            setFetchingOrg(false)
            return
          }
          
          // Simple approach: just get the organization ID without complex validation
          const { data: playerData, error: playerError } = await supabase
            .from('players')
            .select('organization_id')
            .eq('user_id', user.id)
            .single()
          
          if (playerError) {
            console.error('Error fetching player data:', playerError)
          } else if (playerData?.organization_id) {
            console.log('Setting user organization:', playerData.organization_id)
            setUserOrganization(playerData.organization_id)
          }
        } catch (err) {
          console.error('Error fetching user organization:', err)
        } finally {
          setFetchingOrg(false)
        }
      }
    }

    fetchUserOrganization()
  }, [user, userRoles])

  // Show loading while determining user roles or fetching organization
  if (loading || (fetchingOrg && !userRoles.includes('superadmin'))) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  // If no user, redirect to login
  if (!user) {
    return <Navigate to="/login" replace />
  }

  // Handle case where user has no roles (orphaned user)
  if (userRoles.length === 0) {
    console.log('RoleBasedRedirect: User has no roles, showing access denied')
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
                  You have not been granted access. Please contact an administrator.
                </p>
                
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <p className="text-sm text-gray-700 mb-2">
                    <strong>Current User:</strong> {user?.email}
                  </p>
                  <p className="text-sm text-gray-700">
                    <strong>Roles:</strong> None
                  </p>
                </div>
                
                <p className="text-gray-600 text-sm">
                  Your account may have been deactivated or your access revoked.
                </p>
              </div>
              
              <div className="space-y-3">
                <button
                  onClick={async () => {
                    try {
                      await supabase.auth.signOut()
                    } catch (error) {
                      console.error('Error signing out:', error)
                    }
                  }}
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

  // Simple redirect logic based on user roles
  console.log('RoleBasedRedirect: userRoles:', userRoles, 'userOrganization:', userOrganization)
  
  if (userRoles.includes('superadmin')) {
    console.log('RoleBasedRedirect: Redirecting superadmin to dashboard')
    return <Navigate to="/dashboard" replace />
  } else if (userOrganization) {
    console.log('RoleBasedRedirect: Redirecting user to organization:', userOrganization)
    return <Navigate to={`/organisations/${userOrganization}`} replace />
  } else {
    // User has roles but no organization (no player record)
    console.log('RoleBasedRedirect: User has roles but no organization, showing access denied')
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
                  You have not been connected to any organisation. Please contact an administrator.
                </p>
                
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <p className="text-sm text-gray-700 mb-2">
                    <strong>Current User:</strong> {user?.email}
                  </p>
                  <p className="text-sm text-gray-700">
                    <strong>Roles:</strong> {userRoles.join(', ')}
                  </p>
                </div>
                
                <p className="text-gray-600 text-sm">
                  Your account has roles but is not associated with any organization.
                </p>
              </div>
              
              <div className="space-y-3">
                <button
                  onClick={async () => {
                    try {
                      await supabase.auth.signOut()
                    } catch (error) {
                      console.error('Error signing out:', error)
                    }
                  }}
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
}

export default RoleBasedRedirect 