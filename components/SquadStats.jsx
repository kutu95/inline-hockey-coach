import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../src/lib/supabase'
import { useAuth } from '../src/contexts/AuthContext'
import OrganizationHeader from './OrganizationHeader'

const SquadStats = () => {
  const [squad, setSquad] = useState(null)
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [playerProfile, setPlayerProfile] = useState(null)
  const [playerPhotoUrl, setPlayerPhotoUrl] = useState(null)
  const { user, hasRole } = useAuth()
  
  const params = useParams()
  const orgId = params.orgId
  const squadId = params.squadId || params.id

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
          console.log(`Final player data for ${player.first_name}:`, playerWithStats)
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
      // Get all game sessions this player participated in through squad membership
      const { data: playerSquads, error: squadError } = await supabase
        .from('player_squads')
        .select('squad_id')
        .eq('player_id', playerId)

      if (squadError) throw squadError

      if (!playerSquads || playerSquads.length === 0) {
        return {
          gamesPlayed: 0,
          totalMinutes: 0,
          averageShiftTime: 0,
          plusMinus: 0
        }
      }

      const squadIds = playerSquads.map(ps => ps.squad_id)

      // Get all game sessions for these squads
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
        .in('squad_id', squadIds)
        .eq('sessions.event_type', 'game')

      if (sessionsError) throw sessionsError

      console.log(`Player ${playerId} - Raw game sessions data:`, gameSessions)

      // Get all game events for these sessions
      const validGameSessions = (gameSessions || []).filter(gs => gs.sessions && gs.sessions.id)
      const sessionIds = validGameSessions.map(gs => gs.sessions.id)
      
      console.log(`Player ${playerId} - Found ${validGameSessions.length} valid game sessions:`, validGameSessions.map(gs => ({
        sessionId: gs.sessions.id,
        title: gs.sessions.title,
        date: gs.sessions.date
      })))
      
      if (sessionIds.length === 0) {
        return {
          gamesPlayed: 0,
          totalMinutes: 0,
          averageShiftTime: 0,
          plusMinus: 0
        }
      }

      const { data: gameEvents, error: eventsError } = await supabase
        .from('game_events')
        .select('*')
        .in('session_id', sessionIds)
        .order('event_time', { ascending: true })

      if (eventsError) throw eventsError

      // Calculate stats
      let totalRinkTime = 0
      let shiftCount = 0
      let totalShiftTime = 0
      let plusMinus = 0

      // Process events for this player
      const playerEvents = (gameEvents || []).filter(event => 
        event.player_id === playerId && 
        ['player_on', 'player_off', 'goal_for', 'goal_against'].includes(event.event_type)
      )

      // Get play start/stop events
      const playEvents = (gameEvents || []).filter(event => 
        ['play_start', 'play_stop'].includes(event.event_type)
      )

      // Calculate rink time during active play
      let isOnRink = false
      let rinkStartTime = null
      let currentPlayStart = null

      for (const event of playerEvents) {
        if (event.event_type === 'player_on') {
          isOnRink = true
          rinkStartTime = new Date(event.event_time)
        } else if (event.event_type === 'player_off') {
          if (isOnRink && rinkStartTime) {
            // Check if this was during active play
            const playStartBefore = playEvents
              .filter(pe => pe.event_type === 'play_start' && new Date(pe.event_time) <= rinkStartTime)
              .sort((a, b) => new Date(b.event_time) - new Date(a.event_time))[0]
            
            const playStopAfter = playEvents
              .filter(pe => pe.event_type === 'play_stop' && new Date(pe.event_time) >= new Date(event.event_time))
              .sort((a, b) => new Date(a.event_time) - new Date(b.event_time))[0]

            if (playStartBefore && (!playStopAfter || new Date(playStopAfter.event_time) > new Date(event.event_time))) {
              // This shift was during active play
              const shiftTime = (new Date(event.event_time) - rinkStartTime) / 1000
              totalRinkTime += shiftTime
              totalShiftTime += shiftTime
              shiftCount++
            }
          }
          isOnRink = false
          rinkStartTime = null
        } else if (event.event_type === 'goal_for') {
          if (isOnRink) plusMinus++
        } else if (event.event_type === 'goal_against') {
          if (isOnRink) plusMinus--
        }
      }

      // Handle case where player is still on rink at end of game
      if (isOnRink && rinkStartTime) {
        const lastPlayStop = playEvents
          .filter(pe => pe.event_type === 'play_stop')
          .sort((a, b) => new Date(b.event_time) - new Date(a.event_time))[0]
        
        if (lastPlayStop) {
          const shiftTime = (new Date(lastPlayStop.event_time) - rinkStartTime) / 1000
          totalRinkTime += shiftTime
          totalShiftTime += shiftTime
          shiftCount++
        }
      }

      return {
        gamesPlayed: validGameSessions.length,
        totalMinutes: Math.round(totalRinkTime / 60),
        averageShiftTime: shiftCount > 0 ? Math.round(totalShiftTime / shiftCount) : 0,
        plusMinus: plusMinus
      }

    } catch (err) {
      console.error('Error calculating player stats:', err)
      return {
        gamesPlayed: 0,
        totalMinutes: 0,
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

  // Sort players by total minutes (descending)
  const sortedPlayers = [...players].sort((a, b) => b.stats.totalMinutes - a.stats.totalMinutes)

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
                          Total Minutes
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
                                <div className="text-sm font-medium text-gray-900">
                                  {player.first_name} {player.last_name}
                                </div>
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
                            {player.stats.totalMinutes}m
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {player.stats.averageShiftTime}s
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
    </div>
  )
}

export default SquadStats
