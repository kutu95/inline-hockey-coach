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

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
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

      // Load squad players
      const { data: squadData, error: squadError } = await supabase
        .from('session_squads')
        .select(`
          player_squads (
            players (
              id,
              first_name,
              last_name,
              jersey_number
            )
          )
        `)
        .eq('session_id', sessionId)

      if (squadError) throw squadError

      const playersData = squadData
        .flatMap(squad => squad.player_squads)
        .map(ps => ps.players)
        .filter(Boolean)

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

      // Calculate player stats using event-driven approach
      const stats = playersData.map(({ players: player }) => {
        console.log(`\n=== Calculating stats for ${player.first_name} ${player.last_name} ===`)
        
        // Get all events for this player, ordered by time
        const playerEvents = gameEvents
          .filter(event => event.player_id === player.id)
          .sort((a, b) => new Date(a.event_time) - new Date(b.event_time))
        
        console.log(`Player events (${playerEvents.length}):`, playerEvents.map(e => ({
          type: e.event_type,
          time: e.event_time,
          gameTime: e.game_time_seconds
        })))
        
        // Get all play start/stop events for the entire game
        const playEvents = gameEvents
          .filter(event => event.event_type === 'play_start' || event.event_type === 'play_stop')
          .sort((a, b) => new Date(a.event_time) - new Date(b.event_time))
        
        console.log(`Play events (${playEvents.length}):`, playEvents.map(e => ({
          type: e.event_type,
          time: e.event_time,
          gameTime: e.game_time_seconds
        })))
        
        // Calculate total rink time during active play periods
        let totalRinkTime = 0
        let currentShiftStart = null
        let isOnRink = false
        
        // Process all events in chronological order
        const allEvents = [...playerEvents, ...playEvents]
          .sort((a, b) => new Date(a.event_time) - new Date(b.event_time))
        
        console.log(`All events for ${player.first_name} (${allEvents.length}):`, allEvents.map(e => ({
          type: e.event_type,
          time: e.event_time,
          isPlayEvent: e.event_type === 'play_start' || e.event_type === 'play_stop'
        })))
        
        let isPlayActive = false
        
        for (const event of allEvents) {
          const eventTime = new Date(event.event_time)
          
          if (event.event_type === 'play_start') {
            isPlayActive = true
            console.log(`Play started at ${eventTime.toISOString()}`)
          } else if (event.event_type === 'play_stop') {
            isPlayActive = false
            console.log(`Play stopped at ${eventTime.toISOString()}`)
            
            // If player was on rink when play stopped, end their shift
            if (isOnRink && currentShiftStart) {
              const shiftDuration = Math.floor((eventTime - currentShiftStart) / 1000)
              console.log(`Ending shift due to play stop: ${shiftDuration}s (${currentShiftStart.toISOString()} to ${eventTime.toISOString()})`)
              totalRinkTime += shiftDuration
              isOnRink = false
              currentShiftStart = null
            }
          } else if (event.player_id === player.id) {
            // This is a player-specific event
            if (event.event_type === 'player_on') {
              if (!isOnRink) {
                isOnRink = true
                if (isPlayActive) {
                  currentShiftStart = eventTime
                  console.log(`Player came on rink during active play at ${eventTime.toISOString()}`)
                } else {
                  console.log(`Player came on rink during stopped play at ${eventTime.toISOString()} - not counting time`)
                }
              }
            } else if (event.event_type === 'player_off') {
              if (isOnRink && currentShiftStart && isPlayActive) {
                const shiftDuration = Math.floor((eventTime - currentShiftStart) / 1000)
                console.log(`Player went off rink during active play: ${shiftDuration}s (${currentShiftStart.toISOString()} to ${eventTime.toISOString()})`)
                totalRinkTime += shiftDuration
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
          const gameEndTime = gameSession?.game_end_time ? new Date(gameSession.game_end_time) : new Date()
          const finalShiftDuration = Math.floor((gameEndTime - currentShiftStart) / 1000)
          console.log(`Player still on rink at game end: ${finalShiftDuration}s (${currentShiftStart.toISOString()} to ${gameEndTime.toISOString()})`)
          totalRinkTime += finalShiftDuration
        }
        
        console.log(`Total rink time for ${player.first_name}: ${totalRinkTime}s`)
        
        // Calculate plus/minus
        let plusMinus = 0
        
        // Get all goal events
        const goalEvents = gameEvents.filter(event => 
          event.event_type === 'goal_for' || event.event_type === 'goal_against'
        ).sort((a, b) => new Date(a.event_time) - new Date(b.event_time))
        
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
          plusMinus,
          formattedTime: formatTime(totalRinkTime)
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
                      Plus/Minus
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {playerStats.map((player) => (
                    <tr key={player.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {player.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        #{player.jerseyNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {player.formattedTime}
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
    </div>
  )
}

export default GameStats

