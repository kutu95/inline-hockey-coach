import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../src/lib/supabase'
import { useAuth } from '../src/contexts/AuthContext'
import OrganizationHeader from './OrganizationHeader'

const SessionAttendance = () => {
  const { sessionId, orgId } = useParams()
  const [session, setSession] = useState(null)
  const [players, setPlayers] = useState([])
  const [attendance, setAttendance] = useState({})
  const [sessionNotes, setSessionNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [playerPhotoUrls, setPlayerPhotoUrls] = useState({})
  const [retryCount, setRetryCount] = useState(0)
  const { user } = useAuth()

  // Clear error when component unmounts or when retry count changes
  useEffect(() => {
    if (error && retryCount > 0) {
      setError('')
    }
  }, [retryCount])

  // Retry function for network issues
  const retryOperation = () => {
    setRetryCount(prev => prev + 1)
    setError('')
    fetchSessionAndPlayers()
  }

  // Clear success message after a delay
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setSuccess('')
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [success])

  useEffect(() => {
    fetchSessionAndPlayers()
  }, [sessionId])

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

  // Get signed URLs for all player photos
  useEffect(() => {
    const getSignedUrls = async () => {
      const photoUrls = {}
      
      for (const player of players) {
        if (player.photo_url) {
          photoUrls[player.id] = await getSignedUrlForPlayerPhoto(player.photo_url)
        }
      }
      
      setPlayerPhotoUrls(photoUrls)
    }
    
    if (players.length > 0) {
      getSignedUrls()
    }
  }, [players])

  const fetchSessionAndPlayers = async () => {
    try {
      setLoading(true)
      
      // Fetch session details with squad assignments
      let sessionQuery = supabase
        .from('sessions')
        .select(`
          *,
          session_squads (
            squad_id,
            squads (
              id,
              name
            )
          )
        `)
        .eq('id', sessionId)

      // Filter by organization_id for multi-tenant access
      if (orgId) {
        sessionQuery = sessionQuery.eq('organization_id', orgId)
      } else {
        throw new Error('Organization ID is required for multi-tenant access')
      }

      const { data: sessionData, error: sessionError } = await sessionQuery.single()

      if (sessionError) throw sessionError
      setSession(sessionData)
      setSessionNotes(sessionData.notes || '')

      // Fetch players based on invited squads
      let playersQuery = supabase
        .from('players')
        .select(`
          *,
          player_squads (
            squad_id
          )
        `)
        .order('first_name', { ascending: true })

      // Filter by organization_id for multi-tenant access
      if (orgId) {
        playersQuery = playersQuery.eq('organization_id', orgId)
      } else {
        throw new Error('Organization ID is required for multi-tenant access')
      }

      const { data: playersData, error: playersError } = await playersQuery

      if (playersError) throw playersError

      // Filter players to only include those in invited squads
      let invitedPlayers = playersData || []
      
      if (sessionData.session_squads && sessionData.session_squads.length > 0) {
        const invitedSquadIds = sessionData.session_squads.map(assignment => assignment.squad_id)
        
        invitedPlayers = playersData.filter(player => {
          // Check if player is in any of the invited squads
          return player.player_squads && player.player_squads.some(playerSquad => 
            invitedSquadIds.includes(playerSquad.squad_id)
          )
        })
      }

      setPlayers(invitedPlayers)

      // Fetch existing attendance records
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('session_attendance')
        .select('*')
        .eq('session_id', sessionId)

      if (attendanceError) throw attendanceError

      // Initialize attendance state
      const attendanceState = {}
      invitedPlayers.forEach(player => {
        const existingRecord = attendanceData.find(record => record.player_id === player.id)
        attendanceState[player.id] = {
          attended: existingRecord ? existingRecord.attended : true,
          notes: existingRecord ? existingRecord.notes : ''
        }
      })
      setAttendance(attendanceState)

    } catch (err) {
      setError('Failed to fetch session and players')
      console.error('Error fetching session and players:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAttendanceChange = (playerId, attended) => {
    setAttendance(prev => ({
      ...prev,
      [playerId]: {
        ...prev[playerId],
        attended
      }
    }))
  }

  const handlePlayerNotesChange = (playerId, notes) => {
    setAttendance(prev => ({
      ...prev,
      [playerId]: {
        ...prev[playerId],
        notes
      }
    }))
  }

  const handleSelectAll = () => {
    const newAttendance = {}
    players.forEach(player => {
      newAttendance[player.id] = {
        attended: true,
        notes: attendance[player.id]?.notes || ''
      }
    })
    setAttendance(newAttendance)
  }

  const handleUnselectAll = () => {
    const newAttendance = {}
    players.forEach(player => {
      newAttendance[player.id] = {
        attended: false,
        notes: attendance[player.id]?.notes || ''
      }
    })
    setAttendance(newAttendance)
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setError('')
      setSuccess('')

      // Update session notes
      let sessionUpdateQuery = supabase
        .from('sessions')
        .update({ notes: sessionNotes })
        .eq('id', sessionId)

      // Filter by organization_id for multi-tenant access
      if (orgId) {
        sessionUpdateQuery = sessionUpdateQuery.eq('organization_id', orgId)
      } else {
        throw new Error('Organization ID is required for multi-tenant access')
      }

      const { error: sessionError } = await sessionUpdateQuery

      if (sessionError) {
        console.error('Session update error:', sessionError)
        throw new Error(`Failed to update session notes: ${sessionError.message}`)
      }

      // Update attendance records - use upsert to handle both insert and update
      // This prevents the unique constraint violation
      const attendanceRecords = Object.entries(attendance).map(([playerId, record]) => ({
        session_id: sessionId,
        player_id: playerId,
        attended: record.attended,
        notes: record.notes || null
      }))

      // Use upsert with onConflict to handle the unique constraint properly
      const { error: attendanceError } = await supabase
        .from('session_attendance')
        .upsert(attendanceRecords, {
          onConflict: 'session_id,player_id',
          ignoreDuplicates: false
        })

      if (attendanceError) {
        console.error('Attendance upsert error:', attendanceError)
        
        // Provide more specific error messages based on the error type
        if (attendanceError.code === '409') {
          throw new Error('Conflict detected. This usually means the attendance data has been modified by another user. Please refresh the page and try again.')
        } else if (attendanceError.code === '42501') {
          throw new Error('Permission denied. You may not have access to modify this session\'s attendance.')
        } else if (attendanceError.code === '23505') {
          throw new Error('Duplicate attendance record detected. Please refresh the page and try again.')
        } else {
          throw new Error(`Failed to save attendance: ${attendanceError.message}`)
        }
      }

      setSuccess('Attendance saved successfully!')
    } catch (err) {
      console.error('Error saving attendance:', err)
      
      // Handle network errors specifically
      if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
        setError('Network connection lost. Please check your internet connection and try again.')
      } else {
        setError(err.message || 'Failed to save attendance. Please try again.')
      }
    } finally {
      setSaving(false)
    }
  }

  const formatTime = (time) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getEndTime = (startTime, durationMinutes) => {
    const start = new Date(`2000-01-01T${startTime}`)
    const end = new Date(start.getTime() + durationMinutes * 60000)
    return end.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="bg-white shadow rounded-lg p-6">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Session Not Found</h2>
                <p className="text-gray-600 mb-4">The session you're looking for doesn't exist or you don't have permission to view it.</p>
                <Link
                  to={orgId ? `/organisations/${orgId}/sessions` : "/sessions"}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-md transition duration-150 ease-in-out"
                >
                  Back to Sessions
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {orgId && <OrganizationHeader orgId={orgId} showBackButton={false} />}
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                  <Link
                    to={orgId ? `/organisations/${orgId}/sessions` : "/sessions"}
                    className="text-gray-600 hover:text-gray-800 font-medium"
                  >
                    ← Back to Sessions
                  </Link>
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Session Attendance</h1>
                </div>
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <svg className="h-5 w-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <span className="text-red-800">{error}</span>
                  </div>
                  {error.includes('Network connection lost') && (
                    <button
                      onClick={retryOperation}
                      className="ml-4 px-3 py-1 text-sm bg-red-100 text-red-700 border border-red-300 rounded-md hover:bg-red-200 transition-colors duration-150"
                    >
                      Retry
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Success Display */}
            {success && (
              <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
                <div className="flex items-center">
                  <svg className="h-5 w-5 text-green-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-green-800">{success}</span>
                </div>
              </div>
            )}

            <div className="px-6 py-4">
              {/* Session Details */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">{session.title}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                  <div>
                    <span className="font-medium">Date:</span> {formatDate(session.date)}
                  </div>
                  <div>
                    <span className="font-medium">Time:</span> {formatTime(session.start_time)} - {getEndTime(session.start_time, session.duration_minutes)}
                  </div>
                  <div>
                    <span className="font-medium">Location:</span> {session.location}
                  </div>
                  <div>
                    <span className="font-medium">Duration:</span> {session.duration_minutes} minutes
                  </div>
                </div>
                {session.description && (
                  <div className="mt-2">
                    <span className="font-medium">Description:</span> {session.description}
                  </div>
                )}
              </div>

              {/* Session Notes */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Session Notes
                </label>
                <textarea
                  value={sessionNotes}
                  onChange={(e) => setSessionNotes(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Add notes about this session..."
                />
              </div>

              {/* Attendance List */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Player Attendance</h3>
                  {players.length > 0 && (
                    <div className="flex space-x-2">
                      <button
                        onClick={handleSelectAll}
                        className="px-3 py-1 text-sm bg-green-600 hover:bg-green-700 text-white rounded-md transition duration-150 ease-in-out"
                      >
                        Select All
                      </button>
                      <button
                        onClick={handleUnselectAll}
                        className="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 text-white rounded-md transition duration-150 ease-in-out"
                      >
                        Unselect All
                      </button>
                    </div>
                  )}
                </div>
                {players.length === 0 ? (
                  <p className="text-gray-500">No players found. Add some players first.</p>
                ) : (
                  <div className="space-y-3">
                    {players.map(player => (
                      <div key={player.id} className="flex items-center space-x-4 p-3 border border-gray-200 rounded-lg">
                        <div className="flex items-center space-x-3 flex-1">
                          <input
                            type="checkbox"
                            id={`attended-${player.id}`}
                            checked={attendance[player.id]?.attended || false}
                            onChange={(e) => handleAttendanceChange(player.id, e.target.checked)}
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                          />
                          <label htmlFor={`attended-${player.id}`} className="flex-1">
                            <div className="flex items-center space-x-3">
                              {playerPhotoUrls[player.id] && (
                                <img
                                  src={playerPhotoUrls[player.id]}
                                  alt={`${player.first_name} ${player.last_name}`}
                                  className="h-8 w-8 rounded-full object-cover"
                                />
                              )}
                              <div>
                                <div className="font-medium text-gray-900">
                                  {player.first_name} {player.last_name}
                                </div>
                                {player.jersey_number && (
                                  <div className="text-sm text-gray-500">#{player.jersey_number}</div>
                                )}
                              </div>
                            </div>
                          </label>
                        </div>
                        <div className="flex-1">
                          <input
                            type="text"
                            value={attendance[player.id]?.notes || ''}
                            onChange={(e) => handlePlayerNotesChange(player.id, e.target.value)}
                            placeholder="Notes for this player..."
                            className="w-full px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Save Button */}
              <div className="flex justify-end">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium py-2 px-4 rounded-md transition duration-150 ease-in-out flex items-center"
                >
                  {saving ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </>
                  ) : (
                    'Save Attendance'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SessionAttendance 