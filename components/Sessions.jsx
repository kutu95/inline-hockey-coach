import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../src/lib/supabase'
import { useAuth } from '../src/contexts/AuthContext'
import OrganizationHeader from './OrganizationHeader'

const Sessions = () => {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingSession, setEditingSession] = useState(null)
  const { user } = useAuth()
  const params = useParams()
  const orgId = params.orgId // Get organization ID from route params

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    start_time: '',
    duration_minutes: '',
    location: '',
    notes: ''
  })

  useEffect(() => {
    fetchSessions()
  }, [])

  const fetchSessions = async () => {
    try {
      setLoading(true)
      let query = supabase
        .from('sessions')
        .select('*')
        .order('date', { ascending: true })
        .order('start_time', { ascending: true })

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

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      date: '',
      start_time: '',
      duration_minutes: '',
      location: '',
      notes: ''
    })
    setEditingSession(null)
    setShowAddForm(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.title || !formData.date || !formData.start_time || !formData.duration_minutes || !formData.location) {
      setError('Please fill in all required fields')
      return
    }

    try {
      // Prepare the data for submission
      const sessionData = {
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        date: formData.date,
        start_time: formData.start_time,
        duration_minutes: parseInt(formData.duration_minutes),
        location: formData.location.trim(),
        notes: formData.notes.trim() || null
      }
      console.log('Submitting sessionData:', sessionData)
      console.log('User ID (coach_id):', user.id)

      if (editingSession) {
        // Update existing session
        let query = supabase
          .from('sessions')
          .update(sessionData)
          .eq('id', editingSession.id)

        // If we're in an organization context, ensure the session belongs to the organization
        if (orgId) {
          query = query.eq('organization_id', orgId)
        } else {
          // Otherwise, ensure the session belongs to the coach
          query = query.eq('coach_id', user.id)
        }

        const { error } = await query

        if (error) {
          console.error('Supabase update error:', error)
          throw error
        }
      } else {
        // Add new session
        const insertData = {
          ...sessionData
        }

        // If we're in an organization context, set organization_id
        if (orgId) {
          insertData.organization_id = orgId
        } else {
          // Otherwise, set coach_id (single tenant)
          insertData.coach_id = user.id
        }

        const { error } = await supabase
          .from('sessions')
          .insert(insertData)

        if (error) {
          console.error('Supabase insert error:', error)
          throw error
        }
      }

      resetForm()
      fetchSessions()
    } catch (err) {
      setError(editingSession ? 'Failed to update session' : 'Failed to add session')
      console.error('Error saving session:', err)
    }
  }

  const handleEdit = (session) => {
    setEditingSession(session)
    setFormData({
      title: session.title || '',
      description: session.description || '',
      date: session.date || '',
      start_time: session.start_time || '',
      duration_minutes: session.duration_minutes || '',
      location: session.location || '',
      notes: session.notes || ''
    })
    setShowAddForm(true)
  }

  const handleDelete = async (sessionId) => {
    if (!confirm('Are you sure you want to delete this session?')) return

    try {
      let query = supabase
        .from('sessions')
        .delete()
        .eq('id', sessionId)

      // If we're in an organization context, ensure the session belongs to the organization
      if (orgId) {
        query = query.eq('organization_id', orgId)
      } else {
        // Otherwise, ensure the session belongs to the coach
        query = query.eq('coach_id', user.id)
      }

      const { error } = await query

      if (error) throw error
      
      fetchSessions()
    } catch (err) {
      setError('Failed to delete session')
      console.error('Error deleting session:', err)
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              {orgId ? (
                <OrganizationHeader title="Sessions" />
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Link
                      to="/dashboard"
                      className="text-gray-600 hover:text-gray-800 font-medium"
                    >
                      ← Back to Dashboard
                    </Link>
                    <h1 className="text-3xl font-bold text-gray-900">Sessions</h1>
                  </div>
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-md transition duration-150 ease-in-out"
                  >
                    Add Session
                  </button>
                </div>
              )}
              {orgId && (
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-md transition duration-150 ease-in-out"
                  >
                    Add Session
                  </button>
                </div>
              )}
            </div>

            {error && (
              <div className="px-6 py-4">
                <div className="rounded-md bg-red-50 p-4">
                  <div className="text-sm text-red-700">{error}</div>
                </div>
              </div>
            )}

            <div className="px-6 py-4">
              {/* Add/Edit Form */}
              {showAddForm && (
                <div className="mb-6 bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    {editingSession ? 'Edit Session' : 'Add New Session'}
                  </h3>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                          Session Title *
                        </label>
                        <input
                          type="text"
                          id="title"
                          name="title"
                          required
                          value={formData.title}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          placeholder="e.g., U16 Practice"
                        />
                      </div>

                      <div>
                        <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
                          Location *
                        </label>
                        <input
                          type="text"
                          id="location"
                          name="location"
                          required
                          value={formData.location}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          placeholder="e.g., Main Arena"
                        />
                      </div>

                      <div>
                        <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
                          Date *
                        </label>
                        <input
                          type="date"
                          id="date"
                          name="date"
                          required
                          value={formData.date}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <label htmlFor="start_time" className="block text-sm font-medium text-gray-700 mb-2">
                          Start Time *
                        </label>
                        <input
                          type="time"
                          id="start_time"
                          name="start_time"
                          required
                          value={formData.start_time}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <label htmlFor="duration_minutes" className="block text-sm font-medium text-gray-700 mb-2">
                          Duration (minutes) *
                        </label>
                        <input
                          type="number"
                          id="duration_minutes"
                          name="duration_minutes"
                          required
                          min="15"
                          max="480"
                          value={formData.duration_minutes}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          placeholder="60"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                        Description
                      </label>
                      <textarea
                        id="description"
                        name="description"
                        rows="3"
                        value={formData.description}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="Session details, focus areas, etc."
                      />
                    </div>

                    <div>
                      <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                        Session Notes
                      </label>
                      <textarea
                        id="notes"
                        name="notes"
                        rows="3"
                        value={formData.notes}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="Notes about this session (optional)"
                      />
                    </div>

                    <div className="flex justify-end space-x-3">
                      <button
                        type="button"
                        onClick={resetForm}
                        className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        {editingSession ? 'Update Session' : 'Add Session'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Sessions List */}
              {sessions.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-500 text-lg mb-4">No sessions scheduled</div>
                  <p className="text-gray-400">Create your first practice session to get started</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {sessions.map((session) => (
                    <div key={session.id} className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200">
                      <div className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="text-xl font-semibold text-gray-900">{session.title}</h3>
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {formatDate(session.date)}
                              </span>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                              <div>
                                <span className="font-medium">Time:</span> {formatTime(session.start_time)} - {getEndTime(session.start_time, session.duration_minutes)}
                              </div>
                              <div>
                                <span className="font-medium">Location:</span> {session.location}
                              </div>
                              <div>
                                <span className="font-medium">Duration:</span> {session.duration_minutes} minutes
                              </div>
                              {session.description && (
                                <div className="md:col-span-2">
                                  <span className="font-medium">Description:</span> {session.description}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex space-x-2 ml-4">
                            <Link
                              to={`/sessions/${session.id}/attendance`}
                              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                            >
                              Take Attendance
                            </Link>
                            <button
                              onClick={() => handleEdit(session)}
                              className="text-green-600 hover:text-green-800 text-sm font-medium"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(session.id)}
                              className="text-red-600 hover:text-red-800 text-sm font-medium"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Sessions 