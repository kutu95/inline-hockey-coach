import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../src/lib/supabase'
import { useAuth } from '../src/contexts/AuthContext'
import OrganizationHeader from './OrganizationHeader'

const EditSession = () => {
  const { sessionId, orgId } = useParams()
  const navigate = useNavigate()
  const { user, hasRole } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [locations, setLocations] = useState([])
  const [squads, setSquads] = useState([])
  const [selectedSquads, setSelectedSquads] = useState([])
  const [playerProfile, setPlayerProfile] = useState(null)
  const [playerPhotoUrl, setPlayerPhotoUrl] = useState(null)
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    start_time: '',
    duration_minutes: '',
    location_id: '',
    notes: ''
  })

  useEffect(() => {
    if (sessionId) {
      fetchSession()
      fetchLocations()
      fetchSquads()
      fetchPlayerProfile()
    }
  }, [sessionId])

  // Function to get signed URL for player photos
  const getSignedUrlForPlayerPhoto = async (url) => {
    if (!url || !url.includes('supabase.co') || !url.includes('/storage/')) {
      return null
    }
    
    try {
      const urlParts = url.split('/')
      if (urlParts.length < 2) return null
      
      const filePath = urlParts.slice(-2).join('/')
      
      const { data: existsData, error: existsError } = await supabase.storage
        .from('player-photos')
        .list(filePath.split('/')[0])
      
      if (existsError) {
        return null
      }
      
      const fileName = filePath.split('/')[1]
      const fileExists = existsData?.some(file => file.name === fileName)
      
      if (!fileExists) {
        return null
      }
      
      const { data, error } = await supabase.storage
        .from('player-photos')
        .createSignedUrl(filePath, 60 * 60 * 24 * 7)
      
      if (error) {
        return null
      }
      
      return data?.signedUrl || null
    } catch (err) {
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

  const fetchSession = async () => {
    try {
      setLoading(true)
      let query = supabase
        .from('sessions')
        .select('*')
        .eq('id', sessionId)

      // If we're in an organization context, filter by organization_id
      if (orgId) {
        query = query.eq('organization_id', orgId)
      } else {
        // Otherwise, filter by coach_id (single tenant)
        query = query.eq('coach_id', user.id)
      }

      const { data, error } = await query.single()

      if (error) throw error
      
      setFormData({
        title: data.title || '',
        description: data.description || '',
        date: data.date || '',
        start_time: data.start_time || '',
        duration_minutes: data.duration_minutes || '',
        location_id: data.location_id || '',
        notes: data.notes || ''
      })
      
      // Fetch session squads after setting form data
      await fetchSessionSquads()
    } catch (err) {
      setError('Failed to fetch session')
      console.error('Error fetching session:', err)
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

  const fetchSquads = async () => {
    try {
      let query = supabase
        .from('squads')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true })

      // If we're in an organization context, filter by organization_id
      if (orgId) {
        query = query.eq('organization_id', orgId)
      } else {
        // For single tenant, we'll need to handle this differently
        console.log('No organization context for squads')
        setSquads([])
        return
      }

      const { data, error } = await query

      if (error) throw error
      setSquads(data || [])
    } catch (err) {
      console.error('Error fetching squads:', err)
    }
  }

  const fetchSessionSquads = async () => {
    try {
      const { data, error } = await supabase
        .from('session_squads')
        .select('squad_id')
        .eq('session_id', sessionId)

      if (error) throw error
      
      const squadIds = data.map(ss => ss.squad_id)
      setSelectedSquads(squadIds)
    } catch (err) {
      console.error('Error fetching session squads:', err)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
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

  const updateSessionSquads = async () => {
    try {
      // First, delete all existing session squad assignments
      const { error: deleteError } = await supabase
        .from('session_squads')
        .delete()
        .eq('session_id', sessionId)

      if (deleteError) throw deleteError

      // Then, insert the new squad assignments
      if (selectedSquads.length > 0) {
        const sessionSquadData = selectedSquads.map(squadId => ({
          session_id: sessionId,
          squad_id: squadId
        }))

        const { error: insertError } = await supabase
          .from('session_squads')
          .insert(sessionSquadData)

        if (insertError) throw insertError
      }
    } catch (err) {
      console.error('Error updating session squads:', err)
      throw err
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      const sessionData = {
        title: formData.title,
        description: formData.description,
        date: formData.date,
        start_time: formData.start_time,
        duration_minutes: formData.duration_minutes ? parseInt(formData.duration_minutes) : null,
        location_id: formData.location_id || null,
        notes: formData.notes,
        updated_at: new Date().toISOString()
      }

      let query = supabase
        .from('sessions')
        .update(sessionData)
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

      // Update session squad assignments
      await updateSessionSquads()

      navigate(orgId ? `/organisations/${orgId}/sessions/${sessionId}` : `/sessions/${sessionId}`)
    } catch (err) {
      setError('Failed to update session')
      console.error('Error updating session:', err)
    } finally {
      setSaving(false)
    }
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
      <div className="max-w-2xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <OrganizationHeader title="Edit Session" showBackButton={false} playerProfile={playerProfile} playerPhotoUrl={playerPhotoUrl} />
            </div>

            {error && (
              <div className="px-6 py-4">
                <div className="rounded-md bg-red-50 p-4">
                  <div className="text-sm text-red-700">{error}</div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="px-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Title */}
                <div className="md:col-span-2">
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                    Session Title *
                  </label>
                  <input
                    type="text"
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                {/* Description */}
                <div className="md:col-span-2">
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                {/* Date */}
                <div>
                  <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
                    Date *
                  </label>
                  <input
                    type="date"
                    id="date"
                    name="date"
                    value={formData.date}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                {/* Start Time */}
                <div>
                  <label htmlFor="start_time" className="block text-sm font-medium text-gray-700 mb-2">
                    Start Time *
                  </label>
                  <input
                    type="time"
                    id="start_time"
                    name="start_time"
                    value={formData.start_time}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                {/* Duration */}
                <div>
                  <label htmlFor="duration_minutes" className="block text-sm font-medium text-gray-700 mb-2">
                    Duration (minutes)
                  </label>
                  <input
                    type="number"
                    id="duration_minutes"
                    name="duration_minutes"
                    value={formData.duration_minutes}
                    onChange={handleChange}
                    min="1"
                    max="480"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                {/* Location */}
                <div>
                  <label htmlFor="location_id" className="block text-sm font-medium text-gray-700 mb-2">
                    Location
                  </label>
                  <select
                    id="location_id"
                    name="location_id"
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
                </div>

                {/* Notes */}
                <div className="md:col-span-2">
                  <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    id="notes"
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Additional notes about this session..."
                  />
                </div>

                {/* Squad Selection */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Invited Squads
                  </label>
                  <div className="border border-gray-300 rounded-md p-4 bg-gray-50">
                    {squads.length === 0 ? (
                      <p className="text-gray-500 text-sm">No active squads available for this organization.</p>
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
                            <span className="text-sm font-medium text-gray-900">{squad.name}</span>
                            {squad.description && (
                              <span className="text-sm text-gray-500">- {squad.description}</span>
                            )}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-gray-500">
                    Select the squads that should be invited to this session. Players in these squads will be able to see and join this session.
                  </p>
                </div>
              </div>

              <div className="mt-8 flex justify-end space-x-3">
                <Link
                  to={orgId ? `/organisations/${orgId}/sessions/${sessionId}` : `/sessions/${sessionId}`}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition duration-150 ease-in-out"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-400 transition duration-150 ease-in-out"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EditSession 