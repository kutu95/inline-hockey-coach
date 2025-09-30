import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../src/lib/supabase'
import { useAuth } from '../src/contexts/AuthContext'
import OrganizationHeader from './OrganizationHeader'
import { formatTime } from '../src/utils/gameStatsCalculator'
import { calculatePlayerGameStatsExact } from '../src/utils/calculatePlayerGameStatsExact'
import PlayerGameDetailsModal from './PlayerGameDetailsModal'

const SquadStats = () => {
  const [squad, setSquad] = useState(null)
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [playerProfile, setPlayerProfile] = useState(null)
  const [playerPhotoUrl, setPlayerPhotoUrl] = useState(null)
  const [selectedPlayer, setSelectedPlayer] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const { user, hasRole } = useAuth()
  
  const params = useParams()
  const orgId = params.orgId
  const squadId = params.squadId || params.id

  // Modal handlers
  const handlePlayerClick = (player) => {
    setSelectedPlayer(player)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedPlayer(null)
  }


  // Function to calculate plus/minus per minute
  const calculatePlusMinusPerMinute = (plusMinus, totalSeconds) => {
    if (!totalSeconds || totalSeconds === 0) return '0.00'
    
    const totalMinutes = totalSeconds / 60
    const plusMinusPerMinute = plusMinus / totalMinutes
    
    return plusMinusPerMinute.toFixed(2)
  }

  // Function to format game time
  const formatGameTime = (totalSeconds) => {
    if (!totalSeconds || totalSeconds === 0) return '0:00:00'
    
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  // Function to format shift time (MM:SS format)
  const formatShiftTime = (totalSeconds) => {
    if (!totalSeconds || totalSeconds === 0) return '00:00'
    
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  // Function to get signed URL for player photos
  const getSignedUrlForPlayerPhoto = async (url) => {
    if (!url) {
      return null
    }
    
    // If the URL is already a signed URL (contains token), return it as-is
    if (url.includes('token=')) {
      console.log(`URL is already signed for ${url}`)
      return url
    }
    
    // Only process URLs that are from Supabase storage
    if (!url.includes('supabase.co') || !url.includes('/storage/')) {
      return null
    }
    
    try {
      const urlParts = url.split('/')
      if (urlParts.length < 2) return null
      
      const filePath = urlParts.slice(-2).join('/')
      
      const { data: existsData, error: existsError } = await supabase.storage
        .from('player-photos')
        .list(filePath.split('/')[0])
      
      if (existsError || !existsData?.some(file => file.name === filePath.split('/')[1])) {
        console.log(`File does not exist: ${filePath}`)
        return null
      }
      
      const { data, error } = await supabase.storage
        .from('player-photos')
        .createSignedUrl(filePath, 60 * 60 * 24 * 7)
      
      if (error) {
        console.log(`Error creating signed URL: ${error.message}`)
        return null
      }
      
      console.log(`Successfully created signed URL for ${filePath}`)
      return data?.signedUrl || null
    } catch (err) {
      console.log(`Exception in getSignedUrlForPlayerPhoto: ${err.message}`)
      return null
    }
  }

  // Fetch current user's player profile
  const fetchPlayerProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('players')
        .select('id, organization_id, first_name, last_name, photo_url')
        .eq('user_id', user.id)
        .single()

      if (error) {
        console.error('Error fetching player profile:', error)
        return
      }

      if (data) {
        setPlayerProfile(data)
        
        if (data.photo_url) {
          const signedUrl = await getSignedUrlForPlayerPhoto(data.photo_url)
          setPlayerPhotoUrl(signedUrl)
        }
      }
    } catch (err) {
      console.error('Error in fetchPlayerProfile:', err)
    }
  }

  const fetchSquadData = async () => {
    try {
      setLoading(true)
      setError('')

      // Fetch squad information
      let squadQuery = supabase
        .from('squads')
        .select('*')
        .eq('id', squadId)

      if (orgId) {
        squadQuery = squadQuery.eq('organization_id', orgId)
      }

      const { data: squadData, error: squadError } = await squadQuery.single()

      if (squadError) throw squadError
      setSquad(squadData)

      // Fetch players in the squad with their stats
      const { data: playersData, error: playersError } = await supabase
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

      if (playersError) throw playersError

      // Process players and fetch their game stats
      const playersWithStats = await Promise.all(
        (playersData || []).map(async (playerSquad) => {
          const player = playerSquad.players
          if (!player) return null

          // Get player photo URL
          let photoUrl = null
          if (player.photo_url) {
            console.log(`Fetching photo for ${player.first_name} ${player.last_name}: ${player.photo_url}`)
            photoUrl = await getSignedUrlForPlayerPhoto(player.photo_url)
            console.log(`Photo URL result for ${player.first_name}: ${photoUrl}`)
          } else {
            console.log(`No photo_url for ${player.first_name} ${player.last_name}`)
          }

          // Calculate stats for this player
          const stats = await calculatePlayerStats(player.id)

          const playerWithStats = {
            ...player,
            photo_url: photoUrl,
            stats
          }
          return playerWithStats
        })
      )

      setPlayers(playersWithStats.filter(Boolean))

    } catch (err) {
      setError('Failed to fetch squad data')
      console.error('Error fetching squad data:', err)
    } finally {
      setLoading(false)
    }
  }

  const calculatePlayerStats = async (playerId) => {
    try {
      // Check if the player belongs to the current squad
      const { data: playerSquad, error: squadError } = await supabase
        .from('player_squads')
        .select('squad_id')
        .eq('player_id', playerId)
        .eq('squad_id', squadId)

      if (squadError) throw squadError

      if (!playerSquad || playerSquad.length === 0) {
        // Player doesn't belong to this squad
        return {
          gamesPlayed: 0,
          totalSeconds: 0,
          averageShiftTime: 0,
          plusMinus: 0
        }
      }

      // Get game sessions for this specific squad only
      const { data: gameSessions, error: sessionsError } = await supabase
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
      const validGameSessionsForPlayer = (gameSessions || []).filter(gs => gs.sessions && gs.sessions.id)
      const sessionIds = validGameSessionsForPlayer.map(gs => gs.sessions.id)
      
      
      if (sessionIds.length === 0) {
        return {
          gamesPlayed: 0,
          totalSeconds: 0,
          averageShiftTime: 0,
          plusMinus: 0
        }
      }

      // Check attendance for these game sessions - only count games the player actually attended
      const { data: attendanceRecords, error: attendanceError } = await supabase
        .from('session_attendance')
        .select('session_id, attended')
        .eq('player_id', playerId)
        .in('session_id', sessionIds)
        .eq('attended', true)

      if (attendanceError) throw attendanceError

      // Filter to only sessions where player attended
      const attendedSessionIds = attendanceRecords?.map(record => record.session_id) || []
      const attendedGameSessions = validGameSessionsForPlayer.filter(gs => 
        attendedSessionIds.includes(gs.sessions.id)
      )
      
      console.log(`Player ${playerId} - Found ${attendedGameSessions.length} attended game sessions for squad ${squadId}:`, attendedGameSessions.map(gs => ({
        sessionId: gs.sessions.id,
        title: gs.sessions.title,
        date: gs.sessions.date
      })))
      
      if (attendedGameSessions.length === 0) {
        return {
          gamesPlayed: 0,
          totalSeconds: 0,
          averageShiftTime: 0,
          plusMinus: 0
        }
      }

      // Use only attended sessions for stats calculation
      const finalSessionIds = attendedGameSessions.map(gs => gs.sessions.id)

      // Get game events for each session individually (like GameStats does)
      // This ensures we get all events without hitting query limits
      let allGameEvents = []
      for (const sessionId of finalSessionIds) {
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
      


      // Get game sessions data for context
      const { data: gameSessionsData, error: gameSessionsError } = await supabase
        .from('game_sessions')
        .select('*')
        .in('session_id', finalSessionIds)

      if (gameSessionsError) throw gameSessionsError

      // Get game end events to determine which games have actually ended
      const { data: gameEndEvents, error: endEventsError } = await supabase
        .from('game_events')
        .select('session_id, event_time')
        .eq('event_type', 'game_end')
        .in('session_id', finalSessionIds)

      if (endEventsError) throw endEventsError

      // Filter to only game sessions that have both start time and end event
      const validGameSessionsData = (gameSessionsData || []).filter(gs => {
        const hasStartTime = gs.game_start_time
        const hasEndEvent = gameEndEvents?.some(event => event.session_id === gs.session_id)
        
        if (!hasStartTime || !hasEndEvent) {
          // Skip sessions missing start time or end event
        }
        return hasStartTime && hasEndEvent
      })

      if (validGameSessionsData.length === 0) {
        return {
          gamesPlayed: 0,
          totalSeconds: 0,
          averageShiftTime: 0,
          plusMinus: 0
        }
      }

      // Calculate cumulative stats across all games using the proven GameStats logic
      let totalRinkTime = 0
      let totalShiftCount = 0
      let totalPlusMinus = 0
      let totalShiftTime = 0

      // Process each valid game session separately
      for (const sessionId of finalSessionIds) {
        const sessionEvents = gameEvents.filter(event => event.session_id === sessionId)
        const sessionGameSession = validGameSessionsData.find(gs => gs.session_id === sessionId)
        
        // Skip this session if it's not in the valid game sessions list
        if (!sessionGameSession) {
          continue
        }
        
        // Get player data for this specific session (we'll use a mock player object with the playerId)
        const mockPlayer = { id: playerId, first_name: 'Player', last_name: 'Name' }
        
        try {
          // Use the exact same calculation logic as GameStats
          const sessionStats = calculatePlayerGameStatsExact(mockPlayer, sessionEvents, sessionGameSession)
          
          // Accumulate stats across all games
          totalRinkTime += sessionStats.totalRinkTime
          totalShiftCount += sessionStats.shiftCount
          totalPlusMinus += sessionStats.plusMinus
          totalShiftTime += sessionStats.totalRinkTime // This is the same as totalRinkTime per game
        } catch (sessionError) {
          console.error(`Error calculating stats for session ${sessionId}:`, sessionError)
          // Continue with other sessions instead of failing completely
        }
      }

      const result = {
        gamesPlayed: attendedGameSessions.length,
        totalSeconds: Math.round(totalRinkTime),
        averageShiftTime: totalShiftCount > 0 ? Math.round(totalRinkTime / totalShiftCount) : 0,
        plusMinus: totalPlusMinus
      }
      
      return result

    } catch (err) {
      console.error('Error calculating player stats:', err)
      return {
        gamesPlayed: 0,
        totalSeconds: 0,
        averageShiftTime: 0,
        plusMinus: 0
      }
    }
  }

  useEffect(() => {
    if (user) {
      fetchPlayerProfile()
    }
  }, [user])

  useEffect(() => {
    if (squadId) {
      fetchSquadData()
    }
  }, [squadId, orgId])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Link
            to={orgId ? `/organisations/${orgId}/squads` : '/squads'}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
          >
            Back to Squads
          </Link>
        </div>
      </div>
    )
  }

  if (!squad) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Squad Not Found</h2>
          <p className="text-gray-600 mb-4">The squad you're looking for doesn't exist.</p>
          <Link
            to={orgId ? `/organisations/${orgId}/squads` : '/squads'}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
          >
            Back to Squads
          </Link>
        </div>
      </div>
    )
  }

  // Sort players by total game time in seconds (descending)
  const sortedPlayers = [...players].sort((a, b) => b.stats.totalSeconds - a.stats.totalSeconds)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              {orgId ? (
                <OrganizationHeader 
                  title={`${squad.name} - Player Stats`} 
                  showBackButton={true}
                  backUrl={`/organisations/${orgId}/squads`}
                  playerProfile={playerProfile} 
                  playerPhotoUrl={playerPhotoUrl} 
                />
              ) : (
                <div className="flex items-center space-x-4">
                  <Link
                    to="/squads"
                    className="text-gray-600 hover:text-gray-800 font-medium"
                  >
                    ← Back to Squads
                  </Link>
                  <h1 className="text-3xl font-bold text-gray-900">{squad.name} - Player Stats</h1>
                </div>
              )}
            </div>

            <div className="px-6 py-4">
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Player Performance Leaderboard</h2>
                <p className="text-gray-600">
                  Statistics based on game participation and performance
                </p>
              </div>

              {sortedPlayers.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No players found in this squad.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Rank
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Player
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Games
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Game Time
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Avg Shift Time
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Plus/Minus
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Plus/Minus/Minute
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {sortedPlayers.map((player, index) => (
                        <tr key={player.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            #{index + 1}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-8 w-8">
                                {player.photo_url ? (
                                  <img
                                    className="h-8 w-8 rounded-full object-cover"
                                    src={player.photo_url}
                                    alt={`${player.first_name} ${player.last_name}`}
                                  />
                                ) : (
                                  <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                                    <span className="text-xs font-medium text-gray-600">
                                      {player.first_name?.charAt(0)}{player.last_name?.charAt(0)}
                                    </span>
                                  </div>
                                )}
                              </div>
                              <div className="ml-3">
                                <button
                                  onClick={() => handlePlayerClick(player)}
                                  className="text-sm font-medium text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer transition-colors"
                                >
                                  {player.first_name} {player.last_name}
                                </button>
                                {player.jersey_number && (
                                  <div className="text-sm text-gray-500">
                                    #{player.jersey_number}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {player.stats.gamesPlayed}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatGameTime(player.stats.totalSeconds)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatShiftTime(player.stats.averageShiftTime)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className={`font-medium ${
                              player.stats.plusMinus > 0 
                                ? 'text-green-600' 
                                : player.stats.plusMinus < 0 
                                ? 'text-red-600' 
                                : 'text-gray-600'
                            }`}>
                              {player.stats.plusMinus > 0 ? '+' : ''}{player.stats.plusMinus}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className={`font-medium ${
                              parseFloat(calculatePlusMinusPerMinute(player.stats.plusMinus, player.stats.totalSeconds)) > 0 
                                ? 'text-green-600' 
                                : parseFloat(calculatePlusMinusPerMinute(player.stats.plusMinus, player.stats.totalSeconds)) < 0 
                                ? 'text-red-600' 
                                : 'text-gray-600'
                            }`}>
                              {calculatePlusMinusPerMinute(player.stats.plusMinus, player.stats.totalSeconds)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Player Game Details Modal */}
      <PlayerGameDetailsModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        player={selectedPlayer}
        squadId={squadId}
      />
    </div>
  )
}

export default SquadStats
