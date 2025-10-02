import React, { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../src/lib/supabase'
import './TimelineEventEditor.css'

const TimelineEventEditor = () => {
  const { sessionId, orgId } = useParams()
  const [session, setSession] = useState(null)
  const [gameEvents, setGameEvents] = useState([])
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [draggedEvent, setDraggedEvent] = useState(null)
  const [dragOffset, setDragOffset] = useState(0)
  const [dragPreviewTime, setDragPreviewTime] = useState(null)
  const [showAddEventModal, setShowAddEventModal] = useState(false)
  const [timeZero, setTimeZero] = useState(null) // Custom start time for relative timing
  const [timelineHeight, setTimelineHeight] = useState(6000) // Dynamic timeline height
  const [zoomLevel, setZoomLevel] = useState(1) // 1 = normal, 2 = 2x zoom, 0.5 = half size
  
  // Event type filter state
  const [selectedEventTypes, setSelectedEventTypes] = useState(new Set([
    'player_on', 'player_off', 'goal_for', 'goal_against', 
    'play_start', 'play_stop', 'game_start', 'game_end'
  ]))
  
  // New event form state
  const [newEvent, setNewEvent] = useState({
    event_type: '',
    player_id: '',
    event_time: ''
  })

  // Timeline constants
  const TIMELINE_HEIGHT = 6000 // 6000px for 60 minutes (100px per minute)
  const PIXELS_PER_MINUTE = 100 * zoomLevel
  const PIXELS_PER_SECOND = PIXELS_PER_MINUTE / 60

  // Event types for filtering
  const eventTypes = [
    { value: 'player_on', label: 'Player On Rink', color: 'bg-green-500' },
    { value: 'player_off', label: 'Player Off Rink', color: 'bg-red-500' },
    { value: 'goal_for', label: 'Goal For', color: 'bg-blue-500' },
    { value: 'goal_against', label: 'Goal Against', color: 'bg-yellow-500' },
    { value: 'play_start', label: 'Play Start', color: 'bg-indigo-500' },
    { value: 'play_stop', label: 'Play Stop', color: 'bg-purple-500' },
    { value: 'game_start', label: 'Game Start', color: 'bg-gray-700' },
    { value: 'game_end', label: 'Game End', color: 'bg-gray-900' }
  ]

  // Filter functions
  const toggleEventType = (eventType) => {
    const newSelected = new Set(selectedEventTypes)
    if (newSelected.has(eventType)) {
      newSelected.delete(eventType)
    } else {
      newSelected.add(eventType)
    }
    setSelectedEventTypes(newSelected)
  }

  const filteredEvents = gameEvents.filter(event => 
    selectedEventTypes.size === 0 || selectedEventTypes.has(event.event_type)
  )
  
  // Debug: Check if the target event is in the final filtered events for rendering
  const targetEventInRender = filteredEvents.find(e => e.id === '0455e763-1fa3-495c-92e7-fccf1d24ee65')
  if (targetEventInRender) {
    console.log('Target event will be rendered:', {
      id: targetEventInRender.id,
      event_type: targetEventInRender.event_type,
      event_time: targetEventInRender.event_time,
      selectedEventTypes: Array.from(selectedEventTypes)
    })
    
    // Calculate the timeline position for this event
    if (timeZero) {
      const eventTime = new Date(targetEventInRender.event_time)
      const timeDiff = eventTime - timeZero
      const position = (timeDiff / (1000 * 60)) * PIXELS_PER_MINUTE
      console.log('Target event timeline position:', {
        eventTime: eventTime.toISOString(),
        timeZero: timeZero.toISOString(),
        timeDiffMs: timeDiff,
        timeDiffMinutes: timeDiff / (1000 * 60),
        positionPixels: position
      })
    }
  } else {
    console.log('Target event will NOT be rendered - filtered out by event type filter')
    console.log('Selected event types:', Array.from(selectedEventTypes))
    const targetEventInGameEvents = gameEvents.find(e => e.id === '0455e763-1fa3-495c-92e7-fccf1d24ee65')
    if (targetEventInGameEvents) {
      console.log('Target event exists in gameEvents but not in filteredEvents:', targetEventInGameEvents.event_type)
    }
  }

  useEffect(() => {
    if (sessionId) {
      loadSessionData()
      loadGameEvents()
      loadPlayers()
    }
  }, [sessionId])

  const loadSessionData = async () => {
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', sessionId)
        .single()

      if (error) throw error
      setSession(data)
    } catch (err) {
      setError('Failed to load session data')
      console.error('Error loading session:', err)
    }
  }

  const loadGameEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('game_events')
        .select('*')
        .eq('session_id', sessionId)
        .order('event_time', { ascending: true })

      if (error) throw error
      
      // Filter to only include events from the actual game day
      // Use the chronologically first event to determine the game day
      if (data && data.length > 0) {
        const firstEvent = data[0] // This is already sorted by event_time
        const firstEventTime = new Date(firstEvent.event_time)
        
        // Only include events from the game day onwards
        const gameDayStart = new Date(firstEventTime)
        gameDayStart.setHours(0, 0, 0, 0) // Start of the game day
        
        const filteredEvents = (data || []).filter(event => 
          new Date(event.event_time) >= gameDayStart
        )
        
        console.log('Timeline Editor - Filtering events:', {
          totalEvents: data?.length || 0,
          filteredEvents: filteredEvents.length,
          firstEventTime: firstEventTime.toISOString(),
          gameDayStart: gameDayStart.toISOString()
        })
        
        // Debug: Check if the specific event is in the filtered results
        const targetEvent = filteredEvents.find(e => e.id === '0455e763-1fa3-495c-92e7-fccf1d24ee65')
        if (targetEvent) {
          console.log('Target event found in filtered events:', {
            id: targetEvent.id,
            event_type: targetEvent.event_type,
            event_time: targetEvent.event_time,
            player_id: targetEvent.player_id,
            date: new Date(targetEvent.event_time).toDateString()
          })
        } else {
          console.log('Target event NOT found in filtered events')
          // Check if it's in the original data
          const originalTargetEvent = data.find(e => e.id === '0455e763-1fa3-495c-92e7-fccf1d24ee65')
          if (originalTargetEvent) {
            console.log('Target event found in original data but filtered out:', {
              id: originalTargetEvent.id,
              event_type: originalTargetEvent.event_type,
              event_time: originalTargetEvent.event_time,
              date: new Date(originalTargetEvent.event_time).toDateString()
            })
            console.log('Event time:', new Date(originalTargetEvent.event_time).toISOString())
            console.log('Game day start:', gameDayStart.toISOString())
            console.log('Event time >= game day start?', new Date(originalTargetEvent.event_time) >= gameDayStart)
          } else {
            console.log('Target event NOT found in original data either')
            console.log('Total events loaded:', data?.length || 0)
          }
        }
        
        setGameEvents(filteredEvents)
        
        // Set time zero to the first play_start event if available, otherwise use first event
        const playStartEvents = filteredEvents.filter(event => event.event_type === 'play_start')
        let timeZeroEvent
        let timeZeroTime
        
        if (playStartEvents.length > 0) {
          timeZeroEvent = playStartEvents[0]
          timeZeroTime = new Date(timeZeroEvent.event_time)
          console.log('Timeline Editor - Using first play_start as time zero:', timeZeroTime.toISOString())
        } else {
          timeZeroEvent = filteredEvents[0]
          timeZeroTime = new Date(timeZeroEvent.event_time)
          console.log('Timeline Editor - No play_start found, using first event as time zero:', timeZeroTime.toISOString())
        }
        
        const lastEventTime = new Date(filteredEvents[filteredEvents.length - 1].event_time)
        
        console.log('Timeline Editor - Time zero setup:', {
          timeZeroEvent: timeZeroEvent,
          timeZeroTime: timeZeroTime.toISOString(),
          totalEvents: filteredEvents.length,
          lastEventTime: lastEventTime.toISOString()
        })
        
        setTimeZero(timeZeroTime)
        
        // Calculate timeline height based on time span (with some padding)
        const timeSpanMs = lastEventTime - timeZeroTime
        const timeSpanMinutes = timeSpanMs / (1000 * 60) // Convert to minutes
        const paddedMinutes = Math.max(timeSpanMinutes + 10, 15) // Add 10 minutes padding (5 before + 5 after), minimum 15 minutes
        const calculatedHeight = paddedMinutes * PIXELS_PER_MINUTE
        
        setTimelineHeight(calculatedHeight)
      } else {
        // No play_start events found, use all events
        console.log('Timeline Editor - No play_start events found, using all events')
        setGameEvents(data || [])
        
        if (data && data.length > 0) {
          const firstEventTime = new Date(data[0].event_time)
          const lastEventTime = new Date(data[data.length - 1].event_time)
          setTimeZero(firstEventTime)
          
          const timeSpanMs = lastEventTime - firstEventTime
          const timeSpanMinutes = timeSpanMs / (1000 * 60)
          const paddedMinutes = Math.max(timeSpanMinutes + 5, 10)
          const calculatedHeight = paddedMinutes * PIXELS_PER_MINUTE
          setTimelineHeight(calculatedHeight)
        }
      }
    } catch (err) {
      setError('Failed to load game events')
      console.error('Error loading game events:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadPlayers = async () => {
    try {
      // Get players from the session's squad
      const { data: sessionSquads, error: squadError } = await supabase
        .from('session_squads')
        .select('squad_id')
        .eq('session_id', sessionId)

      if (squadError) throw squadError

      if (sessionSquads && sessionSquads.length > 0) {
        const squadIds = sessionSquads.map(ss => ss.squad_id)
        
        const { data: squadPlayers, error: playersError } = await supabase
          .from('player_squads')
          .select(`
            players!inner (
              id,
              first_name,
              last_name,
              jersey_number
            )
          `)
          .in('squad_id', squadIds)

        if (playersError) throw playersError

        const playerList = (squadPlayers || [])
          .map(sp => sp.players)
          .filter(Boolean)
          .map(player => ({
            id: player.id,
            name: `${player.first_name} ${player.last_name}`,
            jersey: player.jersey_number
          }))

        setPlayers(playerList)
      }
    } catch (err) {
      console.error('Error loading players:', err)
    }
  }

  const formatTime = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-AU', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const formatRelativeTime = (dateString) => {
    if (!timeZero) return '00:00'
    
    const eventTime = new Date(dateString)
    const diffMs = eventTime - timeZero
    const diffSeconds = Math.floor(diffMs / 1000)
    const minutes = Math.floor(diffSeconds / 60)
    const seconds = diffSeconds % 60
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  const getEventTypeColor = (eventType) => {
    const colors = {
      'goal_for': 'bg-green-500',
      'goal_against': 'bg-red-500',
      'player_on': 'bg-blue-500',
      'player_off': 'bg-orange-500',
      'play_start': 'bg-green-600',
      'play_stop': 'bg-red-600',
      'game_start': 'bg-purple-500',
      'game_end': 'bg-gray-500'
    }
    return colors[eventType] || 'bg-gray-400'
  }

  const getEventTypeLabel = (eventType) => {
    const labels = {
      'goal_for': 'Goal For',
      'goal_against': 'Goal Against',
      'player_on': 'Player On',
      'player_off': 'Player Off',
      'play_start': 'Play Start',
      'play_stop': 'Play Stop',
      'game_start': 'Game Start',
      'game_end': 'Game End'
    }
    return labels[eventType] || eventType
  }

  const getPlayerName = (playerId) => {
    const player = players.find(p => p.id === playerId)
    return player ? `${player.name} #${player.jersey}` : 'Unknown Player'
  }

  const getPlayerFirstName = (playerId) => {
    const player = players.find(p => p.id === playerId)
    if (!player) return 'Unknown'
    
    // Extract first name from the full name and include jersey number
    const nameParts = player.name.split(' ')
    const firstName = nameParts[0]
    return `${firstName} #${player.jersey}`
  }

  const getTimelinePosition = (eventTime) => {
    if (!timeZero) return 0
    
    const event = new Date(eventTime)
    const diffMs = event - timeZero
    const diffSeconds = diffMs / 1000
    const position = diffSeconds * PIXELS_PER_SECOND
    
    // Add padding to show events that happen before time zero
    // This ensures pre-game events are visible above the timeline
    const adjustedPosition = position + (5 * 60 * PIXELS_PER_SECOND) // 5 minutes padding
    
    return adjustedPosition
  }

  const handleDragStart = (e, event) => {
    setDraggedEvent(event)
    
    // Set drag effect
    e.dataTransfer.effectAllowed = 'move'
    
    // Store event data for drag end
    e.dataTransfer.setData('text/plain', event.id)
    
    // Create a custom drag image that shows the dynamic time
    const dragImage = e.currentTarget.cloneNode(true)
    dragImage.style.opacity = '0.8'
    dragImage.style.transform = 'rotate(2deg)'
    document.body.appendChild(dragImage)
    e.dataTransfer.setDragImage(dragImage, 0, 0)
    
    // Remove the temporary drag image after a short delay
    setTimeout(() => {
      if (document.body.contains(dragImage)) {
        document.body.removeChild(dragImage)
      }
    }, 0)
  }

  const handleDrag = (e) => {
    if (!draggedEvent) return
    // Mouse tracking is now handled in onDragOver
  }

  const handleDragEnd = async (e) => {
    if (!draggedEvent) return
    
    // Calculate new time based on drop position
    const timelineElement = document.querySelector('.timeline-container')
    if (!timelineElement) {
      setDraggedEvent(null)
      return
    }
    
    const rect = timelineElement.getBoundingClientRect()
    const relativeY = e.clientY - rect.top
    const newSeconds = relativeY / PIXELS_PER_SECOND
    const newEventTime = new Date(timeZero.getTime() + newSeconds * 1000)
    
    // Immediately update the local state to prevent snap-back
    // Create local time string with explicit timezone offset for event_time
    const year = newEventTime.getFullYear()
    const month = String(newEventTime.getMonth() + 1).padStart(2, '0')
    const day = String(newEventTime.getDate()).padStart(2, '0')
    const hours = String(newEventTime.getHours()).padStart(2, '0')
    const minutes = String(newEventTime.getMinutes()).padStart(2, '0')
    const seconds = String(newEventTime.getSeconds()).padStart(2, '0')
    
    // Get timezone offset in format +/-HH:MM
    const timezoneOffset = newEventTime.getTimezoneOffset()
    const offsetHours = Math.floor(Math.abs(timezoneOffset) / 60)
    const offsetMinutes = Math.abs(timezoneOffset) % 60
    const offsetSign = timezoneOffset <= 0 ? '+' : '-'
    const timezoneString = `${offsetSign}${String(offsetHours).padStart(2, '0')}:${String(offsetMinutes).padStart(2, '0')}`
    
    const localTimeString = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.000${timezoneString}`

    setGameEvents(prevEvents => {
      const updatedEvents = prevEvents.map(event => 
        event.id === draggedEvent.id 
          ? { ...event, event_time: localTimeString }
          : event
      )
      return updatedEvents
    })
    
    // Update database in background
    try {
      const { error } = await supabase
        .from('game_events')
        .update({ event_time: localTimeString })
        .eq('id', draggedEvent.id)

      if (error) throw error
      
      // Only reset drag state after successful database update
      setDraggedEvent(null)
      setDragOffset(0)
      setDragPreviewTime(null)
    } catch (err) {
      setError('Failed to update event time')
      console.error('Error updating event:', err)
      
      // Reset drag state on error
      setDraggedEvent(null)
      setDragOffset(0)
      setDragPreviewTime(null)
      
      // If database update failed, revert the local state
      loadGameEvents()
    }
  }

  const handleAddEvent = async () => {
    if (!newEvent.event_type) return
    
    // For player_on and player_off events, require a player
    if ((newEvent.event_type === 'player_on' || newEvent.event_type === 'player_off') && !newEvent.player_id) {
      setError('Please select a player for this event type')
      return
    }

    try {
      // Create local time string with explicit timezone offset for event_time
      const now = new Date()
      const year = now.getFullYear()
      const month = String(now.getMonth() + 1).padStart(2, '0')
      const day = String(now.getDate()).padStart(2, '0')
      const hours = String(now.getHours()).padStart(2, '0')
      const minutes = String(now.getMinutes()).padStart(2, '0')
      const seconds = String(now.getSeconds()).padStart(2, '0')
      
      // Get timezone offset in format +/-HH:MM
      const timezoneOffset = now.getTimezoneOffset()
      const offsetHours = Math.floor(Math.abs(timezoneOffset) / 60)
      const offsetMinutes = Math.abs(timezoneOffset) % 60
      const offsetSign = timezoneOffset <= 0 ? '+' : '-'
      const timezoneString = `${offsetSign}${String(offsetHours).padStart(2, '0')}:${String(offsetMinutes).padStart(2, '0')}`
      
      const localTimeString = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.000${timezoneString}`

      const eventData = {
        session_id: sessionId,
        event_type: newEvent.event_type,
        event_time: newEvent.event_time || localTimeString
      }

      if (newEvent.player_id) {
        eventData.player_id = newEvent.player_id
      }

      const { error } = await supabase
        .from('game_events')
        .insert(eventData)

      if (error) throw error
      
      // Reset form and reload events
      setNewEvent({ event_type: '', player_id: '', event_time: '' })
      setShowAddEventModal(false)
      loadGameEvents()
    } catch (err) {
      setError('Failed to add event')
      console.error('Error adding event:', err)
    }
  }

  const generateTimeMarkers = () => {
    if (!timeZero) return []
    
    const markers = []
    const totalMinutes = Math.ceil(timelineHeight / PIXELS_PER_MINUTE) // Dynamic based on timeline height
    const paddingMinutes = 5 // 5 minutes padding for pre-game events
    
    // Generate markers for pre-game time (negative time)
    for (let minute = -paddingMinutes; minute < 0; minute++) {
      const time = new Date(timeZero.getTime() + minute * 60 * 1000)
      const position = (minute + paddingMinutes) * PIXELS_PER_MINUTE
      
      markers.push(
        <div key={`pre-${minute}`} className="time-marker" style={{ top: `${position}px` }}>
          <div className="time-label-absolute">
            {time.toLocaleTimeString('en-US', { 
              hour12: false, 
              hour: '2-digit', 
              minute: '2-digit', 
              second: '2-digit' 
            })}
          </div>
          <div className="time-label-relative">
            {minute}:00
          </div>
          <div className="timeline-line"></div>
        </div>
      )
    }
    
    // Generate markers for game time (0 and positive time)
    for (let minute = 0; minute <= totalMinutes; minute += 1) { // One minute graduations
      const position = (minute + paddingMinutes) * PIXELS_PER_MINUTE
      const time = new Date(timeZero.getTime() + minute * 60 * 1000)
      
      markers.push(
        <div key={minute} className="time-marker" style={{ top: `${position}px` }}>
          <div className="time-label-absolute">
            {time.toLocaleTimeString('en-US', { 
              hour12: false, 
              hour: '2-digit', 
              minute: '2-digit', 
              second: '2-digit' 
            })}
          </div>
          <div className="time-label-relative">
            {minute === 0 ? '00:00' : `${minute.toString().padStart(2, '0')}:00`}
          </div>
          <div className="timeline-line"></div>
        </div>
      )
    }
    
    return markers
  }

  if (loading || !timeZero) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <Link
                to={orgId ? `/organisations/${orgId}/sessions/${sessionId}/game-stats` : `/sessions/${sessionId}/game-stats`}
                className="text-gray-600 hover:text-gray-800 font-medium flex items-center space-x-1 mb-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span>Back to Game Stats</span>
              </Link>
              <h1 className="text-3xl font-bold text-gray-900">
                Timeline Event Editor
              </h1>
              {session && (
                <p className="text-gray-600 mt-1">
                  {session.title} - {session.date}
                </p>
              )}
            </div>
            <div className="flex items-center space-x-4">
              {/* Zoom Controls */}
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Zoom:</span>
                <button
                  onClick={() => setZoomLevel(Math.max(0.25, zoomLevel - 0.25))}
                  className="bg-gray-200 text-gray-700 px-3 py-1 rounded hover:bg-gray-300 transition-colors"
                  disabled={zoomLevel <= 0.25}
                >
                  -
                </button>
                <span className="text-sm text-gray-700 min-w-[3rem] text-center">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <button
                  onClick={() => setZoomLevel(Math.min(4, zoomLevel + 0.25))}
                  className="bg-gray-200 text-gray-700 px-3 py-1 rounded hover:bg-gray-300 transition-colors"
                  disabled={zoomLevel >= 4}
                >
                  +
                </button>
                <button
                  onClick={() => setZoomLevel(1)}
                  className="bg-gray-200 text-gray-700 px-3 py-1 rounded hover:bg-gray-300 transition-colors text-xs"
                >
                  Reset
                </button>
              </div>
              <button
                onClick={() => setShowAddEventModal(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-md transition duration-150 ease-in-out"
              >
                Add Event
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Event Type Filter */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Filter Event Types</h2>
          <div className="flex flex-wrap gap-2">
            {eventTypes.map((eventType) => (
              <button
                key={eventType.value}
                onClick={() => toggleEventType(eventType.value)}
                className={`px-3 py-2 rounded-full text-sm font-medium transition-colors ${
                  selectedEventTypes.has(eventType.value)
                    ? `${eventType.color} text-white`
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {eventType.label}
              </button>
            ))}
          </div>
          <div className="mt-3 text-sm text-gray-600">
            Showing {filteredEvents.length} of {gameEvents.length} events
          </div>
        </div>

        {/* Timeline Container */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex">
            {/* Time Labels Column */}
            <div className="w-32 flex-shrink-0 relative">
              <div className="sticky top-0 bg-white z-10 pb-4">
                <div className="flex justify-between text-sm font-semibold text-gray-700 mb-2">
                  <div className="text-right" style={{ width: '5rem' }}>Absolute Time</div>
                  <div className="text-right" style={{ width: '5rem' }}>Relative Time</div>
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="flex-1 relative">
              <div 
                className="timeline-container relative"
                style={{ height: `${timelineHeight}px` }}
                onDragOver={(e) => {
                  if (draggedEvent) {
                    // Calculate preview time for visual feedback
                    const rect = e.currentTarget.getBoundingClientRect()
                    const relativeY = e.clientY - rect.top
                    const newSeconds = relativeY / PIXELS_PER_SECOND
                    const newEventTime = new Date(timeZero.getTime() + newSeconds * 1000)
                    
                    // Create local time string with explicit timezone offset for preview
                    const year = newEventTime.getFullYear()
                    const month = String(newEventTime.getMonth() + 1).padStart(2, '0')
                    const day = String(newEventTime.getDate()).padStart(2, '0')
                    const hours = String(newEventTime.getHours()).padStart(2, '0')
                    const minutes = String(newEventTime.getMinutes()).padStart(2, '0')
                    const seconds = String(newEventTime.getSeconds()).padStart(2, '0')
                    
                    // Get timezone offset in format +/-HH:MM
                    const timezoneOffset = newEventTime.getTimezoneOffset()
                    const offsetHours = Math.floor(Math.abs(timezoneOffset) / 60)
                    const offsetMinutes = Math.abs(timezoneOffset) % 60
                    const offsetSign = timezoneOffset <= 0 ? '+' : '-'
                    const timezoneString = `${offsetSign}${String(offsetHours).padStart(2, '0')}:${String(offsetMinutes).padStart(2, '0')}`
                    
                    const localTimeString = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.000${timezoneString}`
                    
                    setDragPreviewTime(localTimeString)
                  }
                }}
              >
                {/* Timeline Background */}
                <div className="timeline-background" style={{ height: `${timelineHeight}px` }}>
                  {/* Time Markers */}
                  {generateTimeMarkers()}
                  
                  {/* Events */}
                  {filteredEvents.map((event) => {
                    const position = getTimelinePosition(event.event_time)
                    
                    // Debug: Log when rendering the target event
                    if (event.id === '0455e763-1fa3-495c-92e7-fccf1d24ee65') {
                      console.log('Rendering target event in DOM:', {
                        id: event.id,
                        position: position,
                        event_time: event.event_time,
                        player_id: event.player_id
                      })
                    }
                    
                    return (
                      <div
                        key={event.id}
                        className={`event-item ${draggedEvent && draggedEvent.id === event.id ? 'dragging' : ''}`}
                        style={{ 
                          top: `${position}px`,
                          userSelect: 'none',
                          WebkitUserSelect: 'none',
                          MozUserSelect: 'none',
                          msUserSelect: 'none'
                        }}
                        draggable={true}
                        onClick={(e) => {
                          console.log('Event clicked:', event.id)
                        }}
                        onDragStart={(e) => {
                          console.log('Drag start triggered for event:', event.id)
                          handleDragStart(e, event)
                        }}
                        onDrag={handleDrag}
                        onDragEnd={handleDragEnd}
                      >
                        <div className="event-arrow"></div>
                        <div className={`event-label ${getEventTypeColor(event.event_type)}`}>
                          <span className="event-type">{getEventTypeLabel(event.event_type)}</span>
                          {event.player_id && (
                            <span className="event-player"> • {getPlayerFirstName(event.player_id)}</span>
                          )}
                          <span className="event-time"> • {formatTime(
                            draggedEvent && draggedEvent.id === event.id && dragPreviewTime 
                              ? dragPreviewTime 
                              : event.event_time
                          )}</span>
                        </div>
                      </div>
                    )
                  })}
                  
                </div>
              </div>
            </div>
          </div>
        </div>


        {/* Add Event Modal */}
        {showAddEventModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">Add New Event</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Event Type
                  </label>
                  <select
                    value={newEvent.event_type}
                    onChange={(e) => setNewEvent({ ...newEvent, event_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select event type</option>
                    <option value="goal_for">Goal For</option>
                    <option value="goal_against">Goal Against</option>
                    <option value="player_on">Player On</option>
                    <option value="player_off">Player Off</option>
                    <option value="play_start">Play Start</option>
                    <option value="play_stop">Play Stop</option>
                    <option value="game_start">Game Start</option>
                    <option value="game_end">Game End</option>
                  </select>
                </div>

                {(newEvent.event_type === 'player_on' || newEvent.event_type === 'player_off') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Player
                    </label>
                    <select
                      value={newEvent.player_id}
                      onChange={(e) => setNewEvent({ ...newEvent, player_id: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Select player</option>
                      {players.map(player => (
                        <option key={player.id} value={player.id}>
                          {player.name} #{player.jersey}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Event Time
                  </label>
                  <input
                    type="datetime-local"
                    value={newEvent.event_time}
                    onChange={(e) => setNewEvent({ ...newEvent, event_time: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowAddEventModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddEvent}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  Add Event
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default TimelineEventEditor
