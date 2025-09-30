import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../src/lib/supabase'
import { useAuth } from '../src/contexts/AuthContext'
import OrganizationHeader from './OrganizationHeader'

const Sessions = () => {
  const [sessions, setSessions] = useState([])
  const [squads, setSquads] = useState([])
  const [locations, setLocations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingSession, setEditingSession] = useState(null)
  const [selectedSquads, setSelectedSquads] = useState([])
  const [playerProfile, setPlayerProfile] = useState(null)
  const [playerPhotoUrl, setPlayerPhotoUrl] = useState(null)
  const [templates, setTemplates] = useState([])
  const [showTemplateSelector, setShowTemplateSelector] = useState(false)
  const [sessionTypeFilter, setSessionTypeFilter] = useState('all') // 'all', 'practice', 'game'
  const { user, hasRole } = useAuth()
  
  // Determine user permissions
  const canViewSessions = hasRole('superadmin') || hasRole('admin') || hasRole('coach') || hasRole('player')
  const canManageSessions = hasRole('superadmin') || hasRole('admin') || hasRole('coach')
  const canDeleteSessions = hasRole('superadmin') || hasRole('admin')
  const params = useParams()
  const orgId = params.orgId // Get organization ID from route params

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    start_time: '',
    duration_minutes: '',
    location_id: '',
    notes: '',
    event_type: 'practice'
  })

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

  useEffect(() => {
    if (orgId && orgId !== 'undefined') {
      fetchSessions()
      fetchSquads()
      fetchLocations()
      fetchTemplates()
      fetchPlayerProfile()
    }
  }, [orgId])

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

      // Filter by organization_id
      query = query.eq('organization_id', orgId)

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

  const fetchSquads = async () => {
    try {
      let query = supabase
        .from('squads')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true })

      // Filter by organization_id
      query = query.eq('organization_id', orgId)

      const { data, error } = await query

      if (error) throw error
      setSquads(data || [])
    } catch (err) {
      console.error('Error fetching squads:', err)
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

  const fetchTemplates = async () => {
    try {
      let query = supabase
        .from('session_templates')
        .select('*')
        .order('title', { ascending: true })

      if (orgId) {
        query = query.eq('organization_id', orgId)
      } else {
        query = query.eq('author_id', user.id)
      }

      const { data, error } = await query

      if (error) throw error
      setTemplates(data || [])
    } catch (err) {
      console.error('Error fetching templates:', err)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const importTemplate = async (template) => {
    try {
      // Import template data into the form
      setFormData(prev => ({
        ...prev,
        title: template.title,
        description: template.description || '',
        duration_minutes: template.duration_minutes.toString(),
        notes: '' // Keep notes empty as they're session-specific
      }))
      
      setShowTemplateSelector(false)
      setError('') // Clear any existing errors
    } catch (err) {
      console.error('Error importing template:', err)
      setError('Failed to import template')
    }
  }

  const handleSquadToggle = (squadId) => {
    setSelectedSquads(prev => {
      if (prev.includes(squadId)) {
        return prev.filter(id => id !== squadId)
      } else {
        return [...prev, squadId]
      }
    })
  }

  const fetchSessionSquads = async (sessionId) => {
    try {
      const { data, error } = await supabase
        .from('session_squads')
        .select('squad_id')
        .eq('session_id', sessionId)

      if (error) throw error
      
      const squadIds = data.map(item => item.squad_id)
      setSelectedSquads(squadIds)
    } catch (err) {
      console.error('Error fetching session squads:', err)
    }
  }

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      date: '',
      start_time: '',
      duration_minutes: '',
      location_id: '',
      notes: '',
      event_type: 'practice'
    })
    setSelectedSquads([])
    setEditingSession(null)
    setShowAddForm(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.title || !formData.date || !formData.start_time || !formData.duration_minutes || !formData.location_id) {
      setError('Please fill in all required fields')
      return
    }
    if (formData.event_type === 'game' && selectedSquads.length !== 1) {
      setError('Please select exactly one squad for a game')
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
        notes: formData.notes.trim() || null,
        event_type: formData.event_type || 'practice'
      }

      // Ensure legacy "location" text column is populated for compatibility
      const selectedLocation = locations.find(loc => loc.id === formData.location_id)
      sessionData.location = selectedLocation?.name || 'Main Arena'

      // Remove any undefined or null values and system fields to avoid trigger issues
      Object.keys(sessionData).forEach(key => {
        if (sessionData[key] === undefined || sessionData[key] === null) {
          delete sessionData[key]
        }
      })
      
      // Temporarily exclude system fields until database is fixed
      delete sessionData.updated_at
      delete sessionData.created_at
      let sessionId

      if (editingSession) {
        // Update existing session - use a different approach to avoid trigger issues
        const updateData = { ...sessionData }
        
        // Remove any fields that might cause issues
        delete updateData.id
        delete updateData.created_at
        delete updateData.updated_at
        
        let query = supabase
          .from('sessions')
          .update(updateData)
          .eq('id', editingSession.id)

        // Ensure the session belongs to the organization
        query = query.eq('organization_id', orgId)

        const { error } = await query

        if (error) {
          console.error('Supabase update error:', error)
          console.error('Supabase update error details:', {
            message: error?.message,
            details: error?.details,
            hint: error?.hint,
            code: error?.code
          })
          throw error
        }

        sessionId = editingSession.id
      } else {
        // Add new session
        const insertData = {
          ...sessionData
        }

        // Set organization_id
        insertData.organization_id = orgId
        // Set created_by to current user for NOT NULL constraint
        insertData.created_by = user.id

        let insertError = null
        let insertResult = null

        const attemptInsert = async () => {
          const { data, error } = await supabase
            .from('sessions')
            .insert(insertData)
            .select('id')
            .single()
          insertResult = data
          insertError = error
        }

        await attemptInsert()

        if (insertError) {
          console.error('Supabase insert error:', insertError)
          console.error('Supabase insert error details:', {
            message: insertError?.message,
            details: insertError?.details,
            hint: insertError?.hint,
            code: insertError?.code
          })

          // Fallback 1: event_type column does not exist (new column)
          if (insertError && (insertError?.code === '42703') && (insertError?.message?.includes('event_type') || insertError?.details?.includes('event_type'))) {
            delete insertData.event_type
            await attemptInsert()
          }

          // Fallback 2: older schema requiring coach_id NOT NULL
          if (insertError?.code === '23502' && (insertError?.message?.includes('coach_id') || insertError?.details?.includes('coach_id'))) {
            insertData.coach_id = user.id
            await attemptInsert()
          }

          // Fallback 3: created_by column does not exist on this DB
          if (insertError && (insertError?.code === '42703') && (insertError?.message?.includes('created_by') || insertError?.details?.includes('created_by'))) {
            delete insertData.created_by
            await attemptInsert()
          }

          // Fallback 4: location_id column does not exist (legacy schema)
          if (insertError && (insertError?.code === '42703') && (insertError?.message?.includes('location_id') || insertError?.details?.includes('location_id'))) {
            delete insertData.location_id
            await attemptInsert()
          }

          // If still failing, throw last error
          if (insertError) {
            throw insertError
          }
        }

        sessionId = insertResult.id
      }

      // Handle squad assignments
      if (sessionId) {
        // First, remove all existing squad assignments for this session
        await supabase
          .from('session_squads')
          .delete()
          .eq('session_id', sessionId)

        // Then, add new squad assignments
        if (selectedSquads.length > 0) {
          const squadAssignments = selectedSquads.map(squadId => ({
            session_id: sessionId,
            squad_id: squadId
          }))

          const { error: squadError } = await supabase
            .from('session_squads')
            .insert(squadAssignments)

          if (squadError) {
            console.error('Error saving squad assignments:', squadError)
            throw squadError
          }
        }
      }

      resetForm()
      fetchSessions()
    } catch (err) {
      setError((editingSession ? 'Failed to update session' : 'Failed to add session') + (err?.message ? `: ${err.message}` : ''))
      console.error('Error saving session:', err)
      console.error('Error saving session details:', {
        message: err?.message,
        details: err?.details,
        hint: err?.hint,
        code: err?.code
      })
    }
  }

  const handleEdit = async (session) => {
    setEditingSession(session)
    setFormData({
      title: session.title || '',
      description: session.description || '',
      date: session.date || '',
      start_time: session.start_time || '',
      duration_minutes: session.duration_minutes || '',
      location_id: session.location_id || '',
      notes: session.notes || '',
      event_type: session.event_type || 'practice'
    })
    
    // Fetch existing squad assignments for this session
    await fetchSessionSquads(session.id)
    
    setShowAddForm(true)
  }

  const handleDelete = async (sessionId) => {
    if (!confirm('Are you sure you want to delete this session?')) return

    try {
      let query = supabase
        .from('sessions')
        .delete()
        .eq('id', sessionId)

      // Ensure the session belongs to the organization
      query = query.eq('organization_id', orgId)

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

  // Get filtered sessions based on session type filter
  const getFilteredSessions = () => {
    if (sessionTypeFilter === 'all') {
      return sessions
    }
    return sessions.filter(session => session.event_type === sessionTypeFilter)
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
                <OrganizationHeader title="Sessions" showBackButton={false} playerProfile={playerProfile} playerPhotoUrl={playerPhotoUrl} />
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
                  <div className="flex items-center space-x-2">
                    <Link
                      to="/session-templates"
                      className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-md transition duration-150 ease-in-out"
                    >
                      Templates
                    </Link>
                    <Link
                      to="/sessions/calendar"
                      className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-md transition duration-150 ease-in-out"
                    >
                      Calendar View
                    </Link>
                    {canManageSessions && (
                      <button
                        onClick={() => setShowAddForm(true)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-md transition duration-150 ease-in-out"
                      >
                        Add Session
                      </button>
                    )}
                  </div>
                </div>
              )}
              {orgId && (
                <div className="mt-4 flex justify-end space-x-2">
                  <Link
                    to={`/organisations/${orgId}/session-templates`}
                    className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-md transition duration-150 ease-in-out"
                  >
                    Templates
                  </Link>
                  <Link
                    to={`/organisations/${orgId}/sessions/calendar`}
                    className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-md transition duration-150 ease-in-out"
                  >
                    Calendar View
                  </Link>
                  {canManageSessions && (
                    <button
                      onClick={() => setShowAddForm(true)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-md transition duration-150 ease-in-out"
                    >
                      Add Session
                    </button>
                  )}
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
                <div className="mb-6 bg-gray-50 rounded-lg p-4 sm:p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    {editingSession ? 'Edit Session' : 'Add New Session'}
                  </h3>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="event_type" className="block text-sm font-medium text-gray-700 mb-2">
                          Type
                        </label>
                        <select
                          id="event_type"
                          name="event_type"
                          value={formData.event_type}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        >
                          <option value="practice">Practice</option>
                          <option value="game">Game</option>
                        </select>
                      </div>
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
                            <Link to={`/organisations/${orgId}/locations`} className="text-indigo-600 hover:text-indigo-800 ml-1">
                              Create locations first
                            </Link>
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

                    {formData.event_type === 'game' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Game Squad (select exactly one)
                        </label>
                        {squads.length === 0 ? (
                          <p className="text-sm text-gray-500">No squads available. Create squads first to use games.</p>
                        ) : (
                          <div className="space-y-2">
                            {squads.map((squad) => (
                              <label key={squad.id} className="flex items-center space-x-3 cursor-pointer">
                                <input
                                  type="radio"
                                  name="game_squad"
                                  checked={selectedSquads.includes(squad.id)}
                                  onChange={() => setSelectedSquads([squad.id])}
                                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                                />
                                <span className="text-sm text-gray-900">{squad.name}</span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

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

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Invited Squads
                      </label>
                      {squads.length === 0 ? (
                        <p className="text-sm text-gray-500">No squads available. Create squads first to assign them to sessions.</p>
                      ) : (
                        <div className="space-y-2">
                          {squads.map((squad) => (
                            <label key={squad.id} className="flex items-center space-x-3 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={selectedSquads.includes(squad.id)}
                                onChange={() => handleSquadToggle(squad.id)}
                                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                              />
                              <span className="text-sm text-gray-900">{squad.name}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row sm:justify-between space-y-3 sm:space-y-0 sm:space-x-4 mt-8">
                      <button
                        type="button"
                        onClick={() => setShowTemplateSelector(true)}
                        className="w-full sm:w-auto px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      >
                        Import Template
                      </button>
                      <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
                      <button
                        type="button"
                        onClick={resetForm}
                        className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="w-full sm:w-auto px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        {editingSession ? 'Update Session' : 'Add Session'}
                      </button>
                      </div>
                    </div>
                  </form>
                </div>
              )}

              {/* Session Type Filter */}
              <div className="mb-6">
                <div className="flex items-center space-x-4">
                  <label className="text-sm font-medium text-gray-700">Filter by type:</label>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setSessionTypeFilter('all')}
                      className={`px-3 py-1 rounded-full text-sm font-medium transition-colors duration-200 ${
                        sessionTypeFilter === 'all'
                          ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      All Sessions
                    </button>
                    <button
                      onClick={() => setSessionTypeFilter('practice')}
                      className={`px-3 py-1 rounded-full text-sm font-medium transition-colors duration-200 ${
                        sessionTypeFilter === 'practice'
                          ? 'bg-blue-100 text-blue-800 border border-blue-200'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Practice
                    </button>
                    <button
                      onClick={() => setSessionTypeFilter('game')}
                      className={`px-3 py-1 rounded-full text-sm font-medium transition-colors duration-200 ${
                        sessionTypeFilter === 'game'
                          ? 'bg-green-100 text-green-800 border border-green-200'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Games
                    </button>
                  </div>
                </div>
              </div>

              {/* Sessions List */}
              {getFilteredSessions().length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-500 text-lg mb-4">
                    {sessions.length === 0 
                      ? 'No sessions scheduled' 
                      : sessionTypeFilter === 'all'
                        ? 'No sessions scheduled'
                        : `No ${sessionTypeFilter} sessions found`
                    }
                  </div>
                  <p className="text-gray-400">
                    {sessions.length === 0 
                      ? 'Create your first practice session to get started'
                      : `Try selecting a different filter or create a new ${sessionTypeFilter} session`
                    }
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {getFilteredSessions().map((session) => (
                    <div key={session.id} className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200">
                      <div className="p-6">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between space-y-4 sm:space-y-0">
                          <div className="flex-1">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3 space-y-2 sm:space-y-0 mb-2">
                              <Link
                                to={orgId ? `/organisations/${orgId}/sessions/${session.id}` : `/sessions/${session.id}`}
                                className="text-xl font-semibold text-gray-900 hover:text-indigo-600 transition-colors duration-200"
                              >
                                {session.title}
                              </Link>
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 self-start sm:self-auto">
                                {session.event_type === 'game' ? 'Game' : 'Practice'} · {formatDate(session.date)}
                              </span>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                              <div>
                                <span className="font-medium">Time:</span> {formatTime(session.start_time)} - {getEndTime(session.start_time, session.duration_minutes)}
                              </div>
                              <div>
                                <span className="font-medium">Location:</span> {session.locations?.name || 'No location assigned'}
                              </div>
                              <div>
                                <span className="font-medium">Duration:</span> {session.duration_minutes} minutes
                              </div>
                              {session.description && (
                                <div className="md:col-span-2">
                                  <span className="font-medium">Description:</span> {session.description}
                                </div>
                              )}
                              {session.session_squads && session.session_squads.length > 0 && (
                                <div className="md:col-span-2">
                                  <span className="font-medium">Invited Squads:</span>{' '}
                                  {session.session_squads.map((assignment, index) => (
                                    <span key={assignment.squad_id}>
                                      {assignment.squads?.name}
                                      {index < session.session_squads.length - 1 ? ', ' : ''}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 sm:ml-4">
                            <Link
                              to={orgId ? `/organisations/${orgId}/sessions/${session.id}` : `/sessions/${session.id}`}
                              className="text-indigo-600 hover:text-indigo-800 text-sm font-medium text-center sm:text-left"
                            >
                              View Session
                            </Link>
                            {session.event_type === 'game' && (
                              <Link
                                to={orgId ? `/organisations/${orgId}/sessions/${session.id}/game-stats` : `/sessions/${session.id}/game-stats`}
                                className="text-green-600 hover:text-green-800 text-sm font-medium text-center sm:text-left"
                              >
                                Game Stats
                              </Link>
                            )}
                            {canManageSessions && session.event_type !== 'game' && (
                              <Link
                                to={orgId ? `/organisations/${orgId}/sessions/${session.id}/planner` : `/sessions/${session.id}/planner`}
                                className="text-purple-600 hover:text-purple-800 text-sm font-medium text-center sm:text-left"
                              >
                                Plan Session
                              </Link>
                            )}
                            {canManageSessions && (
                              <Link
                                to={orgId ? `/organisations/${orgId}/sessions/${session.id}/attendance` : `/sessions/${session.id}/attendance`}
                                className="text-blue-600 hover:text-blue-800 text-sm font-medium text-center sm:text-left"
                              >
                                Take Attendance
                              </Link>
                            )}
                            <Link
                              to={orgId ? `/organisations/${orgId}/sessions/${session.id}/pdf` : `/sessions/${session.id}/pdf`}
                              className="text-orange-600 hover:text-orange-800 text-sm font-medium text-center sm:text-left"
                            >
                              Export PDF
                            </Link>
                            {canManageSessions && (
                              <button
                                onClick={() => handleEdit(session)}
                                className="text-green-600 hover:text-green-800 text-sm font-medium text-center sm:text-left"
                              >
                                Edit
                              </button>
                            )}
                            {canDeleteSessions && (
                              <button
                                onClick={() => handleDelete(session.id)}
                                className="text-red-600 hover:text-red-800 text-sm font-medium text-center sm:text-left"
                              >
                                Delete
                              </button>
                            )}
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

      {/* Template Selector Modal */}
      {showTemplateSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Select a Template</h3>
              <button
                onClick={() => setShowTemplateSelector(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-2">
              {templates.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-500 text-lg mb-2">No templates available</div>
                  <p className="text-gray-400 text-sm">
                    {orgId ? (
                      <Link to={`/organisations/${orgId}/session-templates/new`} className="text-indigo-600 hover:text-indigo-800">
                        Create a template first
                      </Link>
                    ) : (
                      <Link to="/session-templates/new" className="text-indigo-600 hover:text-indigo-800">
                        Create a template first
                      </Link>
                    )}
                  </p>
                </div>
              ) : (
                templates.map(template => (
                  <div
                    key={template.id}
                    onClick={() => importTemplate(template)}
                    className="p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 mb-1">{template.title}</h4>
                        {template.description && (
                          <p className="text-sm text-gray-600 mb-2">{template.description}</p>
                        )}
                        <div className="flex flex-wrap gap-2 text-xs">
                          <span className="inline-flex items-center px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                            {template.duration_minutes} minutes
                          </span>
                          <span className="inline-flex items-center px-2 py-1 rounded-full bg-green-100 text-green-800">
                            Created by {template.author_id === user.id ? 'you' : 'another user'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Sessions 