// Utility functions for calculating game statistics
// This logic is extracted from GameStats component to ensure consistency

export const formatTime = (totalSeconds) => {
  if (!totalSeconds || totalSeconds === 0) return '0:00:00'
  
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  
  return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

export const calculatePlayerGameStats = (player, gameEvents, gameSession) => {
  // Debug: Check if this is Kael's second game
  if (player.id === '8cdeac25-6589-4a4d-9c22-3b2d28508e0e') { // Kael Telfer's ID
    console.log(`Kael - calculatePlayerGameStats called with ${gameEvents.length} events`)
    console.log(`Kael - Player object:`, player)
    console.log(`Kael - Game session ID:`, gameSession?.session_id)
    
    // Check for goal events in the input
    const inputGoalEvents = gameEvents.filter(event => 
      event.event_type === 'goal_for' || event.event_type === 'goal_against'
    )
    console.log(`Kael - Input goal events:`, inputGoalEvents.length, inputGoalEvents.map(e => ({
      type: e.event_type,
      time: e.event_time,
      session_id: e.session_id
    })))
  }
  
  // Filter events for this specific player
  const playerEvents = gameEvents.filter(event => 
    event.player_id === player.id && 
    ['player_on', 'player_off'].includes(event.event_type)
  ).sort((a, b) => new Date(a.event_time) - new Date(b.event_time))

  // Get play start/stop events
  const playEvents = gameEvents.filter(event => 
    ['play_start', 'play_stop'].includes(event.event_type)
  ).sort((a, b) => new Date(a.event_time) - new Date(b.event_time))

  console.log(`=== Calculating stats for ${player.first_name} ===`)
  console.log(`Player events (${playerEvents.length}):`, playerEvents.map(e => ({
    type: e.event_type,
    time: e.event_time
  })))
  console.log(`Play events (${playEvents.length}):`, playEvents.map(e => ({
    type: e.event_type,
    time: e.event_time
  })))

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
          if (isPlayActive) {
            currentShiftStart = eventTime
            console.log(`Player came on rink during active play at ${eventTime.toISOString()}`)
          } else {
            console.log(`Player came on rink during stopped play at ${eventTime.toISOString()} - will start tracking when play begins`)
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
  
  // Calculate plus/minus FIRST (before any early exits)
  // Debug: Show we're starting plus/minus calculation for Kael
  if (player.id === '8cdeac25-6589-4a4d-9c22-3b2d28508e0e') { // Kael Telfer's ID
    console.log(`Kael - Starting plus/minus calculation...`)
  }
  
  // Calculate plus/minus
  let plusMinus = 0
  
  // Get all goal events
  const goalEvents = gameEvents.filter(event => 
    event.event_type === 'goal_for' || event.event_type === 'goal_against'
  ).sort((a, b) => new Date(a.event_time) - new Date(b.event_time))
  
        // Debug: Show goal events details for Kael
        if (player.id === '8cdeac25-6589-4a4d-9c22-3b2d28508e0e') { // Kael Telfer's ID
          console.log(`Kael - Goal events found in calculatePlayerGameStats:`, goalEvents.length, 'events')
          if (goalEvents.length > 0) {
            console.log(`Kael - Goal events details:`, goalEvents.map(e => ({
              type: e.event_type,
              time: e.event_time,
              session_id: e.session_id,
              player_id: e.player_id,
              metadata: e.metadata,
              metadata_keys: e.metadata ? Object.keys(e.metadata) : 'no metadata'
            })))
      
      // Check if all goal events belong to the current session
      const currentSessionId = gameSession?.session_id || 'unknown'
      const wrongSessionGoals = goalEvents.filter(e => e.session_id !== currentSessionId)
      if (wrongSessionGoals.length > 0) {
        console.log(`Kael - WARNING: Found ${wrongSessionGoals.length} goal events from wrong session!`)
        console.log(`Kael - Current session: ${currentSessionId}`)
        console.log(`Kael - Wrong session goals:`, wrongSessionGoals.map(e => ({
          type: e.event_type,
          time: e.event_time,
          session_id: e.session_id,
          player_id: e.player_id
        })))
      }
    } else {
      console.log(`Kael - No goal events found! Checking all events...`)
      const allGoalEvents = gameEvents.filter(event => 
        event.event_type === 'goal_for' || event.event_type === 'goal_against'
      )
      console.log(`Kael - All goal events in gameEvents:`, allGoalEvents.length, allGoalEvents.map(e => ({
        type: e.event_type,
        time: e.event_time,
        session_id: e.session_id,
        player_id: e.player_id
      })))
    }
  }
  
  // Debug goal events for specific player
  if (player.id === '8cdeac25-6589-4a4d-9c22-3b2d28508e0e') { // Kael Telfer's ID
    console.log(`Kael - Found ${goalEvents.length} goal events:`, goalEvents.map(e => ({
      type: e.event_type,
      time: e.event_time,
      metadata: e.metadata,
      player_id: e.player_id
    })))
    
    // Debug all events in the session to see what's available
    console.log(`Kael - All events in session (${gameEvents.length} total):`, gameEvents.map(e => ({
      type: e.event_type,
      time: e.event_time,
      player_id: e.player_id
    })))
  }

  // Process each goal event
  for (const goalEvent of goalEvents) {
    // Check if player was on rink at the time of the goal
    const goalTime = new Date(goalEvent.event_time)
    let wasOnRinkAtGoal = false
    
    
    // Check if player was on rink at goal time
    if (goalEvent.metadata && goalEvent.metadata.rink_players) {
      // Use metadata if available (more accurate)
      wasOnRinkAtGoal = goalEvent.metadata.rink_players.includes(player.id)
      
      // Debug: Log metadata usage for Kael
      if (player.id === '8cdeac25-6589-4a4d-9c22-3b2d28508e0e') { // Kael Telfer's ID
        console.log(`Kael - Using metadata.rink_players for goal at ${goalEvent.event_time}:`, {
          rink_players: goalEvent.metadata.rink_players,
          player_id: player.id,
          was_on_rink: wasOnRinkAtGoal
        })
      }
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
      
      // Debug: Log fallback usage for Kael
      if (player.id === '8cdeac25-6589-4a4d-9c22-3b2d28508e0e') { // Kael Telfer's ID
        console.log(`Kael - Using fallback player events for goal at ${goalEvent.event_time}:`, {
          was_on_rink: wasOnRinkAtGoal,
          events_before_goal: eventsBeforeGoal.length
        })
      }
    }
    
    // Apply plus/minus based on goal type and whether player was on rink
    // IMPORTANT: Only count plus/minus if the player was on the rink when the goal occurred
    // The goal event type (goal_for/goal_against) already indicates which team scored
    if (wasOnRinkAtGoal) {
      if (goalEvent.event_type === 'goal_for') {
        plusMinus += 1
        if (player.id === '8cdeac25-6589-4a4d-9c22-3b2d28508e0e') { // Kael Telfer's ID
          console.log(`Kael - Goal FOR at ${goalEvent.event_time}, was on rink: ${wasOnRinkAtGoal}, plus/minus: +1, total: ${plusMinus}`)
        console.log(`Kael - Goal FOR details:`, {
          scorer_player_id: goalEvent.player_id,
          scorer_is_kael: goalEvent.player_id === player.id,
          event_time: goalEvent.event_time,
          metadata: goalEvent.metadata,
          metadata_keys: goalEvent.metadata ? Object.keys(goalEvent.metadata) : 'no metadata',
          full_event: goalEvent
        })
        }
      } else if (goalEvent.event_type === 'goal_against') {
        plusMinus -= 1
        if (player.id === '8cdeac25-6589-4a4d-9c22-3b2d28508e0e') { // Kael Telfer's ID
          console.log(`Kael - Goal AGAINST at ${goalEvent.event_time}, was on rink: ${wasOnRinkAtGoal}, plus/minus: -1, total: ${plusMinus}`)
        console.log(`Kael - Goal AGAINST details:`, {
          scorer_player_id: goalEvent.player_id,
          scorer_is_kael: goalEvent.player_id === player.id,
          event_time: goalEvent.event_time,
          metadata: goalEvent.metadata,
          metadata_keys: goalEvent.metadata ? Object.keys(goalEvent.metadata) : 'no metadata',
          full_event: goalEvent
        })
        }
      }
    } else {
      if (player.id === '8cdeac25-6589-4a4d-9c22-3b2d28508e0e') { // Kael Telfer's ID
        console.log(`Kael - Goal ${goalEvent.event_type} at ${goalEvent.event_time}, was on rink: ${wasOnRinkAtGoal}, no change to plus/minus`)
        console.log(`Kael - Goal details (not on rink):`, {
          scorer_player_id: goalEvent.player_id,
          scorer_is_kael: goalEvent.player_id === player.id,
          event_time: goalEvent.event_time,
          metadata: goalEvent.metadata,
          metadata_keys: goalEvent.metadata ? Object.keys(goalEvent.metadata) : 'no metadata',
          full_event: goalEvent
        })
      }
    }
  }
  
  // Handle case where player is still on rink at game end
  if (isOnRink && currentShiftStart && isPlayActive) {
    // Use the game_end event time if available, otherwise use the last play_stop event
    let gameEndTime = null
    
    // First, try to find a game_end event
    const gameEndEvent = allEvents.filter(e => e.event_type === 'game_end').pop()
    if (gameEndEvent) {
      gameEndTime = new Date(gameEndEvent.event_time)
    } else if (playEvents.length > 0) {
      // Find the last play_stop event that happened after the current shift started
      const playStopEvents = playEvents.filter(e => e.event_type === 'play_stop')
      const lastPlayStop = playStopEvents.find(e => new Date(e.event_time) > currentShiftStart)
      if (lastPlayStop) {
        gameEndTime = new Date(lastPlayStop.event_time)
      } else {
        // If no play_stop after current shift, the game might still be active
        // In this case, we should skip the final shift calculation to avoid negative times
        console.log(`Player still on rink but no play_stop event after shift start - skipping final shift calculation`)
        // Debug: Show we're exiting early for Kael but plus/minus is already calculated
        if (player.id === '8cdeac25-6589-4a4d-9c22-3b2d28508e0e') { // Kael Telfer's ID
          console.log(`Kael - EXITING EARLY due to no play_stop event after shift start - but plus/minus already calculated: ${plusMinus}`)
        }
        return {
          totalRinkTime,
          shiftCount,
          averageShiftTime: shiftCount > 0 ? Math.round(totalRinkTime / shiftCount) : 0,
          shortestShift,
          longestShift,
          longestShiftStartTime,
          plusMinus, // Use the calculated plus/minus instead of 0
          formattedTime: formatTime(totalRinkTime),
          formattedAverageShiftTime: formatTime(shiftCount > 0 ? Math.round(totalRinkTime / shiftCount) : 0),
          formattedShortestShift: formatTime(shortestShift),
          formattedLongestShift: formatTime(longestShift)
        }
      }
    }
    
        // If we still don't have a valid end time, skip this shift to avoid infinite calculations
        if (!gameEndTime) {
          console.log(`Player still on rink but no valid game end time found - skipping final shift calculation`)
          // Debug: Show we're exiting early for Kael but plus/minus is already calculated
          if (player.id === '8cdeac25-6589-4a4d-9c22-3b2d28508e0e') { // Kael Telfer's ID
            console.log(`Kael - EXITING EARLY due to no valid game end time - but plus/minus already calculated: ${plusMinus}`)
          }
          return {
            totalRinkTime,
            shiftCount,
            averageShiftTime: shiftCount > 0 ? Math.round(totalRinkTime / shiftCount) : 0,
            shortestShift,
            longestShift,
            longestShiftStartTime,
            plusMinus, // Use the calculated plus/minus instead of 0
            formattedTime: formatTime(totalRinkTime),
            formattedAverageShiftTime: formatTime(shiftCount > 0 ? Math.round(totalRinkTime / shiftCount) : 0),
            formattedShortestShift: formatTime(shortestShift),
            formattedLongestShift: formatTime(longestShift)
          }
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
  
  // Plus/minus already calculated above before early exit logic
  
  
  return {
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
    formattedLongestShift: formatTime(longestShift)
  }
}
