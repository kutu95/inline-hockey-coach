import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../src/lib/supabase'
import { useAuth } from '../src/contexts/AuthContext'

const OrganisationDetail = () => {
  const params = useParams()
  const orgId = params.id // Get organization ID from route params
  const [organisation, setOrganisation] = useState(null)
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const { hasRole, signOut, userRoles } = useAuth()

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  useEffect(() => {
    console.log('OrganizationDetail: orgId =', orgId)
    console.log('OrganizationDetail: params =', params)
    
    if (orgId && orgId !== 'undefined') {
      fetchOrganisationData()
    } else {
      setError('Invalid organisation ID')
      setLoading(false)
    }
  }, [orgId])

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
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
                        className="w-10 h-10 sm:w-12 sm:h-12 object-contain mr-3 sm:mr-4"
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
                    </div>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
                  <div className="text-sm text-gray-500">
                    Created {new Date(organisation.created_at).toLocaleDateString()}
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-md transition duration-150 ease-in-out w-full sm:w-auto"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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