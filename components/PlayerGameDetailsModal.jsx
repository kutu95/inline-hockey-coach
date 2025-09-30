import { useState, useEffect } from 'react'
import { supabase } from '../src/lib/supabase'
import { calculatePlayerGameStatsExact } from '../src/utils/calculatePlayerGameStatsExact'

const PlayerGameDetailsModal = ({ isOpen, onClose, player, squadId }) => {
  const [gameDetails, setGameDetails] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Function to format shift time (MM:SS format)
  const formatShiftTime = (totalSeconds) => {
    if (!totalSeconds || totalSeconds === 0) return '00:00'
    
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  // Function to format game time
  const formatGameTime = (totalSeconds) => {
    if (!totalSeconds || totalSeconds === 0) return '0:00:00'
    
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  useEffect(() => {
    if (isOpen && player && squadId) {
      fetchPlayerGameDetails()
    }
  }, [isOpen, player, squadId])

  const fetchPlayerGameDetails = async () => {
    if (!player || !squadId) return

    setLoading(true)
    setError('')

    try {
      // Get all game sessions for this squad
      const { data: sessions, error: sessionsError } = await supabase
        .from('session_squads')
        .select(`
          session_id,
          sessions (
            id,
            title,
            date,
            event_type
          )
        `)
        .eq('squad_id', squadId)
        .eq('sessions.event_type', 'game')

      if (sessionsError) throw sessionsError

      // Filter to only valid game sessions
      const validGameSessions = (sessions || []).filter(gs => gs.sessions && gs.sessions.id)
      const sessionIds = validGameSessions.map(gs => gs.sessions.id)
      
      // Get all game events for these sessions using individual queries (like SquadStats)
      let allGameEvents = []
      for (const sessionId of sessionIds) {
        const { data: sessionEvents, error: sessionEventsError } = await supabase
          .from('game_events')
          .select('*')
          .eq('session_id', sessionId)
          .order('event_time', { ascending: true })
        
        if (sessionEventsError) {
          console.error(`Error fetching events for session ${sessionId}:`, sessionEventsError)
          continue
        }
        
        allGameEvents = allGameEvents.concat(sessionEvents || [])
      }
      
      const gameEvents = allGameEvents


      // Get game end events to determine which games have actually ended
      const { data: gameEndEvents, error: endEventsError } = await supabase
        .from('game_events')
        .select('session_id, event_time')
        .eq('event_type', 'game_end')
        .in('session_id', sessionIds)

      if (endEventsError) throw endEventsError

      // Get game sessions data for context
      const { data: gameSessionsData, error: gameSessionsError } = await supabase
        .from('game_sessions')
        .select('*')
        .in('session_id', sessionIds)

      if (gameSessionsError) throw gameSessionsError

      // Filter to only game sessions that have both start time and end event
      const validGameSessionsData = (gameSessionsData || []).filter(gs => {
        const hasStartTime = gs.game_start_time
        const hasEndEvent = gameEndEvents?.some(event => event.session_id === gs.session_id)
        return hasStartTime && hasEndEvent
      })

      // Calculate stats for each game session
      const gameDetailsList = []
      
      for (const sessionSquad of validGameSessions) {
        const session = sessionSquad.sessions
        const sessionGameSession = validGameSessionsData.find(gs => gs.session_id === session.id)
        
        if (!sessionGameSession) {
          continue // Skip games that haven't ended properly
        }

        // Get events for this specific session
        const sessionEvents = (gameEvents || []).filter(event => event.session_id === session.id)
        
        // Check if player participated in this game
        const playerEvents = sessionEvents.filter(event => event.player_id === player.id)
        if (playerEvents.length === 0) {
          continue // Skip games where player didn't participate
        }

        try {
          // Calculate stats for this game
          const gameStats = calculatePlayerGameStatsExact(player, sessionEvents, sessionGameSession)
          
          gameDetailsList.push({
            sessionId: session.id,
            title: session.title,
            sessionDate: session.date,
            gameStartTime: sessionGameSession.game_start_time,
            shifts: gameStats.shiftCount,
            averageShiftTime: gameStats.averageShiftTime,
            plusMinus: gameStats.plusMinus,
            totalGameTime: gameStats.totalRinkTime
          })
        } catch (gameError) {
          console.error(`Error calculating stats for game ${session.id}:`, gameError)
          // Continue with other games instead of failing completely
        }
      }

      // Sort by date (most recent first)
      gameDetailsList.sort((a, b) => new Date(b.sessionDate) - new Date(a.sessionDate))

      setGameDetails(gameDetailsList)
    } catch (err) {
      console.error('Error fetching player game details:', err)
      setError('Failed to load game details')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50"
      onClick={onClose}
    >
      <div 
        className="relative top-10 mx-auto p-0 border-0 w-11/12 max-w-5xl shadow-xl rounded-lg bg-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">
                {player ? `${player.first_name} ${player.last_name}` : ''} - Game Details
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Detailed statistics for each game played
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              <span className="ml-2 text-gray-600">Loading game details...</span>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={fetchPlayerGameDetails}
                className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
              >
                Try Again
              </button>
            </div>
          ) : gameDetails.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No game data found for this player.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Game Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Session Title
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Game Time
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
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {gameDetails.map((game, index) => (
                    <tr key={game.sessionId} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {new Date(game.sessionDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {game.title}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatGameTime(game.totalGameTime)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {game.shifts}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatShiftTime(game.averageShiftTime)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          game.plusMinus > 0 
                            ? 'bg-green-100 text-green-800' 
                            : game.plusMinus < 0 
                            ? 'bg-red-100 text-red-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {game.plusMinus > 0 ? '+' : ''}{game.plusMinus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer */}
          <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-200">
            <div className="text-sm text-gray-500">
              {gameDetails.length} game{gameDetails.length !== 1 ? 's' : ''} found
            </div>
            <button
              onClick={onClose}
              className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 transition-colors font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PlayerGameDetailsModal
