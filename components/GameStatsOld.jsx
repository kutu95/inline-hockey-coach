import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../src/lib/supabase'

const GameStats = () => {
  const [session, setSession] = useState(null)
  const [gameSession, setGameSession] = useState(null)
  const [playerStats, setPlayerStats] = useState([])
  const [gameEvents, setGameEvents] = useState([])
  const [allPlayers, setAllPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  const { sessionId, orgId } = useParams()

  useEffect(() => {
    if (sessionId) {
      loadGameStats()
    }
  }, [sessionId])

  const loadGameStats = async () => {
    try {
      setLoading(true)
      setError(null)

      // Load session details
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', sessionId)
        .single()

      if (sessionError) throw sessionError
      setSession(sessionData)

      // Load game session data
      const { data: gameSessionData, error: gameSessionError } = await supabase
        .from('game_sessions')
        .select('*')
        .eq('session_id', sessionId)
        .single()

      console.log('Game session query result:', { gameSessionData, gameSessionError })
      
      if (gameSessionError) {
        console.error('Error loading game session:', gameSessionError)
        // Don't throw error, just continue without game session data
        setGameSession(null)
      } else {
        setGameSession(gameSessionData)
      }

      // Load player statuses and calculate stats
      const { data: playerStatuses, error: statusError } = await supabase
        .from('game_player_status')
        .select('*')
        .eq('session_id', sessionId)

      if (statusError) throw statusError

      // Load squad players
      const { data: squadData, error: squadError } = await supabase
        .from('session_squads')
        .select('squad_id')
        .eq('session_id', sessionId)
        .single()

      if (squadError) throw squadError

      const { data: playersData, error: playersError } = await supabase
        .from('player_squads')
        .select(`
          players (
            id,
            first_name,
            last_name,
            jersey_number
          )
        `)
        .eq('squad_id', squadData.squad_id)

      if (playersError) throw playersError

      // Load game events for plus/minus calculation
      const { data: gameEvents, error: eventsError } = await supabase
        .from('game_events')
        .select('*')
        .eq('session_id', sessionId)
        .order('event_time', { ascending: true })

      if (eventsError) throw eventsError

      // Set game events state
      setGameEvents(gameEvents || [])

      // Load all players that appear in game events for debug table
      const playerIds = [...new Set(gameEvents?.map(event => event.player_id).filter(Boolean) || [])]
      if (playerIds.length > 0) {
        const { data: playersData, error: playersError } = await supabase
          .from('players')
          .select('id, first_name, last_name')
          .in('id', playerIds)
        
        if (playersError) {
          console.error('Error loading players for debug table:', playersError)
        } else {
          setAllPlayers(playersData || [])
        }
      }

      // Debug logging
      console.log('Game Session Data:', gameSession)
      console.log('Player Statuses:', playerStatuses)
      console.log('Game Events:', gameEvents)

      // Calculate player stats using event-driven approach
      const stats = playersData.map(({ players: player }) => {
        // Get all player status changes from game_player_status table
        const playerStatusChanges = playerStatuses
          .filter(ps => ps.player_id === player.id)
          .sort((a, b) => new Date(a.status_start_time) - new Date(b.status_start_time))
        
        // Also check for player_on/player_off events in game_events
        const playerEvents = gameEvents
          .filter(event => 
            event.player_id === player.id && 
            (event.event_type === 'player_on' || event.event_type === 'player_off')
          )
          .sort((a, b) => new Date(a.event_time) - new Date(b.event_time))
        
        console.log(`Player ${player.first_name} events:`, playerEvents)
        
        console.log(`Player ${player.first_name} status changes:`, playerStatusChanges)
        
        // Calculate total rink time by tracking status changes
        let totalRinkTime = 0
        
        // Use player events if available, otherwise use status changes
        const hasPlayerEvents = playerEvents.length > 0
        const statusSource = hasPlayerEvents ? playerEvents : playerStatusChanges
        const statusTimeField = hasPlayerEvents ? 'event_time' : 'status_start_time'
        const statusValueField = hasPlayerEvents ? 'event_type' : 'status'
        
        console.log(`Using ${hasPlayerEvents ? 'player events' : 'status changes'} for ${player.first_name}`)
        
        if (statusSource.length > 0 && gameSession) {
          console.log(`Player ${player.first_name} has ${statusSource.length} status changes`)
          const gameStart = new Date(gameSession.game_start_time)
          const gameEnd = gameSession.game_end_time ? new Date(gameSession.game_end_time) : new Date()
          
          console.log(`Game time range: ${gameStart.toISOString()} to ${gameEnd.toISOString()}`)
          
          // Process all status changes to track all rink time segments
          let currentTime = gameStart
          let isCurrentlyOnRink = false
          let rinkTimeSegments = []
          
          // Determine initial state - if first event is player_on, player was on rink at start
          if (statusSource.length > 0) {
            const firstEvent = statusSource[0]
            const firstEventType = firstEvent[statusValueField]
            if (hasPlayerEvents) {
              isCurrentlyOnRink = firstEventType === 'player_on' // If first event is player_on, they were on rink
            } else {
              isCurrentlyOnRink = firstEventType === 'rink' // If first status is rink, they were on rink
            }
            console.log(`Initial state for ${player.first_name}: ${isCurrentlyOnRink ? 'on rink' : 'on bench'} (first event: ${firstEventType})`)
          }
          
          console.log(`Processing ${statusSource.length} status changes for ${player.first_name}`)
          
          for (let i = 0; i < statusSource.length; i++) {
            const statusChange = statusSource[i]
            const statusTime = new Date(statusChange[statusTimeField])
            const eventType = statusChange[statusValueField]
            
            console.log(`Status change ${i}: ${eventType} at ${statusTime.toISOString()}, was on rink: ${isCurrentlyOnRink}`)
            
            // If we were on rink before this change, add the time segment
            if (isCurrentlyOnRink) {
              const timeSegment = Math.floor((statusTime - currentTime) / 1000)
              console.log(`Time calculation: ${statusTime.toISOString()} - ${currentTime.toISOString()} = ${timeSegment} seconds`)
              
              // Validate time segment - should be reasonable (not negative, not more than 4 hours)
              if (timeSegment > 0 && timeSegment <= 14400) { // 4 hours max
                totalRinkTime += timeSegment
                rinkTimeSegments.push(timeSegment)
                console.log(`Added ${timeSegment} seconds to rink time (segment ${rinkTimeSegments.length})`)
              } else {
                console.log(`Skipped ${timeSegment} seconds (invalid: ${timeSegment <= 0 ? 'negative' : 'too large'})`)
              }
            } else {
              console.log(`Not on rink, skipping time calculation`)
            }
            
            // Update current state based on event type
            if (hasPlayerEvents) {
              if (eventType === 'player_on') {
                isCurrentlyOnRink = true
              } else if (eventType === 'player_off') {
                isCurrentlyOnRink = false
              }
            } else {
              isCurrentlyOnRink = eventType === 'rink'
            }
            
            console.log(`After event ${i}: isCurrentlyOnRink = ${isCurrentlyOnRink}`)
            
            currentTime = statusTime
          }
          
          // Add time from last status change to game end if still on rink
          if (isCurrentlyOnRink) {
            const finalSegment = Math.floor((gameEnd - currentTime) / 1000)
            console.log(`Final segment calculation: ${gameEnd.toISOString()} - ${currentTime.toISOString()} = ${finalSegment} seconds`)
            
            // Validate final segment - should be reasonable (not negative, not more than 4 hours)
            if (finalSegment > 0 && finalSegment <= 14400) { // 4 hours max
              totalRinkTime += finalSegment
              rinkTimeSegments.push(finalSegment)
              console.log(`Added final ${finalSegment} seconds to rink time (segment ${rinkTimeSegments.length})`)
            } else {
              console.log(`Skipped final ${finalSegment} seconds (invalid: ${finalSegment <= 0 ? 'negative' : 'too large'})`)
            }
          } else {
            console.log(`Not on rink at game end, skipping final segment`)
          }
          
          console.log(`Player ${player.first_name} total rink time: ${totalRinkTime} seconds from ${rinkTimeSegments.length} segments:`, rinkTimeSegments)
        } else if (gameSession) {
          // No status changes - check if player was on rink from start to end
          console.log(`Player ${player.first_name} has no status changes`)
          console.log(`Game session:`, gameSession)
          console.log(`All player statuses for ${player.first_name}:`, playerStatuses.filter(ps => ps.player_id === player.id))
          
          // Check if player was on rink at game start by looking at initial status
          const initialStatus = playerStatuses.find(ps => 
            ps.player_id === player.id && 
            new Date(ps.status_start_time) <= new Date(gameSession.game_start_time)
          )
          
          console.log(`Initial status for ${player.first_name}:`, initialStatus)
          
          if (initialStatus && initialStatus.status === 'rink') {
            // Player was on rink from start to end
            const gameStart = new Date(gameSession.game_start_time)
            const gameEnd = gameSession.game_end_time ? new Date(gameSession.game_end_time) : new Date()
            
            // Validate dates
            if (!isNaN(gameStart.getTime()) && !isNaN(gameEnd.getTime())) {
              const calculatedTime = Math.floor((gameEnd - gameStart) / 1000)
              
              // Validate total game time - should be reasonable (not more than 4 hours)
              if (calculatedTime > 0 && calculatedTime <= 14400) { // 4 hours max
                totalRinkTime = calculatedTime
                console.log(`Player ${player.first_name} was on rink from game start to end: ${totalRinkTime} seconds`)
              } else {
                console.log(`Invalid game duration for ${player.first_name}: ${calculatedTime} seconds (too large or negative)`)
                totalRinkTime = 0
              }
            } else {
              console.log(`Invalid game start/end times for ${player.first_name}`)
              totalRinkTime = 0
            }
            console.log(`Game start: ${gameStart.toISOString()}, Game end: ${gameEnd.toISOString()}`)
          } else {
            console.log(`Player ${player.first_name} was not on rink at game start`)
            console.log(`Initial status found:`, initialStatus)
            if (initialStatus) {
              console.log(`Initial status type: ${initialStatus.status}, start time: ${initialStatus.status_start_time}`)
            }
          }
        } else {
          // No game session data - try to calculate from player status and game events
          console.log(`Player ${player.first_name} has no status changes and no game session data`)
          console.log(`All player statuses for ${player.first_name}:`, playerStatuses.filter(ps => ps.player_id === player.id))
          
          // Get all status changes for this player (even if no game session)
          const playerStatusChanges = playerStatuses
            .filter(ps => ps.player_id === player.id)
            .sort((a, b) => new Date(a.status_start_time) - new Date(b.status_start_time))
          
          // Also check for player_on/player_off events in game_events for fallback
          const playerEventsFallback = gameEvents
            .filter(event => 
              event.player_id === player.id && 
              (event.event_type === 'player_on' || event.event_type === 'player_off')
            )
            .sort((a, b) => new Date(a.event_time) - new Date(b.event_time))
          
          console.log(`Player ${player.first_name} status changes for fallback:`, playerStatusChanges)
          console.log(`Player ${player.first_name} events for fallback:`, playerEventsFallback)
          
          // Use player events if available, otherwise use status changes
          const hasPlayerEventsFallback = playerEventsFallback.length > 0
          const statusSourceFallback = hasPlayerEventsFallback ? playerEventsFallback : playerStatusChanges
          const statusTimeFieldFallback = hasPlayerEventsFallback ? 'event_time' : 'status_start_time'
          const statusValueFieldFallback = hasPlayerEventsFallback ? 'event_type' : 'status'
          
          console.log(`Using ${hasPlayerEventsFallback ? 'player events' : 'status changes'} for fallback ${player.first_name}`)
          
          if (statusSourceFallback.length > 0) {
            // Calculate rink time using status changes - track all segments
            const lastEvent = gameEvents[gameEvents.length - 1]
            const gameEnd = lastEvent ? new Date(lastEvent.event_time) : new Date()
            
            console.log(`Game end time: ${gameEnd.toISOString()}`)
            
            // Process all status changes to track all rink time segments
            let currentTime = new Date(statusSourceFallback[0]?.[statusTimeFieldFallback])
            let isCurrentlyOnRink = false
            let rinkTimeSegments = []
            
            // Validate the first time - if it's invalid, skip calculation
            if (!currentTime || isNaN(currentTime.getTime())) {
              console.log(`Invalid first status time for ${player.first_name}, skipping fallback calculation`)
              totalRinkTime = 0
            } else {
            
            // Determine initial state - if first event is player_on, player was on rink at start
            if (statusSourceFallback.length > 0) {
              const firstEvent = statusSourceFallback[0]
              const firstEventType = firstEvent[statusValueFieldFallback]
              if (hasPlayerEventsFallback) {
                isCurrentlyOnRink = firstEventType === 'player_on' // If first event is player_on, they were on rink
              } else {
                isCurrentlyOnRink = firstEventType === 'rink' // If first status is rink, they were on rink
              }
              console.log(`Initial state for fallback ${player.first_name}: ${isCurrentlyOnRink ? 'on rink' : 'on bench'} (first event: ${firstEventType})`)
            }
            
            console.log(`Processing ${statusSourceFallback.length} status changes for fallback ${player.first_name}`)
            
            for (let i = 0; i < statusSourceFallback.length; i++) {
              const statusChange = statusSourceFallback[i]
              const statusTime = new Date(statusChange[statusTimeFieldFallback])
              const eventType = statusChange[statusValueFieldFallback]
              
              console.log(`Status change ${i}: ${eventType} at ${statusTime.toISOString()}, was on rink: ${isCurrentlyOnRink}`)
              
              // If we were on rink before this change, add the time segment
              if (isCurrentlyOnRink) {
                const timeSegment = Math.floor((statusTime - currentTime) / 1000)
                console.log(`Time calculation: ${statusTime.toISOString()} - ${currentTime.toISOString()} = ${timeSegment} seconds`)
                
                // Validate time segment - should be reasonable (not negative, not more than 4 hours)
                if (timeSegment > 0 && timeSegment <= 14400) { // 4 hours max
                  totalRinkTime += timeSegment
                  rinkTimeSegments.push(timeSegment)
                  console.log(`Added ${timeSegment} seconds to rink time (segment ${rinkTimeSegments.length})`)
                } else {
                  console.log(`Skipped ${timeSegment} seconds (invalid: ${timeSegment <= 0 ? 'negative' : 'too large'})`)
                }
              } else {
                console.log(`Not on rink, skipping time calculation`)
              }
              
              // Update current state based on event type
              if (hasPlayerEventsFallback) {
                if (eventType === 'player_on') {
                  isCurrentlyOnRink = true
                } else if (eventType === 'player_off') {
                  isCurrentlyOnRink = false
                }
              } else {
                isCurrentlyOnRink = eventType === 'rink'
              }
              
              console.log(`After event ${i}: isCurrentlyOnRink = ${isCurrentlyOnRink}`)
              
              currentTime = statusTime
            }
            
            // Add time from last status change to game end if still on rink
            if (isCurrentlyOnRink) {
              const finalSegment = Math.floor((gameEnd - currentTime) / 1000)
              console.log(`Final segment calculation: ${gameEnd.toISOString()} - ${currentTime.toISOString()} = ${finalSegment} seconds`)
              
              // Validate final segment - should be reasonable (not negative, not more than 4 hours)
              if (finalSegment > 0 && finalSegment <= 14400) { // 4 hours max
                totalRinkTime += finalSegment
                rinkTimeSegments.push(finalSegment)
                console.log(`Added final ${finalSegment} seconds to rink time (segment ${rinkTimeSegments.length})`)
              } else {
                console.log(`Skipped final ${finalSegment} seconds (invalid: ${finalSegment <= 0 ? 'negative' : 'too large'})`)
              }
            } else {
              console.log(`Not on rink at game end, skipping final segment`)
            }
            
            console.log(`Player ${player.first_name} total rink time (fallback): ${totalRinkTime} seconds from ${rinkTimeSegments.length} segments:`, rinkTimeSegments)
            } // Close the else block for valid currentTime
          } else {
            console.log(`Player ${player.first_name} has no status records`)
          }
        }
        
        // Final validation - cap total rink time at 4 hours (14400 seconds)
        if (totalRinkTime > 14400) {
          console.log(`Warning: ${player.first_name} has unrealistic rink time of ${totalRinkTime} seconds, capping at 14400`)
          totalRinkTime = 14400
        }
        
        console.log(`Total rink time for ${player.first_name}: ${totalRinkTime} seconds`)

        // Calculate plus/minus from game events
        let plusMinus = 0
        if (gameEvents) {
          // Find all goal events
          const goalEvents = gameEvents.filter(event => 
            event.event_type === 'goal_for' || event.event_type === 'goal_against'
          )
          
          console.log(`Goal events for ${player.first_name}:`, goalEvents)
          
          // For each goal event, check if player was on rink at the time of the goal
          goalEvents.forEach(event => {
            const eventTime = new Date(event.event_time)
            console.log(`Checking goal event at ${eventTime.toISOString()}: ${event.event_type}`)
            
            // Check if player was on rink using the metadata from the goal event
            let wasOnRink = false
            if (event.metadata && event.metadata.rink_players) {
              wasOnRink = event.metadata.rink_players.includes(player.id)
              console.log(`Player ${player.first_name} was on rink according to goal metadata: ${wasOnRink}`)
            } else {
              // Fallback to status-based calculation if no metadata
              console.log('No metadata found, falling back to status calculation')
              const playerStatusesForPlayer = playerStatuses
                .filter(ps => ps.player_id === player.id)
                .sort((a, b) => new Date(a.status_start_time) - new Date(b.status_start_time))
              
              let activeStatus = null
              for (let i = playerStatusesForPlayer.length - 1; i >= 0; i--) {
                const status = playerStatusesForPlayer[i]
                if (new Date(status.status_start_time) <= eventTime) {
                  activeStatus = status
                  break
                }
              }
              
              wasOnRink = activeStatus && activeStatus.status === 'rink'
              console.log(`Player ${player.first_name} was on rink according to status: ${wasOnRink}`)
            }
            
            if (wasOnRink) {
              if (event.event_type === 'goal_for') {
                plusMinus += 1
                console.log(`Player ${player.first_name} gets +1 for goal_for`)
              } else if (event.event_type === 'goal_against') {
                plusMinus -= 1
                console.log(`Player ${player.first_name} gets -1 for goal_against`)
              }
            } else {
              console.log(`Player ${player.first_name} was not on rink at goal time`)
            }
          })
        }

        return {
          id: player.id,
          name: `${player.first_name} ${player.last_name}`,
          jerseyNumber: player.jersey_number,
          totalRinkTime,
          plusMinus,
          formattedTime: formatTime(totalRinkTime)
        }
      })

      // Sort by total rink time (descending)
      stats.sort((a, b) => b.totalRinkTime - a.totalRinkTime)
      setPlayerStats(stats)

    } catch (err) {
      console.error('Error loading game stats:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading game stats...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <p className="font-bold">Error loading game stats:</p>
            <p>{error}</p>
          </div>
          <Link
            to={orgId ? `/organisations/${orgId}/sessions/${sessionId}` : `/sessions/${sessionId}`}
            className="text-indigo-600 hover:text-indigo-800"
          >
            ← Back to Session
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Game Statistics</h1>
              <p className="text-gray-600 mt-1">{session?.title}</p>
              <p className="text-sm text-gray-500">
                {session?.date && new Date(session.date).toLocaleDateString()}
              </p>
            </div>
            <Link
              to={orgId ? `/organisations/${orgId}/sessions/${sessionId}` : `/sessions/${sessionId}`}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              ← Back to Session
            </Link>
          </div>

          {/* Game Summary */}
          {gameSession && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {gameSession.goals_for || 0}
                </div>
                <div className="text-sm text-gray-600">Goals For</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {gameSession.goals_against || 0}
                </div>
                <div className="text-sm text-gray-600">Goals Against</div>
              </div>
            </div>
          )}
        </div>

        {/* Player Statistics */}
        <div className="bg-white rounded-lg shadow-md">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Player Statistics</h2>
            <p className="text-gray-600 text-sm mt-1">
              Total rink time and plus/minus for each player
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Player
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Jersey #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rink Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Plus/Minus
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {playerStats.map((player, index) => (
                  <tr key={player.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {player.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        #{player.jerseyNumber}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-mono text-gray-900">
                        {player.formattedTime}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm font-medium ${
                        player.plusMinus > 0 ? 'text-green-600' : 
                        player.plusMinus < 0 ? 'text-red-600' : 'text-gray-600'
                      }`}>
                        {player.plusMinus > 0 ? '+' : ''}{player.plusMinus}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {playerStats.length === 0 && (
            <div className="px-6 py-8 text-center text-gray-500">
              No player statistics available for this game.
            </div>
          )}
        </div>
      </div>

      {/* Debug: Game Events Table */}
      <div className="bg-white rounded-lg shadow-md p-6 mt-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Debug: Game Events</h3>
        
        {gameEvents && gameEvents.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time
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
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {gameEvents
                  .filter(event => event.event_type !== 'player_positions')
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
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                        {eventTime}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          event.event_type === 'goal_for' ? 'bg-green-100 text-green-800' :
                          event.event_type === 'goal_against' ? 'bg-red-100 text-red-800' :
                          event.event_type === 'player_on' ? 'bg-blue-100 text-blue-800' :
                          event.event_type === 'player_off' ? 'bg-yellow-100 text-yellow-800' :
                          event.event_type === 'player_deleted' ? 'bg-gray-100 text-gray-800' :
                          event.event_type === 'player_positions' ? 'bg-purple-100 text-purple-800' :
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
        
        <div className="mt-4 text-xs text-gray-400">
          <p>This debug table shows relevant game events (excluding player_positions) to help troubleshoot calculation issues.</p>
          <p>Total events: {gameEvents?.length || 0}</p>
          <p>Filtered events (excluding player_positions): {gameEvents?.filter(e => e.event_type !== 'player_positions').length || 0}</p>
          <p>Unique players in events: {allPlayers?.length || 0}</p>
          <p>Player IDs in events: {[...new Set(gameEvents?.map(e => e.player_id).filter(Boolean) || [])].join(', ')}</p>
        </div>
      </div>
    </div>
  )
}

export default GameStats
