import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../src/lib/supabase'
import { useAuth } from '../src/contexts/AuthContext'
import OrganizationHeader from './OrganizationHeader'

const EditPlayer = () => {
  const { id, orgId } = useParams()
  const navigate = useNavigate()
  const { user, hasRole } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [clubs, setClubs] = useState([])
  const [loadingClubs, setLoadingClubs] = useState(true)
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [currentPhotoUrl, setCurrentPhotoUrl] = useState('')
  const [playerUserId, setPlayerUserId] = useState(null)
  const [isPlayerEditingOwnProfile, setIsPlayerEditingOwnProfile] = useState(false)
  
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    birthdate: '',
    accreditations: [],
    jersey_number: '',
    hand: '',
    club_id: '',
    phone: '',
    email: '',
    skate_australia_number: '',
    emergency_contact: '',
    emergency_phone: '',
    notes: ''
  })

  const availableAccreditations = ['skater', 'goalie', 'coach', 'referee']

  useEffect(() => {
    fetchPlayer()
    fetchClubs()
  }, [id])

  const fetchClubs = async () => {
    try {
      setLoadingClubs(true)
      let query = supabase
        .from('clubs')
        .select('id, name')
        .order('name', { ascending: true })

      // If we're in an organization context, filter by organization_id
      if (orgId) {
        query = query.eq('organization_id', orgId)
      } else {
        // Otherwise, filter by coach_id (single tenant)
        query = query.eq('coach_id', user.id)
      }

      const { data, error } = await query

      if (error) throw error
      setClubs(data || [])
    } catch (err) {
      console.error('Error fetching clubs:', err)
    } finally {
      setLoadingClubs(false)
    }
  }

  const fetchPlayer = async () => {
    try {
      setLoading(true)
      let query = supabase
        .from('players')
        .select('*')
        .eq('id', id)

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
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        birthdate: data.birthdate || '',
        accreditations: data.accreditations || [],
        jersey_number: data.jersey_number || '',
        hand: data.hand || '',
        club_id: data.club_id || '',
        phone: data.phone || '',
        email: data.email || '',
        skate_australia_number: data.skate_australia_number || '',
        emergency_contact: data.emergency_contact || '',
        emergency_phone: data.emergency_phone || '',
        notes: data.notes || ''
      })
      setCurrentPhotoUrl(data.photo_url || '')
      setPlayerUserId(data.user_id)
      
      // Check if current user is a player editing their own profile
      const isPlayer = hasRole('player')
      const isOwnProfile = data.user_id === user.id
      setIsPlayerEditingOwnProfile(isPlayer && isOwnProfile)
    } catch (err) {
      setError('Failed to fetch player')
      console.error('Error fetching player:', err)
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

  const handleAccreditationChange = (accreditation) => {
    setFormData(prev => ({
      ...prev,
      accreditations: prev.accreditations.includes(accreditation)
        ? prev.accreditations.filter(acc => acc !== accreditation)
        : [...prev.accreditations, accreditation]
    }))
  }

  const handlePhotoChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file')
        return
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image must be less than 5MB')
        return
      }

      setPhotoFile(file)
      
      // Create preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setPhotoPreview(e.target.result)
      }
      reader.readAsDataURL(file)
      setError('')
    }
  }

  const uploadPhoto = async () => {
    if (!photoFile) return null

    try {
      const fileExt = photoFile.name.split('.').pop()
      const fileName = `${Date.now()}.${fileExt}`
      const filePath = `${user.id}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('player-photos')
        .upload(filePath, photoFile)

      if (uploadError) throw uploadError

      // Get signed URL instead of public URL
      const { data: { signedUrl } } = await supabase.storage
        .from('player-photos')
        .createSignedUrl(filePath, 60 * 60 * 24 * 365) // 1 year expiry

      return signedUrl
    } catch (err) {
      console.error('Error uploading photo:', err)
      throw new Error('Failed to upload photo')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      let photoUrl = currentPhotoUrl
      if (photoFile) {
        photoUrl = await uploadPhoto()
      }

      let query = supabase
        .from('players')
        .update({
          ...formData,
          birthdate: formData.birthdate || null,
          jersey_number: formData.jersey_number ? parseInt(formData.jersey_number) : null,
          hand: formData.hand || null,
          club_id: formData.club_id || null,
          photo_url: photoUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      // If we're in an organization context, ensure the player belongs to the organization
      if (orgId) {
        query = query.eq('organization_id', orgId)
      } else {
        // Otherwise, ensure the player belongs to the coach
        query = query.eq('coach_id', user.id)
      }

      const { error } = await query

      if (error) throw error

      navigate(orgId ? `/organisations/${orgId}/players/${id}` : `/players/${id}`)
    } catch (err) {
      setError('Failed to update player')
      console.error('Error updating player:', err)
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
    <>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8">
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                  <Link
                    to={orgId ? `/organisations/${orgId}` : '/dashboard'}
                    className="text-gray-600 hover:text-gray-800 font-medium text-sm sm:text-base"
                  >
                    ← Back to Dashboard
                  </Link>
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Edit Player</h1>
                </div>
                <button
                  onClick={() => navigate(orgId ? `/organisations/${orgId}/players` : '/players')}
                  className="text-gray-600 hover:text-gray-800 font-medium text-sm sm:text-base"
                >
                  ← Back to Players
                </button>
              </div>
            </div>

            {error && (
              <div className="px-4 sm:px-6 py-4">
                <div className="rounded-md bg-red-50 p-4">
                  <div className="text-sm text-red-700">{error}</div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="px-4 sm:px-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Basic Information */}
                <div className="md:col-span-2">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
                </div>

                <div>
                  <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 mb-2">
                    First Name *
                  </label>
                  <input
                    type="text"
                    id="first_name"
                    name="first_name"
                    required
                    value={formData.first_name}
                    onChange={handleChange}
                    readOnly={isPlayerEditingOwnProfile}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                      isPlayerEditingOwnProfile ? 'bg-gray-100 cursor-not-allowed' : ''
                    }`}
                  />
                </div>

                <div>
                  <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-2">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    id="last_name"
                    name="last_name"
                    required
                    value={formData.last_name}
                    onChange={handleChange}
                    readOnly={isPlayerEditingOwnProfile}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                      isPlayerEditingOwnProfile ? 'bg-gray-100 cursor-not-allowed' : ''
                    }`}
                  />
                </div>

                <div>
                  <label htmlFor="birthdate" className="block text-sm font-medium text-gray-700 mb-2">
                    Birthdate
                  </label>
                  <input
                    type="date"
                    id="birthdate"
                    name="birthdate"
                    value={formData.birthdate}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Accreditations *
                  </label>
                  <div className="space-y-2">
                    {availableAccreditations.map(accreditation => (
                      <label key={accreditation} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.accreditations.includes(accreditation)}
                          onChange={() => handleAccreditationChange(accreditation)}
                          disabled={isPlayerEditingOwnProfile}
                          className={`h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded ${
                            isPlayerEditingOwnProfile ? 'cursor-not-allowed opacity-50' : ''
                          }`}
                        />
                        <span className={`ml-2 text-sm capitalize ${
                          isPlayerEditingOwnProfile ? 'text-gray-500' : 'text-gray-700'
                        }`}>
                          {accreditation}
                        </span>
                      </label>
                    ))}
                  </div>
                  {formData.accreditations.length === 0 && !isPlayerEditingOwnProfile && (
                    <p className="text-sm text-red-600 mt-1">Please select at least one accreditation</p>
                  )}
                </div>

                <div>
                  <label htmlFor="jersey_number" className="block text-sm font-medium text-gray-700 mb-2">
                    Jersey Number
                  </label>
                  <input
                    type="number"
                    id="jersey_number"
                    name="jersey_number"
                    min="0"
                    max="99"
                    value={formData.jersey_number}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label htmlFor="hand" className="block text-sm font-medium text-gray-700 mb-2">
                    Dominant Hand
                  </label>
                  <select
                    id="hand"
                    name="hand"
                    value={formData.hand}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">Select Hand</option>
                    <option value="left">Left</option>
                    <option value="right">Right</option>
                  </select>
                </div>

                {/* Club Selection */}
                <div>
                  <label htmlFor="club_id" className="block text-sm font-medium text-gray-700 mb-2">
                    Club *
                  </label>
                  <select
                    id="club_id"
                    name="club_id"
                    required
                    value={formData.club_id}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">Select Club</option>
                    {loadingClubs ? (
                      <option value="">Loading clubs...</option>
                    ) : clubs.length === 0 ? (
                      <option value="">No clubs found. Please add a club first.</option>
                    ) : (
                      clubs.map(club => (
                        <option key={club.id} value={club.id}>{club.name}</option>
                      ))
                    )}
                  </select>
                </div>

                {/* Photo Upload */}
                <div className="md:col-span-2">
                  <label htmlFor="photo" className="block text-sm font-medium text-gray-700 mb-2">
                    Player Photo
                  </label>
                  <div className="space-y-4">
                    {currentPhotoUrl && (
                      <div className="mb-4">
                        <p className="text-sm text-gray-600 mb-2">Current photo:</p>
                        <img
                          src={currentPhotoUrl}
                          alt="Current player photo"
                          className="w-32 h-32 object-cover rounded-lg border border-gray-300"
                        />
                      </div>
                    )}
                    <input
                      type="file"
                      id="photo"
                      name="photo"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    {photoPreview && (
                      <div className="mt-4">
                        <p className="text-sm text-gray-600 mb-2">New photo preview:</p>
                        <img
                          src={photoPreview}
                          alt="Photo preview"
                          className="w-32 h-32 object-cover rounded-lg border border-gray-300"
                        />
                      </div>
                    )}
                    <p className="text-sm text-gray-500">
                      Accepted formats: JPG, PNG, GIF. Maximum size: 5MB
                    </p>
                  </div>
                </div>

                {/* Contact Information */}
                <div className="md:col-span-2">
                  <h3 className="text-lg font-medium text-gray-900 mb-4 mt-6">Contact Information</h3>
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                    Phone
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    readOnly={isPlayerEditingOwnProfile}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                      isPlayerEditingOwnProfile ? 'bg-gray-100 cursor-not-allowed' : ''
                    }`}
                  />
                </div>

                <div>
                  <label htmlFor="skate_australia_number" className="block text-sm font-medium text-gray-700 mb-2">
                    Skate Australia Number
                  </label>
                  <input
                    type="text"
                    id="skate_australia_number"
                    name="skate_australia_number"
                    value={formData.skate_australia_number}
                    onChange={handleChange}
                    placeholder="Optional - max 6 digits"
                    maxLength="6"
                    pattern="[0-9]*"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Optional: Enter the player's Skate Australia registration number (max 6 digits)</p>
                </div>

                {/* Emergency Contact */}
                <div className="md:col-span-2">
                  <h3 className="text-lg font-medium text-gray-900 mb-4 mt-6">Emergency Contact</h3>
                </div>

                <div>
                  <label htmlFor="emergency_contact" className="block text-sm font-medium text-gray-700 mb-2">
                    Emergency Contact Name
                  </label>
                  <input
                    type="text"
                    id="emergency_contact"
                    name="emergency_contact"
                    value={formData.emergency_contact}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label htmlFor="emergency_phone" className="block text-sm font-medium text-gray-700 mb-2">
                    Emergency Contact Phone
                  </label>
                  <input
                    type="tel"
                    id="emergency_phone"
                    name="emergency_phone"
                    value={formData.emergency_phone}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                {/* Notes - Hidden for players editing their own profile */}
                {!isPlayerEditingOwnProfile && (
                  <div className="md:col-span-2">
                    <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                      Notes
                    </label>
                    <textarea
                      id="notes"
                      name="notes"
                      rows="4"
                      value={formData.notes}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Any additional notes about the player..."
                    />
                  </div>
                )}
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-end space-y-3 sm:space-y-0 sm:space-x-4 mt-8">
                <button
                  type="button"
                  onClick={() => navigate(orgId ? `/organisations/${orgId}/players` : '/players')}
                  className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full sm:w-auto px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  )
}

export default EditPlayer 