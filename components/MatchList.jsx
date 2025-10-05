import React, { useState, useEffect } from 'react'
import { supabase } from '../src/lib/supabase'
import { useParams, Link } from 'react-router-dom'
import OrganizationHeader from './OrganizationHeader'

const MatchList = () => {
  const { orgId } = useParams()
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('all') // 'all', 'active', 'completed'
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [matchToClear, setMatchToClear] = useState(null)
  
  useEffect(() => {
    loadMatches()
  }, [orgId, filter])
  
  const loadMatches = async () => {
    try {
      setLoading(true)
      setError(null)
      
      let query = supabase
        .from('matches')
        .select(`
          id,
          match_date,
          match_time,
          venue,
          goals_home,
          goals_away,
          is_active,
          match_start_time,
          game_end_time,
          created_at,
          sessions (
            id,
            title,
            date
          ),
          home_squad:squads!matches_home_squad_id_fkey (
            id,
            name
          ),
          away_squad:squads!matches_away_squad_id_fkey (
            id,
            name
          )
        `)
        .order('match_date', { ascending: false })
        .order('match_time', { ascending: false })
      
      // Apply filters
      if (filter === 'active') {
        query = query.eq('is_active', true).is('game_end_time', null)
      } else if (filter === 'completed') {
        query = query.or('is_active.eq.false,game_end_time.not.is.null')
      }
      
      const { data, error: matchesError } = await query
      
      if (matchesError) throw matchesError
      setMatches(data || [])
      
    } catch (error) {
      console.error('Error loading matches:', error)
      setError('Failed to load matches: ' + error.message)
    } finally {
      setLoading(false)
    }
  }
  
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }
  
  const formatTime = (timeString) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  }
  
  const getMatchStatus = (match) => {
    if (match.game_end_time) {
      return { status: 'completed', label: 'Completed', color: 'bg-gray-100 text-gray-800' }
    } else if (match.is_active && match.match_start_time) {
      return { status: 'active', label: 'In Progress', color: 'bg-green-100 text-green-800' }
    } else if (match.match_start_time) {
      return { status: 'paused', label: 'Paused', color: 'bg-yellow-100 text-yellow-800' }
    } else {
      return { status: 'scheduled', label: 'Scheduled', color: 'bg-blue-100 text-blue-800' }
    }
  }
  
  const getMatchDuration = (match) => {
    if (!match.match_start_time) return null
    
    const startTime = new Date(match.match_start_time)
    const endTime = match.game_end_time ? new Date(match.game_end_time) : new Date()
    const durationMs = endTime - startTime
    const durationMinutes = Math.floor(durationMs / 60000)
    
    return `${durationMinutes}m`
  }
  
  const handleDeleteMatch = async (matchId) => {
    if (!confirm('Are you sure you want to delete this match? This action cannot be undone.')) {
      return
    }
    
    try {
      const { error } = await supabase
        .from('matches')
        .delete()
        .eq('id', matchId)
      
      if (error) throw error
      
      // Reload matches
      loadMatches()
      
    } catch (error) {
      console.error('Error deleting match:', error)
      setError('Failed to delete match: ' + error.message)
    }
  }

  const handleClearMatchData = async (matchId) => {
    try {
      setLoading(true)
      
      // Delete all match events
      const { error: eventsError } = await supabase
        .from('match_events')
        .delete()
        .eq('match_id', matchId)
      
      if (eventsError) throw eventsError
      
      // Delete all match player status records
      const { error: statusError } = await supabase
        .from('match_player_status')
        .delete()
        .eq('match_id', matchId)
      
      if (statusError) throw statusError
      
      // Reset match fields
      const { error: matchError } = await supabase
        .from('matches')
        .update({
          goals_home: 0,
          goals_away: 0,
          match_start_time: null,
          game_end_time: null,
          current_play_start_time: null,
          total_play_time_seconds: 0,
          is_active: false,
          current_period: 1
        })
        .eq('id', matchId)
      
      if (matchError) throw matchError
      
      // Reload matches
      loadMatches()
      
      // Close confirmation modal
      setShowClearConfirm(false)
      setMatchToClear(null)
      
    } catch (error) {
      console.error('Error clearing match data:', error)
      setError('Failed to clear match data: ' + error.message)
    } finally {
      setLoading(false)
    }
  }
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <OrganizationHeader organizationId={orgId} showBackButton={true} />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center">Loading matches...</div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <OrganizationHeader organizationId={orgId} showBackButton={true} />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Match Management</h1>
              <p className="mt-2 text-gray-600">Manage matches and view match history</p>
            </div>
            <div className="mt-4 sm:mt-0">
              <Link
                to={orgId ? `/organisations/${orgId}/create-match` : '/create-match'}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Create New Match
              </Link>
            </div>
          </div>
        </div>
        
        {/* Filters */}
        <div className="mb-6">
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                filter === 'all'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              All Matches
            </button>
            <button
              onClick={() => setFilter('active')}
              className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                filter === 'active'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                filter === 'completed'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Completed
            </button>
          </div>
        </div>
        
        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-800">{error}</p>
          </div>
        )}
        
        {/* Matches List */}
        {matches.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No matches found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {filter === 'all' 
                ? "Get started by creating a new match."
                : `No ${filter} matches found.`
              }
            </p>
            {filter === 'all' && (
              <div className="mt-6">
                <Link
                  to={orgId ? `/organisations/${orgId}/create-match` : '/create-match'}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Create New Match
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {matches.map((match) => {
                const matchStatus = getMatchStatus(match)
                const duration = getMatchDuration(match)
                
                return (
                  <li key={match.id}>
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          {/* Teams */}
                          <div className="flex items-center space-x-2">
                            <div className="text-sm font-medium text-red-600">
                              {match.home_squad?.name || 'Home'}
                            </div>
                            <div className="text-lg font-bold text-gray-900">
                              {match.goals_home} - {match.goals_away}
                            </div>
                            <div className="text-sm font-medium text-blue-600">
                              {match.away_squad?.name || 'Away'}
                            </div>
                          </div>
                          
                          {/* Match Info */}
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <div className="flex items-center">
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              {formatDate(match.match_date)}
                            </div>
                            <div className="flex items-center">
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {formatTime(match.match_time)}
                            </div>
                            {match.venue && (
                              <div className="flex items-center">
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                {match.venue}
                              </div>
                            )}
                            {duration && (
                              <div className="flex items-center">
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {duration}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Actions */}
                        <div className="flex items-center space-x-3">
                          {/* Status Badge */}
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${matchStatus.color}`}>
                            {matchStatus.label}
                          </span>
                          
                          {/* Manage Button */}
                          <Link
                            to={match.sessions?.id 
                              ? (orgId 
                                ? `/organisations/${orgId}/sessions/${match.sessions.id}/match` 
                                : `/sessions/${match.sessions.id}/match`)
                              : (orgId 
                                ? `/organisations/${orgId}/matches/${match.id}/management`
                                : `/matches/${match.id}/management`)
                            }
                            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            Manage
                          </Link>
                          
                          {/* View Stats Button */}
                          <Link
                            to={orgId 
                              ? `/organisations/${orgId}/matches/${match.id}/stats`
                              : `/matches/${match.id}/stats`}
                            className="inline-flex items-center px-3 py-2 border border-green-300 shadow-sm text-sm leading-4 font-medium rounded-md text-green-700 bg-white hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                          >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                            Stats
                          </Link>
                          
                          {/* Delete Button */}
                          <button
                            onClick={() => handleDeleteMatch(match.id)}
                            className="inline-flex items-center px-3 py-2 border border-red-300 shadow-sm text-sm leading-4 font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      
                      {/* Session Info */}
                      <div className="mt-2">
                        <p className="text-sm text-gray-600">
                          Session: <span className="font-medium">{match.sessions?.title}</span>
                        </p>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

export default MatchList
