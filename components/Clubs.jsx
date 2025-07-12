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
  const [formData, setFormData] = useState({ name: '' })
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

      const { data, error } = await query

      if (error) throw error
      setClubs(data || [])
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
        logo_url: logoUrl
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
      setFormData({ name: '' })
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
    setFormData({ name: club.name })
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
    setFormData({ name: '' })
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
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Link
                      to="/dashboard"
                      className="text-gray-600 hover:text-gray-800 font-medium"
                    >
                      ← Back to Dashboard
                    </Link>
                    <h1 className="text-3xl font-bold text-gray-900">Clubs</h1>
                  </div>
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-md transition duration-150 ease-in-out"
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
              <div className="px-6 py-4 border-b border-gray-200">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="clubName" className="block text-sm font-medium text-gray-700 mb-2">
                      Club Name *
                    </label>
                    <input
                      type="text"
                      id="clubName"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ name: e.target.value })}
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
                            className="w-24 h-24 object-contain border border-gray-300 rounded-lg"
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
                            className="w-24 h-24 object-contain border border-gray-300 rounded-lg"
                          />
                        </div>
                      )}
                      <p className="text-sm text-gray-500">
                        Accepted formats: JPG, PNG, GIF. Maximum size: 5MB
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex space-x-3">
                    <button
                      type="submit"
                      disabled={saving}
                      className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-md transition duration-150 ease-in-out disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : editingClub ? 'Update Club' : 'Add Club'}
                    </button>
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="bg-gray-300 hover:bg-gray-400 text-gray-700 font-medium py-2 px-4 rounded-md transition duration-150 ease-in-out"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="px-6 py-4">
              {clubs.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-500 text-lg mb-4">No clubs found</div>
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-md transition duration-150 ease-in-out"
                  >
                    Add Your First Club
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {clubs.map((club) => (
                    <div key={club.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
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
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{club.name}</h3>
                          <p className="text-sm text-gray-500">Created {new Date(club.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(club)}
                          className="text-green-600 hover:text-green-800 text-sm font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(club.id)}
                          className="text-red-600 hover:text-red-800 text-sm font-medium"
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