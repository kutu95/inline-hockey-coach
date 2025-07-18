import { useState, useEffect } from 'react'
import { supabase } from '../src/lib/supabase'
import { useAuth } from '../src/contexts/AuthContext'
import { Link, useParams } from 'react-router-dom'
import OrganizationHeader from './OrganizationHeader'

const Clubs = () => {
  const [clubs, setClubs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingClub, setEditingClub] = useState(null)
  const [formData, setFormData] = useState({ 
    name: '',
    facebook_url: '',
    instagram_url: ''
  })
  const [saving, setSaving] = useState(false)
  const [logoFile, setLogoFile] = useState(null)
  const [logoPreview, setLogoPreview] = useState(null)
  const [currentLogoUrl, setCurrentLogoUrl] = useState('')
  const { user } = useAuth()
  const params = useParams()
  const orgId = params.orgId // Get organization ID from route params

  useEffect(() => {
    fetchClubs()
  }, [])

  const fetchClubs = async () => {
    try {
      setLoading(true)
      let query = supabase
        .from('clubs')
        .select('*')
        .order('name', { ascending: true })

      // If we're in an organization context, filter by organization_id
      if (orgId) {
        query = query.eq('organization_id', orgId)
      } else {
        // Otherwise, filter by coach_id (single tenant)
        query = query.eq('coach_id', user.id)
      }

      const { data: clubsData, error } = await query

      if (error) throw error

      // Fetch player statistics for each club
      const clubsWithStats = await Promise.all(
        clubsData.map(async (club) => {
          let playersQuery = supabase
            .from('players')
            .select('accreditations')
            .eq('club_id', club.id)

          // If we're in an organization context, filter by organization_id
          if (orgId) {
            playersQuery = playersQuery.eq('organization_id', orgId)
          } else {
            // Otherwise, filter by coach_id (single tenant)
            playersQuery = playersQuery.eq('coach_id', user.id)
          }

          const { data: players, error: playersError } = await playersQuery

          if (playersError) {
            console.error('Error fetching players for club:', club.id, playersError)
            return {
              ...club,
              totalMembers: 0,
              totalPlayers: 0,
              totalCoaches: 0,
              totalReferees: 0,
              totalGoalies: 0
            }
          }

          const totalMembers = players.length
          const totalPlayers = players.filter(p => 
            p.accreditations && (p.accreditations.includes('skater') || p.accreditations.includes('goalie'))
          ).length
          const totalCoaches = players.filter(p => 
            p.accreditations && p.accreditations.includes('coach')
          ).length
          const totalReferees = players.filter(p => 
            p.accreditations && p.accreditations.includes('referee')
          ).length
          const totalGoalies = players.filter(p => 
            p.accreditations && p.accreditations.includes('goalie')
          ).length

          return {
            ...club,
            totalMembers,
            totalPlayers,
            totalCoaches,
            totalReferees,
            totalGoalies
          }
        })
      )

      setClubs(clubsWithStats || [])
    } catch (err) {
      setError('Failed to fetch clubs')
      console.error('Error fetching clubs:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      let logoUrl = currentLogoUrl
      if (logoFile) {
        logoUrl = await uploadLogo()
      }

      const clubData = {
        name: formData.name,
        logo_url: logoUrl,
        facebook_url: formData.facebook_url || null,
        instagram_url: formData.instagram_url || null
      }

      if (editingClub) {
        // Update existing club
        let query = supabase
          .from('clubs')
          .update(clubData)
          .eq('id', editingClub.id)

        // If we're in an organization context, ensure the club belongs to the organization
        if (orgId) {
          query = query.eq('organization_id', orgId)
        } else {
          // Otherwise, ensure the club belongs to the coach
          query = query.eq('coach_id', user.id)
        }

        const { error } = await query

        if (error) throw error
      } else {
        // Add new club
        const insertData = {
          ...clubData
        }

        // If we're in an organization context, set organization_id
        if (orgId) {
          insertData.organization_id = orgId
        } else {
          // Otherwise, set coach_id (single tenant)
          insertData.coach_id = user.id
        }

        const { error } = await supabase
          .from('clubs')
          .insert([insertData])

        if (error) throw error
      }

      // Reset form and refresh
      setFormData({ 
        name: '',
        facebook_url: '',
        instagram_url: ''
      })
      setEditingClub(null)
      setShowAddForm(false)
      fetchClubs()
    } catch (err) {
      setError('Failed to save club')
      console.error('Error saving club:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (club) => {
    setEditingClub(club)
    setFormData({ 
      name: club.name,
      facebook_url: club.facebook_url || '',
      instagram_url: club.instagram_url || ''
    })
    setCurrentLogoUrl(club.logo_url || '')
    setShowAddForm(true)
  }

  const handleDelete = async (clubId) => {
    if (!confirm('Are you sure you want to delete this club? Players in this club will have their club set to none.')) return

    try {
      let query = supabase
        .from('clubs')
        .delete()
        .eq('id', clubId)

      // If we're in an organization context, ensure the club belongs to the organization
      if (orgId) {
        query = query.eq('organization_id', orgId)
      } else {
        // Otherwise, ensure the club belongs to the coach
        query = query.eq('coach_id', user.id)
      }

      const { error } = await query

      if (error) throw error
      
      fetchClubs()
    } catch (err) {
      setError('Failed to delete club')
      console.error('Error deleting club:', err)
    }
  }

  const handleLogoChange = (e) => {
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

      setLogoFile(file)
      
      // Create preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setLogoPreview(e.target.result)
      }
      reader.readAsDataURL(file)
      setError('')
    }
  }

  const uploadLogo = async () => {
    if (!logoFile) return null

    try {
      const fileExt = logoFile.name.split('.').pop()
      const fileName = `${Date.now()}.${fileExt}`
      const filePath = `${user.id}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('club-logos')
        .upload(filePath, logoFile)

      if (uploadError) throw uploadError

      // Get signed URL instead of public URL
      const { data: { signedUrl } } = await supabase.storage
        .from('club-logos')
        .createSignedUrl(filePath, 60 * 60 * 24 * 365) // 1 year expiry

      return signedUrl
    } catch (err) {
      console.error('Error uploading logo:', err)
      throw new Error('Failed to upload logo')
    }
  }

  // Function to get signed URL for displaying images
  const getSignedUrl = async (url) => {
    if (!url) return null
    
    try {
      // Extract file path from the URL
      const urlParts = url.split('/')
      const filePath = urlParts.slice(-2).join('/') // Get user_id/filename
      
      const { data: { signedUrl } } = await supabase.storage
        .from('club-logos')
        .createSignedUrl(filePath, 60 * 60 * 24 * 7) // 7 days expiry
      
      return signedUrl
    } catch (err) {
      console.error('Error getting signed URL:', err)
      return url // Fallback to original URL
    }
  }

  // State for signed URLs
  const [signedUrls, setSignedUrls] = useState({})

  // Get signed URLs for all clubs with logos
  useEffect(() => {
    const getSignedUrls = async () => {
      const urls = {}
      for (const club of clubs) {
        if (club.logo_url) {
          urls[club.id] = await getSignedUrl(club.logo_url)
        }
      }
      setSignedUrls(urls)
    }
    
    if (clubs.length > 0) {
      getSignedUrls()
    }
  }, [clubs])

  const handleCancel = () => {
    setFormData({ 
      name: '',
      facebook_url: '',
      instagram_url: ''
    })
    setEditingClub(null)
    setShowAddForm(false)
    setLogoFile(null)
    setLogoPreview(null)
    setCurrentLogoUrl('')
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
      <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              {orgId ? (
                <OrganizationHeader title="Clubs" />
              ) : (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                  <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                    <Link
                      to="/dashboard"
                      className="text-gray-600 hover:text-gray-800 font-medium text-sm sm:text-base"
                    >
                      ← Back to Dashboard
                    </Link>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Clubs</h1>
                  </div>
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-md transition duration-150 ease-in-out"
                  >
                    Add Club
                  </button>
                </div>
              )}
              {orgId && (
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-md transition duration-150 ease-in-out"
                  >
                    Add Club
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

            {showAddForm && (
              <div className="mb-6 bg-gray-50 rounded-lg p-4 sm:p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {editingClub ? 'Edit Club' : 'Add New Club'}
                </h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="clubName" className="block text-sm font-medium text-gray-700 mb-2">
                        Club Name *
                      </label>
                      <input
                        type="text"
                        id="clubName"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="Enter club name"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="logo" className="block text-sm font-medium text-gray-700 mb-2">
                        Club Logo
                      </label>
                      <div className="space-y-4">
                        {currentLogoUrl && (
                          <div className="mb-4">
                            <p className="text-sm text-gray-600 mb-2">Current logo:</p>
                            <img
                              src={signedUrls[editingClub?.id] || currentLogoUrl}
                              alt="Current club logo"
                              className="w-20 h-20 sm:w-24 sm:h-24 object-contain border border-gray-300 rounded-lg"
                            />
                          </div>
                        )}
                        <input
                          type="file"
                          id="logo"
                          name="logo"
                          accept="image/*"
                          onChange={handleLogoChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                        {logoPreview && (
                          <div className="mt-4">
                            <p className="text-sm text-gray-600 mb-2">New logo preview:</p>
                            <img
                              src={logoPreview}
                              alt="Logo preview"
                              className="w-20 h-20 sm:w-24 sm:h-24 object-contain border border-gray-300 rounded-lg"
                            />
                          </div>
                        )}
                        <p className="text-sm text-gray-500">
                          Accepted formats: JPG, PNG, GIF. Maximum size: 5MB
                        </p>
                      </div>
                    </div>
                    
                    <div>
                      <label htmlFor="facebookUrl" className="block text-sm font-medium text-gray-700 mb-2">
                        Facebook URL
                      </label>
                      <input
                        type="url"
                        id="facebookUrl"
                        value={formData.facebook_url}
                        onChange={(e) => setFormData({ ...formData, facebook_url: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="https://facebook.com/yourpage"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="instagramUrl" className="block text-sm font-medium text-gray-700 mb-2">
                        Instagram URL
                      </label>
                      <input
                        type="url"
                        id="instagramUrl"
                        value={formData.instagram_url}
                        onChange={(e) => setFormData({ ...formData, instagram_url: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="https://instagram.com/yourprofile"
                      />
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row sm:justify-end space-y-3 sm:space-y-0 sm:space-x-4 mt-8">
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="w-full sm:w-auto px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      {saving ? 'Saving...' : editingClub ? 'Update Club' : 'Add Club'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="px-6 py-4">
              {clubs.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <div className="text-gray-500 text-lg mb-4">No clubs found</div>
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-md transition duration-150 ease-in-out"
                  >
                    Add Your First Club
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {clubs.map((club) => (
                    <div key={club.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 bg-gray-50 rounded-lg space-y-4 sm:space-y-0">
                      <div className="flex items-center space-x-4">
                        {club.logo_url ? (
                          <img
                            src={signedUrls[club.id] || club.logo_url}
                            alt={`${club.name} logo`}
                            className="w-16 h-16 object-contain border border-gray-300 rounded-lg bg-white"
                          />
                        ) : (
                          <div className="w-16 h-16 bg-gray-200 border border-gray-300 rounded-lg flex items-center justify-center">
                            <span className="text-gray-500 text-sm font-medium">
                              {club.name.charAt(0)}
                            </span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold text-gray-900">{club.name}</h3>
                          <div className="grid grid-cols-2 sm:flex sm:items-center sm:space-x-4 mt-2 text-xs text-gray-600 gap-2 sm:gap-0">
                            <span className="flex items-center">
                              <svg className="w-4 h-4 mr-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                              </svg>
                              {club.totalMembers} members
                            </span>
                            <span className="flex items-center">
                              <svg className="w-4 h-4 mr-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                              {club.totalPlayers} players
                            </span>
                            <span className="flex items-center">
                              <svg className="w-4 h-4 mr-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                              </svg>
                              {club.totalCoaches} coaches
                            </span>
                            <span className="flex items-center">
                              <svg className="w-4 h-4 mr-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                              </svg>
                              {club.totalGoalies} goalies
                            </span>
                            <span className="flex items-center">
                              <svg className="w-4 h-4 mr-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {club.totalReferees} referees
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                        <Link
                          to={orgId ? `/organisations/${orgId}/clubs/${club.id}` : `/clubs/${club.id}`}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium text-center sm:text-left"
                        >
                          View Details
                        </Link>
                        <button
                          onClick={() => handleEdit(club)}
                          className="text-green-600 hover:text-green-800 text-sm font-medium text-center sm:text-left"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(club.id)}
                          className="text-red-600 hover:text-red-800 text-sm font-medium text-center sm:text-left"
                        >
                          Delete
                        </button>
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

export default Clubs 