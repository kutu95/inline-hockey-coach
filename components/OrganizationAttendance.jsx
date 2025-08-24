import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../src/lib/supabase'
import { useAuth } from '../src/contexts/AuthContext'
import OrganizationHeader from './OrganizationHeader'

const OrganizationAttendance = () => {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [playerProfile, setPlayerProfile] = useState(null)
  const [playerPhotoUrl, setPlayerPhotoUrl] = useState(null)
  const [sessionStats, setSessionStats] = useState({})
  const [statsLoading, setStatsLoading] = useState(false)
  const [playerAttendanceStats, setPlayerAttendanceStats] = useState([])
  const [playerStatsLoading, setPlayerStatsLoading] = useState(false)
  const { user, hasRole } = useAuth()
  
  // Determine user permissions
  const canViewAttendance = hasRole('superadmin') || hasRole('admin') || hasRole('coach')
  const params = useParams()
  const orgId = params.orgId // Get organization ID from route params

  useEffect(() => {
    if (orgId) {
      fetchSessions()
      fetchPlayerProfile()
    }
  }, [orgId])

  // Calculate stats for all sessions when sessions change
  useEffect(() => {
    if (sessions.length > 0) {
      calculateAllSessionStats()
    }
  }, [sessions])

  // Fetch player attendance statistics when sessions change
  useEffect(() => {
    if (sessions.length > 0 && orgId) {
      fetchPlayerAttendanceStats()
    }
  }, [sessions, orgId])

  // Calculate stats for all sessions
  const calculateAllSessionStats = async () => {
    setStatsLoading(true)
    try {
      const stats = {}
      for (const session of sessions) {
        stats[session.id] = await getAttendanceStats(session)
      }
      setSessionStats(stats)
    } catch (err) {
      console.error('Error calculating session stats:', err)
    } finally {
      setStatsLoading(false)
    }
  }

  // Fetch player attendance statistics
  const fetchPlayerAttendanceStats = async () => {
    setPlayerStatsLoading(true)
    try {
      // Get current date to exclude future sessions
      const currentDate = new Date().toISOString().split('T')[0]
      
      // Fetch all active squad players
      const { data: activePlayers, error: playersError } = await supabase
        .from('players')
        .select(`
          id,
          first_name,
          last_name,
          photo_url,
          player_squads!inner(
            squad_id,
            squads!inner(
              id,
              name,
              is_active
            )
          )
        `)
        .eq('organization_id', orgId)
        .eq('player_squads.squads.is_active', true)

      if (playersError) throw playersError

      // Get all past and current sessions (excluding future)
      const { data: eligibleSessions, error: sessionsError } = await supabase
        .from('sessions')
        .select(`
          id,
          date,
          session_squads (
            squad_id
          )
        `)
        .eq('organization_id', orgId)
        .lte('date', currentDate)
        .order('date', { ascending: true })

      if (sessionsError) throw sessionsError

      // Get all attendance records for these sessions
      const { data: allAttendance, error: attendanceError } = await supabase
        .from('session_attendance')
        .select(`
          session_id,
          player_id,
          attended
        `)
        .in('session_id', eligibleSessions.map(s => s.id))

      if (attendanceError) throw attendanceError

      // Calculate statistics for each player
      const playerStats = activePlayers.map(player => {
        // Get all squads this player is in
        const playerSquadIds = player.player_squads.map(ps => ps.squad_id)
        
        // Count sessions this player was eligible to attend
        const eligibleSessionsCount = eligibleSessions.filter(session => 
          session.session_squads.some(ss => playerSquadIds.includes(ss.squad_id))
        ).length
        
        // Count sessions this player actually attended
        const attendedSessionsCount = allAttendance.filter(record => 
          record.player_id === player.id && record.attended
        ).length
        
        // Calculate attendance percentage
        const attendancePercentage = eligibleSessionsCount > 0 
          ? Math.round((attendedSessionsCount / eligibleSessionsCount) * 100) 
          : 0

        return {
          id: player.id,
          firstName: player.first_name,
          lastName: player.last_name,
          photoUrl: player.photo_url,
          squads: player.player_squads.map(ps => ps.squads.name).join(', '),
          eligibleSessions: eligibleSessionsCount,
          attendedSessions: attendedSessionsCount,
          attendancePercentage
        }
      })

      // Sort by attendance percentage (descending) then by name
      playerStats.sort((a, b) => {
        if (b.attendancePercentage !== a.attendancePercentage) {
          return b.attendancePercentage - a.attendancePercentage
        }
        return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)
      })

      setPlayerAttendanceStats(playerStats)
    } catch (err) {
      console.error('Error fetching player attendance stats:', err)
    } finally {
      setPlayerStatsLoading(false)
    }
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
      return url // Fallback to original URL
    }
  }

  // Update player attendance stats with signed photo URLs
  useEffect(() => {
    const updatePlayerPhotoUrls = async () => {
      if (playerAttendanceStats.length > 0) {
        const updatedStats = await Promise.all(
          playerAttendanceStats.map(async (player) => {
            if (player.photoUrl) {
              const signedUrl = await getSignedUrlForPlayerPhoto(player.photoUrl)
              return { ...player, photoUrl: signedUrl }
            }
            return player
          })
        )
        setPlayerAttendanceStats(updatedStats)
      }
    }
    
    updatePlayerPhotoUrls()
  }, [playerAttendanceStats.length])

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
        
        // Get signed URL for photo if it exists
        if (data.photo_url) {
          const signedUrl = await getSignedUrlForPlayerPhoto(data.photo_url)
          setPlayerPhotoUrl(signedUrl)
        }
      }
    } catch (err) {
      console.error('Error in fetchPlayerProfile:', err)
    }
  }

  const fetchSessions = async () => {
    try {
      setLoading(true)
      let query = supabase
        .from('sessions')
        .select(`
          *,
          session_squads (
            squad_id,
            squads (
              id,
              name
            )
          ),
          session_attendance (
            player_id,
            attended,
            notes
          )
        `)
        .order('date', { ascending: false })
        .order('start_time', { ascending: false })

      // Filter by organization_id for multi-tenant access
      if (orgId) {
        query = query.eq('organization_id', orgId)
      } else {
        throw new Error('Organization ID is required for multi-tenant access')
      }

      const { data, error } = await query

      if (error) throw error
      setSessions(data || [])
    } catch (err) {
      setError('Failed to fetch sessions')
      console.error('Error fetching sessions:', err)
    } finally {
      setLoading(false)
    }
  }

  // Function to get unique invited players for a session
  const getInvitedPlayers = async (session) => {
    if (!session.session_squads || session.session_squads.length === 0) {
      return []
    }

    try {
      const invitedSquadIds = session.session_squads.map(assignment => assignment.squad_id)
      
      // Fetch unique players from invited squads
      const { data: playersData, error } = await supabase
        .from('players')
        .select(`
          id,
          player_squads!inner(squad_id)
        `)
        .eq('organization_id', orgId)
        .in('player_squads.squad_id', invitedSquadIds)

      if (error) {
        console.error('Error fetching invited players:', error)
        return []
      }

      // Return unique players (remove duplicates if a player is in multiple squads)
      const uniquePlayers = playersData || []
      return uniquePlayers
    } catch (err) {
      console.error('Error in getInvitedPlayers:', err)
      return []
    }
  }

  // Updated attendance statistics calculation
  const getAttendanceStats = async (session) => {
    try {
      // Get the actual invited players (unique players from invited squads)
      const invitedPlayers = await getInvitedPlayers(session)
      const totalInvited = invitedPlayers.length

      if (totalInvited === 0) {
        return { total: 0, attended: 0, percentage: 0 }
      }

      // Count how many of the invited players actually attended
      if (!session.session_attendance || session.session_attendance.length === 0) {
        return { total: totalInvited, attended: 0, percentage: 0 }
      }

      // Create a set of invited player IDs for efficient lookup
      const invitedPlayerIds = new Set(invitedPlayers.map(player => player.id))
      
      // Count attended players from the invited list
      const attended = session.session_attendance.filter(record => 
        invitedPlayerIds.has(record.player_id) && record.attended
      ).length

      const percentage = totalInvited > 0 ? Math.round((attended / totalInvited) * 100) : 0

      return { total: totalInvited, attended, percentage }
    } catch (err) {
      console.error('Error calculating attendance stats:', err)
      return { total: 0, attended: 0, percentage: 0 }
    }
  }

  const formatTime = (time) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const calculateEndTime = (startTime, durationMinutes) => {
    if (!startTime || !durationMinutes) return null
    
    const startDate = new Date(`2000-01-01T${startTime}`)
    const endDate = new Date(startDate.getTime() + durationMinutes * 60000)
    
    return endDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <OrganizationHeader title="Attendance Overview" showBackButton={false} playerProfile={playerProfile} playerPhotoUrl={playerPhotoUrl} />
            </div>

            {error && (
              <div className="px-6 py-4">
                <div className="rounded-md bg-red-50 p-4">
                  <div className="text-sm text-red-700">{error}</div>
                </div>
              </div>
            )}

            <div className="px-6 py-4">
              {sessions.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-500 text-lg mb-4">No sessions found</div>
                  <p className="text-gray-400">Create sessions to start tracking attendance</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {sessions.map((session) => {
                    const stats = sessionStats[session.id] || { total: 0, attended: 0, percentage: 0 }
                    return (
                      <div key={session.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow duration-200">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <Link
                              to={`/organisations/${orgId}/sessions/${session.id}`}
                              className="text-lg font-semibold text-gray-900 hover:text-indigo-600 transition-colors duration-150"
                            >
                              {session.title}
                            </Link>
                            <p className="text-sm text-gray-600">
                              {formatDate(session.date)} • {formatTime(session.start_time)}
                              {session.duration_minutes && ` - ${calculateEndTime(session.start_time, session.duration_minutes)}`}
                            </p>
                            {session.location && (
                              <p className="text-sm text-gray-500">📍 {session.location}</p>
                            )}
                          </div>
                          <div className="text-right">
                            {statsLoading ? (
                              <div className="animate-pulse">
                                <div className="h-8 bg-gray-200 rounded w-16 mb-1"></div>
                                <div className="h-4 bg-gray-200 rounded w-20"></div>
                              </div>
                            ) : (
                              <>
                                <div className="text-2xl font-bold text-indigo-600">{stats.percentage}%</div>
                                <div className="text-sm text-gray-500">
                                  {stats.attended}/{stats.total} players
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                        {stats.total > 0 && !statsLoading && (
                          <div className="mt-3">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${stats.percentage}%` }}
                              ></div>
                            </div>
                          </div>
                        )}
                        <div className="mt-3 flex justify-end">
                          <Link
                            to={`/organisations/${orgId}/sessions/${session.id}/attendance`}
                            className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                          >
                            View Details →
                          </Link>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Player Attendance Statistics Table */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Player Attendance Summary</h2>
            <p className="text-sm text-gray-600 mt-1">
              Attendance statistics for all active squad players (excluding future sessions)
            </p>
          </div>
          
          {playerStatsLoading ? (
            <div className="p-6">
              <div className="animate-pulse space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-4">
                    <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                    </div>
                    <div className="h-4 bg-gray-200 rounded w-16"></div>
                    <div className="h-4 bg-gray-200 rounded w-16"></div>
                    <div className="h-4 bg-gray-200 rounded w-20"></div>
                  </div>
                ))}
              </div>
            </div>
          ) : playerAttendanceStats.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No active squad players found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Player
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Squads
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sessions Attended
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sessions Eligible
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Attendance Rate
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {playerAttendanceStats.map((player) => (
                    <tr key={player.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            {player.photoUrl ? (
                              <img
                                className="h-10 w-10 rounded-full object-cover"
                                src={player.photoUrl}
                                alt={`${player.firstName} ${player.lastName}`}
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                                <span className="text-sm font-medium text-gray-700">
                                  {player.firstName.charAt(0)}{player.lastName.charAt(0)}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {player.firstName} {player.lastName}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {player.squads}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {player.attendedSessions}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {player.eligibleSessions}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="text-sm font-medium text-gray-900 mr-2">
                            {player.attendancePercentage}%
                          </div>
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full transition-all duration-300 ${
                                player.attendancePercentage >= 80 ? 'bg-green-500' :
                                player.attendancePercentage >= 60 ? 'bg-yellow-500' :
                                'bg-red-500'
                              }`}
                              style={{ width: `${player.attendancePercentage}%` }}
                            ></div>
                          </div>
                        </div>
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
  )
}

export default OrganizationAttendance 