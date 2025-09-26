import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../src/lib/supabase'
import { useParams, useNavigate } from 'react-router-dom'
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
  
  // Refs
  const gameTimeInterval = useRef(null)
  const playTimeInterval = useRef(null)
  const hasLoadedGameState = useRef(false)
  
  // Load session data
  useEffect(() => {
    if (sessionId) {
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
    if (gameStartTime) {
      updatePlayerTimers()
    }
  }, [isPlaying, currentPlayStartTime])
  
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
          setBenchPlayers([...players])
          
          // Split bench players between D and F columns
          const half = Math.ceil(players.length / 2)
          setBenchDPlayers(players.slice(0, half))
          setBenchFPlayers(players.slice(half))
          
          console.log('Squad players set:', players.length, 'players')
          console.log('Bench D players:', half, 'players')
          console.log('Bench F players:', players.length - half, 'players')
          
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
        .single()
      
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
        .single()
      
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
        // Don't reset player positions - they should be restored by loadExistingGameState
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
      
      // Record player event (don't wait for this)
      const eventType = toZone === 'rink' ? 'player_on' : 'player_off'
      recordGameEvent(eventType, playerId, now, gameTime, playTime)
        .catch(error => console.error('Error recording game event:', error))
      
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
      await recordGameEvent(`goal_${type}`, null, now, currentGameTime, totalPlayTime, {
        rink_players: rinkPlayers.map(p => p.id)
      })
      
    } catch (error) {
      console.error('Error recording goal:', error)
      alert('Error recording goal')
    }
  }
  
  const endGame = async () => {
    try {
      const now = new Date()
      
      // Update game session
      await supabase
        .from('game_sessions')
        .update({
          is_active: false,
          current_play_start_time: null
        })
        .eq('session_id', sessionId)
      
      // Record game end event
      await recordGameEvent('game_end', null, now, currentGameTime, totalPlayTime)
      
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
      
      // Add player to deleted set so they don't get restored on refresh
      setDeletedPlayers(prev => new Set([...prev, playerId]))
      
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
  }

  // Move player between bench columns (D and F) - no database events
  const movePlayerBetweenBenchColumns = (playerId, fromColumn, toColumn) => {
    console.log(`Moving player ${playerId} from ${fromColumn} to ${toColumn}`)
    
    const player = squadPlayers.find(p => p.id === playerId)
    if (!player) return
    
    // Remove from all zones first
    removePlayerFromAllZones(playerId)
    
    // Add to target column
    if (toColumn === 'benchD') {
      setBenchDPlayers(prev => [...prev, player])
    } else if (toColumn === 'benchF') {
      setBenchFPlayers(prev => [...prev, player])
    }
  }
  
  // Move player to/from GK zone - no database events
  const movePlayerToGk = (playerId, fromZone) => {
    console.log(`Moving player ${playerId} from ${fromZone} to GK`)
    
    const player = squadPlayers.find(p => p.id === playerId)
    if (!player) return
    
    // Remove from all zones first
    removePlayerFromAllZones(playerId)
    
    // Add to GK
    setGkPlayers(prev => [...prev, player])
  }
  
  // Move player from GK to other zones - no database events
  const movePlayerFromGk = (playerId, toZone) => {
    console.log(`Moving player ${playerId} from GK to ${toZone}`)
    
    const player = squadPlayers.find(p => p.id === playerId)
    if (!player) return
    
    // Remove from all zones first
    removePlayerFromAllZones(playerId)
    
    // Add to target zone
    if (toZone === 'benchD') {
      setBenchDPlayers(prev => [...prev, player])
    } else if (toZone === 'benchF') {
      setBenchFPlayers(prev => [...prev, player])
    } else if (toZone === 'rink') {
      setRinkPlayers(prev => [...prev, player])
    }
  }
  
  // Move player between rink columns (D and F) - no database events
  const movePlayerBetweenRinkColumns = (playerId, fromColumn, toColumn) => {
    console.log(`Moving player ${playerId} from rink ${fromColumn} to rink ${toColumn}`)
    
    const player = squadPlayers.find(p => p.id === playerId)
    if (!player) return
    
    // Remove from all zones first
    removePlayerFromAllZones(playerId)
    
    // Add to target rink column
    if (toColumn === 'rinkD') {
      setRinkDPlayers(prev => [...prev, player])
    } else if (toColumn === 'rinkF') {
      setRinkFPlayers(prev => [...prev, player])
    }
  }
  
  // Move player to/from rink GK zone - no database events
  const movePlayerToRinkGk = (playerId, fromZone) => {
    console.log(`Moving player ${playerId} from rink ${fromZone} to rink GK`)
    
    const player = squadPlayers.find(p => p.id === playerId)
    if (!player) return
    
    // Remove from all zones first
    removePlayerFromAllZones(playerId)
    
    // Add to rink GK
    setRinkGkPlayers(prev => [...prev, player])
  }
  
  // Move player from rink GK to other rink zones - no database events
  const movePlayerFromRinkGk = (playerId, toZone) => {
    console.log(`Moving player ${playerId} from rink GK to rink ${toZone}`)
    
    const player = squadPlayers.find(p => p.id === playerId)
    if (!player) return
    
    // Remove from all zones first
    removePlayerFromAllZones(playerId)
    
    // Add to target rink zone
    if (toZone === 'rinkD') {
      setRinkDPlayers(prev => [...prev, player])
    } else if (toZone === 'rinkF') {
      setRinkFPlayers(prev => [...prev, player])
    }
  }
  
  // Insert player at specific position in column
  const insertPlayerAtPosition = (player, targetZone, position) => {
    const playerId = player.id
    console.log(`Inserting player ${playerId} into ${targetZone} at position ${position}`)
    
    // Use functional updates to ensure we get the latest state
    if (targetZone === 'benchD') {
      setBenchDPlayers(prev => {
        // Remove player from all other zones first
        setBenchPlayers(prev => prev.filter(p => p.id !== playerId))
        setBenchFPlayers(prev => prev.filter(p => p.id !== playerId))
        setGkPlayers(prev => prev.filter(p => p.id !== playerId))
        setRinkPlayers(prev => prev.filter(p => p.id !== playerId))
        setRinkDPlayers(prev => prev.filter(p => p.id !== playerId))
        setRinkFPlayers(prev => prev.filter(p => p.id !== playerId))
        setRinkGkPlayers(prev => prev.filter(p => p.id !== playerId))
        
        // Remove from current zone and add at position
        const filtered = prev.filter(p => p.id !== playerId)
        const insertIndex = Math.floor(position * (filtered.length + 1))
        const clampedIndex = Math.max(0, Math.min(insertIndex, filtered.length))
        const newPlayers = [...filtered]
        newPlayers.splice(clampedIndex, 0, player)
        console.log(`Setting benchDPlayers to ${newPlayers.length} players`)
        return newPlayers
      })
    } else if (targetZone === 'benchF') {
      setBenchFPlayers(prev => {
        // Remove player from all other zones first
        setBenchPlayers(prev => prev.filter(p => p.id !== playerId))
        setBenchDPlayers(prev => prev.filter(p => p.id !== playerId))
        setGkPlayers(prev => prev.filter(p => p.id !== playerId))
        setRinkPlayers(prev => prev.filter(p => p.id !== playerId))
        setRinkDPlayers(prev => prev.filter(p => p.id !== playerId))
        setRinkFPlayers(prev => prev.filter(p => p.id !== playerId))
        setRinkGkPlayers(prev => prev.filter(p => p.id !== playerId))
        
        // Remove from current zone and add at position
        const filtered = prev.filter(p => p.id !== playerId)
        const insertIndex = Math.floor(position * (filtered.length + 1))
        const clampedIndex = Math.max(0, Math.min(insertIndex, filtered.length))
        const newPlayers = [...filtered]
        newPlayers.splice(clampedIndex, 0, player)
        console.log(`Setting benchFPlayers to ${newPlayers.length} players`)
        return newPlayers
      })
    } else if (targetZone === 'gk') {
      setGkPlayers(prev => {
        // Remove player from all other zones first
        setBenchPlayers(prev => prev.filter(p => p.id !== playerId))
        setBenchDPlayers(prev => prev.filter(p => p.id !== playerId))
        setBenchFPlayers(prev => prev.filter(p => p.id !== playerId))
        setRinkPlayers(prev => prev.filter(p => p.id !== playerId))
        setRinkDPlayers(prev => prev.filter(p => p.id !== playerId))
        setRinkFPlayers(prev => prev.filter(p => p.id !== playerId))
        setRinkGkPlayers(prev => prev.filter(p => p.id !== playerId))
        
        // Remove from current zone and add at position
        const filtered = prev.filter(p => p.id !== playerId)
        const insertIndex = Math.floor(position * (filtered.length + 1))
        const clampedIndex = Math.max(0, Math.min(insertIndex, filtered.length))
        const newPlayers = [...filtered]
        newPlayers.splice(clampedIndex, 0, player)
        console.log(`Setting gkPlayers to ${newPlayers.length} players`)
        return newPlayers
      })
    } else if (targetZone === 'rinkD') {
      setRinkDPlayers(prev => {
        // Remove player from all other zones first
        setBenchPlayers(prev => prev.filter(p => p.id !== playerId))
        setBenchDPlayers(prev => prev.filter(p => p.id !== playerId))
        setBenchFPlayers(prev => prev.filter(p => p.id !== playerId))
        setGkPlayers(prev => prev.filter(p => p.id !== playerId))
        setRinkPlayers(prev => prev.filter(p => p.id !== playerId))
        setRinkFPlayers(prev => prev.filter(p => p.id !== playerId))
        setRinkGkPlayers(prev => prev.filter(p => p.id !== playerId))
        
        // Remove from current zone and add at position
        const filtered = prev.filter(p => p.id !== playerId)
        const insertIndex = Math.floor(position * (filtered.length + 1))
        const clampedIndex = Math.max(0, Math.min(insertIndex, filtered.length))
        const newPlayers = [...filtered]
        newPlayers.splice(clampedIndex, 0, player)
        console.log(`Setting rinkDPlayers to ${newPlayers.length} players`)
        return newPlayers
      })
    } else if (targetZone === 'rinkF') {
      setRinkFPlayers(prev => {
        // Remove player from all other zones first
        setBenchPlayers(prev => prev.filter(p => p.id !== playerId))
        setBenchDPlayers(prev => prev.filter(p => p.id !== playerId))
        setBenchFPlayers(prev => prev.filter(p => p.id !== playerId))
        setGkPlayers(prev => prev.filter(p => p.id !== playerId))
        setRinkPlayers(prev => prev.filter(p => p.id !== playerId))
        setRinkDPlayers(prev => prev.filter(p => p.id !== playerId))
        setRinkGkPlayers(prev => prev.filter(p => p.id !== playerId))
        
        // Remove from current zone and add at position
        const filtered = prev.filter(p => p.id !== playerId)
        const insertIndex = Math.floor(position * (filtered.length + 1))
        const clampedIndex = Math.max(0, Math.min(insertIndex, filtered.length))
        const newPlayers = [...filtered]
        newPlayers.splice(clampedIndex, 0, player)
        console.log(`Setting rinkFPlayers to ${newPlayers.length} players`)
        return newPlayers
      })
    } else if (targetZone === 'rinkGk') {
      setRinkGkPlayers(prev => {
        // Remove player from all other zones first
        setBenchPlayers(prev => prev.filter(p => p.id !== playerId))
        setBenchDPlayers(prev => prev.filter(p => p.id !== playerId))
        setBenchFPlayers(prev => prev.filter(p => p.id !== playerId))
        setGkPlayers(prev => prev.filter(p => p.id !== playerId))
        setRinkPlayers(prev => prev.filter(p => p.id !== playerId))
        setRinkDPlayers(prev => prev.filter(p => p.id !== playerId))
        setRinkFPlayers(prev => prev.filter(p => p.id !== playerId))
        
        // Remove from current zone and add at position
        const filtered = prev.filter(p => p.id !== playerId)
        const insertIndex = Math.floor(position * (filtered.length + 1))
        const clampedIndex = Math.max(0, Math.min(insertIndex, filtered.length))
        const newPlayers = [...filtered]
        newPlayers.splice(clampedIndex, 0, player)
        console.log(`Setting rinkGkPlayers to ${newPlayers.length} players`)
        return newPlayers
      })
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
      
      // Check if there's an active game session
      const { data: gameSessionData, error: sessionError } = await supabase
        .from('game_sessions')
        .select('*')
        .eq('session_id', sessionId)
        .eq('is_active', true)
        .single()
      
      if (sessionError || !gameSessionData) {
        console.log('No active game session found - keeping current bench players')
        console.log('Current bench players:', benchPlayers.length)
        return
      }
      
      // If we found a game session, check if it's actually active and valid
      if (!gameSessionData.is_active) {
        console.log('Game session found but not active - keeping current bench players')
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
      
      // Restore player positions
      const benchPlayers = []
      const rinkPlayers = []
      const playerStatuses = {}
      const playerTimers = {}
      
      playerStatusData.forEach(status => {
        const player = squadPlayers.find(p => p.id === status.player_id)
        console.log(`Processing player ${status.player_id}: found=${!!player}, status=${status.status}`)
        if (player && !deletedPlayers.has(status.player_id)) {
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
          
          if (status.status === 'bench') {
            console.log(`Adding player ${player.first_name} to bench`)
            // Remove from all zones first to ensure single placement
            removePlayerFromAllZones(player.id)
            // Add to bench D by default (user can redistribute manually)
            setBenchDPlayers(prev => [...prev, player])
          } else {
            console.log(`Adding player ${player.first_name} to rink`)
            // Remove from all zones first to ensure single placement
            removePlayerFromAllZones(player.id)
            // Add to rink D by default (user can redistribute manually)
            setRinkDPlayers(prev => [...prev, player])
          }
        } else {
          console.log(`Player ${status.player_id} not found in squadPlayers`)
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
      // Rink players: light green (0-60s) -> fade to red (60-180s)
      if (timeInSeconds <= 60) {
        return 'bg-green-100' // Light green for first 60 seconds
      } else if (timeInSeconds <= 180) {
        // Fade from green to red between 60-180 seconds
        const fadeProgress = (timeInSeconds - 60) / 120 // 0 to 1
        if (fadeProgress < 0.5) {
          return 'bg-green-200' // Still greenish
        } else if (fadeProgress < 0.8) {
          return 'bg-yellow-200' // Yellow transition
        } else {
          return 'bg-red-200' // Red
        }
      } else {
        return 'bg-red-300' // Full red after 180 seconds
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
      
      // Always use the status start time for timer calculation
      // This ensures timers reset when players move between bench and rink
      const effectiveStartTime = statusStart
      
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
          effectiveStartTime: effectiveStartTime.toISOString(),
          now: now.toISOString(),
          timeElapsed,
          isPlaying,
          currentPlayStartTime
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
    
    if (draggedPlayer && targetZone) {
      // Determine current zone
      let currentZone = 'bench'
      if (rinkPlayers.find(p => p.id === draggedPlayer.id)) {
        currentZone = 'rink'
      } else if (benchDPlayers.find(p => p.id === draggedPlayer.id)) {
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
      
      // Check if moving within the same zone (reordering)
      if (currentZone === targetZone) {
        // Reorder within the same column
        insertPlayerAtPosition(draggedPlayer, targetZone, dragOverPosition || 0)
      }
      // Check if moving to/from bench GK (no database events)
      else if (targetZone === 'gk') {
        movePlayerToGk(draggedPlayer.id, currentZone)
        insertPlayerAtPosition(draggedPlayer, targetZone, dragOverPosition || 0)
      } else if (currentZone === 'gk') {
        movePlayerFromGk(draggedPlayer.id, targetZone)
        insertPlayerAtPosition(draggedPlayer, targetZone, dragOverPosition || 0)
      } else if ((currentZone === 'benchD' || currentZone === 'benchF') && (targetZone === 'benchD' || targetZone === 'benchF')) {
        // Moving between bench columns (no database events)
        movePlayerBetweenBenchColumns(draggedPlayer.id, currentZone, targetZone)
        insertPlayerAtPosition(draggedPlayer, targetZone, dragOverPosition || 0)
      } else if ((currentZone === 'rinkD' || currentZone === 'rinkF') && (targetZone === 'rinkD' || targetZone === 'rinkF')) {
        // Moving between rink columns (no database events)
        movePlayerBetweenRinkColumns(draggedPlayer.id, currentZone, targetZone)
        insertPlayerAtPosition(draggedPlayer, targetZone, dragOverPosition || 0)
      } else if (targetZone === 'rinkGk') {
        movePlayerToRinkGk(draggedPlayer.id, currentZone)
        insertPlayerAtPosition(draggedPlayer, targetZone, dragOverPosition || 0)
      } else if (currentZone === 'rinkGk') {
        movePlayerFromRinkGk(draggedPlayer.id, targetZone)
        insertPlayerAtPosition(draggedPlayer, targetZone, dragOverPosition || 0)
      } else if (currentZone !== targetZone) {
        // Moving to/from rink (triggers database events)
        movePlayer(draggedPlayer.id, currentZone, targetZone)
        insertPlayerAtPosition(draggedPlayer, targetZone, dragOverPosition || 0)
      }
    }
    
    setDraggedPlayer(null)
    setDragOverZone(null)
    setDragOverPosition(null)
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
          <h1 className="text-2xl font-bold text-gray-800">
            Game Management
            {session && (
              <span className="text-lg font-normal text-gray-600 ml-2">
                - {session.title}
              </span>
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
        
        {/* Timer Display */}
        <div className="flex justify-center mb-4">
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="text-sm text-blue-600 font-medium">Game Time</div>
            <div className="text-2xl font-bold text-blue-800 timer-display">
              {formatTime(currentGameTime)}
            </div>
          </div>
        </div>
        
        {/* Game Controls */}
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
                onClick={endGame}
                className="bg-gray-600 text-white px-6 py-3 rounded-lg font-medium"
              >
                End Game
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* Player Management */}
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
                    className={`${getPlayerCardColor(player.id, 'bench')} rounded p-1.5 shadow-sm cursor-move hover:shadow-md transition-all duration-300 player-card player-bench no-select`}
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
                    className={`${getPlayerCardColor(player.id, 'bench')} rounded p-1.5 shadow-sm cursor-move hover:shadow-md transition-all duration-300 player-card player-bench no-select`}
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
                    className={`${getPlayerCardColor(player.id, 'bench')} rounded p-1.5 shadow-sm cursor-move hover:shadow-md transition-all duration-300 player-card player-gk no-select`}
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
          className={`bg-green-50 rounded-lg p-3 min-h-[300px] player-column ${
            dragOverZone === 'rink' ? 'drag-over' : ''
          }`}
          onDragOver={(e) => handleDragOver(e, 'rink')}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, 'rink')}
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
                      className={`${getPlayerCardColor(player.id, 'rink')} rounded p-1.5 shadow-sm cursor-move hover:shadow-md transition-all duration-300 player-card player-rink no-select`}
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
                      className={`${getPlayerCardColor(player.id, 'rink')} rounded p-1.5 shadow-sm cursor-move hover:shadow-md transition-all duration-300 player-card player-rink no-select`}
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
                    className={`${getPlayerCardColor(player.id, 'rink')} rounded p-1.5 shadow-sm cursor-move hover:shadow-md transition-all duration-300 player-card player-rink no-select`}
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
      
      {/* Game Events */}
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
