import { useState, useEffect } from 'react'
import { useNavigate, Link, useParams } from 'react-router-dom'
import { supabase } from '../src/lib/supabase'
import { useAuth } from '../src/contexts/AuthContext'
import { sendInvitationEmail } from '../src/lib/email'

const AddPlayer = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const params = useParams()
  const orgId = params.orgId // Get organization ID from route params
  const [searchParams] = useState(() => new URLSearchParams(window.location.search))
  const clubId = searchParams.get('club_id') // Get club_id from query parameter
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [clubs, setClubs] = useState([])
  const [loadingClubs, setLoadingClubs] = useState(true)
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [sendInvitation, setSendInvitation] = useState(false)
  const [sendingInvitation, setSendingInvitation] = useState(false)
  
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    birthdate: '',
    accreditations: [],
    jersey_number: '',
    hand: '',
    club_id: clubId || '', // Pre-fill with club_id if provided
    phone: '',
    email: '',
    skate_australia_number: '',
    emergency_contact: '',
    emergency_phone: '',
    notes: ''
  })

  const availableAccreditations = ['skater', 'goalie', 'coach', 'referee']

  useEffect(() => {
    fetchClubs()
  }, [])

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
    setLoading(true)
    setError('')
    setSuccess('')

    // Validate accreditations
    if (formData.accreditations.length === 0) {
      setError('Please select at least one accreditation')
      setLoading(false)
      return
    }

    // Validate email if sending invitation
    if (sendInvitation && !formData.email) {
      setError('Email is required to send an invitation')
      setLoading(false)
      return
    }

    try {
      let photoUrl = null
      if (photoFile) {
        photoUrl = await uploadPhoto()
      }

      // Prepare player data
      const playerDataToInsert = {
        ...formData,
        birthdate: formData.birthdate || null,
        jersey_number: formData.jersey_number ? parseInt(formData.jersey_number) : null,
        hand: formData.hand || null,
        club_id: formData.club_id || null,
        photo_url: photoUrl
      }

      // If we're in an organization context, set organization_id
      if (orgId) {
        playerDataToInsert.organization_id = orgId
        // Don't set coach_id in organization context
      } else {
        // Otherwise, set coach_id (single tenant)
        playerDataToInsert.coach_id = user.id
      }

      // Insert player
      const { data: playerData, error } = await supabase
        .from('players')
        .insert([playerDataToInsert])
        .select()
        .single()

      if (error) throw error

      // Send invitation if requested
      if (sendInvitation && formData.email) {
        setSendingInvitation(true)
        try {
          // Generate invitation token
          const { data: tokenData } = await supabase.rpc('generate_invitation_token')
          const token = tokenData || crypto.randomUUID()

          // Create invitation record
          const { error: invitationError } = await supabase
            .from('invitations')
            .insert({
              email: formData.email,
              token: token,
              player_id: playerData.id,
              invited_by: user.id,
              expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
            })

          if (invitationError) throw invitationError

          // Send invitation email
          await sendInvitationEmail(
            formData.email,
            token,
            `${formData.first_name} ${formData.last_name}`,
            user.email
          )

          setSuccess('Player added successfully and invitation sent!')
        } catch (invitationErr) {
          console.error('Error sending invitation:', invitationErr)
          setError('Player added but failed to send invitation. Please try again.')
        } finally {
          setSendingInvitation(false)
        }
      } else {
        setSuccess('Player added successfully!')
      }

      // Navigate after a short delay to show success message
      setTimeout(() => {
        if (clubId) {
          // If we came from a club page, redirect back to that club
          if (orgId) {
            navigate(`/organisations/${orgId}/clubs/${clubId}`)
          } else {
            navigate(`/clubs/${clubId}`)
          }
        } else if (orgId) {
          navigate(`/organisations/${orgId}/players`)
        } else {
          navigate('/players')
        }
      }, 2000)
    } catch (err) {
      setError(err.message || 'Failed to add player')
      console.error('Error adding player:', err)
    } finally {
      setLoading(false)
    }
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
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Add Player</h1>
                </div>
                <button
                  onClick={() => {
                    if (clubId) {
                      // If we came from a club page, go back to that club
                      if (orgId) {
                        navigate(`/organisations/${orgId}/clubs/${clubId}`)
                      } else {
                        navigate(`/clubs/${clubId}`)
                      }
                    } else {
                      navigate(orgId ? `/organisations/${orgId}/players` : '/players')
                    }
                  }}
                  className="text-gray-600 hover:text-gray-800 font-medium text-sm sm:text-base"
                >
                  ← Back to {clubId ? 'Club' : 'Players'}
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

            {success && (
              <div className="px-4 sm:px-6 py-4">
                <div className="rounded-md bg-green-50 p-4">
                  <div className="text-sm text-green-700">{success}</div>
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700 capitalize">
                          {accreditation}
                        </span>
                      </label>
                    ))}
                  </div>
                  {formData.accreditations.length === 0 && (
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
                      <option value="">No clubs found. Please create one first.</option>
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
                        <img
                          src={photoPreview}
                          alt="Photo preview"
                          className="w-32 h-32 object-cover rounded-lg border border-gray-300"
                        />
                        <p className="text-sm text-gray-500 mt-2">Photo preview</p>
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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

                {/* Notes */}
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

                {/* Invitation Section */}
                <div className="md:col-span-2">
                  <h3 className="text-lg font-medium text-gray-900 mb-4 mt-6">Account Invitation</h3>
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h4 className="text-sm font-medium text-blue-800">Send Account Invitation</h4>
                        <p className="text-sm text-blue-700 mt-1">
                          Check this box to send an invitation email to the player. They will be able to set up their own account and access the platform.
                        </p>
                        <div className="mt-3">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={sendInvitation}
                              onChange={(e) => setSendInvitation(e.target.checked)}
                              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                            />
                            <span className="ml-2 text-sm text-blue-800">
                              Send invitation email to {formData.email || 'player'}
                            </span>
                          </label>
                        </div>
                        {sendInvitation && !formData.email && (
                          <p className="text-sm text-red-600 mt-2">
                            Please enter an email address above to send an invitation.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
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
                  disabled={loading || (sendInvitation && sendingInvitation)}
                  className="w-full sm:w-auto px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Adding...' : sendingInvitation ? 'Sending Invitation...' : 'Add Player'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  )
}

export default AddPlayer 