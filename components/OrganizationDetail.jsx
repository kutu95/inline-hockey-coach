import React, { useState, useEffect, useRef } from 'react'
import { useParams, Link, Navigate } from 'react-router-dom'
import { supabase } from '../src/lib/supabase'
import { useAuth } from '../src/contexts/AuthContext'
import NotificationBanner from './NotificationBanner'

const OrganisationDetail = () => {
  const params = useParams()
  const orgId = params.id // Get organization ID from route params
  const [organisation, setOrganisation] = useState(null)
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [playerProfile, setPlayerProfile] = useState(null)
  const [playerPhotoUrl, setPlayerPhotoUrl] = useState(null)
  const [hasAccess, setHasAccess] = useState(false)
  const [checkingAccess, setCheckingAccess] = useState(true)
  const { hasRole, signOut, userRoles, user } = useAuth()

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Error signing out:', error)
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
    try {
      const { data, error } = await supabase
        .from('players')
        .select('id, organization_id, first_name, last_name, photo_url')
        .eq('user_id', user.id)
        .single()

      if (error) {
        console.error('Error fetching player profile:', error)
        
        // If user has admin/coach role but no player record, create a minimal profile
        if (hasRole('admin') || hasRole('coach')) {
          console.log('Creating minimal profile for admin/coach without player record')
          setPlayerProfile({
            id: null,
            organization_id: orgId,
            first_name: user.email?.split('@')[0] || 'Admin',
            last_name: '',
            photo_url: null
          })
        }
        return
      }

      if (data) {
        setPlayerProfile(data)
        
        // Get signed URL for photo if it exists
        if (data.photo_url) {
          const signedUrl = await getSignedUrlForPlayerPhoto(data.photo_url)
          setPlayerPhotoUrl(signedUrl)
        }
      }
    } catch (err) {
      console.error('Error in fetchPlayerProfile:', err)
    }
  }

  useEffect(() => {
    console.log('OrganizationDetail: orgId =', orgId)
    console.log('OrganizationDetail: params =', params)
    
    const initializeComponent = async () => {
      if (orgId && orgId !== 'undefined') {
        // Check if user has access to this organization
        const access = await checkUserAccess()
        setHasAccess(access)
        
        if (access) {
          fetchOrganisationData()
          fetchPlayerProfile()
        } else {
          setError('You do not have access to this organization')
          setLoading(false)
        }
      } else {
        setError('Invalid organisation ID')
        setLoading(false)
      }
      setCheckingAccess(false)
    }

    initializeComponent()
  }, [orgId, user])

  // Check if user has access to this organization
  const checkUserAccess = async () => {
    if (!user || !orgId) {
      return false
    }

    try {
      // Superadmin can access any organization
      if (hasRole('superadmin')) {
        return true
      }

      // Check if user belongs to this organization
      const { data: playerData, error } = await supabase
        .from('players')
        .select('organization_id')
        .eq('user_id', user.id)
        .single()

      if (error) {
        console.error('Error checking user access:', error)
        
        // If user has admin/coach role but no player record, they might be an admin
        // who was created without a player profile. Allow access for now.
        if (hasRole('admin') || hasRole('coach')) {
          console.log('User has admin/coach role but no player record - allowing access')
          return true
        }
        
        return false
      }

      return playerData?.organization_id === orgId
    } catch (err) {
      console.error('Error in checkUserAccess:', err)
      return false
    }
  }

  const fetchOrganisationData = async () => {
    try {
      setLoading(true)
      console.log('Fetching organisation data for ID:', orgId)
      
      // Fetch organisation details
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', orgId)
        .single()

      if (orgError) throw orgError
      setOrganisation(orgData)

      // Fetch statistics - remove the role filter from players query
      const [
        playersResult,
        squadsResult,
        sessionsResult,
        drillsResult,
        clubsResult
      ] = await Promise.all([
        supabase.from('players').select('*', { count: 'exact', head: true }).eq('organization_id', orgId),
        supabase.from('squads').select('*', { count: 'exact', head: true }).eq('organization_id', orgId),
        supabase.from('sessions').select('*', { count: 'exact', head: true }).eq('organization_id', orgId),
        supabase.from('drills').select('*', { count: 'exact', head: true }).eq('organization_id', orgId),
        supabase.from('clubs').select('*', { count: 'exact', head: true }).eq('organization_id', orgId)
      ])

      // Extract counts from results
      const playersCount = playersResult.count || 0
      const squadsCount = squadsResult.count || 0
      const sessionsCount = sessionsResult.count || 0
      const drillsCount = drillsResult.count || 0
      const clubsCount = clubsResult.count || 0

      // For now, set coaches to 0 since we need to implement proper role checking
      // TODO: Implement proper coach counting through user_roles table
      setStats({
        players: playersCount || 0,
        coaches: 0, // Will implement proper coach counting later
        squads: squadsCount || 0,
        sessions: sessionsCount || 0,
        drills: drillsCount || 0,
        clubs: clubsCount || 0
      })

    } catch (err) {
      console.error('Error fetching organisation data:', err)
      setError('Failed to fetch organisation data: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  // Helper function to check if user can view reports (admin or coach)
  const canViewReports = () => {
    return hasRole('admin') || hasRole('coach')
  }

  // Helper function to check if user can view admin panel (admin only)
  const canViewAdminPanel = () => {
    return hasRole('admin')
  }

  // Helper function to check if user can view players and attendance (admin, coach, or superadmin)
  const canViewPlayersAndAttendance = () => {
    return hasRole('admin') || hasRole('coach') || hasRole('superadmin')
  }

  // Show loading while checking access or loading data
  if (loading || checkingAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  // If user doesn't have access, show error with redirect option
  if (!hasAccess && !error.includes('Invalid organisation ID')) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="bg-white shadow rounded-lg p-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
                <p className="text-gray-600 mb-6">You do not have access to this organization.</p>
                <Link
                  to="/dashboard"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-md transition duration-150 ease-in-out"
                >
                  Go to Dashboard
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="bg-white shadow rounded-lg p-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Error</h2>
                <p className="text-gray-600 mb-6">{error}</p>
                {hasRole('superadmin') && (
                  <Link
                    to="/organisations"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-md transition duration-150 ease-in-out"
                  >
                    Back to Organisations
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!organisation) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="bg-white shadow rounded-lg p-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Organisation Not Found</h2>
                <p className="text-gray-600 mb-6">The requested organisation could not be found.</p>
                {hasRole('superadmin') && (
                  <Link
                    to="/organisations"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-md transition duration-150 ease-in-out"
                  >
                    Back to Organisations
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header */}
          <div className="bg-white shadow rounded-lg mb-6">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                  {hasRole('superadmin') && (
                    <Link
                      to="/organisations"
                      className="text-gray-600 hover:text-gray-800 font-medium"
                    >
                      ← Back to Organisations
                    </Link>
                  )}
                  <div className="flex items-center">
                    {organisation.logo_url && (
                      <img
                        src={organisation.logo_url}
                        alt={`${organisation.name} logo`}
                        className="w-20 h-20 sm:w-24 sm:h-24 object-contain mr-3 sm:mr-4"
                        onError={(e) => {
                          e.target.style.display = 'none'
                        }}
                      />
                    )}
                    <div>
                      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{organisation.name}</h1>
                      {organisation.description && (
                        <p className="text-gray-600 mt-1 text-sm sm:text-base">{organisation.description}</p>
                      )}
                      {/* Social Media Links */}
                      {(organisation.facebook_url || organisation.instagram_url || organisation.website_url) && (
                        <div className="flex flex-wrap gap-3 mt-3">
                          {organisation.website_url && (
                            <a
                              href={organisation.website_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center text-blue-600 hover:text-blue-800 text-sm"
                            >
                              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                              </svg>
                              Website
                            </a>
                          )}
                          {organisation.facebook_url && (
                            <a
                              href={organisation.facebook_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center text-blue-600 hover:text-blue-800 text-sm"
                            >
                              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                              </svg>
                              Facebook
                            </a>
                          )}
                          {organisation.instagram_url && (
                            <a
                              href={organisation.instagram_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center text-pink-600 hover:text-pink-800 text-sm"
                            >
                              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 6.62 5.367 11.987 11.988 11.987 6.62 0 11.987-5.367 11.987-11.987C24.014 5.367 18.637.001 12.017.001zM8.449 16.988c-1.297 0-2.448-.49-3.323-1.297C4.198 14.895 3.708 13.744 3.708 12.447s.49-2.448 1.297-3.323c.875-.807 2.026-1.297 3.323-1.297s2.448.49 3.323 1.297c.807.875 1.297 2.026 1.297 3.323s-.49 2.448-1.297 3.323c-.875.807-2.026 1.297-3.323 1.297zm7.718-1.297c-.875.807-2.026 1.297-3.323 1.297s-2.448-.49-3.323-1.297c-.807-.875-1.297-2.026-1.297-3.323s.49-2.448 1.297-3.323c.875-.807 2.026-1.297 3.323-1.297s2.448.49 3.323 1.297c.807.875 1.297 2.026 1.297 3.323s-.49 2.448-1.297 3.323z"/>
                              </svg>
                              Instagram
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end space-y-2">
                  {playerProfile && (
                    <Link
                      to={`/organisations/${playerProfile.organization_id}/players/${playerProfile.id}`}
                      className="hover:opacity-80 transition-opacity flex-shrink-0"
                    >
                      {playerProfile.photo_url ? (
                        <img
                          src={playerPhotoUrl || playerProfile.photo_url}
                          alt={`${playerProfile.first_name} ${playerProfile.last_name}`}
                          className="w-10 h-10 object-cover rounded-full border border-gray-300"
                          onError={(e) => {
                            e.target.style.display = 'none'
                            if (e.target.nextSibling) {
                              e.target.nextSibling.style.display = 'flex'
                            }
                          }}
                          onLoad={(e) => {
                            if (e.target.nextSibling) {
                              e.target.nextSibling.style.display = 'none'
                            }
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
            </div>
          </div>

          {/* Notification Banner */}
          <NotificationBanner />

          {/* Navigation Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {canViewPlayersAndAttendance() && (
              <Link
                to={`/organisations/${orgId}/players`}
                className="bg-white shadow rounded-lg p-6 hover:shadow-lg transition-shadow duration-200"
              >
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-semibold text-gray-900">Players</h3>
                    <p className="text-gray-600">Manage players and coaches</p>
                    <p className="text-sm text-blue-600 mt-1">{stats.players} players</p>
                  </div>
                </div>
              </Link>
            )}

            <Link
              to={`/organisations/${orgId}/squads`}
              className="bg-white shadow rounded-lg p-6 hover:shadow-lg transition-shadow duration-200"
            >
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-900">Squads</h3>
                  <p className="text-gray-600">Organize training groups</p>
                  <p className="text-sm text-purple-600 mt-1">{stats.squads} squads</p>
                </div>
              </div>
            </Link>

            <Link
              to={`/organisations/${orgId}/sessions`}
              className="bg-white shadow rounded-lg p-6 hover:shadow-lg transition-shadow duration-200"
            >
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a4 4 0 118 0v4m-4 6v6m-4-6h8m-8 0H4m8 0h4" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-900">Sessions</h3>
                  <p className="text-gray-600">Schedule practice sessions</p>
                  <p className="text-sm text-yellow-600 mt-1">{stats.sessions} sessions</p>
                </div>
              </div>
            </Link>

            <Link
              to={`/organisations/${orgId}/drills`}
              className="bg-white shadow rounded-lg p-6 hover:shadow-lg transition-shadow duration-200"
            >
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-900">Drills</h3>
                  <p className="text-gray-600">Create practice drills</p>
                  <p className="text-sm text-indigo-600 mt-1">{stats.drills} drills</p>
                </div>
              </div>
            </Link>

            <Link
              to={`/organisations/${orgId}/clubs`}
              className="bg-white shadow rounded-lg p-6 hover:shadow-lg transition-shadow duration-200"
            >
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-900">Clubs</h3>
                  <p className="text-gray-600">Manage hockey clubs</p>
                  <p className="text-sm text-red-600 mt-1">{stats.clubs} clubs</p>
                </div>
              </div>
            </Link>

            {canViewPlayersAndAttendance() && (
              <Link
                to={`/organisations/${orgId}/attendance`}
                className="bg-white shadow rounded-lg p-6 hover:shadow-lg transition-shadow duration-200"
              >
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-semibold text-gray-900">Attendance</h3>
                    <p className="text-gray-600">Training session attendance</p>
                    <p className="text-sm text-teal-600 mt-1">View attendance</p>
                  </div>
                </div>
              </Link>
            )}

            {/* Reports - Only visible to admins and coaches */}
            {canViewReports() && (
              <Link
                to={`/organisations/${orgId}/reports`}
                className="bg-white shadow rounded-lg p-6 hover:shadow-lg transition-shadow duration-200"
              >
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-semibold text-gray-900">Reports</h3>
                    <p className="text-gray-600">View analytics and reports</p>
                    <p className="text-sm text-green-600 mt-1">View reports</p>
                  </div>
                </div>
              </Link>
            )}

            {/* Admin Panel - Only visible to admins */}
            {canViewAdminPanel() && (
              <Link
                to={`/organisations/${orgId}/admin`}
                className="bg-white shadow rounded-lg p-6 hover:shadow-lg transition-shadow duration-200"
              >
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-semibold text-gray-900">Admin Panel</h3>
                    <p className="text-gray-600">Manage locations and clubs</p>
                    <p className="text-sm text-gray-600 mt-1">Admin settings</p>
                  </div>
                </div>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default OrganisationDetail 