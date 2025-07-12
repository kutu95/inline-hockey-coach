import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../src/lib/supabase'
import { useAuth } from '../src/contexts/AuthContext'
import OrganizationHeader from './OrganizationHeader'

const OrganizationAttendance = () => {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const { user } = useAuth()
  const params = useParams()
  const orgId = params.orgId

  useEffect(() => {
    fetchSessions()
  }, [orgId])

  const fetchSessions = async () => {
    try {
      setLoading(true)
      let query = supabase
        .from('sessions')
        .select(`
          *,
          session_attendance (
            player_id,
            attended,
            notes
          )
        `)
        .order('date', { ascending: false })
        .order('start_time', { ascending: false })

      // If we're in an organization context, filter by organization_id
      if (orgId) {
        query = query.eq('organization_id', orgId)
      } else {
        // Otherwise, filter by coach_id (single tenant)
        query = query.eq('coach_id', user.id)
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

  const formatTime = (time) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
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

  const getAttendanceStats = (session) => {
    if (!session.session_attendance || session.session_attendance.length === 0) {
      return { total: 0, attended: 0, percentage: 0 }
    }

    const total = session.session_attendance.length
    const attended = session.session_attendance.filter(record => record.attended).length
    const percentage = total > 0 ? Math.round((attended / total) * 100) : 0

    return { total, attended, percentage }
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
              <OrganizationHeader title="Attendance Overview" />
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
                    const stats = getAttendanceStats(session)
                    return (
                      <div key={session.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow duration-200">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-900">{session.title}</h3>
                            <p className="text-sm text-gray-600">
                              {formatDate(session.date)} • {formatTime(session.start_time)} - {formatTime(session.start_time + session.duration_minutes * 60000)}
                            </p>
                            {session.location && (
                              <p className="text-sm text-gray-500">📍 {session.location}</p>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-indigo-600">{stats.percentage}%</div>
                            <div className="text-sm text-gray-500">
                              {stats.attended}/{stats.total} players
                            </div>
                          </div>
                        </div>
                        {stats.total > 0 && (
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
    </div>
  )
}

export default OrganizationAttendance 