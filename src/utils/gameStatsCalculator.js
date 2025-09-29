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
  
  // Handle case where player is still on rink at game end
  if (isOnRink && currentShiftStart && isPlayActive) {
    const gameEndTime = gameSession?.game_end_time ? new Date(gameSession.game_end_time) : new Date()
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
