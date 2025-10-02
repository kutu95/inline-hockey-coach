import React, { useState, useEffect } from 'react'
import { useParams, Link, Navigate } from 'react-router-dom'
import { supabase } from '../src/lib/supabase'
import { useAuth } from '../src/contexts/AuthContext'
import { useDataLogger, usePageLogger } from '../src/hooks/useEventLogger'
import PlayerDetailsModal from './PlayerDetailsModal'

// Cache buster: v2 - Fixed Supabase query structure

const GameStats = () => {
  const { user, loading: authLoading, hasRole } = useAuth()
  const { logUpdate, logCreate, logDelete } = useDataLogger()
  
  // Log page access
  usePageLogger('Game Stats')
  const [session, setSession] = useState(null)
  const [gameSession, setGameSession] = useState(null)
  const [playerStats, setPlayerStats] = useState([])
  const [gameEvents, setGameEvents] = useState([])
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
    event_time: new Date().toISOString().slice(0, 19), // YYYY-MM-DDTHH:MM:SS format
    metadata: ''
  })
  const [editEvent, setEditEvent] = useState({
    event_type: '',
    player_id: '',
    event_time: '',
    metadata: ''
  })
  
  const { sessionId, orgId } = useParams()

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
    if (sessionId) {
      loadGameStats()
    }
  }, [sessionId])

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const getFirstPlayStartTime = () => {
    if (!gameEvents) return null
    const firstPlayStart = gameEvents
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

  const handleDeleteEvents = async () => {
    try {
      const { error } = await supabase
        .from('game_events')
        .delete()
        .in('id', selectedEventIds)

      if (error) throw error

      // Refresh game events from database to ensure proper sorting
      await refreshGameEvents()
      
      // Close dialog and clear selection
      setShowDeleteDialog(false)
      setSelectedEventIds([])
      
      console.log('Events deleted successfully:', selectedEventIds)
    } catch (error) {
      console.error('Error deleting events:', error)
      alert('Failed to delete events: ' + error.message)
    }
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

  const handleAddEvent = async () => {
    try {
      // Validate that we have a game session
      if (!gameSession || !gameSession.game_start_time) {
        alert('Cannot add event: No game session found. Please start a game first.')
        return
      }

      // Handle timezone conversion - datetime-local gives us local time
      // We need to treat this as local time and store it consistently
      const localDateTime = new Date(newEvent.event_time)
      
      // Create ISO string with explicit timezone offset to prevent UTC conversion
      const year = localDateTime.getFullYear()
      const month = String(localDateTime.getMonth() + 1).padStart(2, '0')
      const day = String(localDateTime.getDate()).padStart(2, '0')
      const hours = String(localDateTime.getHours()).padStart(2, '0')
      const minutes = String(localDateTime.getMinutes()).padStart(2, '0')
      const seconds = String(localDateTime.getSeconds()).padStart(2, '0')
      
      // Get timezone offset in format +/-HH:MM
      const timezoneOffset = localDateTime.getTimezoneOffset()
      const offsetHours = Math.floor(Math.abs(timezoneOffset) / 60)
      const offsetMinutes = Math.abs(timezoneOffset) % 60
      const offsetSign = timezoneOffset <= 0 ? '+' : '-'
      const timezoneString = `${offsetSign}${String(offsetHours).padStart(2, '0')}:${String(offsetMinutes).padStart(2, '0')}`
      
      const eventTimeISO = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.000${timezoneString}`

      // Calculate game_time_seconds based on game start time
      // Both times should be in the same timezone for proper calculation
      const gameStart = new Date(gameSession.game_start_time)
      const gameTimeSeconds = Math.max(0, Math.floor((localDateTime - gameStart) / 1000))

      // Calculate play_time_seconds (simplified - could be enhanced later)
      const playTimeSeconds = 0 // For now, default to 0 as this requires complex calculation

      const eventData = {
        session_id: sessionId,
        event_type: newEvent.event_type,
        player_id: newEvent.player_id || null,
        event_time: eventTimeISO,
        game_time_seconds: gameTimeSeconds,
        play_time_seconds: playTimeSeconds,
        metadata: newEvent.metadata ? JSON.parse(newEvent.metadata) : null
      }

      const { data, error } = await supabase
        .from('game_events')
        .insert([eventData])
        .select()

      if (error) throw error

      // Refresh game events from database to ensure proper sorting
      await refreshGameEvents()
      
      // Close dialog and reset form
      setShowAddEventDialog(false)
      setNewEvent({
        event_type: 'player_on',
        player_id: '',
        event_time: new Date().toISOString().slice(0, 19),
        metadata: ''
      })
      
      console.log('Event added successfully:', data)
    } catch (error) {
      console.error('Error adding event:', error)
      alert('Failed to add event: ' + error.message)
    }
  }

  const handleAddEventClick = () => {
    setShowAddEventDialog(true)
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

  const handlePlayerNameClick = (playerId) => {
    setSelectedPlayerForDetails(playerId)
    setShowPlayerDetailsModal(true)
  }

  const handleClosePlayerDetailsModal = () => {
    setShowPlayerDetailsModal(false)
    setSelectedPlayerForDetails(null)
  }

  const handleEditEvent = async () => {
    try {
      if (!selectedEventForEdit) return

      // Validate that we have a game session
      if (!gameSession || !gameSession.game_start_time) {
        alert('Cannot edit event: No game session found.')
        return
      }

      // Handle timezone conversion - datetime-local gives us local time
      // We need to treat this as local time and store it consistently
      const localDateTime = new Date(editEvent.event_time)
      
      // Create ISO string with explicit timezone offset to prevent UTC conversion
      const year = localDateTime.getFullYear()
      const month = String(localDateTime.getMonth() + 1).padStart(2, '0')
      const day = String(localDateTime.getDate()).padStart(2, '0')
      const hours = String(localDateTime.getHours()).padStart(2, '0')
      const minutes = String(localDateTime.getMinutes()).padStart(2, '0')
      const seconds = String(localDateTime.getSeconds()).padStart(2, '0')
      
      // Get timezone offset in format +/-HH:MM
      const timezoneOffset = localDateTime.getTimezoneOffset()
      const offsetHours = Math.floor(Math.abs(timezoneOffset) / 60)
      const offsetMinutes = Math.abs(timezoneOffset) % 60
      const offsetSign = timezoneOffset <= 0 ? '+' : '-'
      const timezoneString = `${offsetSign}${String(offsetHours).padStart(2, '0')}:${String(offsetMinutes).padStart(2, '0')}`
      
      const eventTimeISO = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.000${timezoneString}`
      

      // Calculate game_time_seconds based on game start time
      const gameStart = new Date(gameSession.game_start_time)
      const gameTimeSeconds = Math.max(0, Math.floor((localDateTime - gameStart) / 1000))

      // Calculate play_time_seconds (simplified - could be enhanced later)
      const playTimeSeconds = 0 // For now, default to 0 as this requires complex calculation

      const eventData = {
        event_type: editEvent.event_type,
        player_id: editEvent.player_id || null,
        event_time: eventTimeISO,
        game_time_seconds: gameTimeSeconds,
        play_time_seconds: playTimeSeconds,
        metadata: editEvent.metadata ? JSON.parse(editEvent.metadata) : null
      }

      
      const { data, error } = await supabase
        .from('game_events')
        .update(eventData)
        .eq('id', selectedEventForEdit.id)
        .select()

      if (error) {
        console.error('Error updating event:', error)
        throw error
      }

      // Log the event update
      logUpdate('game_events', selectedEventForEdit.id, {
        session_id: sessionId,
        event_type: editEvent.event_type,
        player_id: editEvent.player_id,
        old_event_time: selectedEventForEdit.event_time,
        new_event_time: eventTimeISO
      })

      // Refresh game events from database to ensure proper sorting
      await refreshGameEvents()
      
      // Close dialog and reset form
      setShowEditEventDialog(false)
      setSelectedEventForEdit(null)
      setEditEvent({
        event_type: '',
        player_id: '',
        event_time: '',
        metadata: ''
      })
    } catch (error) {
      console.error('Error updating event:', error)
      alert('Failed to update event: ' + error.message)
    }
  }

  const handleShowDetails = (event) => {
    setSelectedEventForDetails(event)
    setShowDetailsDialog(true)
  }

  const handleCloseDetailsDialog = () => {
    setShowDetailsDialog(false)
    setSelectedEventForDetails(null)
  }

  const handleShowPlayerStats = (player) => {
    setSelectedPlayerForStats(player)
    setShowPlayerStatsDialog(true)
  }

  const handleClosePlayerStatsDialog = () => {
    setShowPlayerStatsDialog(false)
    setSelectedPlayerForStats(null)
  }

  const refreshGameEvents = async () => {
    try {
      const { data: gameEvents, error: eventsError } = await supabase
        .from('game_events')
        .select('*')
        .eq('session_id', sessionId)
        .order('event_time', { ascending: true })

      if (eventsError) throw eventsError
      setGameEvents(gameEvents || [])
      
      // Update selectedEventForDetails if it's currently open
      if (selectedEventForDetails && gameEvents) {
        const updatedEvent = gameEvents.find(event => event.id === selectedEventForDetails.id)
        if (updatedEvent) {
          setSelectedEventForDetails(updatedEvent)
        }
      }
      
      // Note: recalculateGoalEventMetadata is called separately when needed
    } catch (error) {
      console.error('Error refreshing game events:', error)
    }
  }

  const recalculateGoalEventMetadata = async (events) => {
    try {
      console.log('Recalculating goal event metadata...')
      console.log(`Total events passed to recalculateGoalEventMetadata: ${events.length}`)
      
      // Get all goal events that need metadata recalculation
      const goalEvents = events.filter(event => 
        event.event_type === 'goal_for' || event.event_type === 'goal_against'
      )
      
      console.log(`Found ${goalEvents.length} goal events to recalculate`)
      console.log(`Goal event IDs:`, goalEvents.map(e => `${e.id}: ${e.event_type} at ${e.event_time}`))
      
      if (goalEvents.length === 0) {
        console.log('No goal events found, skipping metadata recalculation')
        return
      }
      
      // Get all player_on and player_off events in chronological order
      const playerEvents = events
        .filter(event => event.event_type === 'player_on' || event.event_type === 'player_off')
        .sort((a, b) => new Date(a.event_time) - new Date(b.event_time))
      
      // Process each goal event
      for (let i = 0; i < goalEvents.length; i++) {
        try {
          const goalEvent = goalEvents[i]
          const goalTime = new Date(goalEvent.event_time)
          
          console.log(`\n=== Processing goal event ${i + 1}/${goalEvents.length}: ${goalEvent.event_type} at ${goalTime.toISOString()} ===`)
          console.log(`Goal event ID: ${goalEvent.id}`)
          
          // Find which players were on the rink at the time of the goal
          const playersOnRinkAtGoal = calculatePlayersOnRinkAtTime(goalTime, playerEvents)
        
        // Debug: Show which players will be saved to metadata
        console.log(`\n=== Goal Event ${goalEvent.id} Metadata Update ===`)
        console.log(`Goal time: ${goalTime.toISOString()}`)
        console.log(`Players on rink at goal time: ${playersOnRinkAtGoal.length}`)
        playersOnRinkAtGoal.forEach(playerId => {
          const player = allPlayers.find(p => p.id === playerId)
          const playerName = player ? `${player.first_name} ${player.last_name}` : `Unknown Player (${playerId})`
          console.log(`  - ${playerName} (${playerId})`)
        })
        
        // Create new metadata for the goal event
        const newMetadata = {
          rink_players: playersOnRinkAtGoal,
          calculated_at: new Date().toISOString(),
          goal_time: goalTime.toISOString()
        }
        
        // Update the goal event with new metadata
        console.log(`Updating goal event ${goalEvent.id} with metadata:`, JSON.stringify(newMetadata, null, 2))
        
        const { error: updateError } = await supabase
          .from('game_events')
          .update({ metadata: newMetadata })
          .eq('id', goalEvent.id)
        
          if (updateError) {
            console.error(`Error updating goal event ${goalEvent.id}:`, updateError)
          } else {
            console.log(`✅ Successfully updated goal event ${goalEvent.id} with ${playersOnRinkAtGoal.length} rink players`)
          }
        } catch (error) {
          console.error(`❌ Error processing goal event ${goalEvent.id}:`, error)
          console.error(`Error details:`, error.message)
        }
      }
      
      // Small delay to ensure database changes are committed
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Refresh the events to show updated metadata
      console.log('Refreshing events from database after recalculation...')
      const { data: updatedEvents, error: refreshError } = await supabase
        .from('game_events')
        .select('*')
        .eq('session_id', sessionId)
        .order('event_time', { ascending: true })
      
      if (!refreshError && updatedEvents) {
        setGameEvents(updatedEvents)
        
        // Update selectedEventForDetails if it's currently open and was updated
        if (selectedEventForDetails) {
          console.log(`Current selectedEventForDetails ID: ${selectedEventForDetails.id}`)
          console.log(`Available updated events:`, updatedEvents.map(e => e.id))
          const updatedEvent = updatedEvents.find(event => event.id === selectedEventForDetails.id)
          console.log(`DEBUG: Looking for updated event with ID: ${selectedEventForDetails.id}`)
          if (updatedEvent) {
            console.log(`Found updated event, metadata:`, JSON.stringify(updatedEvent.metadata, null, 2))
            setSelectedEventForDetails(updatedEvent)
            console.log(`✅ Updated selectedEventForDetails with fresh metadata for event ${updatedEvent.id}`)
          } else {
            console.log(`❌ No updated event found for selectedEventForDetails ID: ${selectedEventForDetails.id}`)
          }
        } else {
          console.log(`No selectedEventForDetails currently open`)
        }
        
        // Also refresh allPlayers to include players from updated metadata
        const eventPlayerIds = [...new Set(updatedEvents?.map(event => event.player_id).filter(Boolean) || [])]
        const metadataPlayerIds = [...new Set(
          updatedEvents
            ?.filter(event => event.metadata && event.metadata.rink_players)
            ?.flatMap(event => event.metadata.rink_players)
            || []
        )]
        const allPlayerIds = [...new Set([...eventPlayerIds, ...metadataPlayerIds])]
        
        if (allPlayerIds.length > 0) {
          console.log(`DEBUG: Loading players for allPlayerIds:`, allPlayerIds)
          const { data: playersData, error: playersError } = await supabase
            .from('players')
            .select('id, first_name, last_name')
            .in('id', allPlayerIds)
          
          if (!playersError && playersData) {
            console.log(`DEBUG: Loaded players data:`, playersData.map(p => `${p.id}: ${p.first_name} ${p.last_name}`))
            setAllPlayers(playersData)
            console.log(`Refreshed allPlayers with ${playersData.length} players after goal recalculation`)
          } else if (playersError) {
            console.error(`DEBUG: Error loading players:`, playersError)
          }
        }
      }
      
    } catch (error) {
      console.error('Error recalculating goal event metadata:', error)
    }
  }

  const calculatePlayersOnRinkAtTime = (targetTime, playerEvents) => {
    const playerStates = new Map() // player_id -> { isOnRink: boolean, lastEventTime: Date }
    
    console.log(`Calculating players on rink at ${targetTime.toISOString()}`)
    console.log(`Processing ${playerEvents.length} player events`)
    
    // Process all player events up to the target time
    for (const event of playerEvents) {
      const eventTime = new Date(event.event_time)
      
      // Only consider events that happened before or at the target time
      if (eventTime <= targetTime) {
        if (!playerStates.has(event.player_id)) {
          playerStates.set(event.player_id, { isOnRink: false, lastEventTime: eventTime })
        }
        
        const playerState = playerStates.get(event.player_id)
        playerState.isOnRink = event.event_type === 'player_on'
        playerState.lastEventTime = eventTime
        
        // Find player name for better debugging
        const player = allPlayers.find(p => p.id === event.player_id)
        const playerName = player ? `${player.first_name} ${player.last_name}` : `Unknown Player (${event.player_id})`
        console.log(`Event: ${event.event_type} for player ${playerName} (${event.player_id}) at ${eventTime.toISOString()} - isOnRink: ${playerState.isOnRink}`)
      }
    }
    
    // Return array of player IDs who were on the rink at the target time
    const playersOnRink = []
    for (const [playerId, state] of playerStates.entries()) {
      if (state.isOnRink) {
        playersOnRink.push(playerId)
        // Find player name for better debugging
        const player = allPlayers.find(p => p.id === playerId)
        const playerName = player ? `${player.first_name} ${player.last_name}` : `Unknown Player (${playerId})`
        console.log(`Player ${playerName} (${playerId}) was on rink at goal time`)
      }
    }
    
    console.log(`Total players on rink at goal time: ${playersOnRink.length}`)
    console.log(`Players on rink:`, playersOnRink)
    
    return playersOnRink
  }

  const loadGameStats = async () => {
    try {
      setLoading(true)
      setError(null)

      // Load session data
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', sessionId)
        .single()

      if (sessionError) throw sessionError
      setSession(sessionData)

      // Load squad players using a simpler approach
      console.log('Loading squad players for session:', sessionId)
      
      // First get the squad_id
      const { data: sessionSquadData, error: sessionSquadError } = await supabase
        .from('session_squads')
        .select('squad_id')
        .eq('session_id', sessionId)
        .single()

      console.log('Session squad data:', sessionSquadData, 'Error:', sessionSquadError)
      
      if (sessionSquadError) {
        console.error('Error loading session squad:', sessionSquadError)
        throw sessionSquadError
      }

      // Then get player IDs from that squad
      const { data: playerSquadData, error: playerSquadError } = await supabase
        .from('player_squads')
        .select('player_id')
        .eq('squad_id', sessionSquadData.squad_id)

      console.log('Player squad data:', playerSquadData, 'Error:', playerSquadError)
      
      if (playerSquadError) {
        console.error('Error loading player squad:', playerSquadError)
        throw playerSquadError
      }

      // Finally get player details
      const squadPlayerIds = playerSquadData.map(ps => ps.player_id)
      console.log('Player IDs:', squadPlayerIds)
      
      let players = []
      if (squadPlayerIds.length === 0) {
        console.log('No players found in squad')
      } else {
        const { data: playersData, error: playersError } = await supabase
          .from('players')
          .select('id, first_name, last_name, jersey_number')
          .in('id', squadPlayerIds)

        console.log('Players data:', playersData, 'Error:', playersError)
        
        if (playersError) {
          console.error('Error loading players:', playersError)
          throw playersError
        }

        players = playersData || []
        console.log('Final players array:', players)
      }

      // Load game session
      const { data: gameSession, error: gameSessionError } = await supabase
        .from('game_sessions')
        .select('*')
        .eq('session_id', sessionId)
        .single()

      if (gameSessionError && gameSessionError.code !== 'PGRST116') {
        console.warn('No game session found:', gameSessionError)
      }
      setGameSession(gameSession)

      // Load all game events
      const { data: gameEvents, error: eventsError } = await supabase
        .from('game_events')
        .select('*')
        .eq('session_id', sessionId)
        .order('event_time', { ascending: true })

      if (eventsError) throw eventsError
      setGameEvents(gameEvents || [])

      // Load all players that appear in game events for debug table
      const eventPlayerIds = [...new Set(gameEvents?.map(event => event.player_id).filter(Boolean) || [])]
      
      // Also include players from goal event metadata
      const metadataPlayerIds = [...new Set(
        gameEvents
          ?.filter(event => event.metadata && event.metadata.rink_players)
          ?.flatMap(event => event.metadata.rink_players)
          || []
      )]
      
      // Combine both sets of player IDs
      const allPlayerIds = [...new Set([...eventPlayerIds, ...metadataPlayerIds])]
      
      if (allPlayerIds.length > 0) {
        const { data: playersData, error: playersError } = await supabase
          .from('players')
          .select('id, first_name, last_name')
          .in('id', allPlayerIds)
        
        if (playersError) {
          console.error('Error loading players for debug table:', playersError)
        } else {
          setAllPlayers(playersData || [])
          console.log(`Loaded ${playersData?.length || 0} players for display (including metadata players)`)
        }
      }

      // Calculate player stats using event-driven approach
      const stats = players.map((player) => {
        
        // Get all events for this player, ordered by time
        const playerEvents = gameEvents
          .filter(event => event.player_id === player.id)
          .sort((a, b) => new Date(a.event_time) - new Date(b.event_time))
        
        
        // Get all play start/stop events for the entire game
        const playEvents = gameEvents
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
        
        console.log(`All events for ${player.first_name} (${allEvents.length}):`, allEvents.map(e => ({
          type: e.event_type,
          time: e.event_time,
          isPlayEvent: e.event_type === 'play_start' || e.event_type === 'play_stop'
        })))
        
        let isPlayActive = false
        
        // Determine initial player state - check if player was on rink before any events
        if (playerEvents.length > 0) {
          const firstPlayerEvent = playerEvents[0]
          const firstPlayEvent = playEvents[0]
          
          // If first player event is player_on and it's before first play_start, player was on rink at game start
          if (firstPlayerEvent.event_type === 'player_on' && 
              firstPlayEvent && 
              new Date(firstPlayerEvent.event_time) < new Date(firstPlayEvent.event_time)) {
            isOnRink = true
            console.log(`Player ${player.first_name} was on rink at game start (before first play_start)`)
          }
        }
        
        for (const event of allEvents) {
          const eventTime = new Date(event.event_time)
          
          if (event.event_type === 'play_start') {
            isPlayActive = true
            console.log(`Play started at ${eventTime.toISOString()}`)
            
            // If player was already on rink when play started, begin tracking their shift
            if (isOnRink && !currentShiftStart) {
              currentShiftStart = eventTime
              console.log(`Player was already on rink when play started - beginning shift tracking at ${eventTime.toISOString()}`)
            }
          } else if (event.event_type === 'play_stop') {
            isPlayActive = false
            console.log(`Play stopped at ${eventTime.toISOString()}`)
            
            // If player was on rink when play stopped, end their shift
            if (isOnRink && currentShiftStart) {
              const shiftDuration = Math.floor((eventTime - currentShiftStart) / 1000)
              console.log(`Ending shift due to play stop: ${shiftDuration}s (${currentShiftStart.toISOString()} to ${eventTime.toISOString()})`)
              totalRinkTime += shiftDuration
              shiftCount++
              // Track shortest and longest shifts
              if (shiftCount === 1 || shiftDuration < shortestShift) shortestShift = shiftDuration
              if (shiftDuration > longestShift) {
                longestShift = shiftDuration
                longestShiftStartTime = currentShiftStart
              }
              currentShiftStart = null // Don't reset isOnRink, player might still be on rink
            }
          } else if (event.player_id === player.id) {
            // This is a player-specific event
            if (event.event_type === 'player_on') {
              if (!isOnRink) {
                isOnRink = true
                if (isPlayActive && !currentShiftStart) {
                  currentShiftStart = eventTime
                  console.log(`Player came on rink during active play at ${eventTime.toISOString()}`)
                } else if (!isPlayActive) {
                  console.log(`Player came on rink during stopped play at ${eventTime.toISOString()} - will start tracking when play begins`)
                } else if (currentShiftStart) {
                  console.log(`Player came on rink during active play at ${eventTime.toISOString()} but shift already started at ${currentShiftStart.toISOString()}`)
                }
              }
            } else if (event.event_type === 'player_off') {
              if (isOnRink && currentShiftStart && isPlayActive) {
                const shiftDuration = Math.floor((eventTime - currentShiftStart) / 1000)
                console.log(`Player went off rink during active play: ${shiftDuration}s (${currentShiftStart.toISOString()} to ${eventTime.toISOString()})`)
                totalRinkTime += shiftDuration
                shiftCount++
                // Track shortest and longest shifts
                if (shiftCount === 1 || shiftDuration < shortestShift) shortestShift = shiftDuration
                if (shiftDuration > longestShift) {
                  longestShift = shiftDuration
                  longestShiftStartTime = currentShiftStart
                }
              } else if (isOnRink && currentShiftStart && !isPlayActive) {
                console.log(`Player went off rink during stopped play at ${eventTime.toISOString()} - not counting time`)
              }
              isOnRink = false
              currentShiftStart = null
            }
          }
        }
        
        // Handle case where player is still on rink at game end
        if (isOnRink && currentShiftStart && isPlayActive) {
          // Find the game_end event to get the actual game end time
          const gameEndEvent = gameEvents.find(event => event.event_type === 'game_end')
          let gameEndTime
          
          if (gameEndEvent) {
            gameEndTime = new Date(gameEndEvent.event_time)
          } else {
            // Fallback: use the time of the last event in the game
            const lastEvent = gameEvents.length > 0 ? gameEvents[gameEvents.length - 1] : null
            gameEndTime = lastEvent ? new Date(lastEvent.event_time) : new Date()
          }
          
          const finalShiftDuration = Math.floor((gameEndTime - currentShiftStart) / 1000)
          console.log(`Player still on rink at game end: ${finalShiftDuration}s (${currentShiftStart.toISOString()} to ${gameEndTime.toISOString()})`)
          totalRinkTime += finalShiftDuration
          shiftCount++
          // Track shortest and longest shifts
          if (shiftCount === 1 || finalShiftDuration < shortestShift) shortestShift = finalShiftDuration
          if (finalShiftDuration > longestShift) {
            longestShift = finalShiftDuration
            longestShiftStartTime = currentShiftStart
          }
        }
        
        console.log(`Total rink time for ${player.first_name}: ${totalRinkTime}s`)
        console.log(`Shift count for ${player.first_name}: ${shiftCount}`)
        console.log(`Shortest shift for ${player.first_name}: ${shortestShift}s`)
        console.log(`Longest shift for ${player.first_name}: ${longestShift}s`)
        if (longestShiftStartTime) {
          console.log(`Longest shift start time for ${player.first_name}: ${longestShiftStartTime.toISOString()}`)
        }
        
        // Calculate average shift time
        const averageShiftTime = shiftCount > 0 ? Math.round(totalRinkTime / shiftCount) : 0
        console.log(`Average shift time for ${player.first_name}: ${averageShiftTime}s`)
        
        // Calculate plus/minus
        let plusMinus = 0
        
        // Get all goal events
        const goalEvents = gameEvents.filter(event => 
          event.event_type === 'goal_for' || event.event_type === 'goal_against'
        ).sort((a, b) => new Date(a.event_time) - new Date(b.event_time))
        
        // Debug: Check goal events for Kael
        if (player.id === '8cdeac25-6589-4a4d-9c22-3b2d28508e0e') { // Kael Telfer's ID
          console.log(`GameStats - Kael - Goal events found:`, goalEvents.length, 'events')
          if (goalEvents.length > 0) {
            console.log(`GameStats - Kael - Goal events details:`, goalEvents.map(e => ({
              type: e.event_type,
              time: e.event_time,
              player_id: e.player_id,
              metadata: e.metadata,
              id: e.id,
              session_id: e.session_id
            })))
          }
        }
        
        for (const goalEvent of goalEvents) {
          const goalTime = new Date(goalEvent.event_time)
          
          // Check if player was on rink at goal time
          let wasOnRinkAtGoal = false
          
          if (goalEvent.metadata && goalEvent.metadata.rink_players) {
            // Use metadata if available (more accurate)
            wasOnRinkAtGoal = goalEvent.metadata.rink_players.includes(player.id)
          } else {
            // Fallback: check player events to see if they were on rink at goal time
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
            if (goalEvent.event_type === 'goal_for') {
              plusMinus += 1
            } else if (goalEvent.event_type === 'goal_against') {
              plusMinus -= 1
            }
          }
        }
        
        console.log(`Plus/minus for ${player.first_name}: ${plusMinus}`)
        console.log(`=== End calculation for ${player.first_name} ===\n`)
        
        return {
          id: player.id,
          name: `${player.first_name} ${player.last_name}`,
          jerseyNumber: player.jersey_number,
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

      // Sort by total rink time (descending)
      stats.sort((a, b) => b.totalRinkTime - a.totalRinkTime)
      setPlayerStats(stats)

    } catch (error) {
      console.error('Error loading game stats:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading game stats...</p>
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
              <p className="font-bold">Error loading game stats:</p>
              <p>{error}</p>
            </div>
            <Link 
              to={`/organisations/${orgId}/sessions/${sessionId}`}
              className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
            >
              Back to Session
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
            to={`/organisations/${orgId}/sessions/${sessionId}`}
            className="text-indigo-600 hover:text-indigo-800 mb-2 inline-block"
          >
            ← Back to Session
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Game Statistics</h1>
          {session && (
            <p className="text-gray-600 mt-2">
              {session.title} - {session.date ? new Date(session.date).toLocaleDateString() : 'No date'}
            </p>
          )}
        </div>

        {/* Game Stats Table */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Player Statistics</h2>
          
          {playerStats.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Player
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
                  {playerStats.map((player) => (
                    <tr key={player.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        <button
                          onClick={() => handlePlayerNameClick(player.id)}
                          className="text-blue-600 hover:text-blue-900 hover:underline focus:outline-none focus:underline transition-colors duration-200"
                        >
                          {player.name}
                        </button>
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
                          onClick={() => handleShowPlayerStats(player)}
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
              No player statistics available for this game.
            </div>
          )}
        </div>

        {/* Game Statistics Summary */}
        <div className="bg-white rounded-lg shadow-md p-6 mt-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Game Statistics</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Goals For */}
            <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="text-3xl font-bold text-green-600 mb-2">
                {gameSession?.goals_for || 0}
              </div>
              <div className="text-sm font-medium text-green-800">Goals For</div>
            </div>
            
            {/* Goals Against */}
            <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
              <div className="text-3xl font-bold text-red-600 mb-2">
                {gameSession?.goals_against || 0}
              </div>
              <div className="text-sm font-medium text-red-800">Goals Against</div>
            </div>
            
            {/* Total Game Time */}
            <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-3xl font-bold text-blue-600 mb-2">
                {(() => {
                  if (!gameEvents || gameEvents.length === 0) return '0:00'
                  
                  // Get all play start/stop events in chronological order
                  const playEvents = gameEvents
                    .filter(event => event.event_type === 'play_start' || event.event_type === 'play_stop')
                    .sort((a, b) => new Date(a.event_time) - new Date(b.event_time))
                  
                  let totalPlayTime = 0
                  let playStartTime = null
                  
                  for (const event of playEvents) {
                    if (event.event_type === 'play_start') {
                      playStartTime = new Date(event.event_time)
                    } else if (event.event_type === 'play_stop' && playStartTime) {
                      const playEndTime = new Date(event.event_time)
                      const playDuration = Math.floor((playEndTime - playStartTime) / 1000)
                      totalPlayTime += playDuration
                      playStartTime = null
                    }
                  }
                  
                  // If game ended while play was active, add time until game end
                  if (playStartTime) {
                    const gameEndEvent = gameEvents.find(event => event.event_type === 'game_end')
                    if (gameEndEvent) {
                      const gameEndTime = new Date(gameEndEvent.event_time)
                      const finalPlayDuration = Math.floor((gameEndTime - playStartTime) / 1000)
                      totalPlayTime += finalPlayDuration
                    }
                  }
                  
                  const minutes = Math.floor(totalPlayTime / 60)
                  const seconds = totalPlayTime % 60
                  return `${minutes}:${seconds.toString().padStart(2, '0')}`
                })()}
              </div>
              <div className="text-sm font-medium text-blue-800">Total Play Time</div>
            </div>
          </div>
          
          {/* Additional Game Info */}
          {gameSession && (
            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                <div>
                  <span className="font-medium">Game Started:</span>{' '}
                  {new Date(gameSession.game_start_time).toLocaleString('en-AU', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
                {(() => {
                  const gameEndEvent = gameEvents.find(event => event.event_type === 'game_end')
                  return gameEndEvent && (
                    <div>
                      <span className="font-medium">Game Ended:</span>{' '}
                      {new Date(gameEndEvent.event_time).toLocaleString('en-AU', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  )
                })()}
                <div>
                  <span className="font-medium">Game Status:</span>{' '}
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    gameEvents.find(event => event.event_type === 'game_end') ? 'bg-gray-100 text-gray-800' : 'bg-green-100 text-green-800'
                  }`}>
                    {gameEvents.find(event => event.event_type === 'game_end') ? 'Completed' : 'In Progress'}
                  </span>
                </div>
                {gameSession.total_play_time_seconds && (
                  <div>
                    <span className="font-medium">Stored Play Time:</span>{' '}
                    {formatTime(gameSession.total_play_time_seconds)}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Game Events Table */}
        <div className="bg-white rounded-lg shadow-md p-6 mt-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-4">
            <h3 className="text-lg font-semibold text-gray-800">Game Events</h3>
            
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
                  <option value="goal_for">Goal For</option>
                  <option value="goal_against">Goal Against</option>
                  <option value="play_events">Play Events (Start & Stop)</option>
                  <option value="play_start">Play Start</option>
                  <option value="play_stop">Play Stop</option>
                  <option value="player_deleted">Player Deleted</option>
                </select>
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-2">
                <Link
                  to={orgId ? `/organisations/${orgId}/sessions/${sessionId}/timeline-editor` : `/sessions/${sessionId}/timeline-editor`}
                  className="px-3 py-1 text-sm rounded-md bg-purple-600 text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  Timeline Editor
                </Link>
                <button
                  onClick={handleAddEventClick}
                  className="px-3 py-1 text-sm rounded-md bg-green-600 text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  Add Event
                </button>
                <button
                  onClick={() => recalculateGoalEventMetadata(gameEvents)}
                  className="px-3 py-1 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  title="Recalculate goal event metadata based on current player events"
                >
                  Recalculate Goals
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
          
          {gameEvents && gameEvents.length > 0 ? (
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
                  {gameEvents
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
                            event.event_type === 'goal_for' ? 'bg-green-100 text-green-800' :
                            event.event_type === 'goal_against' ? 'bg-red-100 text-red-800' :
                            event.event_type === 'player_on' ? 'bg-blue-100 text-blue-800' :
                            event.event_type === 'player_off' ? 'bg-yellow-100 text-yellow-800' :
                            event.event_type === 'player_deleted' ? 'bg-gray-100 text-gray-800' :
                            event.event_type === 'player_positions' ? 'bg-purple-100 text-purple-800' :
                            event.event_type === 'play_start' ? 'bg-green-100 text-green-800' :
                            event.event_type === 'play_stop' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {event.event_type || 'Unknown'}
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
              No game events found for this session.
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
                        Are you sure you want to delete {selectedEventIds.length} selected event{selectedEventIds.length !== 1 ? 's' : ''}? This action cannot be undone and may affect game statistics calculations.
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

      {/* Add Event Dialog */}
      {showAddEventDialog && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Game Event</h3>
              
              <div className="space-y-4">
                {/* Event Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Event Type
                  </label>
                  <select
                    value={newEvent.event_type}
                    onChange={(e) => setNewEvent({...newEvent, event_type: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="player_on">Player On</option>
                    <option value="player_off">Player Off</option>
                    <option value="goal_for">Goal For</option>
                    <option value="goal_against">Goal Against</option>
                    <option value="play_start">Play Start</option>
                    <option value="play_stop">Play Stop</option>
                    <option value="player_deleted">Player Deleted</option>
                  </select>
                </div>

                {/* Player Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Player {['goal_for', 'goal_against', 'play_start', 'play_stop'].includes(newEvent.event_type) && '(Optional)'}
                  </label>
                  <select
                    value={newEvent.player_id}
                    onChange={(e) => setNewEvent({...newEvent, player_id: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">No Player</option>
                    {allPlayers.map((player) => (
                      <option key={player.id} value={player.id}>
                        {player.first_name} {player.last_name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Event Time */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Event Time
                  </label>
                  <input
                    type="datetime-local"
                    step="1"
                    value={newEvent.event_time}
                    onChange={(e) => setNewEvent({...newEvent, event_time: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  {gameSession && gameSession.game_start_time && newEvent.event_time && (
                    <p className="text-xs text-gray-500 mt-1">
                      Game time: {(() => {
                        const gameStart = new Date(gameSession.game_start_time)
                        const eventTime = new Date(newEvent.event_time) // This is already in local time from datetime-local
                        const gameTimeSeconds = Math.floor((eventTime - gameStart) / 1000)
                        const minutes = Math.floor(gameTimeSeconds / 60)
                        const seconds = gameTimeSeconds % 60
                        return `${minutes}:${seconds.toString().padStart(2, '0')}`
                      })()}
                    </p>
                  )}
                </div>

                {/* Metadata */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Metadata (JSON, Optional)
                  </label>
                  <textarea
                    value={newEvent.metadata}
                    onChange={(e) => setNewEvent({...newEvent, metadata: e.target.value})}
                    placeholder='{"rink_players": [1, 2, 3]}'
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 h-20"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 mt-6">
                <button
                  onClick={handleAddEvent}
                  className="flex-1 px-4 py-2 bg-green-600 text-white text-base font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  Add Event
                </button>
                <button
                  onClick={() => {
                    setShowAddEventDialog(false)
                    setNewEvent({
                      event_type: 'player_on',
                      player_id: '',
                      event_time: new Date().toISOString().slice(0, 19),
                      metadata: ''
                    })
                  }}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-800 text-base font-medium rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Event Dialog */}
      {showEditEventDialog && selectedEventForEdit && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Edit Game Event</h3>
              
              <div className="space-y-4">
                {/* Event Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Event Type
                  </label>
                  <select
                    value={editEvent.event_type}
                    onChange={(e) => setEditEvent({...editEvent, event_type: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="player_on">Player On</option>
                    <option value="player_off">Player Off</option>
                    <option value="goal_for">Goal For</option>
                    <option value="goal_against">Goal Against</option>
                    <option value="play_start">Play Start</option>
                    <option value="play_stop">Play Stop</option>
                    <option value="player_deleted">Player Deleted</option>
                  </select>
                </div>

                {/* Player Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Player {['goal_for', 'goal_against', 'play_start', 'play_stop'].includes(editEvent.event_type) && '(Optional)'}
                  </label>
                  <select
                    value={editEvent.player_id}
                    onChange={(e) => setEditEvent({...editEvent, player_id: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">No Player</option>
                    {allPlayers.map((player) => (
                      <option key={player.id} value={player.id}>
                        {player.first_name} {player.last_name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Event Time */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Event Time
                  </label>
                  <input
                    type="datetime-local"
                    step="1"
                    value={editEvent.event_time}
                    onChange={(e) => setEditEvent({...editEvent, event_time: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  {gameSession && gameSession.game_start_time && editEvent.event_time && (
                    <p className="text-xs text-gray-500 mt-1">
                      Game time: {(() => {
                        const gameStart = new Date(gameSession.game_start_time)
                        const eventTime = new Date(editEvent.event_time) // This is local time from datetime-local input
                        const gameTimeSeconds = Math.floor((eventTime - gameStart) / 1000)
                        const minutes = Math.floor(gameTimeSeconds / 60)
                        const seconds = gameTimeSeconds % 60
                        return `${minutes}:${seconds.toString().padStart(2, '0')}`
                      })()}
                    </p>
                  )}
                </div>

                {/* Metadata */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Metadata (JSON, Optional)
                  </label>
                  <textarea
                    value={editEvent.metadata}
                    onChange={(e) => setEditEvent({...editEvent, metadata: e.target.value})}
                    placeholder='{"rink_players": [1, 2, 3]}'
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 h-20"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 mt-6">
                <button
                  onClick={handleEditEvent}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white text-base font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Update Event
                </button>
                <button
                  onClick={() => {
                    setShowEditEventDialog(false)
                    setSelectedEventForEdit(null)
                    setEditEvent({
                      event_type: '',
                      player_id: '',
                      event_time: '',
                      metadata: ''
                    })
                  }}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-800 text-base font-medium rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Event Details Dialog */}
      {showDetailsDialog && selectedEventForDetails && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              
              {/* Action Buttons in Modal */}
              {(selectedEventForDetails.event_type === 'goal_for' || selectedEventForDetails.event_type === 'goal_against') && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-blue-800">
                      Goal Event Actions
                    </span>
                    <button
                      onClick={() => recalculateGoalEventMetadata(gameEvents)}
                      className="px-3 py-1 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      title="Recalculate goal event metadata based on current player events"
                    >
                      Recalculate Goals
                    </button>
                  </div>
                </div>
              )}
              <h3 className="text-lg font-medium text-gray-900 mb-4">Event Details</h3>
              
              <div className="space-y-4">
                {/* Event Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Event Type
                  </label>
                  <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-md">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      selectedEventForDetails.event_type === 'goal_for' ? 'bg-green-100 text-green-800' :
                      selectedEventForDetails.event_type === 'goal_against' ? 'bg-red-100 text-red-800' :
                      selectedEventForDetails.event_type === 'player_on' ? 'bg-blue-100 text-blue-800' :
                      selectedEventForDetails.event_type === 'player_off' ? 'bg-yellow-100 text-yellow-800' :
                      selectedEventForDetails.event_type === 'player_deleted' ? 'bg-gray-100 text-gray-800' :
                      selectedEventForDetails.event_type === 'play_start' ? 'bg-green-100 text-green-800' :
                      selectedEventForDetails.event_type === 'play_stop' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {selectedEventForDetails.event_type || 'Unknown'}
                    </span>
                  </div>
                </div>

                {/* Event Time */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Event Time
                  </label>
                  <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-md font-mono text-sm">
                    {new Date(selectedEventForDetails.event_time).toLocaleString()}
                  </div>
                </div>

                {/* Player */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Player
                  </label>
                  <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-md">
                    {selectedEventForDetails.player_id ? (() => {
                      const player = allPlayers.find(p => p.id === selectedEventForDetails.player_id)
                      return player ? `${player.first_name} ${player.last_name}` : `Player ID: ${selectedEventForDetails.player_id}`
                    })() : 'N/A (No player associated)'}
                  </div>
                </div>

                {/* Game Time */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Game Time (seconds)
                  </label>
                  <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-md font-mono text-sm">
                    {selectedEventForDetails.game_time_seconds || 0}s
                  </div>
                </div>

                {/* Play Time */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Play Time (seconds)
                  </label>
                  <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-md font-mono text-sm">
                    {selectedEventForDetails.play_time_seconds || 0}s
                  </div>
                </div>

                {/* Metadata/Details */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Details (Metadata)
                  </label>
                  <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-md">
                    {selectedEventForDetails.metadata ? (
                      <pre className="whitespace-pre-wrap text-sm font-mono text-gray-800 max-h-64 overflow-y-auto">
                        {JSON.stringify(selectedEventForDetails.metadata, null, 2)}
                      </pre>
                    ) : (
                      <span className="text-gray-500 italic">No metadata available</span>
                    )}
                  </div>
                </div>

                {/* Human-Readable Translation */}
                {selectedEventForDetails.metadata && (selectedEventForDetails.event_type === 'goal_for' || selectedEventForDetails.event_type === 'goal_against') && selectedEventForDetails.metadata.rink_players && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Players on Rink at Goal Time
                    </label>
                    <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-md">
                      {selectedEventForDetails.metadata.rink_players.length > 0 ? (
                        <div className="space-y-1">
                          <p className="text-sm text-gray-600 mb-2">
                            {selectedEventForDetails.metadata.rink_players.length} player{selectedEventForDetails.metadata.rink_players.length !== 1 ? 's' : ''} on rink:
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {(() => {
                              console.log(`DEBUG: allPlayers state:`, allPlayers.map(p => `${p.id}: ${p.first_name} ${p.last_name}`))
                              console.log(`DEBUG: rink_players from metadata:`, selectedEventForDetails.metadata.rink_players)
                              return selectedEventForDetails.metadata.rink_players.map(playerId => {
                                const player = allPlayers.find(p => p.id === playerId)
                                console.log(`Rendering player ${playerId}:`, player ? `${player.first_name} ${player.last_name}` : 'NOT FOUND in allPlayers')
                                return (
                                  <span 
                                    key={playerId}
                                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                                  >
                                    {player ? `${player.first_name} ${player.last_name}` : `Player ID: ${playerId}`}
                                  </span>
                                )
                              })
                            })()}
                          </div>
                          {selectedEventForDetails.metadata.calculated_at && (
                            <p className="text-xs text-gray-500 mt-2">
                              Calculated: {new Date(selectedEventForDetails.metadata.calculated_at).toLocaleString()}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-500 italic">No players on rink at goal time</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Event ID */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Event ID
                  </label>
                  <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-md font-mono text-xs text-gray-600">
                    {selectedEventForDetails.id}
                  </div>
                </div>
              </div>

              {/* Close Button */}
              <div className="flex justify-end mt-6">
                <button
                  onClick={handleCloseDetailsDialog}
                  className="px-4 py-2 bg-gray-300 text-gray-800 text-base font-medium rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Player Stats Modal */}
      {showPlayerStatsDialog && selectedPlayerForStats && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-gray-900">
                  Player Statistics - {selectedPlayerForStats.name}
                </h3>
                <button
                  onClick={handleClosePlayerStatsDialog}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Player Stats Content */}
              <div className="space-y-6">
                {/* Basic Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-blue-800 mb-2">Total Rink Time</h4>
                    <p className="text-2xl font-bold text-blue-900">{selectedPlayerForStats.formattedTime}</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-green-800 mb-2">Number of Shifts</h4>
                    <p className="text-2xl font-bold text-green-900">{selectedPlayerForStats.shiftCount}</p>
                  </div>
                </div>

                {/* Shift Statistics */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-yellow-800 mb-2">Average Shift</h4>
                    <p className="text-xl font-bold text-yellow-900">{selectedPlayerForStats.formattedAverageShiftTime}</p>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-orange-800 mb-2">Shortest Shift</h4>
                    <p className="text-xl font-bold text-orange-900">{selectedPlayerForStats.formattedShortestShift}</p>
                  </div>
                  <div className="bg-red-50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-red-800 mb-2">Longest Shift</h4>
                    <p className="text-xl font-bold text-red-900">{selectedPlayerForStats.formattedLongestShift}</p>
                    <p className="text-xs text-red-700 mt-1">Started: {selectedPlayerForStats.formattedLongestShiftStartTime}</p>
                  </div>
                </div>

                {/* Goal Statistics */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-emerald-50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-emerald-800 mb-2">Goals For (On Rink)</h4>
                    <p className="text-2xl font-bold text-emerald-900">
                      {(() => {
                        // Count goals for events where this player was on rink
                        const goalsFor = gameEvents?.filter(event => {
                          if (event.event_type === 'goal_for' && event.metadata?.rink_players) {
                            return event.metadata.rink_players.includes(selectedPlayerForStats.id)
                          }
                          return false
                        }).length || 0
                        return goalsFor
                      })()}
                    </p>
                  </div>
                  <div className="bg-rose-50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-rose-800 mb-2">Goals Against (On Rink)</h4>
                    <p className="text-2xl font-bold text-rose-900">
                      {(() => {
                        // Count goals against events where this player was on rink
                        const goalsAgainst = gameEvents?.filter(event => {
                          if (event.event_type === 'goal_against' && event.metadata?.rink_players) {
                            return event.metadata.rink_players.includes(selectedPlayerForStats.id)
                          }
                          return false
                        }).length || 0
                        return goalsAgainst
                      })()}
                    </p>
                  </div>
                </div>

                {/* Plus/Minus */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-800 mb-2">Plus/Minus</h4>
                  <p className={`text-2xl font-bold ${
                    selectedPlayerForStats.plusMinus > 0 ? 'text-green-600' :
                    selectedPlayerForStats.plusMinus < 0 ? 'text-red-600' :
                    'text-gray-600'
                  }`}>
                    {selectedPlayerForStats.plusMinus > 0 ? '+' : ''}{selectedPlayerForStats.plusMinus}
                  </p>
                </div>

                {/* Additional Details */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-800 mb-3">Additional Details</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Jersey Number:</span>
                      <span className="ml-2 font-medium">{selectedPlayerForStats.jerseyNumber || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Total Rink Time:</span>
                      <span className="ml-2 font-medium">{selectedPlayerForStats.formattedTime}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Close Button */}
              <div className="flex justify-end mt-6">
                <button
                  onClick={handleClosePlayerStatsDialog}
                  className="px-4 py-2 bg-gray-300 text-gray-800 text-base font-medium rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Player Details Modal */}
      <PlayerDetailsModal
        isOpen={showPlayerDetailsModal}
        onClose={handleClosePlayerDetailsModal}
        playerId={selectedPlayerForDetails}
        orgId={orgId}
      />
    </div>
  )
}

export default GameStats
