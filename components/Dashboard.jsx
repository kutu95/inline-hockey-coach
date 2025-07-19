import React, { useState, useEffect } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { supabase } from '../src/lib/supabase'
import { useAuth } from '../src/contexts/AuthContext'

const Dashboard = () => {
  const [userOrganization, setUserOrganization] = useState(null)
  const [loadingOrg, setLoadingOrg] = useState(false)
  const [playerProfile, setPlayerProfile] = useState(null)
  const [playerPhotoUrl, setPlayerPhotoUrl] = useState(null)
  const [loadingPlayer, setLoadingPlayer] = useState(false)
  const [shouldRedirect, setShouldRedirect] = useState(false)
  const [redirectTo, setRedirectTo] = useState(null)
  const { user, userRoles, hasRole, signOut } = useAuth()

  useEffect(() => {
    console.log('🔍 Dashboard useEffect triggered')
    console.log('🔍 User:', user?.id)
    console.log('🔍 UserRoles:', userRoles)
    console.log('🔍 LoadingOrg:', loadingOrg)
    console.log('🔍 LoadingPlayer:', loadingPlayer)
    
    // Only prevent execution if we already have data or are currently loading
    if (userOrganization || playerProfile || (loadingOrg && loadingPlayer)) {
      console.log('🚫 Skipping useEffect - already have data or both loading')
      return
    }
    
    let isMounted = true
    
    const initializeDashboard = async () => {
      console.log('🚀 Starting Dashboard initialization')
      
      if (!isMounted) {
        console.log('🚫 Component unmounted, aborting')
        return
      }
      
      // Don't wait for roles to be fully loaded - proceed with organization fetch
      console.log('📞 Calling fetchUserOrganizations...')
      await fetchUserOrganizations()
      
      if (!isMounted) {
        console.log('🚫 Component unmounted, aborting')
        return
      }
      
      console.log('✅ fetchUserOrganizations completed')
      console.log('📞 Calling fetchPlayerProfile...')
      await fetchPlayerProfile()
      
      if (!isMounted) {
        console.log('🚫 Component unmounted, aborting')
        return
      }
      
      console.log('✅ fetchPlayerProfile completed')
      console.log('🎉 Dashboard initialization completed')
    }

    // Add a timeout to prevent hanging
    const timeoutId = setTimeout(() => {
      console.log('⏰ Dashboard initialization timeout - proceeding anyway')
      console.log('⏰ Current state - loadingOrg:', loadingOrg, 'loadingPlayer:', loadingPlayer)
      if (isMounted) {
        setLoadingOrg(false)
        setLoadingPlayer(false)
      }
    }, 5000) // 5 second timeout

    initializeDashboard().finally(() => {
      console.log('🧹 Clearing timeout')
      clearTimeout(timeoutId)
    })
    
    // Cleanup function
    return () => {
      console.log('🧹 Dashboard useEffect cleanup')
      isMounted = false
    }
  }, [user?.id]) // Only depend on user.id, not the entire user object

  // Handle redirect
  if (shouldRedirect && redirectTo) {
    console.log('🔄 Redirecting to:', redirectTo)
    return <Navigate to={redirectTo} replace />
  }

  // Redirect non-superadmin users to their organization page
  // Only redirect if we have user roles and the user is not a superadmin
  if (userRoles.length > 0 && !hasRole('superadmin') && userOrganization) {
    console.log('🔄 Redirecting non-superadmin to organization:', userOrganization.id)
    return <Navigate to={`/organisations/${userOrganization.id}`} replace />
  }

  // If we have an organization but roles are still loading, show loading
  if (userOrganization && userRoles.length === 0) {
    console.log('⏳ Showing loading for roles - userOrganization exists but no roles')
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading user roles...</p>
        </div>
      </div>
    )
  }

  // If we're still loading and have no organization, show loading
  if (loadingOrg || loadingPlayer) {
    console.log('⏳ Showing loading - loadingOrg:', loadingOrg, 'loadingPlayer:', loadingPlayer)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading user information...</p>
        </div>
      </div>
    )
  }

  console.log('🎯 Rendering main dashboard content')
  console.log('🎯 Final state - userOrganization:', userOrganization, 'playerProfile:', playerProfile, 'userRoles:', userRoles)

  const fetchUserOrganizations = async () => {
    console.log('🏢 fetchUserOrganizations started')
    // Prevent duplicate calls
    if (userOrganization) {
      console.log('🏢 User organization already exists, skipping fetch')
      return
    }
    
    try {
      console.log('🏢 Setting loadingOrg to true')
      setLoadingOrg(true)
      
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          console.log('⏰ Organization fetch timeout triggered')
          reject(new Error('Organization fetch timeout'))
        }, 3000)
      })
      
      const fetchPromise = async () => {
        console.log('🏢 Starting organization fetch promise')
        // Get user's organization for all non-superadmin users
        console.log('🏢 Calling RPC get_user_organization...')
        const { data: orgId, error } = await supabase.rpc('get_user_organization', {
          user_uuid: user.id
        })
        console.log('🏢 RPC result - orgId:', orgId, 'error:', error)
        
        if (error) {
          console.error('🏢 Error fetching user organization:', error)
          // If RPC fails, try direct query to players table
          console.log('🏢 Trying fallback to players table...')
          const { data: playerData, error: playerError } = await supabase
            .from('players')
            .select('organization_id')
            .eq('user_id', user.id)
            .single()
          console.log('🏢 Players table result - playerData:', playerData, 'error:', playerError)
          
          if (playerError) {
            console.error('🏢 Error fetching player data:', playerError)
            return
          }
          
          if (playerData?.organization_id) {
            // Fetch organization details
            console.log('🏢 Fetching organization details for ID:', playerData.organization_id)
            const { data: orgData, error: orgError } = await supabase
              .from('organizations')
              .select('*')
              .eq('id', playerData.organization_id)
              .single()
            console.log('🏢 Organization details result - orgData:', orgData, 'error:', orgError)
            
            if (orgError) {
              console.error('🏢 Error fetching organization details:', orgError)
              return
            }
            
            console.log('🏢 Setting user organization:', orgData)
            setUserOrganization(orgData)
          }
        } else if (orgId) {
          // Fetch organization details
          console.log('🏢 Fetching organization details for RPC orgId:', orgId)
          const { data: orgData, error: orgError } = await supabase
            .from('organizations')
            .select('*')
            .eq('id', orgId)
            .single()
          console.log('🏢 Organization details result - orgData:', orgData, 'error:', orgError)
          
          if (orgError) {
            console.error('🏢 Error fetching organization details:', orgError)
            return
          }
          
          console.log('🏢 Setting user organization:', orgData)
          setUserOrganization(orgData)
        }
        console.log('🏢 Fetch promise completed')
      }

      console.log('🏢 Starting race between fetch and timeout...')
      await Promise.race([fetchPromise(), timeoutPromise])
      console.log('🏢 Race completed successfully')
    } catch (err) {
      console.error('🏢 Error in fetchUserOrganizations:', err)
    } finally {
      console.log('🏢 Setting loadingOrg to false')
      setLoadingOrg(false)
    }
  }

  // Function to get signed URL for player photo
  const getSignedUrlForPlayerPhoto = async (url) => {
    if (!url || !url.includes('supabase.co') || !url.includes('/storage/')) {
      return null
    }
    
    try {
      const urlParts = url.split('/')
      if (urlParts.length < 2) return null
      
      const filePath = urlParts.slice(-2).join('/')
      
      const { data: existsData, error: existsError } = await supabase.storage
        .from('player-photos')
        .list(filePath.split('/')[0])
      
      if (existsError) return null
      
      const fileName = filePath.split('/')[1]
      const fileExists = existsData?.some(file => file.name === fileName)
      
      if (!fileExists) return null
      
      const { data, error } = await supabase.storage
        .from('player-photos')
        .createSignedUrl(filePath, 60 * 60 * 24 * 7)
      
      if (error) return null
      
      return data?.signedUrl || null
    } catch (err) {
      return null
    }
  }

  const fetchPlayerProfile = async () => {
    console.log('👤 fetchPlayerProfile started')
    // Prevent duplicate calls
    if (playerProfile) {
      console.log('👤 Player profile already exists, skipping fetch')
      return
    }
    
    try {
      console.log('👤 Setting loadingPlayer to true')
      setLoadingPlayer(true)
      
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          console.log('⏰ Player profile fetch timeout triggered')
          reject(new Error('Player profile fetch timeout'))
        }, 3000)
      })
      
      const fetchPromise = async () => {
        console.log('👤 Starting player profile fetch promise')
        console.log('👤 Querying players table for user_id:', user.id)
        const { data, error } = await supabase
          .from('players')
          .select('id, organization_id, first_name, last_name, photo_url')
          .eq('user_id', user.id)
          .single()
        console.log('👤 Players table result - data:', data, 'error:', error)

        if (error) {
          console.error('👤 Error fetching player profile:', error)
          return
        }

        if (data) {
          console.log('👤 Setting player profile:', data)
          setPlayerProfile(data)
          
          // Get signed URL for photo if it exists
          if (data.photo_url) {
            console.log('👤 Getting signed URL for photo:', data.photo_url)
            const signedUrl = await getSignedUrlForPlayerPhoto(data.photo_url)
            console.log('👤 Signed URL result:', signedUrl)
            setPlayerPhotoUrl(signedUrl)
          }
        }
        console.log('👤 Fetch promise completed')
      }

      console.log('👤 Starting race between fetch and timeout...')
      await Promise.race([fetchPromise(), timeoutPromise])
      console.log('👤 Race completed successfully')
    } catch (err) {
      console.error('👤 Error in fetchPlayerProfile:', err)
    } finally {
      console.log('👤 Setting loadingPlayer to false')
      setLoadingPlayer(false)
    }
  }
  const handleSignOut = async () => {
    try {
      const { error } = await signOut()
      if (error) {
        console.error('Sign out error:', error)
      }
    } catch (error) {
      console.error('Error signing out:', error)
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
              <div className="flex flex-col items-end space-y-2">
                {playerProfile && (
                  <Link
                    to={playerProfile.organization_id 
                      ? `/organisations/${playerProfile.organization_id}/players/${playerProfile.id}`
                      : `/players/${playerProfile.id}`
                    }
                    className="hover:opacity-80 transition-opacity flex-shrink-0"
                  >
                    {playerProfile.photo_url ? (
                      <img
                        src={playerPhotoUrl || playerProfile.photo_url}
                        alt={`${playerProfile.first_name} ${playerProfile.last_name}`}
                        className="w-10 h-10 object-cover rounded-full border border-gray-300"
                        onError={(e) => {
                          e.target.style.display = 'none'
                          e.target.nextSibling.style.display = 'flex'
                        }}
                        onLoad={(e) => {
                          e.target.nextSibling.style.display = 'none'
                        }}
                      />
                    ) : (
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center" style={{ display: playerProfile.photo_url ? 'none' : 'flex' }}>
                        <span className="text-gray-500 text-sm font-medium">
                          {playerProfile.first_name?.charAt(0)}{playerProfile.last_name?.charAt(0)}
                        </span>
                      </div>
                    )}
                  </Link>
                )}
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

            {/* Admin Organization Section */}
            {hasRole('admin') && (
              <div className="mb-6">
                {loadingOrg ? (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center space-x-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <div>
                        <h3 className="text-lg font-semibold text-blue-900">Loading organization...</h3>
                      </div>
                    </div>
                  </div>
                ) : userOrganization ? (
                  <Link
                    to={`/organisations/${userOrganization.id}`}
                    className="bg-blue-50 border border-blue-200 rounded-lg p-4 hover:bg-blue-100 transition-colors duration-200 block"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="text-blue-600">
                        {userOrganization.logo_url ? (
                          <img 
                            src={userOrganization.logo_url} 
                            alt={`${userOrganization.name} logo`}
                            className="w-8 h-8 object-contain rounded"
                          />
                        ) : (
                          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-blue-900">
                          {userOrganization.name}
                        </h3>
                        <p className="text-blue-700">
                          Access and manage your organization's data
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
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center space-x-4">
                      <div className="text-blue-600">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-blue-900">
                          No Organization Found
                        </h3>
                        <p className="text-blue-700">
                          Please contact your administrator to set up your organization access
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
                  {loadingPlayer ? (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center space-x-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                        <div>
                          <h3 className="text-lg font-semibold text-green-900">Loading profile...</h3>
                        </div>
                      </div>
                    </div>
                  ) : playerProfile ? (
                    <Link
                      to={playerProfile.organization_id 
                        ? `/organisations/${playerProfile.organization_id}/players/${playerProfile.id}`
                        : `/players/${playerProfile.id}`
                      }
                      className="bg-green-50 border border-green-200 rounded-lg p-4 hover:bg-green-100 transition-colors duration-200"
                    >
                      <h3 className="text-lg font-semibold text-green-900 mb-2">
                        My Profile
                      </h3>
                      <p className="text-green-700">
                        View and update your player information
                      </p>
                    </Link>
                  ) : (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center space-x-4">
                        <div className="text-green-600">
                          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-green-900">
                            Profile Not Found
                          </h3>
                          <p className="text-green-700">
                            Your player profile is not linked to your account
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  
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