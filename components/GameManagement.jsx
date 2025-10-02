import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../src/lib/supabase'
import { useParams, useNavigate, Link } from 'react-router-dom'
import './GameManagement.css'

const GameManagement = () => {
  const { sessionId, orgId } = useParams()
  const navigate = useNavigate()
  
  // console.log('GameManagement loaded with sessionId:', sessionId, 'orgId:', orgId)
  
  // Game state
  const [gameSession, setGameSession] = useState(null)
  const [session, setSession] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [gameStartTime, setGameStartTime] = useState(null)
  const [currentPlayStartTime, setCurrentPlayStartTime] = useState(null)
  const [totalPlayTime, setTotalPlayTime] = useState(0)
  const [currentGameTime, setCurrentGameTime] = useState(0)
  const [goalsFor, setGoalsFor] = useState(0)
  const [goalsAgainst, setGoalsAgainst] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [showDeletePlayerConfirm, setShowDeletePlayerConfirm] = useState(false)
  const [playerToDelete, setPlayerToDelete] = useState(null)
  const [showSettings, setShowSettings] = useState(false)
  const [stoppageTimeout, setStoppageTimeout] = useState(60) // Default 60 seconds
  const [playStopTime, setPlayStopTime] = useState(null) // Track when play was stopped
  const [gameHasEnded, setGameHasEnded] = useState(false) // Track if game has ended
  const [showEndGameConfirm, setShowEndGameConfirm] = useState(false) // Track end game confirmation
  
  // Players
  const [squadPlayers, setSquadPlayers] = useState([])
  const [benchPlayers, setBenchPlayers] = useState([])
  const [rinkPlayers, setRinkPlayers] = useState([])
  const [benchDPlayers, setBenchDPlayers] = useState([]) // Bench D column
  const [benchFPlayers, setBenchFPlayers] = useState([]) // Bench F column
  const [gkPlayers, setGkPlayers] = useState([]) // Goal Keeper
  const [rinkDPlayers, setRinkDPlayers] = useState([]) // Rink D column
  const [rinkFPlayers, setRinkFPlayers] = useState([]) // Rink F column
  const [rinkGkPlayers, setRinkGkPlayers] = useState([]) // Rink GK
  const [playerStatuses, setPlayerStatuses] = useState({})
  const [playerTimers, setPlayerTimers] = useState({}) // Track individual player timers
  const playerStatusesRef = useRef({})
  const [deletedPlayers, setDeletedPlayers] = useState(new Set()) // Track deleted players
  const [playerImages, setPlayerImages] = useState({}) // Track player profile images
  
  // Drag and drop
  const [draggedPlayer, setDraggedPlayer] = useState(null)
  const [dragOverZone, setDragOverZone] = useState(null)
  const [dragOverPosition, setDragOverPosition] = useState(null) // Track drop position within column
  
  // Touch support
  const [touchStartPos, setTouchStartPos] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [touchMoved, setTouchMoved] = useState(false)
  
  // Refs
  const gameTimeInterval = useRef(null)
  const playTimeInterval = useRef(null)
  const hasLoadedGameState = useRef(false)
  const hasLoadedSessionData = useRef(false)
  
  // Load session data
  useEffect(() => {
    if (sessionId && !hasLoadedSessionData.current) {
      hasLoadedSessionData.current = true
      loadSessionData()
    }
    return () => {
      if (gameTimeInterval.current) clearInterval(gameTimeInterval.current)
      if (playTimeInterval.current) clearInterval(playTimeInterval.current)
    }
  }, [sessionId])
  
  // Load existing game state when component mounts
  useEffect(() => {
    if (sessionId && squadPlayers.length > 0 && !hasLoadedGameState.current) {
      console.log('Loading existing game state for session:', sessionId, 'with', squadPlayers.length, 'squad players')
      hasLoadedGameState.current = true
      loadExistingGameState()
    }
  }, [sessionId, squadPlayers])
  
  // Update timers
  useEffect(() => {
    if (gameStartTime) {
      gameTimeInterval.current = setInterval(() => {
        const now = new Date()
        const elapsed = Math.floor((now - gameStartTime) / 1000)
        setCurrentGameTime(elapsed)
      }, 1000)
    }
    
    if (isPlaying && currentPlayStartTime) {
      playTimeInterval.current = setInterval(() => {
        const now = new Date()
        const elapsed = Math.floor((now - currentPlayStartTime) / 1000)
        setTotalPlayTime(prev => prev + 1)
      }, 1000)
    }
    
    return () => {
      if (gameTimeInterval.current) clearInterval(gameTimeInterval.current)
      if (playTimeInterval.current) clearInterval(playTimeInterval.current)
    }
  }, [gameStartTime, isPlaying, currentPlayStartTime])
  
  // Update player timers every second when game is running
  useEffect(() => {
    if (gameStartTime) {
      const playerTimerInterval = setInterval(() => {
        updatePlayerTimers()
      }, 1000)
      
      return () => clearInterval(playerTimerInterval)
    }
  }, [gameStartTime])
  
  // Update timers immediately when play state changes
  useEffect(() => {
    if (gameStartTime && Object.keys(playerStatuses).length > 0) {
      updatePlayerTimers()
    }
  }, [isPlaying, currentPlayStartTime, gameStartTime])
  
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
      
      // Test date parsing
      if (session?.date) {
        const testDate = new Date(session.date)
        console.log('Date parsing test:', session.date, '->', testDate, 'isValid:', !isNaN(testDate.getTime()))
      }
      if (session?.time) {
        const testTime = new Date(session.time)
        console.log('Time parsing test:', session.time, '->', testTime, 'isValid:', !isNaN(testTime.getTime()))
      }
      if (session?.start_time) {
        // start_time is just a time string like "15:30:00", not a full date-time
        // So we can't parse it with new Date() directly
        console.log('Start time parsing test:', session.start_time, '-> Time string (not a date)')
      }
      setSession(session)
      
      // Load squad players using correct table structure
      try {
        console.log('Loading squad players for sessionId:', sessionId)
        
        // Step 1: Get squad_id from session_squads table
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
          setBenchPlayers([])
          return
        }
        
        const squadId = sessionSquadData[0].squad_id
        console.log('Found squad_id:', squadId)
        
        // Step 2: Get players from player_squads table using squad_id
        const { data: playerSquadData, error: playerSquadError } = await supabase
          .from('player_squads')
          .select(`
            players (
              id,
              first_name,
              last_name,
              jersey_number,
              photo_url
            )
          `)
          .eq('squad_id', squadId)
        
        if (playerSquadError) {
          console.error('Error loading player squad:', playerSquadError)
          throw playerSquadError
        }
        
        console.log('Player squad data:', playerSquadData)
        
        const players = playerSquadData.map(ps => ps.players).filter(Boolean)
        console.log('Final players loaded:', players)
        
        if (players && players.length > 0) {
          setSquadPlayers(players)
          
          // Player positions will be loaded by loadExistingGameState after squadPlayers is set
          console.log('Squad players loaded, positions will be restored by loadExistingGameState')
          
          console.log('Squad players set:', players.length, 'players')
          console.log('Bench D players:', benchDPlayers.length, 'players')
          console.log('Bench F players:', benchFPlayers.length, 'players')
          console.log('Rink D players:', rinkDPlayers.length, 'players')
          
          // Load player images
          await loadPlayerImages(players)
        } else {
          console.log('No players found in squad')
          setSquadPlayers([])
          setBenchPlayers([])
        }
      } catch (squadError) {
        console.warn('Could not load squad players, continuing without them:', squadError)
        setSquadPlayers([])
        setBenchPlayers([])
      }
      
      // Load existing game session
      const { data: gameSession, error: gameError } = await supabase
        .from('game_sessions')
        .select('*')
        .eq('session_id', sessionId)
        .maybeSingle() // Use maybeSingle() to handle no results gracefully
      
      if (gameSession) {
        setGameSession(gameSession)
        setIsPlaying(gameSession.is_active)
        setGameStartTime(new Date(gameSession.game_start_time))
        setTotalPlayTime(gameSession.total_play_time_seconds)
        setGoalsFor(gameSession.goals_for)
        setGoalsAgainst(gameSession.goals_against)
        
        if (gameSession.current_play_start_time) {
          setCurrentPlayStartTime(new Date(gameSession.current_play_start_time))
        }
      }
      
      // Load player statuses
      const { data: statuses, error: statusError } = await supabase
        .from('game_player_status')
        .select('*')
        .eq('session_id', sessionId)
      
      if (statuses) {
        const statusMap = {}
        statuses.forEach(status => {
          statusMap[status.player_id] = status
        })
        setPlayerStatuses(statusMap)
        playerStatusesRef.current = statusMap
      }
      
    } catch (error) {
      console.error('Error loading session data:', error)
      setError(error.message)
      setLoading(false)
    } finally {
      setLoading(false)
    }
  }
  
  const startGame = async () => {
    try {
      const now = new Date()
      
      // First check if a game session already exists
      const { data: existingSession, error: checkError } = await supabase
        .from('game_sessions')
        .select('*')
        .eq('session_id', sessionId)
        .maybeSingle() // Use maybeSingle() to handle no results gracefully
      
      let gameSessionData
      
      if (existingSession && !checkError) {
        // Use existing game session
        console.log('Using existing game session:', existingSession)
        gameSessionData = existingSession
        
        // Update it to be active if it isn't already
        if (!existingSession.is_active) {
          const { data: updatedSession, error: updateError } = await supabase
            .from('game_sessions')
            .update({
              is_active: true,
              current_play_start_time: now.toISOString()
            })
            .eq('session_id', sessionId)
            .select()
            .single()
          
          if (updateError) {
            console.error('Error updating existing game session:', updateError)
            throw updateError
          }
          
          gameSessionData = updatedSession
        }
      } else {
        // Create new game session
        console.log('Creating new game session')
        const { data: newSession, error: createError } = await supabase
          .from('game_sessions')
          .insert({
            session_id: sessionId,
            is_active: true,
            game_start_time: now.toISOString(),
            current_play_start_time: now.toISOString(),
            total_play_time_seconds: 0,
            goals_for: 0,
            goals_against: 0
          })
          .select()
          .single()
        
        if (createError) {
          console.error('Error creating new game session:', createError)
          throw createError
        }
        
        gameSessionData = newSession
      }
      
      setGameSession(gameSessionData)
      setGameStartTime(new Date(gameSessionData.game_start_time))
      setCurrentPlayStartTime(new Date(gameSessionData.current_play_start_time))
      setIsPlaying(true)
      
      // Only initialize players if this is a new game session
      if (!existingSession || checkError) {
        console.log('Initializing new game - setting all players to bench')
        
        // Check which players already have status records
        const { data: existingPlayerStatuses, error: checkStatusError } = await supabase
          .from('game_player_status')
          .select('player_id')
          .eq('session_id', sessionId)
        
        if (checkStatusError) {
          console.error('Error checking existing player statuses:', checkStatusError)
          throw checkStatusError
        }
        
        const existingPlayerIds = existingPlayerStatuses?.map(ps => ps.player_id) || []
        console.log('Existing player statuses found for', existingPlayerIds.length, 'players')
        
        // Only create records for players that don't already exist
        const playersToAdd = squadPlayers.filter(player => !existingPlayerIds.includes(player.id))
        
        if (playersToAdd.length > 0) {
          const playerStatusRecords = playersToAdd.map(player => ({
            session_id: sessionId,
            player_id: player.id,
            status: 'bench',
            status_start_time: now.toISOString(),
            status_start_game_time: 0,
            status_start_play_time: 0
          }))
          
          console.log('Creating player status records for', playerStatusRecords.length, 'new players')
          
          const { error: playerStatusError } = await supabase
            .from('game_player_status')
            .insert(playerStatusRecords)
          
          if (playerStatusError) {
            console.error('Error creating player status records:', playerStatusError)
            throw playerStatusError
          }
          
          console.log('Player status records created successfully for', playerStatusRecords.length, 'players')
        } else {
          console.log('All players already have status records - no new records needed')
        }
        
        // Initialize all players on bench with game start time
        const initialStatuses = {}
        squadPlayers.forEach(player => {
          initialStatuses[player.id] = {
            status: 'bench',
            status_start_time: now.toISOString(),
            status_start_game_time: 0,
            status_start_play_time: 0
          }
        })
        setPlayerStatuses(initialStatuses)
        playerStatusesRef.current = initialStatuses
        
        // Reset player timers to ensure clean start
        const initialTimers = {}
        squadPlayers.forEach(player => {
          initialTimers[player.id] = 0
        })
        setPlayerTimers(initialTimers)
      } else {
        console.log('Using existing game session - not resetting player positions')
        // Don't reset player positions - they will be restored by loadExistingGameState
      }
      
      // Record play start event
      await recordGameEvent('play_start', null, now, 0, 0)
      
    } catch (error) {
      console.error('Error starting game:', error)
      console.error('Full error details:', JSON.stringify(error, null, 2))
      alert('Error starting game: ' + (error.message || 'Unknown error'))
    }
  }
  
  const togglePlay = async () => {
    try {
      const now = new Date()
      
      if (isPlaying) {
        // Stop play
        setIsPlaying(false)
        setCurrentPlayStartTime(null)
        setPlayStopTime(now) // Track when play was stopped
        
        // Update game session
        await supabase
          .from('game_sessions')
          .update({
            current_play_start_time: null,
            total_play_time_seconds: totalPlayTime
          })
          .eq('session_id', sessionId)
        
        // Record play stop event
        await recordGameEvent('play_stop', null, now, currentGameTime, totalPlayTime)
        
      } else {
        // Start play
        setIsPlaying(true)
        setCurrentPlayStartTime(now)
        
        // Check if stoppage was long enough to reset all timers
        if (playStopTime) {
          const stoppageDuration = Math.floor((now - playStopTime) / 1000)
          console.log(`Stoppage duration: ${stoppageDuration}s, timeout: ${stoppageTimeout}s`)
          
          if (stoppageDuration >= stoppageTimeout) {
            console.log('Long stoppage detected - resetting all player timers')
            // Reset all player timers to 0
            const resetTimers = {}
            const allPlayers = [
              ...benchDPlayers,
              ...benchFPlayers,
              ...gkPlayers,
              ...rinkDPlayers,
              ...rinkFPlayers,
              ...rinkGkPlayers
            ]
            
            allPlayers.forEach(player => {
              resetTimers[player.id] = 0
            })
            setPlayerTimers(resetTimers)
            
            // Reset all player status start times to now
            const nowISO = now.toISOString()
            const updatedStatuses = {}
            allPlayers.forEach(player => {
              updatedStatuses[player.id] = {
                status: playerStatusesRef.current[player.id]?.status || 'bench',
                status_start_time: nowISO,
                status_start_game_time: currentGameTime,
                status_start_play_time: totalPlayTime
              }
            })
            setPlayerStatuses(updatedStatuses)
            playerStatusesRef.current = updatedStatuses
            
            // Update database with new status times
            const statusUpdates = allPlayers.map(player => ({
              session_id: sessionId,
              player_id: player.id,
              status: updatedStatuses[player.id].status,
              status_start_time: nowISO,
              status_start_game_time: currentGameTime,
              status_start_play_time: totalPlayTime
            }))
            
            await supabase
              .from('game_player_status')
              .upsert(statusUpdates, {
                onConflict: 'session_id,player_id'
              })
          }
        }
        
        setPlayStopTime(null) // Clear stop time
        
        // Update game session
        await supabase
          .from('game_sessions')
          .update({
            current_play_start_time: now.toISOString()
          })
          .eq('session_id', sessionId)
        
        // Record play start event
        await recordGameEvent('play_start', null, now, currentGameTime, totalPlayTime)
      }
      
    } catch (error) {
      console.error('Error toggling play:', error)
      alert('Error toggling play')
    }
  }
  
  const recordGameEvent = async (eventType, playerId, eventTime, gameTime, playTime, metadata = null) => {
    try {
      const { error } = await supabase
        .from('game_events')
        .insert({
          session_id: sessionId,
          event_type: eventType,
          player_id: playerId,
          event_time: eventTime.toISOString(),
          game_time_seconds: gameTime,
          play_time_seconds: playTime,
          metadata: metadata
        })
      
      if (error) throw error
      
    } catch (error) {
      console.error('Error recording game event:', error)
    }
  }
  
  const movePlayer = async (playerId, fromZone, toZone) => {
    try {
      console.log('Moving player:', playerId, 'from', fromZone, 'to', toZone)
      
      const now = new Date()
      const gameTime = currentGameTime
      const playTime = totalPlayTime
      
      // Update local state first (immediate UI feedback)
      const player = squadPlayers.find(p => p.id === playerId)
      if (!player) {
        console.error('Player not found:', playerId)
        return
      }
      
      // Determine if this is a cross-zone move (bench ↔ rink)
      const isFromBench = fromZone === 'bench' || fromZone === 'benchD' || fromZone === 'benchF' || fromZone === 'gk'
      const isToBench = toZone === 'bench' || toZone === 'benchD' || toZone === 'benchF' || toZone === 'gk'
      const isFromRink = fromZone === 'rink' || fromZone === 'rinkD' || fromZone === 'rinkF' || fromZone === 'rinkGk'
      const isToRink = toZone === 'rink' || toZone === 'rinkD' || toZone === 'rinkF' || toZone === 'rinkGk'
      
      const isCrossZoneMove = (isFromBench && isToRink) || (isFromRink && isToBench)
      
      // Determine the effective status for database storage
      const effectiveStatus = isToBench ? 'bench' : 'rink'
      
      // Update player status tracking
      const newStatus = {
        status: effectiveStatus,
        status_start_time: now.toISOString(),
        status_start_game_time: gameTime,
        status_start_play_time: playTime
      }
      
      setPlayerStatuses(prev => {
        const updated = {
          ...prev,
          [playerId]: newStatus
        }
        // Update ref with latest statuses
        playerStatusesRef.current = updated
        return updated
      })
      
      // Force immediate timer update for cross-zone moves
      if (isCrossZoneMove) {
        console.log('Cross-zone move detected, forcing timer update')
        // Update timers immediately with the new status
        setTimeout(() => {
          updatePlayerTimersWithNewStatus(playerId, newStatus)
        }, 100)
      } else {
        // Also update timers for internal moves to ensure consistency
        setTimeout(() => {
          updatePlayerTimers()
        }, 100)
      }
      
      if (fromZone === 'bench' || fromZone === 'benchD' || fromZone === 'benchF') {
        // Remove from any bench column
        setBenchPlayers(prev => prev.filter(p => p.id !== playerId))
        setBenchDPlayers(prev => prev.filter(p => p.id !== playerId))
        setBenchFPlayers(prev => prev.filter(p => p.id !== playerId))
        setRinkPlayers(prev => [...prev, player])
      } else {
        setRinkPlayers(prev => prev.filter(p => p.id !== playerId))
        setBenchPlayers(prev => [...prev, player])
        // Add to bench D by default when coming from rink
        setBenchDPlayers(prev => [...prev, player])
      }
      
      // Update player status in database (don't wait for this)
      console.log('Updating player status in database:', {
        session_id: sessionId,
        player_id: playerId,
        status: effectiveStatus,
        status_start_time: now.toISOString(),
        status_start_game_time: gameTime,
        status_start_play_time: playTime,
        isCrossZoneMove: isCrossZoneMove
      })
      
      supabase
        .from('game_player_status')
        .upsert({
          session_id: sessionId,
          player_id: playerId,
          status: effectiveStatus,
          status_start_time: now.toISOString(),
          status_start_game_time: gameTime,
          status_start_play_time: playTime
        }, {
          onConflict: 'session_id,player_id'
        })
        .then(({ data, error: statusError }) => {
          if (statusError) {
            console.error('Error updating player status:', statusError)
            console.error('Full error details:', JSON.stringify(statusError, null, 2))
          } else {
            console.log('Player status updated successfully:', data)
          }
        })
      
      // Record player event only for cross-zone moves (bench ↔ rink)
      if (isCrossZoneMove) {
        const eventType = isToRink ? 'player_on' : 'player_off'
        console.log(`Recording ${eventType} event for cross-zone move: ${fromZone} -> ${toZone}`)
        recordGameEvent(eventType, playerId, now, gameTime, playTime)
          .catch(error => console.error('Error recording game event:', error))
      } else {
        console.log(`Skipping event recording for internal move: ${fromZone} -> ${toZone}`)
      }
      
    } catch (error) {
      console.error('Error moving player:', error)
      // Revert the UI change if there was an error
      const player = squadPlayers.find(p => p.id === playerId)
      if (player) {
        if (fromZone === 'bench') {
          setRinkPlayers(prev => prev.filter(p => p.id !== playerId))
          setBenchPlayers(prev => [...prev, player])
        } else {
          setBenchPlayers(prev => prev.filter(p => p.id !== playerId))
          setRinkPlayers(prev => [...prev, player])
        }
      }
    }
  }
  
  const recordGoal = async (type) => {
    try {
      const now = new Date()
      
      if (type === 'for') {
        setGoalsFor(prev => prev + 1)
        await supabase
          .from('game_sessions')
          .update({ goals_for: goalsFor + 1 })
          .eq('session_id', sessionId)
      } else {
        setGoalsAgainst(prev => prev + 1)
        await supabase
          .from('game_sessions')
          .update({ goals_against: goalsAgainst + 1 })
          .eq('session_id', sessionId)
      }
      
      // Record goal event
      const allRinkPlayers = [...rinkDPlayers, ...rinkFPlayers, ...rinkGkPlayers]
      await recordGameEvent(`goal_${type}`, null, now, currentGameTime, totalPlayTime, {
        rink_players: allRinkPlayers.map(p => p.id)
      })
      
    } catch (error) {
      console.error('Error recording goal:', error)
      alert('Error recording goal')
    }
  }
  
  const endGame = async () => {
    try {
      const now = new Date()
      
      // Record game end event first to get the exact time
      await recordGameEvent('game_end', null, now, currentGameTime, totalPlayTime)
      
      // Update game session with the same time as the game_end event
      await supabase
        .from('game_sessions')
        .update({
          is_active: false,
          current_play_start_time: null,
          game_end_time: now.toISOString()
        })
        .eq('session_id', sessionId)
      
      // Set game as ended
      setGameHasEnded(true)
      
      // Close confirmation dialog
      setShowEndGameConfirm(false)
      
      // Navigate back to session details
      navigate(`/sessions/${sessionId}`)
      
    } catch (error) {
      console.error('Error ending game:', error)
      alert('Error ending game')
    }
  }
  
  const clearGameData = async () => {
    try {
      console.log('Clearing ALL game data for session:', sessionId)
      
      // First, let's check if we can even see the records that should be deleted
      console.log('Checking existing records before deletion...')
      
      const { data: existingEvents, error: eventsCheckError } = await supabase
        .from('game_events')
        .select('*')
        .eq('session_id', sessionId)
      
      const { data: existingStatuses, error: statusCheckError } = await supabase
        .from('game_player_status')
        .select('*')
        .eq('session_id', sessionId)
      
      const { data: existingSessions, error: sessionCheckError } = await supabase
        .from('game_sessions')
        .select('*')
        .eq('session_id', sessionId)
      
      console.log('Existing records found:')
      console.log('- game_events:', existingEvents?.length || 0)
      console.log('- game_player_status:', existingStatuses?.length || 0)
      console.log('- game_sessions:', existingSessions?.length || 0)
      
      if (eventsCheckError) console.error('Error checking events:', eventsCheckError)
      if (statusCheckError) console.error('Error checking statuses:', statusCheckError)
      if (sessionCheckError) console.error('Error checking sessions:', sessionCheckError)
      
      // Step 1: Clear all game events from database
      console.log('Step 1: Clearing game_events...')
      const { data: eventsData, error: eventsError } = await supabase
        .from('game_events')
        .delete()
        .eq('session_id', sessionId)
        .select()
      
      if (eventsError) {
        console.error('Error clearing game events:', eventsError)
        console.error('Full events error details:', JSON.stringify(eventsError, null, 2))
        throw eventsError
      }
      console.log('✅ Game events cleared. Deleted records:', eventsData?.length || 0)
      
      // Step 2: Clear all player statuses from database
      console.log('Step 2: Clearing game_player_status...')
      const { data: statusData, error: statusError } = await supabase
        .from('game_player_status')
        .delete()
        .eq('session_id', sessionId)
        .select()
      
      if (statusError) {
        console.error('Error clearing player statuses:', statusError)
        console.error('Full status error details:', JSON.stringify(statusError, null, 2))
        throw statusError
      }
      console.log('✅ Player statuses cleared. Deleted records:', statusData?.length || 0)
      
      // Step 3: Clear all game sessions from database
      console.log('Step 3: Clearing game_sessions...')
      const { data: sessionData, error: sessionError } = await supabase
        .from('game_sessions')
        .delete()
        .eq('session_id', sessionId)
        .select()
      
      if (sessionError) {
        console.error('Error clearing game sessions:', sessionError)
        console.error('Full session error details:', JSON.stringify(sessionError, null, 2))
        throw sessionError
      }
      console.log('✅ Game sessions cleared. Deleted records:', sessionData?.length || 0)
      
      // Reset all local state completely
      setGameSession(null)
      setIsPlaying(false)
      setGameStartTime(null)
      setCurrentPlayStartTime(null)
      setTotalPlayTime(0)
      setCurrentGameTime(0)
      setGoalsFor(0)
      setGoalsAgainst(0)
      setPlayerStatuses({})
      setPlayerTimers({})
      
      // Reset all players to bench
      setBenchPlayers([...squadPlayers])
      setRinkPlayers([])
      
      // Split bench players between D and F columns
      const half = Math.ceil(squadPlayers.length / 2)
      setBenchDPlayers(squadPlayers.slice(0, half))
      setBenchFPlayers(squadPlayers.slice(half))
      
      // Clear deleted players set
      setDeletedPlayers(new Set())
      
      // Reset game ended state
      setGameHasEnded(false)
      
      console.log('✅ ALL game data cleared and players reset to bench')
      console.log('Ready for a fresh game start!')
      
      // Verify deletion worked
      console.log('Verifying deletion...')
      const { data: verifyEvents } = await supabase
        .from('game_events')
        .select('*')
        .eq('session_id', sessionId)
      
      const { data: verifyStatuses } = await supabase
        .from('game_player_status')
        .select('*')
        .eq('session_id', sessionId)
      
      const { data: verifySessions } = await supabase
        .from('game_sessions')
        .select('*')
        .eq('session_id', sessionId)
      
      console.log('Records remaining after deletion:')
      console.log('- game_events:', verifyEvents?.length || 0)
      console.log('- game_player_status:', verifyStatuses?.length || 0)
      console.log('- game_sessions:', verifySessions?.length || 0)
      
      if ((verifyEvents?.length || 0) > 0 || (verifyStatuses?.length || 0) > 0 || (verifySessions?.length || 0) > 0) {
        console.warn('⚠️ WARNING: Some records were not deleted!')
        alert('Warning: Some game data may not have been cleared completely. Check console for details.')
      } else {
        console.log('✅ All records successfully deleted!')
      }
      
      setShowClearConfirm(false)
      alert('All game data cleared successfully! Ready to start a fresh game.')
      
    } catch (error) {
      console.error('Error clearing game data:', error)
      console.error('Full error details:', JSON.stringify(error, null, 2))
      alert('Error clearing game data: ' + (error.message || 'Unknown error'))
    }
  }
  
  const deletePlayer = async (playerId) => {
    try {
      console.log('Deleting player from game:', playerId)
      
      // Remove player from all zones (but keep in squadPlayers)
      setBenchPlayers(prev => prev.filter(p => p.id !== playerId))
      setBenchDPlayers(prev => prev.filter(p => p.id !== playerId))
      setBenchFPlayers(prev => prev.filter(p => p.id !== playerId))
      setRinkPlayers(prev => prev.filter(p => p.id !== playerId))
      setGkPlayers(prev => prev.filter(p => p.id !== playerId))
      setRinkDPlayers(prev => prev.filter(p => p.id !== playerId))
      setRinkFPlayers(prev => prev.filter(p => p.id !== playerId))
      setRinkGkPlayers(prev => prev.filter(p => p.id !== playerId))
      
      // Remove player status and timer data
      setPlayerStatuses(prev => {
        const newStatuses = { ...prev }
        delete newStatuses[playerId]
        return newStatuses
      })
      
      setPlayerTimers(prev => {
        const newTimers = { ...prev }
        delete newTimers[playerId]
        return newTimers
      })
      
      // Remove player from database
      const { error: deleteError } = await supabase
        .from('game_player_status')
        .delete()
        .eq('session_id', sessionId)
        .eq('player_id', playerId)
      
      if (deleteError) {
        console.error('Error deleting player from database:', deleteError)
        throw deleteError
      }
      
      // Add player to deleted set and update database
      const newDeletedPlayers = new Set([...deletedPlayers, playerId])
      setDeletedPlayers(newDeletedPlayers)
      
      // Store deleted player event in game_events table
      console.log('Recording player deletion event for:', playerId)
      const { error: eventError } = await supabase
        .from('game_events')
        .insert({
          session_id: sessionId,
          event_type: 'player_deleted',
          player_id: playerId,
          event_time: new Date().toISOString(),
          game_time_seconds: Math.floor((new Date() - gameStartTime) / 1000),
          play_time_seconds: totalPlayTime,
          metadata: {
            deleted_at: new Date().toISOString()
          }
        })
      
      if (eventError) {
        console.error('Error recording player deletion event:', eventError)
        // Don't throw error here as the player is already deleted locally
      } else {
        console.log('Successfully recorded player deletion event')
      }
      
      console.log('Player successfully removed from game')
      setShowDeletePlayerConfirm(false)
      setPlayerToDelete(null)
      
    } catch (error) {
      console.error('Error deleting player:', error)
      alert('Error deleting player')
    }
  }
  
  const handleDeletePlayerClick = (player) => {
    setPlayerToDelete(player)
    setShowDeletePlayerConfirm(true)
  }
  
  // Remove player from all zones
  const removePlayerFromAllZones = (playerId) => {
    console.log(`Removing player ${playerId} from all zones`)
    setBenchPlayers(prev => {
      const filtered = prev.filter(p => p.id !== playerId)
      if (filtered.length !== prev.length) {
        console.log(`Removed from benchPlayers: ${prev.length} -> ${filtered.length}`)
      }
      return filtered
    })
    setBenchDPlayers(prev => {
      const filtered = prev.filter(p => p.id !== playerId)
      if (filtered.length !== prev.length) {
        console.log(`Removed from benchDPlayers: ${prev.length} -> ${filtered.length}`)
      }
      return filtered
    })
    setBenchFPlayers(prev => {
      const filtered = prev.filter(p => p.id !== playerId)
      if (filtered.length !== prev.length) {
        console.log(`Removed from benchFPlayers: ${prev.length} -> ${filtered.length}`)
      }
      return filtered
    })
    setGkPlayers(prev => {
      const filtered = prev.filter(p => p.id !== playerId)
      if (filtered.length !== prev.length) {
        console.log(`Removed from gkPlayers: ${prev.length} -> ${filtered.length}`)
      }
      return filtered
    })
    setRinkPlayers(prev => {
      const filtered = prev.filter(p => p.id !== playerId)
      if (filtered.length !== prev.length) {
        console.log(`Removed from rinkPlayers: ${prev.length} -> ${filtered.length}`)
      }
      return filtered
    })
    setRinkDPlayers(prev => {
      const filtered = prev.filter(p => p.id !== playerId)
      if (filtered.length !== prev.length) {
        console.log(`Removed from rinkDPlayers: ${prev.length} -> ${filtered.length}`)
      }
      return filtered
    })
    setRinkFPlayers(prev => {
      const filtered = prev.filter(p => p.id !== playerId)
      if (filtered.length !== prev.length) {
        console.log(`Removed from rinkFPlayers: ${prev.length} -> ${filtered.length}`)
      }
      return filtered
    })
    setRinkGkPlayers(prev => {
      const filtered = prev.filter(p => p.id !== playerId)
      if (filtered.length !== prev.length) {
        console.log(`Removed from rinkGkPlayers: ${prev.length} -> ${filtered.length}`)
      }
      return filtered
    })
    
    // Update refs to prevent duplicates
    if (currentPositionsRef.current) {
      currentPositionsRef.current.benchD = currentPositionsRef.current.benchD.filter(id => id !== playerId)
      currentPositionsRef.current.benchF = currentPositionsRef.current.benchF.filter(id => id !== playerId)
      currentPositionsRef.current.gk = currentPositionsRef.current.gk.filter(id => id !== playerId)
      currentPositionsRef.current.rinkD = currentPositionsRef.current.rinkD.filter(id => id !== playerId)
      currentPositionsRef.current.rinkF = currentPositionsRef.current.rinkF.filter(id => id !== playerId)
      currentPositionsRef.current.rinkGk = currentPositionsRef.current.rinkGk.filter(id => id !== playerId)
    }
  }

  



  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  
  // Function to get signed URL for player photos
  const getSignedUrlForPlayerPhoto = async (url) => {
    if (!url) return null
    
    try {
      // Extract file path from the URL
      const urlParts = url.split('/')
      const filePath = urlParts.slice(-2).join('/') // Get user_id/filename
      
      const { data: { signedUrl } } = await supabase.storage
        .from('player-photos')
        .createSignedUrl(filePath, 60 * 60 * 24 * 7) // 7 days expiry
      
      return signedUrl
    } catch (err) {
      console.error('Error getting signed URL for player photo:', err)
      return null
    }
  }
  
  // Load player images when squad players are loaded
  const loadPlayerImages = async (players) => {
    const imagePromises = players.map(async (player) => {
      if (player.photo_url) {
        const signedUrl = await getSignedUrlForPlayerPhoto(player.photo_url)
        return { playerId: player.id, imageUrl: signedUrl }
      }
      return { playerId: player.id, imageUrl: null }
    })
    
    const results = await Promise.all(imagePromises)
    const imageMap = {}
    results.forEach(({ playerId, imageUrl }) => {
      imageMap[playerId] = imageUrl
    })
    
    setPlayerImages(imageMap)
  }
  
  // Load existing game state from database
  const loadExistingGameState = async () => {
    try {
      console.log('Loading existing game state for session:', sessionId)
      
      // CRITICAL: Clear all zones first to prevent duplicates
      console.log('Clearing all zones before loading game state...')
      setBenchDPlayers([])
      setBenchFPlayers([])
      setGkPlayers([])
      setRinkDPlayers([])
      setRinkFPlayers([])
      setRinkGkPlayers([])
      
      // Clear refs as well
      currentPositionsRef.current = {
        benchD: [],
        benchF: [],
        gk: [],
        rinkD: [],
        rinkF: [],
        rinkGk: []
      }
      
      // Check if there's a game session (active or ended)
      const { data: gameSessionData, error: sessionError } = await supabase
        .from('game_sessions')
        .select('*')
        .eq('session_id', sessionId)
        .maybeSingle() // Use maybeSingle() to handle no results gracefully
      
      // Load deleted players from game_events table (always do this, even if no game session)
      console.log('Loading deleted players from game_events table...')
      const { data: deletedEvents, error: deletedEventsError } = await supabase
        .from('game_events')
        .select('player_id')
        .eq('session_id', sessionId)
        .eq('event_type', 'player_deleted')
      
      let currentDeletedPlayers = new Set()
      if (deletedEventsError) {
        console.error('Error loading deleted players:', deletedEventsError)
      } else {
        const deletedPlayerIds = deletedEvents.map(event => event.player_id)
        console.log('Found deleted players in database:', deletedPlayerIds)
        currentDeletedPlayers = new Set(deletedPlayerIds)
        setDeletedPlayers(currentDeletedPlayers)
      }

      // Load saved player positions
      console.log('Loading saved player positions...')
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
        console.log('Position event details:', positionEvents[0])
      } else {
        console.log('No saved player positions found')
        if (positionEventsError) {
          console.error('Error loading positions:', positionEventsError)
        }
      }
      
      // Apply saved positions if we have them (regardless of game session)
      if (savedPositions) {
        console.log('Applying saved player positions...')
        
        // Restore players to their saved positions - batch all updates to prevent race conditions
        const zoneUpdates = {}
        const refUpdates = {}
        
        Object.entries(savedPositions).forEach(([zone, playerIds]) => {
          const players = playerIds.map(id => squadPlayers.find(p => p.id === id)).filter(Boolean)
          console.log(`Preparing to restore ${players.length} players to ${zone}:`, players.map(p => p.first_name))
          
          zoneUpdates[zone] = players
          refUpdates[zone] = playerIds
        })
        
        // Apply all updates in a single batch
        if (zoneUpdates.benchD) {
          setBenchDPlayers(zoneUpdates.benchD)
          currentPositionsRef.current.benchD = refUpdates.benchD
        }
        if (zoneUpdates.benchF) {
          setBenchFPlayers(zoneUpdates.benchF)
          currentPositionsRef.current.benchF = refUpdates.benchF
        }
        if (zoneUpdates.gk) {
          setGkPlayers(zoneUpdates.gk)
          currentPositionsRef.current.gk = refUpdates.gk
        }
        if (zoneUpdates.rinkD) {
          setRinkDPlayers(zoneUpdates.rinkD)
          currentPositionsRef.current.rinkD = refUpdates.rinkD
        }
        if (zoneUpdates.rinkF) {
          setRinkFPlayers(zoneUpdates.rinkF)
          currentPositionsRef.current.rinkF = refUpdates.rinkF
        }
        if (zoneUpdates.rinkGk) {
          setRinkGkPlayers(zoneUpdates.rinkGk)
          currentPositionsRef.current.rinkGk = refUpdates.rinkGk
        }
        console.log('Saved positions applied successfully')
      } else {
        // No saved positions found - place all players on bench by default
        console.log('No saved positions found - placing all players on bench by default')
        
        const allPlayers = squadPlayers.filter(player => !currentDeletedPlayers.has(player.id))
        if (allPlayers.length > 0) {
          console.log(`Placing ${allPlayers.length} players on bench by default:`, allPlayers.map(p => p.first_name))
          
          // Split players between bench D and F columns
          const half = Math.ceil(allPlayers.length / 2)
          const benchDPlayers = allPlayers.slice(0, half)
          const benchFPlayers = allPlayers.slice(half)
          
          console.log(`BenchD players:`, benchDPlayers.map(p => p.first_name))
          console.log(`BenchF players:`, benchFPlayers.map(p => p.first_name))
          
          setBenchDPlayers(benchDPlayers)
          setBenchFPlayers(benchFPlayers)
          setGkPlayers([])
          setRinkDPlayers([])
          setRinkFPlayers([])
          setRinkGkPlayers([])
          
          // Update refs
          currentPositionsRef.current = {
            benchD: allPlayers.slice(0, half).map(p => p.id),
            benchF: allPlayers.slice(half).map(p => p.id),
            gk: [],
            rinkD: [],
            rinkF: [],
            rinkGk: []
          }
          
          console.log('Players placed on bench successfully')
        }
      }
      
      if (sessionError || !gameSessionData) {
        console.log('No game session found - players already placed by position logic above')
        return
      }
      
      // Check if game has ended
      if (!gameSessionData.is_active) {
        console.log('Game has ended - cannot restart')
        setGameHasEnded(true)
        setGameSession(gameSessionData)
        return
      }
      
      console.log('Found active game session:', gameSessionData)
      
      // Restore game state
      setGameSession(gameSessionData)
      const gameStartTime = new Date(gameSessionData.game_start_time)
      setGameStartTime(gameStartTime)
      setCurrentGameTime(Math.floor((new Date() - gameStartTime) / 1000))
      setTotalPlayTime(gameSessionData.total_play_time_seconds)
      setGoalsFor(gameSessionData.goals_for)
      setGoalsAgainst(gameSessionData.goals_against)
      
      // Set play state
      const isPlaying = gameSessionData.current_play_start_time ? true : false
      if (gameSessionData.current_play_start_time) {
        setCurrentPlayStartTime(new Date(gameSessionData.current_play_start_time))
        setIsPlaying(true)
      } else {
        setIsPlaying(false)
      }
      
      // Load player statuses
      const { data: playerStatusData, error: statusError } = await supabase
        .from('game_player_status')
        .select('*')
        .eq('session_id', sessionId)
      
      if (statusError) {
        console.error('Error loading player statuses:', statusError)
        return
      }
      
      console.log('Found player statuses:', playerStatusData)
      console.log('Player status details:')
      playerStatusData.forEach(status => {
        console.log(`- Player ${status.player_id}: status=${status.status}, start_time=${status.status_start_time}`)
      })
      
      // Set up player statuses and timers
      const playerStatuses = {}
      const playerTimers = {}
      
      // Set up player statuses and timers for all players with status data
      playerStatusData.forEach(status => {
        const player = squadPlayers.find(p => p.id === status.player_id)
        const isDeleted = currentDeletedPlayers.has(status.player_id)
        if (player && !isDeleted) {
          playerStatuses[status.player_id] = {
            status: status.status,
            status_start_time: status.status_start_time,
            status_start_game_time: status.status_start_game_time,
            status_start_play_time: status.status_start_play_time
          }
          
          // Calculate current timer manually (since state isn't set yet)
          const now = new Date()
          const statusStart = new Date(status.status_start_time)
          
          if (status.status === 'rink') {
            // For rink players: time since going on rink (only during active play)
            if (isPlaying) {
              playerTimers[status.player_id] = Math.floor((now - statusStart) / 1000)
            } else {
              // If not playing, return the time when play was stopped
              const playStopTime = gameSessionData.current_play_start_time ? new Date(gameSessionData.current_play_start_time) : statusStart
              playerTimers[status.player_id] = Math.floor((playStopTime - statusStart) / 1000)
            }
          } else {
            // For bench players: time since coming off rink or since game start
            if (isPlaying) {
              playerTimers[status.player_id] = Math.floor((now - statusStart) / 1000)
            } else {
              // If not playing, return the time when play was stopped
              const playStopTime = gameSessionData.current_play_start_time ? new Date(gameSessionData.current_play_start_time) : statusStart
              playerTimers[status.player_id] = Math.floor((playStopTime - statusStart) / 1000)
            }
          }
        }
      })
      
      // Set the restored state
      console.log('Setting restored state:')
      console.log('- playerStatuses:', Object.keys(playerStatuses).length)
      
      // Set the status and timer data
      setPlayerStatuses(playerStatuses)
      setPlayerTimers(playerTimers)
      
      console.log('Game state restored successfully')
      
    } catch (error) {
      console.error('Error loading existing game state:', error)
    }
  }
  
  // Calculate background color based on player status and time
  const getPlayerCardColor = (playerId, status) => {
    const timeInSeconds = playerTimers[playerId] || 0
    
    if (status === 'rink') {
      // Rink players: gradual fade from light green (0s) to light red (120s) to dark red (180s)
      if (timeInSeconds <= 120) {
        // Fade from light green to light red (0-120 seconds)
        const fadeProgress = timeInSeconds / 120 // 0 to 1
        if (fadeProgress < 0.33) {
          return 'bg-green-100' // Light green
        } else if (fadeProgress < 0.66) {
          return 'bg-green-200' // Medium green
        } else {
          return 'bg-red-100' // Light red
        }
      } else if (timeInSeconds <= 180) {
        // Fade from light red to dark red (120-180 seconds)
        const fadeProgress = (timeInSeconds - 120) / 60 // 0 to 1
        if (fadeProgress < 0.5) {
          return 'bg-red-200' // Medium red
        } else {
          return 'bg-red-300' // Dark red
        }
      } else {
        return 'bg-red-400' // Very dark red after 180 seconds
      }
    } else {
      // Bench players: yellow (0-60s) -> white (60-120s) -> fade to blue (120-300s)
      if (timeInSeconds <= 60) {
        return 'bg-yellow-100' // Yellow for first 60 seconds
      } else if (timeInSeconds <= 120) {
        return 'bg-white' // White for next 60 seconds
      } else if (timeInSeconds <= 300) {
        // Fade from white to blue between 120-300 seconds
        const fadeProgress = (timeInSeconds - 120) / 180 // 0 to 1
        if (fadeProgress < 0.3) {
          return 'bg-blue-50' // Very light blue
        } else if (fadeProgress < 0.6) {
          return 'bg-blue-100' // Light blue
        } else {
          return 'bg-blue-200' // Medium blue
        }
      } else {
        return 'bg-blue-300' // Full blue after 300 seconds
      }
    }
  }
  
  // Calculate player time based on current status and game state
  const calculatePlayerTime = (playerId, currentStatus, statusStartTime) => {
    try {
      if (!gameStartTime || !statusStartTime) return 0
      
      const now = new Date()
      const statusStart = new Date(statusStartTime)
      const gameStart = new Date(gameStartTime)
      
      // Validate the date
      if (isNaN(statusStart.getTime())) {
        console.error(`Invalid statusStartTime for player ${playerId}:`, statusStartTime)
        return 0
      }
      
      // Determine the effective start time for timer calculation
      let effectiveStartTime
      if (statusStart <= gameStart) {
        // Player was moved to current position before or at game start
        // Use game start time as the effective start time
        effectiveStartTime = gameStart
      } else {
        // Player was moved to current position after game start
        // Use status start time (when they were moved)
        effectiveStartTime = statusStart
      }
      
      // Calculate time based on play state
      let timeElapsed
      if (isPlaying) {
        // Game is playing - calculate time from status start to now
        timeElapsed = Math.floor((now - effectiveStartTime) / 1000)
      } else {
        // Game is paused - calculate time from status start to when play was stopped
        if (currentPlayStartTime) {
          // Play was stopped - calculate time from status start to when play stopped
          const playStopTime = new Date(currentPlayStartTime)
          timeElapsed = Math.floor((playStopTime - effectiveStartTime) / 1000)
        } else {
          // Game hasn't started playing yet - time is 0
          timeElapsed = 0
        }
      }
      
      // Debug logging for timer calculations
      if (timeElapsed < 5) { // Only log for recent moves
        console.log(`Timer calculation for player ${playerId}:`, {
          currentStatus,
          statusStartTime,
          gameStartTime: gameStart.toISOString(),
          effectiveStartTime: effectiveStartTime.toISOString(),
          now: now.toISOString(),
          timeElapsed,
          isPlaying,
          currentPlayStartTime,
          wasMovedBeforeGameStart: statusStart <= gameStart
        })
      }
      
      return timeElapsed
    } catch (error) {
      console.error(`Error in calculatePlayerTime for player ${playerId}:`, error)
      return 0
    }
  }
  
  // Update all player timers
  const updatePlayerTimers = () => {
    console.log('updatePlayerTimers called')
    
    // Don't update timers if we don't have game data yet
    if (!gameStartTime || Object.keys(playerStatuses).length === 0) {
      console.log('Skipping timer update - no game data yet')
      return
    }
    
    const newTimers = {}
    
    // Update all players from all zones
    const allPlayers = [
      ...benchDPlayers,
      ...benchFPlayers,
      ...gkPlayers,
      ...rinkDPlayers,
      ...rinkFPlayers,
      ...rinkGkPlayers
    ]
    
    console.log('Updating timers for', allPlayers.length, 'players')
    
    allPlayers.forEach(player => {
      // Use ref to get the latest player statuses
      const status = playerStatusesRef.current[player.id]
      if (status && status.status_start_time) {
        // Determine if player is on rink or bench based on which zone they're in
        const isOnRink = rinkDPlayers.some(p => p.id === player.id) || 
                        rinkFPlayers.some(p => p.id === player.id) || 
                        rinkGkPlayers.some(p => p.id === player.id)
        
        try {
          const calculatedTime = calculatePlayerTime(
            player.id, 
            isOnRink ? 'rink' : 'bench', 
            status.status_start_time
          )
          newTimers[player.id] = calculatedTime
          console.log(`Player ${player.first_name} timer: ${calculatedTime}s (${isOnRink ? 'rink' : 'bench'})`)
        } catch (error) {
          console.error(`Error calculating time for player ${player.id}:`, error)
          newTimers[player.id] = 0
        }
      } else {
        newTimers[player.id] = 0
        console.log(`Player ${player.first_name} has no status, timer set to 0`)
      }
    })

    console.log('Setting new timers:', newTimers)
    setPlayerTimers(newTimers)
  }

  // Update player timers with a specific new status (for immediate updates)
  const updatePlayerTimersWithNewStatus = (playerId, newStatus) => {
    console.log('updatePlayerTimersWithNewStatus called for player:', playerId)
    
    // Update the specific player's timer with the new status
    setPlayerTimers(prev => {
      const updatedTimers = { ...prev }
      
      // Determine if player is on rink or bench based on current zone
      const isOnRink = rinkDPlayers.some(p => p.id === playerId) || 
                      rinkFPlayers.some(p => p.id === playerId) || 
                      rinkGkPlayers.some(p => p.id === playerId)
      
      try {
        const calculatedTime = calculatePlayerTime(
          playerId, 
          isOnRink ? 'rink' : 'bench', 
          newStatus.status_start_time
        )
        updatedTimers[playerId] = calculatedTime
        console.log(`Player timer updated immediately: ${calculatedTime}s (${isOnRink ? 'rink' : 'bench'})`)
      } catch (error) {
        console.error(`Error calculating time for player ${playerId}:`, error)
        updatedTimers[playerId] = 0
      }
      
      return updatedTimers
    })
  }

  // Debounced save function to prevent multiple rapid saves
  const saveTimeoutRef = useRef(null)
  const isSavingRef = useRef(false)
  
  // Track current positions in refs for immediate access
  const currentPositionsRef = useRef({
    benchD: [],
    benchF: [],
    gk: [],
    rinkD: [],
    rinkF: [],
    rinkGk: []
  })
  
  // Helper function to update both state and ref
  const updatePlayerPositions = (zone, players) => {
    // Update state
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
    
    // Update ref immediately
    currentPositionsRef.current[zone] = players.map(p => p.id)
    console.log(`Updated ${zone} positions:`, currentPositionsRef.current[zone])
  }
  
  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])
  
  // Initialize refs when component mounts
  useEffect(() => {
    if (squadPlayers.length > 0) {
      // Initialize refs with current state
      currentPositionsRef.current = {
        benchD: benchDPlayers.map(p => p.id),
        benchF: benchFPlayers.map(p => p.id),
        gk: gkPlayers.map(p => p.id),
        rinkD: rinkDPlayers.map(p => p.id),
        rinkF: rinkFPlayers.map(p => p.id),
        rinkGk: rinkGkPlayers.map(p => p.id)
      }
      console.log('Initialized refs with current state:', currentPositionsRef.current)
    }
  }, [squadPlayers, benchDPlayers, benchFPlayers, gkPlayers, rinkDPlayers, rinkFPlayers, rinkGkPlayers])
  
  const savePlayerPositions = async () => {
    console.log('savePlayerPositions called, isSaving:', isSavingRef.current, 'saveTimeout:', !!saveTimeoutRef.current)
    
    // Prevent multiple simultaneous saves
    if (isSavingRef.current) {
      console.log('Save already in progress, skipping...')
      return
    }
    
    // Clear any existing timeout
    if (saveTimeoutRef.current) {
      console.log('Clearing existing timeout')
      clearTimeout(saveTimeoutRef.current)
    }
    
    // Set a new timeout to save after 500ms of inactivity
    const timeout = setTimeout(async () => {
      console.log('Timeout triggered, starting save...')
      isSavingRef.current = true
      try {
        // Use ref values for immediate access to current positions
        const positions = {
          benchD: currentPositionsRef.current.benchD,
          benchF: currentPositionsRef.current.benchF,
          gk: currentPositionsRef.current.gk,
          rinkD: currentPositionsRef.current.rinkD,
          rinkF: currentPositionsRef.current.rinkF,
          rinkGk: currentPositionsRef.current.rinkGk
        }
        
        // If refs are empty, fall back to state values
        if (positions.benchD.length === 0 && positions.benchF.length === 0) {
          console.log('Refs are empty, falling back to state values')
          positions.benchD = benchDPlayers.map(p => p.id)
          positions.benchF = benchFPlayers.map(p => p.id)
          positions.gk = gkPlayers.map(p => p.id)
          positions.rinkD = rinkDPlayers.map(p => p.id)
          positions.rinkF = rinkFPlayers.map(p => p.id)
          positions.rinkGk = rinkGkPlayers.map(p => p.id)
        }
        
        console.log('Saving player positions (debounced):', positions)
        console.log('rinkD players being saved:', positions.rinkD)
        console.log('benchD players being saved:', positions.benchD)
        console.log('benchF players being saved:', positions.benchF)
        
        // If rinkD is empty, try to get the current state directly
        if (positions.rinkD.length === 0) {
          console.log('rinkD is empty, checking current state...')
          console.log('Current rinkDPlayers state:', rinkDPlayers)
          console.log('Current rinkDPlayers length:', rinkDPlayers.length)
        }
        
        const { data, error } = await supabase
          .from('game_events')
          .insert({
            session_id: sessionId,
            event_type: 'player_positions',
            event_time: new Date().toISOString(),
            game_time_seconds: Math.floor((new Date() - gameStartTime) / 1000),
            play_time_seconds: totalPlayTime,
            metadata: positions
          })
          .select()
        
        if (error) {
          console.error('Error saving player positions:', error)
          console.error('Full error details:', JSON.stringify(error, null, 2))
        } else {
          console.log('Player positions saved successfully:', data)
        }
      } catch (error) {
        console.error('Error in savePlayerPositions:', error)
      } finally {
        isSavingRef.current = false
        console.log('Save completed, isSaving reset to false')
      }
    }, 500)
    
    console.log('Setting new timeout:', timeout)
    saveTimeoutRef.current = timeout
  }
  
  const handleDragStart = (e, player) => {
    setDraggedPlayer(player)
    e.dataTransfer.effectAllowed = 'move'
  }
  
  const handleDragOver = (e, zone) => {
    e.preventDefault()
    setDragOverZone(zone)
    
    // Calculate insertion position within the column
    const rect = e.currentTarget.getBoundingClientRect()
    const mouseY = e.clientY - rect.top
    
    // Get the player container (the grid with players)
    const playerContainer = e.currentTarget.querySelector('.grid')
    if (playerContainer) {
      const containerRect = playerContainer.getBoundingClientRect()
      const containerTop = containerRect.top - rect.top
      const containerHeight = containerRect.height
      
      // Calculate position relative to the player container
      const relativeY = mouseY - containerTop
      const relativePosition = Math.max(0, Math.min(1, relativeY / containerHeight))
      
      setDragOverPosition(relativePosition)
    } else {
      // Fallback to column height if container not found
      const columnHeight = rect.height
      const relativePosition = mouseY / columnHeight
      setDragOverPosition(relativePosition)
    }
  }
  
  const handleDragLeave = () => {
    setDragOverZone(null)
    setDragOverPosition(null)
  }
  
  const handleDrop = (e, targetZone) => {
    e.preventDefault()
    
    if (!draggedPlayer || !targetZone) {
      setDraggedPlayer(null)
      setDragOverZone(null)
      setDragOverPosition(null)
      return
    }

    console.log(`Moving player ${draggedPlayer.first_name} to ${targetZone}`)
    
    // Find which zone the player is currently in
    let currentZone = null
    if (benchDPlayers.find(p => p.id === draggedPlayer.id)) {
      currentZone = 'benchD'
    } else if (benchFPlayers.find(p => p.id === draggedPlayer.id)) {
      currentZone = 'benchF'
    } else if (gkPlayers.find(p => p.id === draggedPlayer.id)) {
      currentZone = 'gk'
    } else if (rinkDPlayers.find(p => p.id === draggedPlayer.id)) {
      currentZone = 'rinkD'
    } else if (rinkFPlayers.find(p => p.id === draggedPlayer.id)) {
      currentZone = 'rinkF'
    } else if (rinkGkPlayers.find(p => p.id === draggedPlayer.id)) {
      currentZone = 'rinkGk'
    }

    if (!currentZone) {
      console.error(`Player ${draggedPlayer.first_name} not found in any zone`)
      setDraggedPlayer(null)
      setDragOverZone(null)
      setDragOverPosition(null)
      return
    }

    // If moving to the same zone, just reorder
    if (currentZone === targetZone) {
      console.log(`Reordering ${draggedPlayer.first_name} within ${targetZone}`)
      movePlayerToZone(draggedPlayer, targetZone, dragOverPosition || 0)
    } else {
      // Moving to a different zone
      console.log(`Moving ${draggedPlayer.first_name} from ${currentZone} to ${targetZone}`)
      
      // Check if this is a cross-zone move (bench ↔ rink)
      const isFromBench = ['benchD', 'benchF', 'gk'].includes(currentZone)
      const isToBench = ['benchD', 'benchF', 'gk'].includes(targetZone)
      
      if (isFromBench !== isToBench) {
        // Cross-zone move - record database event
        recordPlayerMove(draggedPlayer.id, currentZone, targetZone)
      }
      
      // Move the player
      movePlayerToZone(draggedPlayer, targetZone, dragOverPosition || 0)
    }

    // Save positions after a short delay
    setTimeout(() => {
      savePlayerPositions()
    }, 100)
    
    setDraggedPlayer(null)
    setDragOverZone(null)
    setDragOverPosition(null)
  }

  // Touch event handlers for mobile support
  const handleTouchStart = (e, player) => {
    if (e.touches.length !== 1) return // Only handle single touch
    
    const touch = e.touches[0]
    setTouchStartPos({ x: touch.clientX, y: touch.clientY })
    setTouchMoved(false)
    setIsDragging(false)
    setDraggedPlayer(player)
  }

  const handleTouchMove = (e) => {
    if (!touchStartPos || !draggedPlayer) return
    
    const touch = e.touches[0]
    const deltaX = Math.abs(touch.clientX - touchStartPos.x)
    const deltaY = Math.abs(touch.clientY - touchStartPos.y)
    
    // If moved more than 10px, consider it a drag
    if (deltaX > 10 || deltaY > 10) {
      setTouchMoved(true)
      setIsDragging(true)
      e.preventDefault() // Prevent scrolling
      
      // Find the drop zone under the touch point
      const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY)
      if (elementBelow) {
        const dropZone = elementBelow.closest('[data-drop-zone]')
        if (dropZone) {
          const zone = dropZone.dataset.dropZone
          setDragOverZone(zone)
          
          // Calculate position within the zone
          const rect = dropZone.getBoundingClientRect()
          const relativeY = touch.clientY - rect.top
          const position = Math.min(Math.max(0, relativeY / rect.height), 1)
          setDragOverPosition(position)
        }
      }
    }
  }

  const handleTouchEnd = (e) => {
    if (!draggedPlayer || !touchMoved) {
      setDraggedPlayer(null)
      setTouchStartPos(null)
      setTouchMoved(false)
      setIsDragging(false)
      setDragOverZone(null)
      setDragOverPosition(null)
      return
    }

    // Find the drop zone under the touch point
    const touch = e.changedTouches[0]
    const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY)
    
    if (elementBelow) {
      const dropZone = elementBelow.closest('[data-drop-zone]')
      if (dropZone && dragOverZone) {
        handleDrop(e, dragOverZone)
        return
      }
    }

    // If no valid drop zone, reset
    setDraggedPlayer(null)
    setTouchStartPos(null)
    setTouchMoved(false)
    setIsDragging(false)
    setDragOverZone(null)
    setDragOverPosition(null)
  }

  // Simple function to move a player to any zone
  const movePlayerToZone = (player, targetZone, position) => {
    console.log(`Moving ${player.first_name} to ${targetZone} at position ${position}`)
    
    // First remove player from all zones
    setBenchDPlayers(prev => prev.filter(p => p.id !== player.id))
    setBenchFPlayers(prev => prev.filter(p => p.id !== player.id))
    setGkPlayers(prev => prev.filter(p => p.id !== player.id))
    setRinkDPlayers(prev => prev.filter(p => p.id !== player.id))
    setRinkFPlayers(prev => prev.filter(p => p.id !== player.id))
    setRinkGkPlayers(prev => prev.filter(p => p.id !== player.id))
    
    // Then add player to target zone
    const addToZone = (setter) => {
      setter(prev => {
        const insertIndex = Math.floor(position * (prev.length + 1))
        const clampedIndex = Math.max(0, Math.min(insertIndex, prev.length))
        const newPlayers = [...prev]
        newPlayers.splice(clampedIndex, 0, player)
        
        console.log(`Added ${player.first_name} to ${targetZone} at position ${clampedIndex}`)
        return newPlayers
      })
    }
    
    switch (targetZone) {
      case 'benchD':
        addToZone(setBenchDPlayers)
        break
      case 'benchF':
        addToZone(setBenchFPlayers)
        break
      case 'gk':
        addToZone(setGkPlayers)
        break
      case 'rinkD':
        addToZone(setRinkDPlayers)
        break
      case 'rinkF':
        addToZone(setRinkFPlayers)
        break
      case 'rinkGk':
        addToZone(setRinkGkPlayers)
        break
      default:
        console.error(`Invalid target zone: ${targetZone}`)
    }
  }

  // Simple function to record player moves in the database
  const recordPlayerMove = async (playerId, fromZone, toZone) => {
    try {
      const now = new Date()
      const currentGameTime = gameStartTime ? Math.floor((now - gameStartTime) / 1000) : 0
      
      // Determine the effective status for database storage
      const isFromBench = ['benchD', 'benchF', 'gk'].includes(fromZone)
      const isToBench = ['benchD', 'benchF', 'gk'].includes(toZone)
      const isFromRink = ['rinkD', 'rinkF', 'rinkGk'].includes(fromZone)
      const isToRink = ['rinkD', 'rinkF', 'rinkGk'].includes(toZone)
      
      // Only record events for cross-zone moves (bench ↔ rink)
      if (isFromBench && isToRink) {
        // Player going from bench to rink
        console.log(`Recording player_on event for player ${playerId}`)
        await recordGameEvent(
          'player_on',
          playerId,
          now,
          currentGameTime,
          totalPlayTime,
          { from_zone: fromZone, to_zone: toZone }
        )
      } else if (isFromRink && isToBench) {
        // Player going from rink to bench
        console.log(`Recording player_off event for player ${playerId}`)
        await recordGameEvent(
          'player_off',
          playerId,
          now,
          currentGameTime,
          totalPlayTime,
          { from_zone: fromZone, to_zone: toZone }
        )
      } else {
        // Moving within the same zone type (bench to bench, or rink to rink) - no database events needed
        console.log(`Internal move within same zone type: ${fromZone} to ${toZone} - no database events`)
        return
      }
      
      // Update player status in game_player_status table
      const effectiveStatus = isToBench ? 'bench' : 'rink'
      const { error: statusError } = await supabase
        .from('game_player_status')
        .upsert({
          session_id: sessionId,
          player_id: playerId,
          status: effectiveStatus,
          status_start_time: now.toISOString(),
          status_start_game_time: currentGameTime,
          status_start_play_time: totalPlayTime,
          updated_at: now.toISOString()
        }, {
          onConflict: 'session_id,player_id'
        })
      
      if (statusError) {
        console.error('Error updating player status:', statusError)
      }
      
      // Update local state for immediate UI feedback
      // Reset player status start time and timer for cross-zone moves
      const newStatus = {
        player_id: playerId,
        status: effectiveStatus,
        status_start_time: now.toISOString(),
        status_start_game_time: currentGameTime,
        status_start_play_time: totalPlayTime
      }
      
      setPlayerStatuses(prev => {
        const updated = {
          ...prev,
          [playerId]: newStatus
        }
        // Also update the ref immediately so updatePlayerTimers uses correct data
        playerStatusesRef.current = updated
        return updated
      })
      
      // Reset player timer to 0 for cross-zone moves
      setPlayerTimers(prev => ({
        ...prev,
        [playerId]: 0
      }))
      
      console.log(`Reset timer and status for player ${playerId} - new status: ${effectiveStatus}`)
      
    } catch (error) {
      console.error('Error recording player move:', error)
    }
  }
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-4 game-management-container flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading game management...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 p-4 game-management-container flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <p className="font-bold">Error loading game data:</p>
            <p>{error}</p>
          </div>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 game-management-container">
      {/* Game Clock Controls */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-4">
        <div className="flex items-center justify-between mb-4">
          <Link
            to={orgId ? `/organisations/${orgId}/sessions/${sessionId}` : `/sessions/${sessionId}`}
            className="text-gray-600 hover:text-gray-800 font-medium flex items-center space-x-1"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>Back to Session</span>
          </Link>
          <h1 className="text-2xl font-bold text-gray-800 text-center">
            Game Management
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
          <button
            onClick={() => setShowSettings(true)}
            className="text-gray-600 hover:text-gray-800 p-2 rounded-lg hover:bg-gray-100 transition-colors"
            title="Settings"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
        
        {/* Game Ended Message */}
        {gameHasEnded && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-center">
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600 mb-2">Game Ended</div>
                <div className="text-gray-600 mb-4">
                  This game has been completed and cannot be restarted.
                </div>
                <div className="flex space-x-4 justify-center">
                  <button
                    onClick={() => navigate(`/sessions/${sessionId}/game-stats`)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                  >
                    View Game Stats
                  </button>
                  <button
                    onClick={() => setShowClearConfirm(true)}
                    className="bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 transition-colors"
                  >
                    Clear Game Data
                  </button>
                  <button
                    onClick={() => navigate(`/sessions/${sessionId}`)}
                    className="bg-gray-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-700 transition-colors"
                  >
                    Back to Session
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Timer Display */}
        {!gameHasEnded && (
          <div className="flex justify-center mb-4">
            <div className="bg-blue-50 rounded-lg p-3">
              <div className="text-sm text-blue-600 font-medium">Game Time</div>
              <div className="text-2xl font-bold text-blue-800 timer-display">
                {formatTime(currentGameTime)}
              </div>
            </div>
          </div>
        )}
        
        {/* Game Controls */}
        {!gameHasEnded && (
          <div className="flex gap-2 justify-center">
            {!gameStartTime ? (
              <button
                onClick={startGame}
                className="bg-green-600 text-white px-6 py-3 rounded-lg font-medium"
              >
                Start Game
              </button>
            ) : (
              <div className="flex space-x-3">
                <button
                  onClick={togglePlay}
                  className={`px-6 py-3 rounded-lg font-medium ${
                    isPlaying 
                      ? 'bg-red-600 text-white' 
                      : 'bg-green-600 text-white'
                  }`}
                >
                  {isPlaying ? 'Stop Play' : 'Start Play'}
                </button>
                <button
                  onClick={() => setShowEndGameConfirm(true)}
                  className="bg-gray-600 text-white px-6 py-3 rounded-lg font-medium"
                >
                  End Game
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Player Management */}
      {!gameHasEnded && (
        <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Bench - Two Columns + GK Row */}
        <div className="bg-blue-50 rounded-lg p-3 min-h-[300px]">
          <h3 className="text-lg font-semibold text-blue-800 mb-2">Bench</h3>
          <div className="space-y-4">
            {/* D and F Columns Row */}
            <div className="grid grid-cols-2 gap-4">
            {/* Bench D Column */}
            <div
              className={`bg-blue-100 rounded-lg p-2 min-h-[250px] ${
                dragOverZone === 'benchD' ? 'drag-over' : ''
              }`}
              data-drop-zone="benchD"
              onDragOver={(e) => handleDragOver(e, 'benchD')}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, 'benchD')}
            >
              <h4 className="text-md font-semibold text-blue-900 mb-2 text-center">D</h4>
                <div className="grid grid-cols-1 gap-1 relative">
                  {/* Insertion indicator */}
                  {dragOverZone === 'benchD' && draggedPlayer && (
                    <div 
                      className="absolute w-full h-0.5 bg-blue-500 z-10 pointer-events-none"
                      style={{
                        top: `${(dragOverPosition || 0) * 100}%`,
                        transform: 'translateY(-50%)'
                      }}
                    />
                  )}
                  {benchDPlayers.map(player => (
                  <div
                    key={player.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, { ...player, status: 'benchD' })}
                    onTouchStart={(e) => handleTouchStart(e, { ...player, status: 'benchD' })}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    className={`${getPlayerCardColor(player.id, 'bench')} rounded p-1.5 shadow-sm cursor-move hover:shadow-md transition-all duration-300 player-card player-bench no-select touch-manipulation`}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center flex-1 min-w-0">
                        <div className="w-6 h-6 rounded-full overflow-hidden mr-2 flex-shrink-0">
                          {playerImages[player.id] ? (
                            <img 
                              src={playerImages[player.id]} 
                              alt={`${player.first_name} ${player.last_name}`}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.style.display = 'none'
                                e.target.nextSibling.style.display = 'flex'
                              }}
                            />
                          ) : null}
                          <div 
                            className={`w-full h-full bg-gray-300 flex items-center justify-center text-xs font-medium ${
                              playerImages[player.id] ? 'hidden' : 'flex'
                            }`}
                          >
                            {player.first_name.charAt(0)}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-gray-800 text-sm truncate">
                            {player.first_name} #{player.jersey_number}
                          </div>
                          <div className="text-xs text-gray-600">
                            {formatTime(playerTimers[player.id] || 0)}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeletePlayerClick(player)
                        }}
                        className="ml-1 text-red-500 hover:text-red-700 text-xs px-0.5 py-0.5 rounded"
                        title="Delete player"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bench F Column */}
            <div
              className={`bg-blue-100 rounded-lg p-2 min-h-[250px] ${
                dragOverZone === 'benchF' ? 'drag-over' : ''
              }`}
              data-drop-zone="benchF"
              onDragOver={(e) => handleDragOver(e, 'benchF')}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, 'benchF')}
            >
              <h4 className="text-md font-semibold text-blue-900 mb-2 text-center">F</h4>
              <div className="grid grid-cols-1 gap-1 relative">
                {/* Insertion indicator */}
                {dragOverZone === 'benchF' && draggedPlayer && (
                  <div 
                    className="absolute w-full h-0.5 bg-blue-500 z-10 pointer-events-none"
                    style={{
                      top: `${(dragOverPosition || 0) * 100}%`,
                      transform: 'translateY(-50%)'
                    }}
                  />
                )}
                {benchFPlayers.map(player => (
                  <div
                    key={player.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, { ...player, status: 'benchF' })}
                    onTouchStart={(e) => handleTouchStart(e, { ...player, status: 'benchF' })}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    className={`${getPlayerCardColor(player.id, 'bench')} rounded p-1.5 shadow-sm cursor-move hover:shadow-md transition-all duration-300 player-card player-bench no-select touch-manipulation`}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center flex-1 min-w-0">
                        <div className="w-6 h-6 rounded-full overflow-hidden mr-2 flex-shrink-0">
                          {playerImages[player.id] ? (
                            <img 
                              src={playerImages[player.id]} 
                              alt={`${player.first_name} ${player.last_name}`}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.style.display = 'none'
                                e.target.nextSibling.style.display = 'flex'
                              }}
                            />
                          ) : null}
                          <div 
                            className={`w-full h-full bg-gray-300 flex items-center justify-center text-xs font-medium ${
                              playerImages[player.id] ? 'hidden' : 'flex'
                            }`}
                          >
                            {player.first_name.charAt(0)}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-gray-800 text-sm truncate">
                            {player.first_name} #{player.jersey_number}
                          </div>
                          <div className="text-xs text-gray-600">
                            {formatTime(playerTimers[player.id] || 0)}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeletePlayerClick(player)
                        }}
                        className="ml-1 text-red-500 hover:text-red-700 text-xs px-0.5 py-0.5 rounded"
                        title="Delete player"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            </div>

            {/* GK Row */}
            <div
              className={`bg-purple-100 rounded-lg p-2 min-h-[100px] ${
                dragOverZone === 'gk' ? 'drag-over' : ''
              }`}
              data-drop-zone="gk"
              onDragOver={(e) => handleDragOver(e, 'gk')}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, 'gk')}
            >
              <h4 className="text-md font-semibold text-purple-900 mb-2 text-center">Goal Keeper (GK)</h4>
              <div className="grid grid-cols-1 gap-1 relative">
                {/* Insertion indicator */}
                {dragOverZone === 'gk' && draggedPlayer && (
                  <div 
                    className="absolute w-full h-0.5 bg-purple-500 z-10 pointer-events-none"
                    style={{
                      top: `${(dragOverPosition || 0) * 100}%`,
                      transform: 'translateY(-50%)'
                    }}
                  />
                )}
                {gkPlayers.map(player => (
                  <div
                    key={player.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, { ...player, status: 'gk' })}
                    onTouchStart={(e) => handleTouchStart(e, { ...player, status: 'gk' })}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    className={`${getPlayerCardColor(player.id, 'bench')} rounded p-1.5 shadow-sm cursor-move hover:shadow-md transition-all duration-300 player-card player-gk no-select touch-manipulation`}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center flex-1 min-w-0">
                        <div className="w-6 h-6 rounded-full overflow-hidden mr-2 flex-shrink-0">
                          {playerImages[player.id] ? (
                            <img 
                              src={playerImages[player.id]} 
                              alt={`${player.first_name} ${player.last_name}`}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.style.display = 'none'
                                e.target.nextSibling.style.display = 'flex'
                              }}
                            />
                          ) : null}
                          <div 
                            className={`w-full h-full bg-gray-300 flex items-center justify-center text-xs font-medium ${
                              playerImages[player.id] ? 'hidden' : 'flex'
                            }`}
                          >
                            {player.first_name.charAt(0)}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-gray-800 text-sm truncate">
                            {player.first_name} #{player.jersey_number}
                          </div>
                          <div className="text-xs text-gray-600">
                            {formatTime(playerTimers[player.id] || 0)}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeletePlayerClick(player)
                        }}
                        className="ml-1 text-red-500 hover:text-red-700 text-xs px-0.5 py-0.5 rounded"
                        title="Delete player"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        
        {/* Rink - Two Columns + GK Row */}
        <div 
          className={`bg-green-50 rounded-lg p-3 min-h-[300px] player-column`}
        >
          <h3 className="text-lg font-semibold text-green-800 mb-2">On Rink</h3>
          <div className="space-y-4">
            {/* D and F Columns Row */}
            <div className="grid grid-cols-2 gap-4">
              {/* Rink D Column */}
              <div 
                className={`bg-green-100 rounded-lg p-2 min-h-[250px] ${
                  dragOverZone === 'rinkD' ? 'drag-over' : ''
                }`}
                data-drop-zone="rinkD"
                onDragOver={(e) => handleDragOver(e, 'rinkD')}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, 'rinkD')}
              >
                <h4 className="text-md font-semibold text-green-900 mb-2 text-center">D</h4>
                <div className="grid grid-cols-1 gap-1 relative">
                  {/* Insertion indicator */}
                  {dragOverZone === 'rinkD' && draggedPlayer && (
                    <div 
                      className="absolute w-full h-0.5 bg-green-500 z-10 pointer-events-none"
                      style={{
                        top: `${(dragOverPosition || 0) * 100}%`,
                        transform: 'translateY(-50%)'
                      }}
                    />
                  )}
                  {rinkDPlayers.map(player => (
                    <div
                      key={player.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, { ...player, status: 'rinkD' })}
                      onTouchStart={(e) => handleTouchStart(e, { ...player, status: 'rinkD' })}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
                      className={`${getPlayerCardColor(player.id, 'rink')} rounded p-1.5 shadow-sm cursor-move hover:shadow-md transition-all duration-300 player-card player-rink no-select touch-manipulation`}
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center flex-1 min-w-0">
                          <div className="w-6 h-6 rounded-full overflow-hidden mr-2 flex-shrink-0">
                            {playerImages[player.id] ? (
                              <img 
                                src={playerImages[player.id]} 
                                alt={`${player.first_name} ${player.last_name}`}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.target.style.display = 'none'
                                  e.target.nextSibling.style.display = 'flex'
                                }}
                              />
                            ) : null}
                            <div 
                              className={`w-full h-full bg-gray-300 flex items-center justify-center text-xs font-medium ${
                                playerImages[player.id] ? 'hidden' : 'flex'
                              }`}
                            >
                              {player.first_name.charAt(0)}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-gray-800 text-sm truncate">
                              {player.first_name} #{player.jersey_number}
                            </div>
                            <div className="text-xs text-gray-600">
                              {formatTime(playerTimers[player.id] || 0)}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeletePlayerClick(player)
                          }}
                          className="ml-1 text-red-500 hover:text-red-700 text-xs px-0.5 py-0.5 rounded"
                          title="Delete player"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Rink F Column */}
              <div 
                className={`bg-green-100 rounded-lg p-2 min-h-[250px] ${
                  dragOverZone === 'rinkF' ? 'drag-over' : ''
                }`}
                data-drop-zone="rinkF"
                onDragOver={(e) => handleDragOver(e, 'rinkF')}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, 'rinkF')}
              >
                <h4 className="text-md font-semibold text-green-900 mb-2 text-center">F</h4>
                <div className="grid grid-cols-1 gap-1 relative">
                  {/* Insertion indicator */}
                  {dragOverZone === 'rinkF' && draggedPlayer && (
                    <div 
                      className="absolute w-full h-0.5 bg-green-500 z-10 pointer-events-none"
                      style={{
                        top: `${(dragOverPosition || 0) * 100}%`,
                        transform: 'translateY(-50%)'
                      }}
                    />
                  )}
                  {rinkFPlayers.map(player => (
                    <div
                      key={player.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, { ...player, status: 'rinkF' })}
                      onTouchStart={(e) => handleTouchStart(e, { ...player, status: 'rinkF' })}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
                      className={`${getPlayerCardColor(player.id, 'rink')} rounded p-1.5 shadow-sm cursor-move hover:shadow-md transition-all duration-300 player-card player-rink no-select touch-manipulation`}
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center flex-1 min-w-0">
                          <div className="w-6 h-6 rounded-full overflow-hidden mr-2 flex-shrink-0">
                            {playerImages[player.id] ? (
                              <img 
                                src={playerImages[player.id]} 
                                alt={`${player.first_name} ${player.last_name}`}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.target.style.display = 'none'
                                  e.target.nextSibling.style.display = 'flex'
                                }}
                              />
                            ) : null}
                            <div 
                              className={`w-full h-full bg-gray-300 flex items-center justify-center text-xs font-medium ${
                                playerImages[player.id] ? 'hidden' : 'flex'
                              }`}
                            >
                              {player.first_name.charAt(0)}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-gray-800 text-sm truncate">
                              {player.first_name} #{player.jersey_number}
                            </div>
                            <div className="text-xs text-gray-600">
                              {formatTime(playerTimers[player.id] || 0)}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeletePlayerClick(player)
                          }}
                          className="ml-1 text-red-500 hover:text-red-700 text-xs px-0.5 py-0.5 rounded"
                          title="Delete player"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Rink GK Row */}
            <div 
              className={`bg-purple-100 rounded-lg p-2 min-h-[100px] ${
                dragOverZone === 'rinkGk' ? 'drag-over' : ''
              }`}
              data-drop-zone="rinkGk"
              onDragOver={(e) => handleDragOver(e, 'rinkGk')}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, 'rinkGk')}
            >
              <h4 className="text-md font-semibold text-purple-900 mb-2 text-center">Goal Keeper (GK)</h4>
              <div className="grid grid-cols-1 gap-1 relative">
                {/* Insertion indicator */}
                {dragOverZone === 'rinkGk' && draggedPlayer && (
                  <div 
                    className="absolute w-full h-0.5 bg-purple-500 z-10 pointer-events-none"
                    style={{
                      top: `${(dragOverPosition || 0) * 100}%`,
                      transform: 'translateY(-50%)'
                    }}
                  />
                )}
                {rinkGkPlayers.map(player => (
                  <div
                    key={player.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, { ...player, status: 'rinkGk' })}
                    onTouchStart={(e) => handleTouchStart(e, { ...player, status: 'rinkGk' })}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    className={`${getPlayerCardColor(player.id, 'rink')} rounded p-1.5 shadow-sm cursor-move hover:shadow-md transition-all duration-300 player-card player-rink no-select touch-manipulation`}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center flex-1 min-w-0">
                        <div className="w-6 h-6 rounded-full overflow-hidden mr-2 flex-shrink-0">
                          {playerImages[player.id] ? (
                            <img 
                              src={playerImages[player.id]} 
                              alt={`${player.first_name} ${player.last_name}`}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.style.display = 'none'
                                e.target.nextSibling.style.display = 'flex'
                              }}
                            />
                          ) : null}
                          <div 
                            className={`w-full h-full bg-gray-300 flex items-center justify-center text-xs font-medium ${
                              playerImages[player.id] ? 'hidden' : 'flex'
                            }`}
                          >
                            {player.first_name.charAt(0)}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-gray-800 text-sm truncate">
                            {player.first_name} #{player.jersey_number}
                          </div>
                          <div className="text-xs text-gray-600">
                            {formatTime(playerTimers[player.id] || 0)}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeletePlayerClick(player)
                        }}
                        className="ml-1 text-red-500 hover:text-red-700 text-xs px-0.5 py-0.5 rounded"
                        title="Delete player"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      )}
      
      {/* Game Events */}
      {!gameHasEnded && (
        <div className="bg-white rounded-lg shadow-md p-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Game Events</h3>
        
        {/* Score Display */}
        <div className="text-center mb-4">
          <div className="text-3xl font-bold text-gray-800 score-display">
            {goalsFor} - {goalsAgainst}
          </div>
          <div className="text-sm text-gray-600">Goals For - Goals Against</div>
        </div>
        
        {/* Event Buttons */}
        <div className="grid grid-cols-3 gap-2 event-buttons">
          <button
            onClick={() => recordGoal('for')}
            className="bg-green-600 text-white py-3 px-4 rounded-lg font-medium touch-button event-button"
          >
            Goal For
          </button>
          <button
            onClick={() => recordGoal('against')}
            className="bg-red-600 text-white py-3 px-4 rounded-lg font-medium touch-button event-button"
          >
            Goal Against
          </button>
        </div>
      </div>
      )}
      
      {/* Clear Game Data Confirmation Dialog */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Clear Game Data
            </h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to clear all game data? This will delete all events, player statuses, and reset the game to the beginning. This action cannot be undone.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg font-medium"
              >
                Cancel
              </button>
              <button
                onClick={clearGameData}
                className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg font-medium"
              >
                Clear Data
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Delete Player Confirmation Dialog */}
      {showDeletePlayerConfirm && playerToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Delete Player
            </h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to remove <strong>{playerToDelete.first_name} #{playerToDelete.jersey_number}</strong> from the game? This will delete all their game data and cannot be undone.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowDeletePlayerConfirm(false)
                  setPlayerToDelete(null)
                }}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => deletePlayer(playerToDelete.id)}
                className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg font-medium"
              >
                Delete Player
              </button>
            </div>
          </div>
        </div>
        )}

      {/* End Game Confirmation Dialog */}
      {showEndGameConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              End Game
            </h3>
            <div className="mb-6">
              <p className="text-gray-700 mb-4">
                Are you sure you want to end this game?
              </p>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-700 text-sm font-medium">
                  ⚠️ Warning: Once ended, this game cannot be restarted.
                </p>
              </div>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowEndGameConfirm(false)}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg font-medium"
              >
                Cancel
              </button>
              <button
                onClick={endGame}
                className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg font-medium"
              >
                End Game
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Game Settings
            </h3>
            
            {/* Stoppage Timeout Setting */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Stoppage Timeout (seconds)
              </label>
              <p className="text-sm text-gray-600 mb-3">
                If play is stopped for longer than this duration, all player timers will reset to 0 when play resumes.
              </p>
              <input
                type="number"
                min="0"
                max="300"
                value={stoppageTimeout}
                onChange={(e) => setStoppageTimeout(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="60"
              />
            </div>

            {/* Clear Game Data Button */}
            <div className="mb-6">
              <button
                onClick={() => {
                  setShowSettings(false)
                  setShowClearConfirm(true)
                }}
                className="w-full bg-red-600 text-white py-3 px-4 rounded-lg font-medium touch-button"
              >
                Clear Game Data
              </button>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowSettings(false)}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default GameManagement

