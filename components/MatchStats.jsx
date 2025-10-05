import React, { useState, useEffect } from 'react'
import { useParams, Link, Navigate } from 'react-router-dom'
import { supabase } from '../src/lib/supabase'
import { useAuth } from '../src/contexts/AuthContext'
import { useDataLogger, usePageLogger } from '../src/hooks/useEventLogger'
import PlayerDetailsModal from './PlayerDetailsModal'

const MatchStats = () => {
  const { user, loading: authLoading, hasRole } = useAuth()
  const { logUpdate, logCreate, logDelete } = useDataLogger()
  
  // Log page access
  usePageLogger('Match Stats')
  const [match, setMatch] = useState(null)
  const [homeSquad, setHomeSquad] = useState(null)
  const [awaySquad, setAwaySquad] = useState(null)
  const [homePlayers, setHomePlayers] = useState([])
  const [awayPlayers, setAwayPlayers] = useState([])
  const [matchEvents, setMatchEvents] = useState([])
  const [allPlayers, setAllPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedPlayerFilter, setSelectedPlayerFilter] = useState('all')
  const [selectedEventTypeFilter, setSelectedEventTypeFilter] = useState('all')
  const [selectedEventIds, setSelectedEventIds] = useState([])
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showAddEventDialog, setShowAddEventDialog] = useState(false)
  const [showEditEventDialog, setShowEditEventDialog] = useState(false)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)
  const [selectedEventForDetails, setSelectedEventForDetails] = useState(null)
  const [selectedEventForEdit, setSelectedEventForEdit] = useState(null)
  const [showPlayerStatsDialog, setShowPlayerStatsDialog] = useState(false)
  const [selectedPlayerForStats, setSelectedPlayerForStats] = useState(null)
  const [showPlayerDetailsModal, setShowPlayerDetailsModal] = useState(false)
  const [selectedPlayerForDetails, setSelectedPlayerForDetails] = useState(null)
  const [newEvent, setNewEvent] = useState({
    event_type: 'player_on',
    player_id: '',
    event_time: new Date().toISOString().slice(0, 19),
    metadata: ''
  })
  const [editEvent, setEditEvent] = useState({
    event_type: '',
    player_id: '',
    event_time: '',
    metadata: ''
  })
  
  const { matchId, orgId } = useParams()

  // Check authentication and superadmin role
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (!hasRole('superadmin')) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
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
                  This page is restricted to superadministrators only.
                </p>
                
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <p className="text-sm text-gray-700 mb-2">
                    <strong>Current User:</strong> {user?.email}
                  </p>
                  <p className="text-sm text-gray-700">
                    <strong>Required Role:</strong> superadmin
                  </p>
                </div>
                
                <p className="text-gray-600 text-sm">
                  Please contact a system administrator if you need access to this page.
                </p>
              </div>
              
              <div className="space-y-3">
                <Link
                  to="/dashboard"
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Return to Dashboard
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  useEffect(() => {
    if (matchId) {
      loadMatchStats()
    }
  }, [matchId])

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const getFirstPlayStartTime = () => {
    if (!matchEvents) return null
    const firstPlayStart = matchEvents
      .filter(event => event.event_type === 'play_start')
      .sort((a, b) => new Date(a.event_time) - new Date(b.event_time))[0]
    return firstPlayStart ? new Date(firstPlayStart.event_time) : null
  }

  const calculateElapsedTime = (eventTime) => {
    const firstPlayStart = getFirstPlayStartTime()
    if (!firstPlayStart) return 'N/A'
    
    const eventDateTime = new Date(eventTime)
    const elapsedSeconds = Math.floor((eventDateTime - firstPlayStart) / 1000)
    
    if (elapsedSeconds < 0) return 'N/A'
    return formatTime(elapsedSeconds)
  }

  const handleSelectEvent = (eventId) => {
    setSelectedEventIds(prev => {
      if (prev.includes(eventId)) {
        // Remove from selection
        return prev.filter(id => id !== eventId)
      } else {
        // Add to selection
        return [...prev, eventId]
      }
    })
  }

  const handleDeleteClick = () => {
    if (selectedEventIds.length > 0) {
      setShowDeleteDialog(true)
    }
  }

  const handleEditEventClick = (event) => {
    setSelectedEventForEdit(event)
    
    // Convert stored UTC time to local time for datetime-local input
    const eventDate = new Date(event.event_time)
    
    // Create local time string in the format expected by datetime-local input
    const year = eventDate.getFullYear()
    const month = String(eventDate.getMonth() + 1).padStart(2, '0')
    const day = String(eventDate.getDate()).padStart(2, '0')
    const hours = String(eventDate.getHours()).padStart(2, '0')
    const minutes = String(eventDate.getMinutes()).padStart(2, '0')
    const seconds = String(eventDate.getSeconds()).padStart(2, '0')
    
    const localTimeString = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`
    
    setEditEvent({
      event_type: event.event_type,
      player_id: event.player_id || '',
      event_time: localTimeString,
      metadata: event.metadata ? JSON.stringify(event.metadata) : ''
    })
    setShowEditEventDialog(true)
  }

  const handleShowDetails = (event) => {
    setSelectedEventForDetails(event)
    setShowDetailsDialog(true)
  }

  const handleDeleteEvents = async () => {
    try {
      const { error } = await supabase
        .from('match_events')
        .delete()
        .in('id', selectedEventIds)

      if (error) throw error

      // Refresh match events from database
      await loadMatchStats()
      
      // Close dialog and clear selection
      setShowDeleteDialog(false)
      setSelectedEventIds([])
      
      console.log('Events deleted successfully:', selectedEventIds)
    } catch (error) {
      console.error('Error deleting events:', error)
      alert('Failed to delete events: ' + error.message)
    }
  }

  const loadMatchStats = async () => {
    try {
      setLoading(true)
      setError(null)

      // Load match data
      const { data: matchData, error: matchError } = await supabase
        .from('matches')
        .select(`
          *,
          home_squad:squads!matches_home_squad_id_fkey (*),
          away_squad:squads!matches_away_squad_id_fkey (*),
          sessions (*)
        `)
        .eq('id', matchId)
        .single()

      if (matchError) throw matchError
      setMatch(matchData)
      setHomeSquad(matchData.home_squad)
      setAwaySquad(matchData.away_squad)

      // Load players for both squads
      const [homePlayerIds, awayPlayerIds] = await Promise.all([
        supabase
          .from('player_squads')
          .select('player_id')
          .eq('squad_id', matchData.home_squad_id),
        supabase
          .from('player_squads')
          .select('player_id')
          .eq('squad_id', matchData.away_squad_id)
      ])

      const homeIds = homePlayerIds.data?.map(p => p.player_id) || []
      const awayIds = awayPlayerIds.data?.map(p => p.player_id) || []

      // Load player details
      const [homePlayersData, awayPlayersData] = await Promise.all([
        homeIds.length > 0 ? supabase
          .from('players')
          .select('id, first_name, last_name, jersey_number')
          .in('id', homeIds) : Promise.resolve({ data: [] }),
        awayIds.length > 0 ? supabase
          .from('players')
          .select('id, first_name, last_name, jersey_number')
          .in('id', awayIds) : Promise.resolve({ data: [] })
      ])

      setHomePlayers(homePlayersData.data || [])
      setAwayPlayers(awayPlayersData.data || [])

      // Load all match events
      const { data: events, error: eventsError } = await supabase
        .from('match_events')
        .select('*')
        .eq('match_id', matchId)
        .order('event_time', { ascending: true })

      if (eventsError) throw eventsError
      setMatchEvents(events || [])

      // Load all players that appear in match events
      const eventPlayerIds = [...new Set(events?.map(event => event.player_id).filter(Boolean) || [])]
      const metadataPlayerIds = [...new Set(
        events
          ?.filter(event => event.metadata && event.metadata.rink_players)
          ?.flatMap(event => event.metadata.rink_players)
          || []
      )]
      const allPlayerIds = [...new Set([...eventPlayerIds, ...metadataPlayerIds, ...homeIds, ...awayIds])]
      
      if (allPlayerIds.length > 0) {
        const { data: playersData, error: playersError } = await supabase
          .from('players')
          .select('id, first_name, last_name')
          .in('id', allPlayerIds)
        
        if (playersError) {
          console.error('Error loading players for display:', playersError)
        } else {
          setAllPlayers(playersData || [])
        }
      }

    } catch (error) {
      console.error('Error loading match stats:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  // Calculate player stats for match
  const calculatePlayerStats = (players, teamSide) => {
    return players.map((player) => {
      // Get all events for this player, ordered by time
      const playerEvents = matchEvents
        .filter(event => event.player_id === player.id && event.team_side === teamSide)
        .sort((a, b) => new Date(a.event_time) - new Date(b.event_time))
      
      // Get all play start/stop events for the entire match
      const playEvents = matchEvents
        .filter(event => event.event_type === 'play_start' || event.event_type === 'play_stop')
        .sort((a, b) => new Date(a.event_time) - new Date(b.event_time))
      
      // Calculate total rink time during active play periods
      let totalRinkTime = 0
      let shiftCount = 0
      let currentShiftStart = null
      let isOnRink = false
      let shortestShift = 0
      let longestShift = 0
      let longestShiftStartTime = null
      
      // Process all events in chronological order
      const allEvents = [...playerEvents, ...playEvents]
        .sort((a, b) => new Date(a.event_time) - new Date(b.event_time))
      
      let isPlayActive = false
      
      // Determine initial player state
      if (playerEvents.length > 0) {
        const firstPlayerEvent = playerEvents[0]
        const firstPlayEvent = playEvents[0]
        
        if (firstPlayerEvent.event_type === 'player_on' && 
            firstPlayEvent && 
            new Date(firstPlayerEvent.event_time) < new Date(firstPlayEvent.event_time)) {
          isOnRink = true
        }
      }
      
      for (const event of allEvents) {
        const eventTime = new Date(event.event_time)
        
        if (event.event_type === 'play_start') {
          isPlayActive = true
          
          if (isOnRink && !currentShiftStart) {
            currentShiftStart = eventTime
          }
        } else if (event.event_type === 'play_stop') {
          isPlayActive = false
          
          if (isOnRink && currentShiftStart) {
            const shiftDuration = Math.floor((eventTime - currentShiftStart) / 1000)
            totalRinkTime += shiftDuration
            shiftCount++
            if (shiftCount === 1 || shiftDuration < shortestShift) shortestShift = shiftDuration
            if (shiftDuration > longestShift) {
              longestShift = shiftDuration
              longestShiftStartTime = currentShiftStart
            }
            currentShiftStart = null
          }
        } else if (event.player_id === player.id && event.team_side === teamSide) {
          if (event.event_type === 'player_on') {
            if (!isOnRink) {
              isOnRink = true
              if (isPlayActive && !currentShiftStart) {
                currentShiftStart = eventTime
              }
            }
          } else if (event.event_type === 'player_off') {
            if (isOnRink && currentShiftStart && isPlayActive) {
              const shiftDuration = Math.floor((eventTime - currentShiftStart) / 1000)
              totalRinkTime += shiftDuration
              shiftCount++
              if (shiftCount === 1 || shiftDuration < shortestShift) shortestShift = shiftDuration
              if (shiftDuration > longestShift) {
                longestShift = shiftDuration
                longestShiftStartTime = currentShiftStart
              }
            }
            isOnRink = false
            currentShiftStart = null
          }
        }
      }
      
      // Handle case where player is still on rink at match end
      if (isOnRink && currentShiftStart && isPlayActive) {
        const matchEndEvent = matchEvents.find(event => event.event_type === 'game_end')
        let matchEndTime
        
        if (matchEndEvent) {
          matchEndTime = new Date(matchEndEvent.event_time)
        } else {
          const lastEvent = matchEvents.length > 0 ? matchEvents[matchEvents.length - 1] : null
          matchEndTime = lastEvent ? new Date(lastEvent.event_time) : new Date()
        }
        
        const finalShiftDuration = Math.floor((matchEndTime - currentShiftStart) / 1000)
        totalRinkTime += finalShiftDuration
        shiftCount++
        if (shiftCount === 1 || finalShiftDuration < shortestShift) shortestShift = finalShiftDuration
        if (finalShiftDuration > longestShift) {
          longestShift = finalShiftDuration
          longestShiftStartTime = currentShiftStart
        }
      }
      
      // Calculate average shift time
      const averageShiftTime = shiftCount > 0 ? Math.round(totalRinkTime / shiftCount) : 0
      
      // Calculate plus/minus for this team
      let plusMinus = 0
      const goalEvents = matchEvents.filter(event => 
        (event.event_type === 'goal_home' && teamSide === 'home') ||
        (event.event_type === 'goal_away' && teamSide === 'away')
      ).sort((a, b) => new Date(a.event_time) - new Date(b.event_time))
      
      const goalsAgainstEvents = matchEvents.filter(event => 
        (event.event_type === 'goal_away' && teamSide === 'home') ||
        (event.event_type === 'goal_home' && teamSide === 'away')
      ).sort((a, b) => new Date(a.event_time) - new Date(b.event_time))
      
      for (const goalEvent of goalEvents) {
        const goalTime = new Date(goalEvent.event_time)
        
        let wasOnRinkAtGoal = false
        if (goalEvent.metadata && goalEvent.metadata.rink_players) {
          wasOnRinkAtGoal = goalEvent.metadata.rink_players.includes(player.id)
        } else {
          // Fallback calculation
          const eventsBeforeGoal = playerEvents.filter(e => new Date(e.event_time) <= goalTime)
          let onRinkState = false
          
          for (const event of eventsBeforeGoal) {
            if (event.event_type === 'player_on') {
              onRinkState = true
            } else if (event.event_type === 'player_off') {
              onRinkState = false
            }
          }
          wasOnRinkAtGoal = onRinkState
        }
        
        if (wasOnRinkAtGoal) {
          plusMinus += 1
        }
      }
      
      for (const goalEvent of goalsAgainstEvents) {
        const goalTime = new Date(goalEvent.event_time)
        
        let wasOnRinkAtGoal = false
        if (goalEvent.metadata && goalEvent.metadata.rink_players) {
          wasOnRinkAtGoal = goalEvent.metadata.rink_players.includes(player.id)
        } else {
          // Fallback calculation
          const eventsBeforeGoal = playerEvents.filter(e => new Date(e.event_time) <= goalTime)
          let onRinkState = false
          
          for (const event of eventsBeforeGoal) {
            if (event.event_type === 'player_on') {
              onRinkState = true
            } else if (event.event_type === 'player_off') {
              onRinkState = false
            }
          }
          wasOnRinkAtGoal = onRinkState
        }
        
        if (wasOnRinkAtGoal) {
          plusMinus -= 1
        }
      }
      
      return {
        id: player.id,
        name: `${player.first_name} ${player.last_name}`,
        jerseyNumber: player.jersey_number,
        teamSide,
        totalRinkTime,
        shiftCount,
        averageShiftTime,
        shortestShift,
        longestShift,
        longestShiftStartTime,
        plusMinus,
        formattedTime: formatTime(totalRinkTime),
        formattedAverageShiftTime: formatTime(averageShiftTime),
        formattedShortestShift: formatTime(shortestShift),
        formattedLongestShift: formatTime(longestShift),
        formattedLongestShiftStartTime: longestShiftStartTime ? calculateElapsedTime(longestShiftStartTime) : 'N/A'
      }
    })
  }

  const homePlayerStats = calculatePlayerStats(homePlayers, 'home')
  const awayPlayerStats = calculatePlayerStats(awayPlayers, 'away')
  const allPlayerStats = [...homePlayerStats, ...awayPlayerStats].sort((a, b) => b.totalRinkTime - a.totalRinkTime)

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading match stats...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-8">
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              <p className="font-bold">Error loading match stats:</p>
              <p>{error}</p>
            </div>
            <Link 
              to={orgId ? `/organisations/${orgId}/matches/${matchId}/management` : `/matches/${matchId}/management`}
              className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
            >
              Back to Match
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link 
            to={orgId ? `/organisations/${orgId}/matches/${matchId}/management` : `/matches/${matchId}/management`}
            className="text-indigo-600 hover:text-indigo-800 mb-2 inline-block"
          >
            ← Back to Match
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Match Statistics</h1>
          {match && (
            <div className="text-gray-600 mt-2">
              <p className="text-lg">
                {homeSquad?.name || 'Home'} vs {awaySquad?.name || 'Away'}
              </p>
              <p className="text-sm">
                {match.match_date ? new Date(match.match_date).toLocaleDateString() : 'No date'} at {match.venue || 'No venue'}
              </p>
            </div>
          )}
        </div>

        {/* Match Stats Summary */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Match Summary</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Home Team Score */}
            <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
              <div className="text-sm font-medium text-red-800 mb-1">{homeSquad?.name || 'Home'}</div>
              <div className="text-3xl font-bold text-red-600 mb-2">
                {match?.goals_home || 0}
              </div>
              <div className="text-xs text-red-700">Goals</div>
            </div>
            
            {/* Away Team Score */}
            <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-sm font-medium text-blue-800 mb-1">{awaySquad?.name || 'Away'}</div>
              <div className="text-3xl font-bold text-blue-600 mb-2">
                {match?.goals_away || 0}
              </div>
              <div className="text-xs text-blue-700">Goals</div>
            </div>
            
            {/* Match Duration */}
            <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="text-sm font-medium text-green-800 mb-1">Duration</div>
              <div className="text-2xl font-bold text-green-600 mb-2">
                {(() => {
                  if (!match?.match_start_time) return '0:00'
                  
                  const startTime = new Date(match.match_start_time)
                  const endTime = match.game_end_time ? new Date(match.game_end_time) : new Date()
                  const durationMs = endTime - startTime
                  const durationMinutes = Math.floor(durationMs / 60000)
                  
                  return `${durationMinutes}m`
                })()}
              </div>
              <div className="text-xs text-green-700">Total Time</div>
            </div>
            
            {/* Match Status */}
            <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="text-sm font-medium text-gray-800 mb-1">Status</div>
              <div className={`text-lg font-bold mb-2 ${
                match?.game_end_time ? 'text-gray-600' : 'text-green-600'
              }`}>
                {match?.game_end_time ? 'Completed' : 'In Progress'}
              </div>
              <div className="text-xs text-gray-700">Match State</div>
            </div>
          </div>
        </div>

        {/* Player Statistics Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Home Team Stats */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 text-red-600">
              {homeSquad?.name || 'Home'} Team Statistics
            </h3>
            
            {homePlayerStats.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Player
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        #
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Time
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Shifts
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Avg Shift
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        +/-
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {homePlayerStats.map((player) => (
                      <tr key={player.id} className="hover:bg-gray-50">
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          <button
                            onClick={() => {
                              setSelectedPlayerForDetails(player.id)
                              setShowPlayerDetailsModal(true)
                            }}
                            className="text-blue-600 hover:text-blue-900 hover:underline focus:outline-none focus:underline transition-colors duration-200"
                          >
                            {player.name}
                          </button>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                          #{player.jerseyNumber}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {player.formattedTime}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                          {player.shiftCount}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                          {player.formattedAverageShiftTime}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            player.plusMinus > 0 ? 'bg-green-100 text-green-800' :
                            player.plusMinus < 0 ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {player.plusMinus > 0 ? '+' : ''}{player.plusMinus}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No player statistics available for home team.
              </div>
            )}
          </div>

          {/* Away Team Stats */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 text-blue-600">
              {awaySquad?.name || 'Away'} Team Statistics
            </h3>
            
            {awayPlayerStats.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Player
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        #
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Time
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Shifts
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Avg Shift
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        +/-
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {awayPlayerStats.map((player) => (
                      <tr key={player.id} className="hover:bg-gray-50">
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          <button
                            onClick={() => {
                              setSelectedPlayerForDetails(player.id)
                              setShowPlayerDetailsModal(true)
                            }}
                            className="text-blue-600 hover:text-blue-900 hover:underline focus:outline-none focus:underline transition-colors duration-200"
                          >
                            {player.name}
                          </button>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                          #{player.jerseyNumber}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {player.formattedTime}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                          {player.shiftCount}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                          {player.formattedAverageShiftTime}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            player.plusMinus > 0 ? 'bg-green-100 text-green-800' :
                            player.plusMinus < 0 ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {player.plusMinus > 0 ? '+' : ''}{player.plusMinus}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No player statistics available for away team.
              </div>
            )}
          </div>
        </div>

        {/* Combined Player Stats */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">All Players Combined</h2>
          
          {allPlayerStats.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Player
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Team
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Jersey
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Rink Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Shifts
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Avg Shift Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Plus/Minus
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {allPlayerStats.map((player) => (
                    <tr key={player.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        <button
                          onClick={() => {
                            setSelectedPlayerForDetails(player.id)
                            setShowPlayerDetailsModal(true)
                          }}
                          className="text-blue-600 hover:text-blue-900 hover:underline focus:outline-none focus:underline transition-colors duration-200"
                        >
                          {player.name}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          player.teamSide === 'home' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {player.teamSide === 'home' ? (homeSquad?.name || 'Home') : (awaySquad?.name || 'Away')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        #{player.jerseyNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {player.formattedTime}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {player.shiftCount}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {player.formattedAverageShiftTime}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          player.plusMinus > 0 ? 'bg-green-100 text-green-800' :
                          player.plusMinus < 0 ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {player.plusMinus > 0 ? '+' : ''}{player.plusMinus}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                        <button
                          onClick={() => {
                            setSelectedPlayerForStats(player)
                            setShowPlayerStatsDialog(true)
                          }}
                          className="px-3 py-1 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          View Stats
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No player statistics available for this match.
            </div>
          )}
        </div>

        {/* Match Events Table */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-4">
            <h3 className="text-lg font-semibold text-gray-800">Match Events</h3>
            
            {/* Filters and Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Player Filter */}
              <div className="flex items-center space-x-2">
                <label htmlFor="player-filter" className="text-sm font-medium text-gray-700 whitespace-nowrap">
                  Player:
                </label>
                <select
                  id="player-filter"
                  value={selectedPlayerFilter}
                  onChange={(e) => setSelectedPlayerFilter(e.target.value)}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="all">All Players</option>
                  {allPlayers.map((player) => (
                    <option key={player.id} value={player.id}>
                      {player.first_name} {player.last_name}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Event Type Filter */}
              <div className="flex items-center space-x-2">
                <label htmlFor="event-type-filter" className="text-sm font-medium text-gray-700 whitespace-nowrap">
                  Event Type:
                </label>
                <select
                  id="event-type-filter"
                  value={selectedEventTypeFilter}
                  onChange={(e) => setSelectedEventTypeFilter(e.target.value)}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="all">All Events</option>
                  <option value="player_on">Player On</option>
                  <option value="player_off">Player Off</option>
                  <option value="goal_home">Goal Home</option>
                  <option value="goal_away">Goal Away</option>
                  <option value="play_events">Play Events (Start & Stop)</option>
                  <option value="play_start">Play Start</option>
                  <option value="play_stop">Play Stop</option>
                  <option value="game_end">Game End</option>
                </select>
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => setShowAddEventDialog(true)}
                  className="px-3 py-1 text-sm rounded-md bg-green-600 text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  Add Event
                </button>
                <button
                  onClick={handleDeleteClick}
                  disabled={selectedEventIds.length === 0}
                  className={`px-3 py-1 text-sm rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 ${
                    selectedEventIds.length > 0
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  Delete Selected ({selectedEventIds.length})
                </button>
              </div>
            </div>
          </div>
          
          {matchEvents && matchEvents.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Select
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Elapsed Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Event Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Team
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Player
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {matchEvents
                    .filter(event => event.event_type !== 'player_positions')
                    .filter(event => {
                      if (selectedPlayerFilter === 'all') return true
                      return event.player_id === selectedPlayerFilter
                    })
                    .filter(event => {
                      if (selectedEventTypeFilter === 'all') return true
                      if (selectedEventTypeFilter === 'play_events') {
                        return event.event_type === 'play_start' || event.event_type === 'play_stop'
                      }
                      return event.event_type === selectedEventTypeFilter
                    })
                    .map((event, index) => {
                    // Find player name
                    let playerName = 'N/A'
                    if (event.player_id) {
                      const player = allPlayers.find(p => p.id === event.player_id)
                      if (player) {
                        playerName = `${player.first_name} ${player.last_name}`
                      } else {
                        playerName = `Player ID: ${event.player_id}`
                      }
                    }
                    
                    // Format event time
                    let eventTime = 'N/A'
                    if (event.event_time) {
                      try {
                        const date = new Date(event.event_time)
                        if (!isNaN(date.getTime())) {
                          eventTime = date.toLocaleString('en-AU', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                          })
                        }
                      } catch (error) {
                        eventTime = event.event_time
                      }
                    }
                    
                    return (
                      <tr 
                        key={index} 
                        className={`hover:bg-gray-50 ${
                          selectedEventIds.includes(event.id) ? 'bg-blue-50' : ''
                        }`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={selectedEventIds.includes(event.id)}
                            onChange={() => handleSelectEvent(event.id)}
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                          {new Date(event.event_time).toLocaleTimeString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                          {calculateElapsedTime(event.event_time)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            event.event_type === 'goal_home' ? 'bg-red-100 text-red-800' :
                            event.event_type === 'goal_away' ? 'bg-blue-100 text-blue-800' :
                            event.event_type === 'player_on' ? 'bg-green-100 text-green-800' :
                            event.event_type === 'player_off' ? 'bg-yellow-100 text-yellow-800' :
                            event.event_type === 'play_start' ? 'bg-green-100 text-green-800' :
                            event.event_type === 'play_stop' ? 'bg-red-100 text-red-800' :
                            event.event_type === 'game_end' ? 'bg-gray-100 text-gray-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {event.event_type || 'Unknown'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            event.team_side === 'home' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {event.team_side === 'home' ? (homeSquad?.name || 'Home') : (awaySquad?.name || 'Away')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {playerName}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                          {event.metadata ? JSON.stringify(event.metadata) : ''}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleEditEventClick(event)}
                              className="text-blue-600 hover:text-blue-900 focus:outline-none focus:underline"
                              title="Edit event"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleShowDetails(event)}
                              className="text-indigo-600 hover:text-indigo-900 focus:outline-none focus:underline"
                              title="View full details"
                            >
                              View Details
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-6 py-8 text-center text-gray-500">
              No match events found for this match.
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mt-4">Delete Events</h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500">
                  Are you sure you want to delete {selectedEventIds.length} selected event{selectedEventIds.length !== 1 ? 's' : ''}? This action cannot be undone and may affect match statistics calculations.
                </p>
              </div>
              <div className="items-center px-4 py-3">
                <button
                  onClick={handleDeleteEvents}
                  className="px-4 py-2 bg-red-600 text-white text-base font-medium rounded-md w-full mr-2 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  Delete
                </button>
                <button
                  onClick={() => {
                    setShowDeleteDialog(false)
                    setSelectedEventIds([])
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-800 text-base font-medium rounded-md w-full mt-2 hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Player Details Modal */}
      <PlayerDetailsModal
        isOpen={showPlayerDetailsModal}
        onClose={() => {
          setShowPlayerDetailsModal(false)
          setSelectedPlayerForDetails(null)
        }}
        playerId={selectedPlayerForDetails}
        orgId={orgId}
      />
    </div>
  )
}

export default MatchStats
