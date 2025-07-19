import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../src/lib/supabase'
import { useAuth } from '../src/contexts/AuthContext'
import OrganizationHeader from './OrganizationHeader'

const SessionsCalendar = () => {
  const [sessions, setSessions] = useState([])
  const [locations, setLocations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingSession, setEditingSession] = useState(null)
  const [searchDate, setSearchDate] = useState('')
  const [playerProfile, setPlayerProfile] = useState(null)
  const [playerPhotoUrl, setPlayerPhotoUrl] = useState(null)
  const { user } = useAuth()
  const params = useParams()
  const orgId = params.orgId // Get organization ID from route params

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    start_time: '',
    duration_minutes: '',
    location_id: '',
    notes: ''
  })

  // Function to get signed URL for player photos
  const getSignedUrlForPlayerPhoto = async (url) => {
    // Only process URLs that are from Supabase storage
    if (!url || !url.includes('supabase.co') || !url.includes('/storage/')) {
      return null
    }
    
    try {
      // Extract file path from the URL
      const urlParts = url.split('/')
      if (urlParts.length < 2) return null
      
      const filePath = urlParts.slice(-2).join('/') // Get user_id/filename
      
      // First check if the file exists
      const { data: existsData, error: existsError } = await supabase.storage
        .from('player-photos')
        .list(filePath.split('/')[0]) // List files in the user directory
      
      if (existsError) {
        // Silently skip if we can't check file existence
        return null
      }
      
      // Check if the file exists in the list
      const fileName = filePath.split('/')[1]
      const fileExists = existsData?.some(file => file.name === fileName)
      
      if (!fileExists) {
        // Silently skip missing files - this is expected for some records
        return null
      }
      
      const { data, error } = await supabase.storage
        .from('player-photos')
        .createSignedUrl(filePath, 60 * 60 * 24 * 7) // 7 days expiry
      
      if (error) {
        // Silently skip if we can't get signed URL
        return null
      }
      
      return data?.signedUrl || null
    } catch (err) {
      // Silently skip if there's an error
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

  useEffect(() => {
    if (orgId && orgId !== 'undefined') {
      fetchSessions()
      fetchPlayerProfile()
    }
  }, [orgId])

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
          locations (
            id,
            name
          )
        `)
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

  const fetchLocations = async () => {
    try {
      let query = supabase
        .from('locations')
        .select('*')
        .order('name', { ascending: true })

      // If we're in an organization context, filter by organization_id
      if (orgId) {
        query = query.eq('organization_id', orgId)
      } else {
        // For single tenant, we'll need to handle this differently
        // since locations are organization-scoped
        console.log('No organization context for locations')
        setLocations([])
        return
      }

      const { data, error } = await query

      if (error) throw error
      setLocations(data || [])
    } catch (err) {
      console.error('Error fetching locations:', err)
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
      location_id: '',
      notes: ''
    })
    setEditingSession(null)
    setShowAddForm(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.title || !formData.date || !formData.start_time || !formData.duration_minutes || !formData.location_id) {
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
        location_id: formData.location_id,
        notes: formData.notes.trim() || null
      }

      if (orgId) {
        sessionData.organization_id = orgId
      }

      if (editingSession) {
        let query = supabase
          .from('sessions')
          .update(sessionData)
          .eq('id', editingSession.id)
        
        if (orgId) {
          query = query.eq('organization_id', orgId)
        } else {
          query = query.eq('coach_id', user.id)
        }

        const { error } = await query
        if (error) throw error
      } else {
        const insertData = {
          ...sessionData,
          ...(orgId ? { organization_id: orgId } : { coach_id: user.id })
        }

        const { error } = await supabase
          .from('sessions')
          .insert(insertData)

        if (error) throw error
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
      location_id: session.location_id || '',
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
      
      if (orgId) {
        query = query.eq('organization_id', orgId)
      } else {
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

  const getEndTime = (startTime, durationMinutes) => {
    const start = new Date(`2000-01-01T${startTime}`)
    const end = new Date(start.getTime() + durationMinutes * 60000)
    return end.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  // Calendar helpers
  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  }

  const getPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  const getNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  const handleDateSearch = () => {
    if (searchDate) {
      const searchDateObj = new Date(searchDate)
      setCurrentDate(searchDateObj)
      setSelectedDate(searchDateObj)
      setSearchDate('')
    }
  }

  const goToToday = () => {
    const today = new Date()
    setCurrentDate(today)
    setSelectedDate(today)
  }

  const getSessionsForDate = (date) => {
    // Format date in local timezone to avoid UTC conversion issues
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const dateStr = `${year}-${month}-${day}`
    return sessions.filter(session => session.date === dateStr)
  }

  const isToday = (date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const isSelected = (date) => {
    return selectedDate && date.toDateString() === selectedDate.toDateString()
  }

  const handleDateClick = (date) => {
    setSelectedDate(date)
    // Format date in local timezone to avoid UTC conversion issues
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const dateStr = `${year}-${month}-${day}`
    setFormData(prev => ({
      ...prev,
      date: dateStr
    }))
  }

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentDate)
    const firstDayOfMonth = getFirstDayOfMonth(currentDate)
    const days = []

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<div key={`empty-${i}`} className="h-32 bg-gray-50"></div>)
    }

    // Add cells for each day of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
      const sessionsForDay = getSessionsForDate(date)
      
      days.push(
        <div
          key={day}
          className={`h-32 border border-gray-200 p-2 cursor-pointer hover:bg-gray-50 transition-colors ${
            isToday(date) ? 'bg-blue-50 border-blue-300' : ''
          } ${isSelected(date) ? 'bg-indigo-50 border-indigo-300' : ''}`}
          onClick={() => handleDateClick(date)}
        >
          <div className="text-sm font-medium text-gray-900 mb-1">{day}</div>
          <div className="space-y-1">
            {sessionsForDay.slice(0, 2).map((session) => (
              <div
                key={session.id}
                className="text-xs bg-indigo-100 text-indigo-800 px-1 py-0.5 rounded truncate"
                title={`${session.title} - ${formatTime(session.start_time)}`}
              >
                {session.title}
              </div>
            ))}
            {sessionsForDay.length > 2 && (
              <div className="text-xs text-gray-500">
                +{sessionsForDay.length - 2} more
              </div>
            )}
          </div>
        </div>
      )
    }

    return days
  }

  const getSelectedDateSessions = () => {
    if (!selectedDate) return []
    // Format date in local timezone to avoid UTC conversion issues
    const year = selectedDate.getFullYear()
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0')
    const day = String(selectedDate.getDate()).padStart(2, '0')
    const dateStr = `${year}-${month}-${day}`
    return sessions.filter(session => session.date === dateStr)
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
                      {orgId && <OrganizationHeader title="Sessions Calendar" showBackButton={false} playerProfile={playerProfile} playerPhotoUrl={playerPhotoUrl} />}
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              {orgId ? (
                <div className="flex items-center justify-between">
                  <h1 className="text-3xl font-bold text-gray-900">Sessions Calendar</h1>
                  <div className="flex space-x-3">
                    <Link
                      to={`/organisations/${orgId}/sessions`}
                      className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-md transition duration-150 ease-in-out"
                    >
                      List View
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Link
                      to="/dashboard"
                      className="text-gray-600 hover:text-gray-800 font-medium"
                    >
                      ← Back to Dashboard
                    </Link>
                    <h1 className="text-3xl font-bold text-gray-900">Sessions Calendar</h1>
                  </div>
                  <div className="flex space-x-3">
                    <Link
                      to="/sessions"
                      className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-md transition duration-150 ease-in-out"
                    >
                      List View
                    </Link>
                  </div>
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
              {/* Calendar Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={getPreviousMonth}
                    className="p-2 hover:bg-gray-100 rounded-md"
                  >
                    ← Previous
                  </button>
                  <button
                    onClick={goToToday}
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Today
                  </button>
                </div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </h2>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={getNextMonth}
                    className="p-2 hover:bg-gray-100 rounded-md"
                  >
                    Next →
                  </button>
                  <div className="flex items-center space-x-2">
                    <input
                      type="date"
                      value={searchDate}
                      onChange={(e) => setSearchDate(e.target.value)}
                      className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Search date"
                    />
                    <button
                      onClick={handleDateSearch}
                      className="px-3 py-1 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                    >
                      Go
                    </button>
                  </div>
                </div>
              </div>

              {/* Calendar Grid */}
              <div className="mb-6">
                <div className="grid grid-cols-7 gap-px bg-gray-200 border border-gray-200 rounded-lg overflow-hidden">
                  {/* Day headers */}
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="bg-gray-100 p-2 text-center text-sm font-medium text-gray-700">
                      {day}
                    </div>
                  ))}
                  
                  {/* Calendar days */}
                  {renderCalendar()}
                </div>
              </div>

              {/* Selected Date Sessions */}
              {selectedDate && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Sessions for {selectedDate.toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </h3>
                  {getSelectedDateSessions().length === 0 ? (
                    <p className="text-gray-500">No sessions scheduled for this date</p>
                  ) : (
                    <div className="space-y-3">
                      {getSelectedDateSessions().map((session) => (
                        <div key={session.id} className="bg-gray-50 rounded-lg p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900">{session.title}</h4>
                              <div className="text-sm text-gray-600 mt-1">
                                <div>Time: {formatTime(session.start_time)} - {getEndTime(session.start_time, session.duration_minutes)}</div>
                                <div>Location: {session.locations?.name || session.location || 'No location'}</div>
                                <div>Duration: {session.duration_minutes} minutes</div>
                                {session.description && (
                                  <div className="mt-2">Description: {session.description}</div>
                                )}
                              </div>
                            </div>
                            <div className="flex space-x-2 ml-4">
                              <Link
                                to={orgId ? `/organisations/${orgId}/sessions/${session.id}/attendance` : `/sessions/${session.id}/attendance`}
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
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Add/Edit Form */}
              {showAddForm && (
                <div className="bg-gray-50 rounded-lg p-6">
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
                        <label htmlFor="location_id" className="block text-sm font-medium text-gray-700 mb-2">
                          Location *
                        </label>
                        {locations.length === 0 ? (
                          <div className="text-sm text-gray-500">
                            No locations available. 
                            {orgId && (
                              <Link to={`/organisations/${orgId}/locations`} className="text-indigo-600 hover:text-indigo-800 ml-1">
                                Create locations first
                              </Link>
                            )}
                          </div>
                        ) : (
                          <select
                            id="location_id"
                            name="location_id"
                            required
                            value={formData.location_id}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          >
                            <option value="">Select a location</option>
                            {locations.map((location) => (
                              <option key={location.id} value={location.id}>
                                {location.name}
                              </option>
                            ))}
                          </select>
                        )}
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
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SessionsCalendar 