import React, { useState, useEffect } from 'react'
import { supabase } from '../src/lib/supabase'
import { useAuth } from '../src/contexts/AuthContext'
import { Link } from 'react-router-dom'

const Organisations = () => {
  const [organisations, setOrganisations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingOrg, setEditingOrg] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [logoPreview, setLogoPreview] = useState(null)
  const [playerProfile, setPlayerProfile] = useState(null)
  const [playerPhotoUrl, setPlayerPhotoUrl] = useState(null)
  const { hasRole, userRoles, signOut, user } = useAuth()

  // Function to get signed URL for player photo
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
      
      if (existsError) return null
      
      const fileName = filePath.split('/')[1]
      const fileExists = existsData?.some(file => file.name === fileName)
      
      if (!fileExists) return null
      
      const { data, error } = await supabase.storage
        .from('player-photos')
        .createSignedUrl(filePath, 60 * 60 * 24 * 7)
      
      if (error) return null
      
      return data?.signedUrl || null
    } catch (err) {
      return null
    }
  }

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

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    logo_url: '',
    facebook_url: '',
    instagram_url: '',
    website_url: ''
  })

  const fetchOrganisations = async () => {
    try {
      setLoading(true)
      setError('')
      
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .order('name')

      if (error) {
        console.error('Error fetching organisations:', error)
        setError('Failed to fetch organisations: ' + error.message)
        return
      }
      
      setOrganisations(data || [])
    } catch (err) {
      console.error('Error fetching organisations:', err)
      setError('Failed to fetch organisations: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrganisations()
    fetchPlayerProfile()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    console.log('Form submitted, editingOrg:', editingOrg)
    console.log('Current user roles:', userRoles)
    console.log('Form data:', formData)
    
    try {
      setError('')
      
      if (editingOrg) {
        // Update existing organisation
        console.log('Updating organisation:', editingOrg.id, 'with data:', formData)
        const { data, error } = await supabase
          .from('organizations')
          .update(formData)
          .eq('id', editingOrg.id)
          .select()

        console.log('Update result:', { data, error })
        if (error) throw error
        
        console.log('Update successful, clearing editingOrg')
        setEditingOrg(null)
      } else {
        // Create new organisation
        console.log('Creating organisation with data:', formData)
        const { data, error } = await supabase
          .from('organizations')
          .insert([formData])
          .select()

        console.log('Create result:', { data, error })
        if (error) throw error
      }

      console.log('Operation successful, resetting form')
      setFormData({
        name: '',
        description: '',
        logo_url: '',
        facebook_url: '',
        instagram_url: '',
        website_url: ''
      })
      setShowCreateForm(false)
      console.log('About to fetch organisations after update...')
      await fetchOrganisations()
      console.log('Fetch organisations completed')
    } catch (err) {
      console.error('Error in handleSubmit:', err)
      setError('Failed to save organisation: ' + err.message)
    }
  }

  const handleFileUpload = async (file) => {
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB')
      return
    }

    try {
      setUploading(true)
      setError('')

      // Create a unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `organisation-logos/${fileName}`

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('organisation-logos')
        .upload(filePath, file)

      if (error) throw error

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('organisation-logos')
        .getPublicUrl(filePath)

      // Update form data with the uploaded URL
      setFormData({ ...formData, logo_url: publicUrl })
      
      // Create preview
      const reader = new FileReader()
      reader.onload = (e) => setLogoPreview(e.target.result)
      reader.readAsDataURL(file)

    } catch (err) {
      console.error('Error uploading file:', err)
      setError('Failed to upload logo: ' + err.message)
    } finally {
      setUploading(false)
    }
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      handleFileUpload(file)
    }
  }

  const removeLogo = () => {
    setFormData({ ...formData, logo_url: '' })
    setLogoPreview(null)
  }

  const handleEdit = (org) => {
    setEditingOrg(org)
    setFormData({
      name: org.name,
      description: org.description || '',
      logo_url: org.logo_url || '',
      facebook_url: org.facebook_url || '',
      instagram_url: org.instagram_url || '',
      website_url: org.website_url || ''
    })
    setLogoPreview(org.logo_url || null)
    setShowCreateForm(true)
  }

  const handleDelete = async (orgId) => {
    if (!confirm('Are you sure you want to delete this organisation? This will also delete all associated data.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('organizations')
        .delete()
        .eq('id', orgId)

      if (error) throw error
      fetchOrganisations()
    } catch (err) {
      setError('Failed to delete organisation: ' + err.message)
    }
  }

  const handleCancel = () => {
    setShowCreateForm(false)
    setEditingOrg(null)
    setFormData({
      name: '',
      description: '',
      logo_url: '',
      facebook_url: '',
      instagram_url: '',
      website_url: ''
    })
    setLogoPreview(null)
  }

  // Check if user is superadmin
  if (!hasRole('superadmin')) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="bg-white shadow rounded-lg p-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
                <p className="text-gray-600 mb-6">You need superadmin privileges to access this page.</p>
                <Link
                  to="/dashboard"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-md transition duration-150 ease-in-out"
                >
                  Back to Dashboard
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
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
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                  <Link
                    to="/dashboard"
                    className="text-gray-600 hover:text-gray-800 font-medium text-sm sm:text-base"
                  >
                    ← Back to Dashboard
                  </Link>
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Organisations</h1>
                    <p className="text-gray-600 mt-1 text-sm sm:text-base">Manage hockey organisations</p>
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end space-x-3">
                  <button
                    onClick={() => setShowCreateForm(true)}
                    className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-md transition duration-150 ease-in-out text-sm sm:text-base"
                  >
                    Add Organisation
                  </button>
                  <div className="flex flex-col items-end space-y-2">
                    {playerProfile && (
                      <Link
                        to={`/organisations/${playerProfile.organization_id}/players/${playerProfile.id}`}
                        className="hover:opacity-80 transition-opacity flex-shrink-0"
                      >
                        {playerProfile.photo_url ? (
                          <img
                            src={playerPhotoUrl || playerProfile.photo_url}
                            alt={`${playerProfile.first_name} ${playerProfile.last_name}`}
                            className="w-10 h-10 object-cover rounded-full border border-gray-300"
                            onError={(e) => {
                              e.target.style.display = 'none'
                              e.target.nextSibling.style.display = 'flex'
                            }}
                            onLoad={(e) => {
                              e.target.nextSibling.style.display = 'none'
                            }}
                          />
                        ) : (
                          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center" style={{ display: playerProfile.photo_url ? 'none' : 'flex' }}>
                            <span className="text-gray-500 text-sm font-medium">
                              {playerProfile.first_name?.charAt(0)}{playerProfile.last_name?.charAt(0)}
                            </span>
                          </div>
                        )}
                      </Link>
                    )}
                    <button
                      onClick={handleSignOut}
                      className="text-red-600 hover:text-red-800 text-sm font-medium transition duration-150 ease-in-out"
                    >
                      Sign out
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <div className="px-6 py-4">
                <div className="rounded-md bg-red-50 p-4">
                  <div className="text-sm text-red-700">{error}</div>
                </div>
              </div>
            )}

            {showCreateForm && (
              <div className="px-6 py-4 border-b border-gray-200">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {editingOrg ? 'Edit Organisation' : 'Create New Organisation'}
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Name *</label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="e.g., WA Inline Hockey"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Logo</label>
                      <div className="mt-1 space-y-3">
                        {/* File Upload Input */}
                        <div className="flex items-center space-x-3">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                            disabled={uploading}
                          />
                          {uploading && (
                            <div className="flex items-center">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
                              <span className="ml-2 text-sm text-gray-500">Uploading...</span>
                            </div>
                          )}
                        </div>

                        {/* Logo Preview */}
                        {(logoPreview || formData.logo_url) && (
                          <div className="relative inline-block">
                            <img
                              src={logoPreview || formData.logo_url}
                              alt="Logo preview"
                              className="w-20 h-20 object-contain border border-gray-300 rounded-md"
                              onError={(e) => {
                                e.target.style.display = 'none'
                              }}
                            />
                            <button
                              type="button"
                              onClick={removeLogo}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                            >
                              ×
                            </button>
                          </div>
                        )}

                        {/* URL Input as fallback */}
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Or enter logo URL:</label>
                          <input
                            type="url"
                            value={formData.logo_url}
                            onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                            className="block w-full text-xs border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="https://example.com/logo.png"
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">Description</label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={3}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="Enter organisation description..."
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Facebook URL</label>
                      <input
                        type="url"
                        value={formData.facebook_url}
                        onChange={(e) => setFormData({ ...formData, facebook_url: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="https://facebook.com/yourpage"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Instagram URL</label>
                      <input
                        type="url"
                        value={formData.instagram_url}
                        onChange={(e) => setFormData({ ...formData, instagram_url: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="https://instagram.com/yourprofile"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Website URL</label>
                      <input
                        type="url"
                        value={formData.website_url}
                        onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="https://yourwebsite.com"
                      />
                    </div>
                  </div>
                  
                  <div className="flex space-x-3">
                    <button
                      type="submit"
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-md transition duration-150 ease-in-out"
                    >
                      {editingOrg ? 'Update Organisation' : 'Create Organisation'}
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
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Organisation
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {organisations.map((org) => (
                      <tr key={org.id}>
                        <td className="px-6 py-4 whitespace-nowrap" colSpan={3} style={{ padding: 0 }}>
                          <Link
                            to={`/organisations/${org.id}`}
                            className="flex items-center w-full h-full group hover:bg-indigo-50 transition rounded"
                            style={{ display: 'block', width: '100%', height: '100%', textDecoration: 'none' }}
                          >
                            <div className="flex items-center px-6 py-4 w-full">
                              {org.logo_url && (
                                <img
                                  src={org.logo_url}
                                  alt={`${org.name} logo`}
                                  className="w-8 h-8 object-contain mr-3"
                                  onError={(e) => {
                                    e.target.style.display = 'none'
                                  }}
                                />
                              )}
                              <div>
                                <div className="text-sm font-medium text-gray-900 group-hover:text-indigo-700">{org.name}</div>
                                <div className="text-sm text-gray-500 max-w-xs truncate group-hover:text-indigo-700">
                                  {org.description || 'No description'}
                                </div>
                                <div className="text-xs text-gray-400 group-hover:text-indigo-700">
                                  {new Date(org.created_at).toLocaleDateString()}
                                </div>
                              </div>
                            </div>
                          </Link>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <Link
                            to={`/organisations/${org.id}`}
                            className="text-blue-600 hover:text-blue-900 mr-3"
                          >
                            View Details
                          </Link>
                          <button
                            onClick={() => handleEdit(org)}
                            className="text-indigo-600 hover:text-indigo-900 mr-3"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(org.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {organisations.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-500">No organisations found.</p>
                  <p className="text-gray-400 text-sm mt-2">Create your first organisation to get started.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Organisations 