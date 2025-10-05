import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../src/lib/supabase'
import { useParams, useNavigate, Link } from 'react-router-dom'
import './MatchManagement.css'

const MatchManagement = () => {
  const { sessionId, matchId, orgId } = useParams()
  const navigate = useNavigate()
  
  // Match state
  const [match, setMatch] = useState(null)
  const [session, setSession] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [matchStartTime, setMatchStartTime] = useState(null)
  const [currentPlayStartTime, setCurrentPlayStartTime] = useState(null)
  const [playStopTime, setPlayStopTime] = useState(null)
  const [totalPlayTime, setTotalPlayTime] = useState(0)
  const [currentGameTime, setCurrentGameTime] = useState(0)
  const [goalsHome, setGoalsHome] = useState(0)
  const [goalsAway, setGoalsAway] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showEndMatchConfirm, setShowEndMatchConfirm] = useState(false)
  const [showClearMatchConfirm, setShowClearMatchConfirm] = useState(false)
  const [matchHasEnded, setMatchHasEnded] = useState(false)
  
  // Teams
  const [homeSquad, setHomeSquad] = useState(null)
  const [awaySquad, setAwaySquad] = useState(null)
  const [homePlayers, setHomePlayers] = useState([])
  const [awayPlayers, setAwayPlayers] = useState([])
  
  // Player positions - Home team (left side)
  const [homeBenchSkaters, setHomeBenchSkaters] = useState([])
  const [homeBenchGoalies, setHomeBenchGoalies] = useState([])
  const [homeRinkSkaters, setHomeRinkSkaters] = useState([])
  const [homeRinkGoalies, setHomeRinkGoalies] = useState([])
  
  // Player positions - Away team (right side)
  const [awayBenchSkaters, setAwayBenchSkaters] = useState([])
  const [awayBenchGoalies, setAwayBenchGoalies] = useState([])
  const [awayRinkSkaters, setAwayRinkSkaters] = useState([])
  const [awayRinkGoalies, setAwayRinkGoalies] = useState([])
  
  // Player status tracking
  const [playerStatuses, setPlayerStatuses] = useState({})
  const [playerTimers, setPlayerTimers] = useState({})
  const playerStatusesRef = useRef({})
  
  // Timer refs
  const gameTimerRef = useRef(null)
  const playTimerRef = useRef(null)
  const lastUpdateTimeRef = useRef(null)
  
  // Match events table state
  const [matchEvents, setMatchEvents] = useState([])
  const [eventsLoading, setEventsLoading] = useState(false)
  const [eventsPage, setEventsPage] = useState(1)
  const [eventsTotal, setEventsTotal] = useState(0)
  const eventsPerPage = 20
  
  // Edit event modal state
  const [showEditEventModal, setShowEditEventModal] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [editEventForm, setEditEventForm] = useState({
    event_type: '',
    player_id: '',
    team_side: '',
    event_time: '',
    game_time_seconds: '',
    play_time_seconds: ''
  })
  
  // Timer Functions
  const startGameTimer = () => {
    console.log('Starting game timer...')
    if (gameTimerRef.current) {
      clearInterval(gameTimerRef.current)
    }
    
    gameTimerRef.current = setInterval(() => {
      setCurrentGameTime(prev => {
        console.log('Game time:', prev + 1)
        return prev + 1
      })
    }, 1000)
  }
  
  const stopGameTimer = () => {
    if (gameTimerRef.current) {
      clearInterval(gameTimerRef.current)
      gameTimerRef.current = null
    }
  }
  
  const startPlayTimer = () => {
    console.log('Starting play timer...')
    if (playTimerRef.current) {
      clearInterval(playTimerRef.current)
    }
    
    lastUpdateTimeRef.current = Date.now()
    
    playTimerRef.current = setInterval(() => {
      const now = Date.now()
      const deltaTime = Math.floor((now - lastUpdateTimeRef.current) / 1000)
      lastUpdateTimeRef.current = now
      
      // Update total play time
      setTotalPlayTime(prev => {
        console.log('Play time:', prev + deltaTime)
        return prev + deltaTime
      })
      
      // Update player timers for players currently on rink
      setPlayerTimers(prev => {
        const newTimers = { ...prev }
        const currentStatuses = playerStatusesRef.current
        
        Object.keys(currentStatuses).forEach(playerId => {
          const status = currentStatuses[playerId]
          if (status && status.status === 'rink') {
            // Add deltaTime to players currently on rink
            const oldTime = newTimers[playerId] || 0
            newTimers[playerId] = oldTime + deltaTime
            console.log(`Player ${playerId} timer: ${oldTime} + ${deltaTime} = ${newTimers[playerId]}`)
          }
        })
        return newTimers
      })
    }, 1000)
  }
  
  const stopPlayTimer = () => {
    if (playTimerRef.current) {
      clearInterval(playTimerRef.current)
      playTimerRef.current = null
    }
  }
  
  const startTimers = () => {
    console.log('Starting both timers...')
    startGameTimer()
    startPlayTimer()
  }
  
  const stopTimers = () => {
    stopGameTimer()
    stopPlayTimer()
  }

  // Load session and match data
  useEffect(() => {
    if (sessionId || matchId) {
      loadSessionData()
    }
  }, [sessionId, matchId])
  
  // Load player positions when players are available
  useEffect(() => {
    if (homePlayers.length > 0 || awayPlayers.length > 0) {
      loadExistingMatchState()
    }
  }, [homePlayers, awayPlayers])
  
  // Load match events when match changes
  useEffect(() => {
    if (match) {
      loadMatchEvents()
    }
  }, [match, eventsPage])
  
  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      stopTimers()
    }
  }, [])
  
  const loadSessionData = async () => {
    try {
      setLoading(true)
      
      let match = null
      let session = null
      
      if (matchId) {
        // Load match directly (standalone match)
        const { data: matchData, error: matchError } = await supabase
          .from('matches')
          .select(`
            *,
            home_squad:squads!matches_home_squad_id_fkey(*),
            away_squad:squads!matches_away_squad_id_fkey(*),
            sessions(*)
          `)
          .eq('id', matchId)
          .single()
        
        if (matchError) throw matchError
        match = matchData
        session = matchData.sessions // May be null for standalone matches
        
      } else if (sessionId) {
        // Load session first, then find associated match
        const { data: sessionData, error: sessionError } = await supabase
          .from('sessions')
          .select('*')
          .eq('id', sessionId)
          .single()
        
        if (sessionError) throw sessionError
        session = sessionData
        
        // Load match details
        const { data: matchData, error: matchError } = await supabase
          .from('matches')
          .select(`
            *,
            home_squad:squads!matches_home_squad_id_fkey(*),
            away_squad:squads!matches_away_squad_id_fkey(*)
          `)
          .eq('session_id', sessionId)
          .single()
        
        if (matchError && matchError.code !== 'PGRST116') throw matchError
        match = matchData
      }
      
      setSession(session)
      
      if (match) {
        setMatch(match)
        setHomeSquad(match.home_squad)
        setAwaySquad(match.away_squad)
        setGoalsHome(match.goals_home)
        setGoalsAway(match.goals_away)
        
        if (match.match_start_time) {
          setMatchStartTime(new Date(match.match_start_time))
          setIsPlaying(match.is_active && !match.game_end_time)
          setMatchHasEnded(!!match.game_end_time)
        }
        
        if (match.current_play_start_time) {
          setCurrentPlayStartTime(new Date(match.current_play_start_time))
        }
        
        setTotalPlayTime(match.total_play_time_seconds || 0)
        
        // Load players for both teams
        await loadTeamPlayers(match.home_squad_id, match.away_squad_id)
      } else {
        // No match exists yet - need to create one
        setError('No match found for this session. Please create a match first.')
      }
      
    } catch (error) {
      console.error('Error loading session data:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }
  
  const loadTeamPlayers = async (homeSquadId, awaySquadId) => {
    try {
      // Load home team players
      const { data: homePlayersData, error: homeError } = await supabase
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
        .eq('squad_id', homeSquadId)
      
      if (homeError) throw homeError
      const homePlayers = homePlayersData.map(ps => ps.players).filter(Boolean)
      setHomePlayers(homePlayers)
      
      // Load away team players
      const { data: awayPlayersData, error: awayError } = await supabase
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
        .eq('squad_id', awaySquadId)
      
      if (awayError) throw awayError
      const awayPlayers = awayPlayersData.map(ps => ps.players).filter(Boolean)
      setAwayPlayers(awayPlayers)
      
    } catch (error) {
      console.error('Error loading team players:', error)
      setError('Failed to load team players: ' + error.message)
    }
  }
  
  const restoreTimersFromMatch = async () => {
    if (!match) return
    
    try {
      console.log('Restoring timers from match data...')
      
      // Set match state from database
      if (match.match_start_time) {
        setMatchStartTime(new Date(match.match_start_time))
      }
      
      if (match.current_play_start_time) {
        setCurrentPlayStartTime(new Date(match.current_play_start_time))
        setIsPlaying(true)
      } else {
        setIsPlaying(false)
      }
      
      setTotalPlayTime(match.total_play_time_seconds || 0)
      setGoalsHome(match.goals_home || 0)
      setGoalsAway(match.goals_away || 0)
      setMatchHasEnded(!match.is_active)
      
      // Calculate current game time based on match start time
      if (match.match_start_time && match.is_active) {
        const now = new Date()
        const matchStart = new Date(match.match_start_time)
        const elapsedSeconds = Math.floor((now - matchStart) / 1000)
        setCurrentGameTime(elapsedSeconds)
        
        console.log('Game time restored:', elapsedSeconds, 'seconds')
        
        // Calculate current play time if play is active
        if (match.current_play_start_time && match.is_active) {
          const playStart = new Date(match.current_play_start_time)
          const playElapsed = Math.floor((now - playStart) / 1000)
          const totalPlayTime = (match.total_play_time_seconds || 0) + playElapsed
          setTotalPlayTime(totalPlayTime)
          
          console.log('Play time restored:', totalPlayTime, 'seconds')
        }
        
        // Start timers if match is active
        if (match.is_active) {
          console.log('Match is active - starting timers')
          setTimeout(() => {
            startGameTimer()
            if (match.current_play_start_time) {
              startPlayTimer()
            }
          }, 100)
        }
      }
      
    } catch (error) {
      console.error('Error restoring timers from match:', error)
    }
  }
  
  const loadExistingMatchState = async () => {
    if (!match) return
    
    try {
      // Restore timers based on match data
      await restoreTimersFromMatch()
      
      // Load player statuses
      const { data: statusData, error: statusError } = await supabase
        .from('match_player_status')
        .select('*')
        .eq('match_id', match.id)
      
      if (statusError) throw statusError
      
      const statuses = {}
      const timers = {}
      
      if (statusData && statusData.length > 0) {
        // Load existing player statuses
        statusData.forEach(status => {
          statuses[status.player_id] = {
            status: status.status,
            status_start_time: status.status_start_time,
            status_start_game_time: status.status_start_game_time,
            status_start_play_time: status.status_start_play_time,
            team_side: status.team_side
          }
          timers[status.player_id] = status.total_rink_time_seconds || 0
        })
        
        // Ensure ALL squad players have status records (some might be missing from database)
        const allPlayers = [...(homePlayers || []), ...(awayPlayers || [])]
        const missingPlayers = []
        
        allPlayers.forEach(player => {
          if (!statuses[player.id]) {
            // This player doesn't have a status record - initialize to bench
            const teamSide = (homePlayers || []).find(p => p.id === player.id) ? 'home' : 'away'
            statuses[player.id] = {
              status: 'bench',
              status_start_time: new Date().toISOString(),
              status_start_game_time: 0,
              status_start_play_time: 0,
              team_side: teamSide
            }
            timers[player.id] = 0
            
            // Prepare record for database
            missingPlayers.push({
              match_id: match.id,
              player_id: player.id,
              team_side: teamSide,
              status: 'bench',
              status_start_time: new Date().toISOString(),
              status_start_game_time: 0,
              status_start_play_time: 0,
              total_rink_time_seconds: 0,
              current_shift_time_seconds: 0
            })
          }
        })
        
        // Save missing player statuses to database
        if (missingPlayers.length > 0) {
          console.log(`Found ${missingPlayers.length} players without status records - adding them to bench`)
          try {
            const { error: insertError } = await supabase
              .from('match_player_status')
              .insert(missingPlayers)
            
            if (insertError) {
              console.error('Error saving missing player statuses:', insertError)
            }
          } catch (error) {
            console.error('Error inserting missing player statuses:', error)
          }
        }
        
        setPlayerStatuses(statuses)
        setPlayerTimers(timers)
        playerStatusesRef.current = statuses
        
        // Organize players into positions
        organizePlayersByPosition(statuses)
      } else {
        // No existing player statuses - initialize all players to bench
        console.log('No existing match state found - initializing all players to bench')
        await initializePlayersToBench()
      }
      
    } catch (error) {
      console.error('Error loading existing match state:', error)
      // Initialize players to bench if no existing state
      console.log('Error loading match state - initializing all players to bench')
      await initializePlayersToBench()
    }
  }
  
  const initializePlayersToBench = async () => {
    if (!match) return
    
    try {
      const statuses = {}
      const timers = {}
      const playerStatusRecords = []
      
      // Initialize all players to bench
      const allPlayers = [...(homePlayers || []), ...(awayPlayers || [])]
      allPlayers.forEach(player => {
        const teamSide = (homePlayers || []).find(p => p.id === player.id) ? 'home' : 'away'
        const now = new Date().toISOString()
        
        statuses[player.id] = {
          status: 'bench',
          status_start_time: now,
          status_start_game_time: 0,
          status_start_play_time: 0,
          team_side: teamSide
        }
        timers[player.id] = 0
        
        // Prepare record for database
        playerStatusRecords.push({
          match_id: match.id,
          player_id: player.id,
          team_side: teamSide,
          status: 'bench',
          status_start_time: now,
          status_start_game_time: 0,
          status_start_play_time: 0,
          total_rink_time_seconds: 0,
          current_shift_time_seconds: 0
        })
      })
      
      // Save initial player statuses to database
      if (playerStatusRecords.length > 0) {
        const { error: insertError } = await supabase
          .from('match_player_status')
          .insert(playerStatusRecords)
        
        if (insertError) {
          console.error('Error saving initial player statuses:', insertError)
          // Continue anyway - we'll still set the local state
        }
      }
      
      setPlayerStatuses(statuses)
      setPlayerTimers(timers)
      playerStatusesRef.current = statuses
      organizePlayersByPosition(statuses)
      
    } catch (error) {
      console.error('Error initializing players to bench:', error)
      // Fallback to local state only
      const statuses = {}
      const timers = {}
      
      const allPlayers = [...(homePlayers || []), ...(awayPlayers || [])]
      allPlayers.forEach(player => {
        const teamSide = (homePlayers || []).find(p => p.id === player.id) ? 'home' : 'away'
        statuses[player.id] = {
          status: 'bench',
          status_start_time: new Date().toISOString(),
          status_start_game_time: 0,
          status_start_play_time: 0,
          team_side: teamSide
        }
        timers[player.id] = 0
      })
      
      setPlayerStatuses(statuses)
      setPlayerTimers(timers)
      playerStatusesRef.current = statuses
      organizePlayersByPosition(statuses)
    }
  }
  
  const organizePlayersByPosition = (statuses) => {
    // Separate home team players
    const homeSkaters = (homePlayers || []).filter(p => p.jersey_number !== null && p.jersey_number !== 1)
    const homeGoalies = (homePlayers || []).filter(p => p.jersey_number === 1 || p.jersey_number === null)
    
    // Separate away team players
    const awaySkaters = (awayPlayers || []).filter(p => p.jersey_number !== null && p.jersey_number !== 1)
    const awayGoalies = (awayPlayers || []).filter(p => p.jersey_number === 1 || p.jersey_number === null)
    
    // Organize by status
    setHomeBenchSkaters(homeSkaters.filter(p => statuses[p.id]?.status === 'bench'))
    setHomeBenchGoalies(homeGoalies.filter(p => statuses[p.id]?.status === 'bench'))
    setHomeRinkSkaters(homeSkaters.filter(p => statuses[p.id]?.status === 'rink'))
    setHomeRinkGoalies(homeGoalies.filter(p => statuses[p.id]?.status === 'rink'))
    
    setAwayBenchSkaters(awaySkaters.filter(p => statuses[p.id]?.status === 'bench'))
    setAwayBenchGoalies(awayGoalies.filter(p => statuses[p.id]?.status === 'bench'))
    setAwayRinkSkaters(awaySkaters.filter(p => statuses[p.id]?.status === 'rink'))
    setAwayRinkGoalies(awayGoalies.filter(p => statuses[p.id]?.status === 'rink'))
  }
  
  const startMatch = async () => {
    try {
      const now = new Date()
      
      const { data: updatedMatch, error: updateError } = await supabase
        .from('matches')
        .update({
          is_active: true,
          match_start_time: now.toISOString(),
          current_play_start_time: now.toISOString(),
          total_play_time_seconds: 0
        })
        .eq('id', match.id)
        .select()
        .single()
      
      if (updateError) throw updateError
      
      setMatch(updatedMatch)
      setMatchStartTime(now)
      setCurrentPlayStartTime(now)
      setIsPlaying(true)
      setMatchHasEnded(false)
      
      // Record play_start event
      await recordMatchEvent('play_start', null, 'home', now, 0, 0)
      
      // Restore timers with updated match data
      await restoreTimersFromMatch()
      
    } catch (error) {
      console.error('Error starting match:', error)
      setError('Failed to start match: ' + error.message)
    }
  }
  
  const togglePlay = async () => {
    try {
      const now = new Date()
      
      if (isPlaying) {
        // Stop play
        setIsPlaying(false)
        setPlayStopTime(now)
        
        // Calculate play time
        const playDuration = Math.floor((now - currentPlayStartTime) / 1000)
        const newTotalPlayTime = totalPlayTime + playDuration
        setTotalPlayTime(newTotalPlayTime)
        
        // Update match in database
        const { error: updateError } = await supabase
          .from('matches')
          .update({
            current_play_start_time: null,
            total_play_time_seconds: newTotalPlayTime
          })
          .eq('id', match.id)
        
        if (updateError) throw updateError
        
        // Record play_stop event
        await recordMatchEvent('play_stop', null, 'home', now, currentGameTime, newTotalPlayTime)
        
        // Stop play timer
        stopPlayTimer()
        
      } else {
        // Start play
        setIsPlaying(true)
        setCurrentPlayStartTime(now)
        setPlayStopTime(null)
        
        // Update match in database
        const { error: updateError } = await supabase
          .from('matches')
          .update({
            current_play_start_time: now.toISOString()
          })
          .eq('id', match.id)
        
        if (updateError) throw updateError
        
        // Record play_start event
        await recordMatchEvent('play_start', null, 'home', now, currentGameTime, totalPlayTime)
        
        // Restore timers with updated match data
        await restoreTimersFromMatch()
      }
      
    } catch (error) {
      console.error('Error toggling play:', error)
      setError('Failed to toggle play: ' + error.message)
    }
  }
  
  const recordMatchEvent = async (eventType, playerId, teamSide, eventTime, gameTimeSeconds, playTimeSeconds) => {
    try {
      const { error } = await supabase
        .from('match_events')
        .insert({
          match_id: match.id,
          event_type: eventType,
          player_id: playerId,
          team_side: teamSide,
          event_time: eventTime.toISOString(),
          game_time_seconds: gameTimeSeconds,
          play_time_seconds: playTimeSeconds
        })
      
      if (error) throw error
      
    } catch (error) {
      console.error('Error recording match event:', error)
    }
  }
  
  
  
  
  const handlePlayerDrop = async (playerId, targetZone, targetTeam) => {
    try {
      const player = [...(homePlayers || []), ...(awayPlayers || [])].find(p => p.id === playerId)
      if (!player) return
      
      const currentStatus = playerStatuses[player.id]
      if (!currentStatus) {
        console.log('Player status not found, skipping drop')
        return
      }
      
      const currentTeam = currentStatus.team_side
      
      // Prevent cross-team drops
      if (currentTeam !== targetTeam) {
        console.log('Cannot drop player across teams')
        return
      }
      
      const newStatus = targetZone === 'bench' ? 'bench' : 'rink'
      
      // Don't do anything if status isn't changing
      if (currentStatus.status === newStatus) return
      
      const now = new Date()
      
      // Update player status
      const updatedStatuses = { ...playerStatuses }
      updatedStatuses[player.id] = {
        ...currentStatus,
        status: newStatus,
        status_start_time: now.toISOString(),
        status_start_game_time: currentGameTime,
        status_start_play_time: totalPlayTime
      }
      
      setPlayerStatuses(updatedStatuses)
      playerStatusesRef.current = updatedStatuses
      
      // Update database
      await supabase
        .from('match_player_status')
        .upsert({
          match_id: match.id,
          player_id: player.id,
          team_side: currentTeam,
          status: newStatus,
          status_start_time: now.toISOString(),
          status_start_game_time: currentGameTime,
          status_start_play_time: totalPlayTime,
          total_rink_time_seconds: playerTimers[player.id] || 0
        }, {
          onConflict: 'match_id,player_id'
        })
      
      // Record event
      const eventType = newStatus === 'rink' ? 'player_on' : 'player_off'
      await recordMatchEvent(eventType, player.id, currentTeam, now, currentGameTime, totalPlayTime)
      
      // Refresh events table
      await loadMatchEvents()
      
      // Reorganize players
      organizePlayersByPosition(updatedStatuses)
      
    } catch (error) {
      console.error('Error handling player drop:', error)
      setError('Failed to move player: ' + error.message)
    }
  }
  
  const recordGoal = async (teamSide) => {
    try {
      const now = new Date()
      
      // Update goals
      if (teamSide === 'home') {
        setGoalsHome(prev => prev + 1)
        await supabase
          .from('matches')
          .update({ goals_home: goalsHome + 1 })
          .eq('id', match.id)
      } else {
        setGoalsAway(prev => prev + 1)
        await supabase
          .from('matches')
          .update({ goals_away: goalsAway + 1 })
          .eq('id', match.id)
      }
      
      // Record goal event
      const eventType = teamSide === 'home' ? 'goal_home' : 'goal_away'
      await recordMatchEvent(eventType, null, teamSide, now, currentGameTime, totalPlayTime)
      
      // Refresh events table
      await loadMatchEvents()
      
    } catch (error) {
      console.error('Error recording goal:', error)
      setError('Failed to record goal: ' + error.message)
    }
  }
  
  const endMatch = async () => {
    try {
      const now = new Date()
      
      // Stop all timers
      stopTimers()
      
      // Update match
      const { error: updateError } = await supabase
        .from('matches')
        .update({
          is_active: false,
          game_end_time: now.toISOString()
        })
        .eq('id', match.id)
      
      if (updateError) throw updateError
      
      setMatchHasEnded(true)
      setIsPlaying(false)
      
      // Record game_end event
      await recordMatchEvent('game_end', null, 'home', now, currentGameTime, totalPlayTime)
      
    } catch (error) {
      console.error('Error ending match:', error)
      setError('Failed to end match: ' + error.message)
    }
  }
  
  const clearMatchData = async () => {
    try {
      console.log('Clearing all match data...')
      
      // Stop all timers
      stopTimers()
      
      // Clear all match events
      const { error: eventsError } = await supabase
        .from('match_events')
        .delete()
        .eq('match_id', match.id)
      
      if (eventsError) throw eventsError
      
      // Clear all player status data
      const { error: statusError } = await supabase
        .from('match_player_status')
        .delete()
        .eq('match_id', match.id)
      
      if (statusError) throw statusError
      
      // Reset match to initial state
      const { error: matchError } = await supabase
        .from('matches')
        .update({
          is_active: false,
          match_start_time: null,
          game_end_time: null,
          current_play_start_time: null,
          total_play_time_seconds: 0,
          goals_home: 0,
          goals_away: 0
        })
        .eq('id', match.id)
      
      if (matchError) throw matchError
      
      // Reset all local state
      setMatchStartTime(null)
      setCurrentPlayStartTime(null)
      setPlayStopTime(null)
      setTotalPlayTime(0)
      setCurrentGameTime(0)
      setGoalsHome(0)
      setGoalsAway(0)
      setIsPlaying(false)
      setMatchHasEnded(false)
      setPlayerStatuses({})
      setPlayerTimers({})
      playerStatusesRef.current = {}
      
      // Clear player positions
      setHomeBenchSkaters([])
      setHomeBenchGoalies([])
      setHomeRinkSkaters([])
      setHomeRinkGoalies([])
      setAwayBenchSkaters([])
      setAwayBenchGoalies([])
      setAwayRinkSkaters([])
      setAwayRinkGoalies([])
      
      // Clear events table
      setMatchEvents([])
      setEventsTotal(0)
      setEventsPage(1)
      
      // Initialize all players to bench
      await initializePlayersToBench()
      
      console.log('Match data cleared successfully')
      
    } catch (error) {
      console.error('Error clearing match data:', error)
      setError('Failed to clear match data: ' + error.message)
    }
  }
  
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  
  // Match Events Functions
  const loadMatchEvents = async () => {
    if (!match) return
    
    try {
      setEventsLoading(true)
      
      const from = (eventsPage - 1) * eventsPerPage
      const to = from + eventsPerPage - 1
      
      // Load events with pagination
      const { data: eventsData, error: eventsError, count } = await supabase
        .from('match_events')
        .select(`
          *,
          players (
            id,
            first_name,
            last_name,
            jersey_number
          )
        `, { count: 'exact' })
        .eq('match_id', match.id)
        .order('event_time', { ascending: false })
        .range(from, to)
      
      if (eventsError) throw eventsError
      
      setMatchEvents(eventsData || [])
      setEventsTotal(count || 0)
      
    } catch (error) {
      console.error('Error loading match events:', error)
      setError('Failed to load match events: ' + error.message)
    } finally {
      setEventsLoading(false)
    }
  }
  
  const handleEditEvent = (event) => {
    setSelectedEvent(event)
    setEditEventForm({
      event_type: event.event_type,
      player_id: event.player_id || '',
      team_side: event.team_side,
      event_time: new Date(event.event_time).toISOString().slice(0, 16), // Format for datetime-local input
      game_time_seconds: event.game_time_seconds,
      play_time_seconds: event.play_time_seconds
    })
    setShowEditEventModal(true)
  }
  
  const handleSaveEvent = async () => {
    if (!selectedEvent) return
    
    try {
      // Convert local time back to ISO string with timezone
      const localDateTime = new Date(editEventForm.event_time)
      const timezoneOffset = localDateTime.getTimezoneOffset()
      const utcDateTime = new Date(localDateTime.getTime() + (timezoneOffset * 60000))
      const isoString = utcDateTime.toISOString().slice(0, 19) + `+${String(Math.floor(Math.abs(timezoneOffset) / 60)).padStart(2, '0')}:${String(Math.abs(timezoneOffset) % 60).padStart(2, '0')}`
      
      const { error } = await supabase
        .from('match_events')
        .update({
          event_type: editEventForm.event_type,
          player_id: editEventForm.player_id || null,
          team_side: editEventForm.team_side,
          event_time: isoString,
          game_time_seconds: parseInt(editEventForm.game_time_seconds),
          play_time_seconds: parseInt(editEventForm.play_time_seconds)
        })
        .eq('id', selectedEvent.id)
      
      if (error) throw error
      
      // Reload events
      await loadMatchEvents()
      
      setShowEditEventModal(false)
      setSelectedEvent(null)
      
    } catch (error) {
      console.error('Error updating event:', error)
      setError('Failed to update event: ' + error.message)
    }
  }
  
  const handleDeleteEvent = async (eventId) => {
    if (!confirm('Are you sure you want to delete this event?')) return
    
    try {
      const { error } = await supabase
        .from('match_events')
        .delete()
        .eq('id', eventId)
      
      if (error) throw error
      
      // Reload events
      await loadMatchEvents()
      
    } catch (error) {
      console.error('Error deleting event:', error)
      setError('Failed to delete event: ' + error.message)
    }
  }
  
  const getEventTypeLabel = (eventType) => {
    const labels = {
      'play_start': 'Play Start',
      'play_stop': 'Play Stop',
      'player_on': 'Player On',
      'player_off': 'Player Off',
      'goal_home': 'Goal (Home)',
      'goal_away': 'Goal (Away)',
      'game_end': 'Game End'
    }
    return labels[eventType] || eventType
  }
  
  const getEventTypeColor = (eventType) => {
    const colors = {
      'play_start': 'bg-green-100 text-green-800',
      'play_stop': 'bg-yellow-100 text-yellow-800',
      'player_on': 'bg-blue-100 text-blue-800',
      'player_off': 'bg-gray-100 text-gray-800',
      'goal_home': 'bg-red-100 text-red-800',
      'goal_away': 'bg-blue-100 text-blue-800',
      'game_end': 'bg-purple-100 text-purple-800'
    }
    return colors[eventType] || 'bg-gray-100 text-gray-800'
  }
  
  const renderPlayerCard = (player, teamSide) => {
    const status = playerStatuses[player.id]?.status || 'bench'
    const timeOnRink = playerTimers[player.id] || 0
    
    return (
      <div
        key={player.id}
        className={`player-card ${status}`}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData('text/plain', JSON.stringify({
            playerId: player.id,
            teamSide: teamSide
          }))
        }}
      >
        <div className="player-info">
          <div className="player-name">
            {player.first_name} {player.last_name}
          </div>
          <div className="player-jersey">#{player.jersey_number}</div>
        </div>
        {status === 'rink' && (
          <div className="player-time">
            {formatTime(timeOnRink)}
          </div>
        )}
      </div>
    )
  }
  
  const renderDropZone = (zone, teamSide, skaters, goalies, title) => {
    return (
      <div
        className={`drop-zone ${zone} ${teamSide}`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          const data = JSON.parse(e.dataTransfer.getData('text/plain'))
          handlePlayerDrop(data.playerId, zone, teamSide)
        }}
      >
        <div className="zone-header">{title}</div>
        
        <div className="skaters-section">
          <div className="section-label">Skaters</div>
          <div className="players-container">
            {skaters.map(player => renderPlayerCard(player, teamSide))}
          </div>
        </div>
        
        <div className="goalies-section">
          <div className="section-label">Goalies</div>
          <div className="players-container">
            {goalies.map(player => renderPlayerCard(player, teamSide))}
          </div>
        </div>
      </div>
    )
  }
  
  if (loading) {
    return (
      <div className="match-management">
        <div className="loading">Loading match...</div>
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="match-management">
        <div className="error">Error: {error}</div>
      </div>
    )
  }
  
  if (!match) {
    return (
      <div className="match-management">
        <div className="error">No match found for this session.</div>
      </div>
    )
  }
  
  return (
    <div className="match-management">
      {/* Header */}
      <div className="match-header">
        <Link 
          to={orgId ? `/organisations/${orgId}/matches` : `/matches`}
          className="back-link"
        >
          ← Back to Matches
        </Link>
        <div className="header-actions">
          <Link 
            to={orgId ? `/organisations/${orgId}/matches/${matchId}/stats` : `/matches/${matchId}/stats`}
            className="view-stats-button"
          >
            📊 View Stats
          </Link>
        </div>
        <h1>Match Management</h1>
        <div className="match-info">
          <div className="teams">
            <span className="home-team">{homeSquad?.name || 'Home'}</span>
            <span className="vs">vs</span>
            <span className="away-team">{awaySquad?.name || 'Away'}</span>
          </div>
        </div>
      </div>
      
      {/* Game Controls */}
      <div className="game-controls">
        <div className="score-display">
          <div className="score">
            <span className="team-score home">{goalsHome}</span>
            <span className="score-separator">-</span>
            <span className="team-score away">{goalsAway}</span>
          </div>
        </div>
        
        <div className="timers">
          <div className="timer">
            <label>Game Time</label>
            <div className="time-display">{formatTime(currentGameTime)}</div>
          </div>
          <div className="timer">
            <label>Play Time</label>
            <div className="time-display">{formatTime(totalPlayTime)}</div>
          </div>
        </div>
        
        <div className="control-buttons">
          {!matchStartTime && (
            <button className="start-button" onClick={startMatch}>
              Start Match
            </button>
          )}
          
          {matchStartTime && !matchHasEnded && (
            <>
              <button 
                className={`play-button ${isPlaying ? 'playing' : 'stopped'}`}
                onClick={togglePlay}
              >
                {isPlaying ? 'Stop Play' : 'Start Play'}
              </button>
              
              <div className="goal-buttons">
                <button 
                  className="goal-button home"
                  onClick={() => recordGoal('home')}
                  disabled={!isPlaying}
                >
                  Goal Home
                </button>
                <button 
                  className="goal-button away"
                  onClick={() => recordGoal('away')}
                  disabled={!isPlaying}
                >
                  Goal Away
                </button>
              </div>
              
              <button 
                className="end-button"
                onClick={() => setShowEndMatchConfirm(true)}
              >
                End Match
              </button>
              
              <button 
                className="clear-button"
                onClick={() => setShowClearMatchConfirm(true)}
              >
                Clear Match Data
              </button>
            </>
          )}
          
          {matchHasEnded && (
            <div className="match-ended-section">
              <div className="match-ended">Match Ended</div>
              <button 
                className="clear-button"
                onClick={() => setShowClearMatchConfirm(true)}
              >
                Clear Match Data
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* Player Management */}
      <div className="player-management">
        <div className="teams-container">
          {/* Home Team (Left Side) */}
          <div className="team-section home">
            <div className="team-header">
              <h2>{homeSquad?.name || 'Home Team'}</h2>
            </div>
            
            <div className="team-zones">
              {renderDropZone('bench', 'home', homeBenchSkaters, homeBenchGoalies, 'Bench')}
              {renderDropZone('rink', 'home', homeRinkSkaters, homeRinkGoalies, 'On Rink')}
            </div>
          </div>
          
          {/* Away Team (Right Side) */}
          <div className="team-section away">
            <div className="team-header">
              <h2>{awaySquad?.name || 'Away Team'}</h2>
            </div>
            
            <div className="team-zones">
              {renderDropZone('bench', 'away', awayBenchSkaters, awayBenchGoalies, 'Bench')}
              {renderDropZone('rink', 'away', awayRinkSkaters, awayRinkGoalies, 'On Rink')}
            </div>
          </div>
        </div>
      </div>
      
      {/* Match Events Table */}
      <div className="match-events-section">
        <div className="section-header">
          <h2>Match Events</h2>
          <div className="events-summary">
            Total Events: {eventsTotal}
          </div>
        </div>
        
        {eventsLoading ? (
          <div className="loading">Loading events...</div>
        ) : (
          <>
            <div className="events-table-container">
              <table className="events-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Game Time</th>
                    <th>Event Type</th>
                    <th>Player</th>
                    <th>Team</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {matchEvents.map((event) => (
                    <tr key={event.id}>
                      <td>
                        {new Date(event.event_time).toLocaleString('en-AU', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit'
                        })}
                      </td>
                      <td>{formatTime(event.game_time_seconds)}</td>
                      <td>
                        <span className={`event-type-badge ${getEventTypeColor(event.event_type)}`}>
                          {getEventTypeLabel(event.event_type)}
                        </span>
                      </td>
                      <td>
                        {event.players ? (
                          <span className="player-info">
                            #{event.players.jersey_number} {event.players.first_name} {event.players.last_name}
                          </span>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </td>
                      <td>
                        <span className={`team-badge ${event.team_side === 'home' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'}`}>
                          {event.team_side === 'home' ? 'Home' : 'Away'}
                        </span>
                      </td>
                      <td>
                        <div className="event-actions">
                          <button 
                            className="edit-button"
                            onClick={() => handleEditEvent(event)}
                            title="Edit Event"
                          >
                            ✏️
                          </button>
                          <button 
                            className="delete-button"
                            onClick={() => handleDeleteEvent(event.id)}
                            title="Delete Event"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            {eventsTotal > eventsPerPage && (
              <div className="pagination">
                <button 
                  className="pagination-button"
                  onClick={() => setEventsPage(prev => Math.max(1, prev - 1))}
                  disabled={eventsPage === 1}
                >
                  Previous
                </button>
                
                <span className="pagination-info">
                  Page {eventsPage} of {Math.ceil(eventsTotal / eventsPerPage)}
                </span>
                
                <button 
                  className="pagination-button"
                  onClick={() => setEventsPage(prev => Math.min(Math.ceil(eventsTotal / eventsPerPage), prev + 1))}
                  disabled={eventsPage >= Math.ceil(eventsTotal / eventsPerPage)}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
      
      {/* End Match Confirmation */}
      {showEndMatchConfirm && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>End Match</h3>
            <p>Are you sure you want to end this match?</p>
            <div className="modal-buttons">
              <button 
                className="cancel-button"
                onClick={() => setShowEndMatchConfirm(false)}
              >
                Cancel
              </button>
              <button 
                className="confirm-button"
                onClick={() => {
                  endMatch()
                  setShowEndMatchConfirm(false)
                }}
              >
                End Match
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Clear Match Data Confirmation */}
      {showClearMatchConfirm && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Clear Match Data</h3>
            <p>Are you sure you want to clear all match data? This will:</p>
            <ul style={{ textAlign: 'left', margin: '1rem 0' }}>
              <li>Delete all match events</li>
              <li>Reset all player positions to bench</li>
              <li>Reset scores to 0-0</li>
              <li>Reset all timers</li>
              <li>Remove all player status data</li>
            </ul>
            <p><strong>This action cannot be undone!</strong></p>
            <div className="modal-buttons">
              <button 
                className="cancel-button"
                onClick={() => setShowClearMatchConfirm(false)}
              >
                Cancel
              </button>
              <button 
                className="confirm-button"
                onClick={() => {
                  clearMatchData()
                  setShowClearMatchConfirm(false)
                }}
                style={{ backgroundColor: '#dc2626' }}
              >
                Clear All Data
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Edit Event Modal */}
      {showEditEventModal && (
        <div className="modal-overlay">
          <div className="modal edit-event-modal">
            <h3>Edit Match Event</h3>
            
            <div className="form-group">
              <label htmlFor="event_type">Event Type:</label>
              <select
                id="event_type"
                value={editEventForm.event_type}
                onChange={(e) => setEditEventForm(prev => ({ ...prev, event_type: e.target.value }))}
                className="form-input"
              >
                <option value="play_start">Play Start</option>
                <option value="play_stop">Play Stop</option>
                <option value="player_on">Player On</option>
                <option value="player_off">Player Off</option>
                <option value="goal_home">Goal (Home)</option>
                <option value="goal_away">Goal (Away)</option>
                <option value="game_end">Game End</option>
              </select>
            </div>
            
            <div className="form-group">
              <label htmlFor="team_side">Team Side:</label>
              <select
                id="team_side"
                value={editEventForm.team_side}
                onChange={(e) => setEditEventForm(prev => ({ ...prev, team_side: e.target.value }))}
                className="form-input"
              >
                <option value="home">Home</option>
                <option value="away">Away</option>
              </select>
            </div>
            
            <div className="form-group">
              <label htmlFor="player_id">Player:</label>
              <select
                id="player_id"
                value={editEventForm.player_id}
                onChange={(e) => setEditEventForm(prev => ({ ...prev, player_id: e.target.value }))}
                className="form-input"
              >
                <option value="">No Player</option>
                {editEventForm.team_side === 'home' ? homePlayers.map(player => (
                  <option key={player.id} value={player.id}>
                    #{player.jersey_number} {player.first_name} {player.last_name}
                  </option>
                )) : awayPlayers.map(player => (
                  <option key={player.id} value={player.id}>
                    #{player.jersey_number} {player.first_name} {player.last_name}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="form-group">
              <label htmlFor="event_time">Event Time:</label>
              <input
                type="datetime-local"
                id="event_time"
                value={editEventForm.event_time}
                onChange={(e) => setEditEventForm(prev => ({ ...prev, event_time: e.target.value }))}
                className="form-input"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="game_time_seconds">Game Time (seconds):</label>
              <input
                type="number"
                id="game_time_seconds"
                value={editEventForm.game_time_seconds}
                onChange={(e) => setEditEventForm(prev => ({ ...prev, game_time_seconds: e.target.value }))}
                className="form-input"
                min="0"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="play_time_seconds">Play Time (seconds):</label>
              <input
                type="number"
                id="play_time_seconds"
                value={editEventForm.play_time_seconds}
                onChange={(e) => setEditEventForm(prev => ({ ...prev, play_time_seconds: e.target.value }))}
                className="form-input"
                min="0"
              />
            </div>
            
            <div className="modal-buttons">
              <button 
                className="cancel-button"
                onClick={() => {
                  setShowEditEventModal(false)
                  setSelectedEvent(null)
                }}
              >
                Cancel
              </button>
              <button 
                className="confirm-button"
                onClick={handleSaveEvent}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MatchManagement
