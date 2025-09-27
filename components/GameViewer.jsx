import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../src/lib/supabase'
import { useParams } from 'react-router-dom'
import './GameManagement.css'

const GameViewer = () => {
  const { sessionId, orgId } = useParams()
  
  // Game state
  const [gameSession, setGameSession] = useState(null)
  const [session, setSession] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [gameStartTime, setGameStartTime] = useState(null)
  const [currentPlayStartTime, setCurrentPlayStartTime] = useState(null)
  const [totalPlayTime, setTotalPlayTime] = useState(0)
  const [goalsFor, setGoalsFor] = useState(0)
  const [goalsAgainst, setGoalsAgainst] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [gameHasEnded, setGameHasEnded] = useState(false)
  
  // Player state
  const [squadPlayers, setSquadPlayers] = useState([])
  const [benchDPlayers, setBenchDPlayers] = useState([])
  const [benchFPlayers, setBenchFPlayers] = useState([])
  const [gkPlayers, setGkPlayers] = useState([])
  const [rinkDPlayers, setRinkDPlayers] = useState([])
  const [rinkFPlayers, setRinkFPlayers] = useState([])
  const [rinkGkPlayers, setRinkGkPlayers] = useState([])
  const [playerStatuses, setPlayerStatuses] = useState({})
  const [playerTimers, setPlayerTimers] = useState({})
  const [playerImages, setPlayerImages] = useState({})
  const [deletedPlayers, setDeletedPlayers] = useState(new Set())
  
  // Auto-refresh timer
  const refreshIntervalRef = useRef(null)

  // Load session data
  const loadSessionData = async () => {
    try {
      setLoading(true)
      setError(null)
      console.log('Loading session data for sessionId:', sessionId)
      
      // Load session details
      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', sessionId)
        .single()
      
      if (sessionError) {
        console.error('Session error:', sessionError)
        throw sessionError
      }
      
      console.log('Session loaded:', session)
      console.log('Session fields available:', Object.keys(session || {}))
      console.log('Session date field:', session?.date, 'type:', typeof session?.date)
      console.log('Session time field:', session?.time, 'type:', typeof session?.time)
      console.log('Session start_time field:', session?.start_time, 'type:', typeof session?.start_time)
      
      setSession(session)
      
      // Load squad players
      try {
        console.log('Loading squad players for sessionId:', sessionId)
        
        const { data: sessionSquadData, error: sessionSquadError } = await supabase
          .from('session_squads')
          .select('squad_id')
          .eq('session_id', sessionId)
        
        if (sessionSquadError) {
          console.error('Error loading session squad:', sessionSquadError)
          throw sessionSquadError
        }
        
        console.log('Session squad data:', sessionSquadData)
        
        if (!sessionSquadData || sessionSquadData.length === 0) {
          console.log('No squad found for this session')
          setSquadPlayers([])
          return
        }
        
        const squadId = sessionSquadData[0].squad_id
        console.log('Found squad_id:', squadId)
        
        const { data: playerSquadData, error: playerSquadError } = await supabase
          .from('player_squads')
          .select(`
            player_id,
            players (
              id,
              first_name,
              last_name
            )
          `)
          .eq('squad_id', squadId)
        
        if (playerSquadError) {
          console.error('Error loading player squad:', playerSquadError)
          throw playerSquadError
        }
        
        console.log('Player squad data:', playerSquadData)
        
        const players = playerSquadData.map(item => item.players).filter(Boolean)
        console.log('Final players loaded:', players)
        
        if (players && players.length > 0) {
          setSquadPlayers(players)
          await loadPlayerImages(players)
          
          // Place all players on bench by default (split between D and F columns)
          const half = Math.ceil(players.length / 2)
          setBenchDPlayers(players.slice(0, half))
          setBenchFPlayers(players.slice(half))
          console.log('Placed players on bench - D:', half, 'F:', players.length - half)
        } else {
          console.log('No players found in squad')
          setSquadPlayers([])
        }
      } catch (playerError) {
        console.error('Error loading players:', playerError)
        // Don't throw here, just log the error and continue
      }
      
    } catch (err) {
      console.error('Error loading session data:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Load player images
  const loadPlayerImages = async (players) => {
    const images = {}
    for (const player of players) {
      // Skip image loading since profile_image_url field doesn't exist
      // This function is kept for future compatibility
    }
    setPlayerImages(images)
  }

  // Load current game state
  const loadCurrentGameState = async () => {
    try {
      console.log('Loading current game state for session:', sessionId)
      
      // Check if there's a game session
      const { data: gameSessionData, error: sessionError } = await supabase
        .from('game_sessions')
        .select('*')
        .eq('session_id', sessionId)
        .single()
      
      if (sessionError && sessionError.code !== 'PGRST116') {
        console.error('Error loading game session:', sessionError)
        return
      }
      
      if (gameSessionData) {
        console.log('Found game session:', gameSessionData)
        setGameSession(gameSessionData)
        setGameStartTime(gameSessionData.game_start_time ? new Date(gameSessionData.game_start_time) : null)
        setIsPlaying(gameSessionData.is_playing || false)
        setTotalPlayTime(gameSessionData.total_play_time || 0)
        setGoalsFor(gameSessionData.goals_for || 0)
        setGoalsAgainst(gameSessionData.goals_against || 0)
        setGameHasEnded(gameSessionData.is_active === false)
      }
      
      // Load deleted players
      const { data: deletedEvents, error: deletedEventsError } = await supabase
        .from('game_events')
        .select('player_id')
        .eq('session_id', sessionId)
        .eq('event_type', 'player_deleted')
      
      let currentDeletedPlayers = new Set()
      if (!deletedEventsError && deletedEvents) {
        const deletedPlayerIds = deletedEvents.map(event => event.player_id)
        console.log('Found deleted players:', deletedPlayerIds)
        currentDeletedPlayers = new Set(deletedPlayerIds)
        setDeletedPlayers(currentDeletedPlayers)
      }

      // Load saved player positions
      const { data: positionEvents, error: positionEventsError } = await supabase
        .from('game_events')
        .select('metadata')
        .eq('session_id', sessionId)
        .eq('event_type', 'player_positions')
        .order('event_time', { ascending: false })
        .limit(1)
      
      let savedPositions = null
      if (!positionEventsError && positionEvents && positionEvents.length > 0) {
        savedPositions = positionEvents[0].metadata
        console.log('Found saved player positions:', savedPositions)
      }
      
      // Apply saved positions if we have them
      if (savedPositions) {
        console.log('Applying saved player positions...')
        
        // Clear all zones first
        setBenchDPlayers([])
        setBenchFPlayers([])
        setGkPlayers([])
        setRinkDPlayers([])
        setRinkFPlayers([])
        setRinkGkPlayers([])
        
        // Restore players to their saved positions
        Object.entries(savedPositions).forEach(([zone, playerIds]) => {
          const players = playerIds.map(id => squadPlayers.find(p => p.id === id)).filter(Boolean)
          console.log(`Restoring ${players.length} players to ${zone}`)
          
          switch (zone) {
            case 'benchD':
              setBenchDPlayers(players)
              break
            case 'benchF':
              setBenchFPlayers(players)
              break
            case 'gk':
              setGkPlayers(players)
              break
            case 'rinkD':
              setRinkDPlayers(players)
              break
            case 'rinkF':
              setRinkFPlayers(players)
              break
            case 'rinkGk':
              setRinkGkPlayers(players)
              break
          }
        })
        console.log('Saved positions applied successfully')
      }
      
      // Load player statuses
      const { data: statusData, error: statusError } = await supabase
        .from('game_player_status')
        .select('*')
        .eq('session_id', sessionId)
      
      if (!statusError && statusData) {
        const statuses = {}
        statusData.forEach(status => {
          statuses[status.player_id] = status
        })
        setPlayerStatuses(statuses)
        console.log('Loaded player statuses:', statuses)
      }
      
    } catch (error) {
      console.error('Error loading current game state:', error)
    }
  }

  // Calculate player time
  const calculatePlayerTime = (playerId, currentStatus, statusStartTime) => {
    try {
      if (!gameStartTime || !statusStartTime) return 0
      
      const now = new Date()
      const statusStart = new Date(statusStartTime)
      const gameStart = new Date(gameStartTime)
      
      if (isNaN(statusStart.getTime())) {
        console.error(`Invalid statusStartTime for player ${playerId}:`, statusStartTime)
        return 0
      }
      
      // Determine the effective start time for timer calculation
      let effectiveStartTime
      if (statusStart <= gameStart) {
        // Player was moved to current position before or at game start
        effectiveStartTime = gameStart
      } else {
        // Player was moved to current position after game start
        effectiveStartTime = statusStart
      }
      
      // Calculate time based on play state
      let timeElapsed
      if (isPlaying) {
        timeElapsed = Math.floor((now - effectiveStartTime) / 1000)
      } else {
        if (currentPlayStartTime) {
          const playStopTime = new Date(currentPlayStartTime)
          timeElapsed = Math.floor((playStopTime - effectiveStartTime) / 1000)
        } else {
          timeElapsed = 0
        }
      }
      
      return timeElapsed
    } catch (error) {
      console.error(`Error in calculatePlayerTime for player ${playerId}:`, error)
      return 0
    }
  }

  // Update player timers
  const updatePlayerTimers = () => {
    const updatedTimers = {}
    
    // Check all player arrays
    const allPlayers = [
      ...benchDPlayers,
      ...benchFPlayers,
      ...gkPlayers,
      ...rinkDPlayers,
      ...rinkFPlayers,
      ...rinkGkPlayers
    ]
    
    allPlayers.forEach(player => {
      const status = playerStatuses[player.id]
      if (status) {
        const isOnRink = rinkDPlayers.some(p => p.id === player.id) || 
                        rinkFPlayers.some(p => p.id === player.id) || 
                        rinkGkPlayers.some(p => p.id === player.id)
        
        const time = calculatePlayerTime(player.id, status.status, status.status_start_time)
        updatedTimers[player.id] = {
          time,
          status: isOnRink ? 'rink' : 'bench'
        }
      }
    })
    
    setPlayerTimers(updatedTimers)
  }

  // Format time display
  const formatTime = (seconds) => {
    if (seconds < 60) {
      return `${seconds}s`
    } else {
      const minutes = Math.floor(seconds / 60)
      const remainingSeconds = seconds % 60
      return `${minutes}m ${remainingSeconds}s`
    }
  }

  // Load session data once on mount
  useEffect(() => {
    if (sessionId) {
      loadSessionData()
    }
  }, [sessionId])

  // Auto-refresh game state
  useEffect(() => {
    if (sessionId && squadPlayers.length > 0) {
      loadCurrentGameState()
      
      // Set up auto-refresh every 2 seconds
      refreshIntervalRef.current = setInterval(() => {
        loadCurrentGameState()
      }, 2000)
    }
    
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current)
      }
    }
  }, [sessionId, squadPlayers.length])

  // Update timers when game state changes
  useEffect(() => {
    updatePlayerTimers()
  }, [gameStartTime, isPlaying, playerStatuses, benchDPlayers, benchFPlayers, gkPlayers, rinkDPlayers, rinkFPlayers, rinkGkPlayers])

  // Update timers every second
  useEffect(() => {
    const timerInterval = setInterval(updatePlayerTimers, 1000)
    return () => clearInterval(timerInterval)
  }, [gameStartTime, isPlaying, playerStatuses, benchDPlayers, benchFPlayers, gkPlayers, rinkDPlayers, rinkFPlayers, rinkGkPlayers])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading game viewer...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error: {error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 game-management-container">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="w-10"></div> {/* Spacer for centering */}
          <h1 className="text-2xl font-bold text-gray-800 text-center">
            Game Viewer
            {session && (
              <span className="text-lg font-normal text-gray-600 ml-2">
                - {session.title}
              </span>
            )}
            {session && (session.date || session.start_time) && (
              <div className="text-sm font-normal text-gray-500 mt-1">
                {(() => {
                  try {
                    const dateValue = session.date || session.start_time
                    if (!dateValue) return null
                    
                    const date = new Date(dateValue)
                    if (isNaN(date.getTime())) return null
                    
                    return date.toLocaleDateString('en-AU', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })
                  } catch (error) {
                    console.error('Error parsing date:', error)
                    return null
                  }
                })()}
                {(() => {
                  try {
                    const timeValue = session.time || session.start_time
                    if (!timeValue) return null
                    
                    let time
                    // Handle time-only format (HH:MM:SS) by combining with date
                    if (session.date && timeValue.includes(':') && !timeValue.includes('T')) {
                      time = new Date(`${session.date}T${timeValue}`)
                    } else {
                      time = new Date(timeValue)
                    }
                    
                    if (isNaN(time.getTime())) return null
                    
                    return (
                      <span className="ml-2">
                        at {time.toLocaleTimeString('en-AU', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    )
                  } catch (error) {
                    console.error('Error parsing time:', error)
                    return null
                  }
                })()}
              </div>
            )}
          </h1>
          <div className="w-10"></div> {/* Spacer for centering */}
        </div>
        
        {/* Game Status */}
        <div className="text-center mb-4">
          <div className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium">
            {gameHasEnded ? (
              <span className="text-red-600 bg-red-100 px-3 py-1 rounded-full">
                Game Ended
              </span>
            ) : isPlaying ? (
              <span className="text-green-600 bg-green-100 px-3 py-1 rounded-full flex items-center">
                <div className="w-2 h-2 bg-green-600 rounded-full mr-2 animate-pulse"></div>
                Live
              </span>
            ) : gameStartTime ? (
              <span className="text-yellow-600 bg-yellow-100 px-3 py-1 rounded-full">
                Paused
              </span>
            ) : (
              <span className="text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                Not Started
              </span>
            )}
          </div>
        </div>

        {/* Game Clock */}
        {gameStartTime && (
          <div className="text-center mb-4">
            <div className="text-3xl font-bold text-gray-800">
              {Math.floor((new Date() - gameStartTime) / 1000)}s
            </div>
            <div className="text-sm text-gray-600">
              Total Game Time
            </div>
          </div>
        )}

        {/* Score */}
        {(goalsFor > 0 || goalsAgainst > 0) && (
          <div className="text-center mb-4">
            <div className="text-2xl font-bold text-gray-800">
              {goalsFor} - {goalsAgainst}
            </div>
            <div className="text-sm text-gray-600">
              Goals For - Goals Against
            </div>
          </div>
        )}
      </div>
      
      {/* Player Management */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-4">
        <h2 className="text-xl font-bold text-gray-800 mb-4 text-center">Player Status</h2>
        
        <div className="grid grid-cols-2 gap-4">
          {/* Bench */}
          <div>
            <h3 className="text-lg font-semibold text-gray-700 mb-3 text-center">Bench</h3>
            
            {/* Bench D */}
            <div className="mb-3">
              <h4 className="text-sm font-medium text-gray-600 mb-2 text-center">D</h4>
              <div className="space-y-2">
                {benchDPlayers.map(player => (
                  <div key={player.id} className="player-card bg-yellow-50 border border-yellow-200">
                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-full bg-gray-300 mr-2 flex-shrink-0 flex items-center justify-center">
                        {playerImages[player.id] ? (
                          <img 
                            src={playerImages[player.id]} 
                            alt={player.first_name}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-xs font-medium text-gray-600">
                            {player.first_name.charAt(0)}{player.last_name.charAt(0)}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-gray-800 truncate">
                          {player.first_name} {player.last_name}
                        </div>
                        <div className="text-xs text-gray-600">
                          {playerTimers[player.id] ? formatTime(playerTimers[player.id].time) : '0s'}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Bench F */}
            <div className="mb-3">
              <h4 className="text-sm font-medium text-gray-600 mb-2 text-center">F</h4>
              <div className="space-y-2">
                {benchFPlayers.map(player => (
                  <div key={player.id} className="player-card bg-yellow-50 border border-yellow-200">
                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-full bg-gray-300 mr-2 flex-shrink-0 flex items-center justify-center">
                        {playerImages[player.id] ? (
                          <img 
                            src={playerImages[player.id]} 
                            alt={player.first_name}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-xs font-medium text-gray-600">
                            {player.first_name.charAt(0)}{player.last_name.charAt(0)}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-gray-800 truncate">
                          {player.first_name} {player.last_name}
                        </div>
                        <div className="text-xs text-gray-600">
                          {playerTimers[player.id] ? formatTime(playerTimers[player.id].time) : '0s'}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* GK */}
            <div>
              <h4 className="text-sm font-medium text-gray-600 mb-2 text-center">GK</h4>
              <div className="space-y-2">
                {gkPlayers.map(player => (
                  <div key={player.id} className="player-card bg-yellow-50 border border-yellow-200">
                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-full bg-gray-300 mr-2 flex-shrink-0 flex items-center justify-center">
                        {playerImages[player.id] ? (
                          <img 
                            src={playerImages[player.id]} 
                            alt={player.first_name}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-xs font-medium text-gray-600">
                            {player.first_name.charAt(0)}{player.last_name.charAt(0)}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-gray-800 truncate">
                          {player.first_name} {player.last_name}
                        </div>
                        <div className="text-xs text-gray-600">
                          {playerTimers[player.id] ? formatTime(playerTimers[player.id].time) : '0s'}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Rink */}
          <div>
            <h3 className="text-lg font-semibold text-gray-700 mb-3 text-center">Rink</h3>
            
            {/* Rink D */}
            <div className="mb-3">
              <h4 className="text-sm font-medium text-gray-600 mb-2 text-center">D</h4>
              <div className="space-y-2">
                {rinkDPlayers.map(player => (
                  <div key={player.id} className="player-card bg-green-50 border border-green-200">
                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-full bg-gray-300 mr-2 flex-shrink-0 flex items-center justify-center">
                        {playerImages[player.id] ? (
                          <img 
                            src={playerImages[player.id]} 
                            alt={player.first_name}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-xs font-medium text-gray-600">
                            {player.first_name.charAt(0)}{player.last_name.charAt(0)}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-gray-800 truncate">
                          {player.first_name} {player.last_name}
                        </div>
                        <div className="text-xs text-gray-600">
                          {playerTimers[player.id] ? formatTime(playerTimers[player.id].time) : '0s'}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Rink F */}
            <div className="mb-3">
              <h4 className="text-sm font-medium text-gray-600 mb-2 text-center">F</h4>
              <div className="space-y-2">
                {rinkFPlayers.map(player => (
                  <div key={player.id} className="player-card bg-green-50 border border-green-200">
                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-full bg-gray-300 mr-2 flex-shrink-0 flex items-center justify-center">
                        {playerImages[player.id] ? (
                          <img 
                            src={playerImages[player.id]} 
                            alt={player.first_name}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-xs font-medium text-gray-600">
                            {player.first_name.charAt(0)}{player.last_name.charAt(0)}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-gray-800 truncate">
                          {player.first_name} {player.last_name}
                        </div>
                        <div className="text-xs text-gray-600">
                          {playerTimers[player.id] ? formatTime(playerTimers[player.id].time) : '0s'}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Rink GK */}
            <div>
              <h4 className="text-sm font-medium text-gray-600 mb-2 text-center">GK</h4>
              <div className="space-y-2">
                {rinkGkPlayers.map(player => (
                  <div key={player.id} className="player-card bg-green-50 border border-green-200">
                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-full bg-gray-300 mr-2 flex-shrink-0 flex items-center justify-center">
                        {playerImages[player.id] ? (
                          <img 
                            src={playerImages[player.id]} 
                            alt={player.first_name}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-xs font-medium text-gray-600">
                            {player.first_name.charAt(0)}{player.last_name.charAt(0)}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-gray-800 truncate">
                          {player.first_name} {player.last_name}
                        </div>
                        <div className="text-xs text-gray-600">
                          {playerTimers[player.id] ? formatTime(playerTimers[player.id].time) : '0s'}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default GameViewer
