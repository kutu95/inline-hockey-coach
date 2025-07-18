import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../src/lib/supabase'
import { useAuth } from '../src/contexts/AuthContext'
import OrganizationHeader from './OrganizationHeader'

const Drills = () => {
  const [drills, setDrills] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingDrill, setEditingDrill] = useState(null)
  const { user } = useAuth()
  const params = useParams()
  const orgId = params.orgId // Get organization ID from route params

  const [formData, setFormData] = useState({
    title: '',
    short_description: '',
    description: '',
    min_players: 1,
    max_players: '',
    features: [],
    is_public: false,
    level: 'beginner'
  })

  const availableFeatures = [
    'agility', 'back-checking', 'break outs', 'defense', 'face-offs', 
    'fitness', 'fore-checking', 'fun', 'goalie', 'Offensive cycling', 
    'off-ice', 'passing', 'penalty kills', 'power plays', 'puck handling', 'shooting', 
    'Warm down', 'Warm up'
  ]

  // State for image upload
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState('')
  const [imageUrls, setImageUrls] = useState({})
  const [organizations, setOrganizations] = useState({})
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({
    playerCount: '',
    selectedFeatures: [], // Default to no features selected
    filterMode: 'all' // 'all' = AND logic, 'any' = OR logic
  })

  useEffect(() => {
    fetchDrills()
    fetchOrganizations()
  }, [])

  // Function to get signed URL for drill images
  const getSignedUrl = async (url) => {
    if (!url) return null
    
    try {
      // Extract file path from the URL
      const urlParts = url.split('/')
      const filePath = urlParts.slice(-2).join('/') // Get user_id/filename
      
      const { data: { signedUrl } } = await supabase.storage
        .from('drill-images')
        .createSignedUrl(filePath, 60 * 60 * 24 * 7) // 7 days expiry
      
      return signedUrl
    } catch (err) {
      console.error('Error getting signed URL:', err)
      return url // Fallback to original URL
    }
  }

  // Get signed URLs for all drill images
  useEffect(() => {
    const getSignedUrls = async () => {
      const urls = {}
      
      for (const drill of drills) {
        if (drill.image_url) {
          urls[drill.id] = await getSignedUrl(drill.image_url)
        }
      }
      
      setImageUrls(urls)
    }
    
    if (drills.length > 0) {
      getSignedUrls()
    }
  }, [drills])

  const fetchDrills = async () => {
    try {
      setLoading(true)
      let query = supabase
        .from('drills')
        .select('*')
        .order('title', { ascending: true })

      // If we're in an organization context, filter by organization_id
      if (orgId) {
        query = query.eq('organization_id', orgId)
      } else {
        // Otherwise, filter by created_by (single tenant)
        query = query.eq('created_by', user.id)
      }

      const { data, error } = await query

      if (error) throw error
      setDrills(data || [])
    } catch (err) {
      setError('Failed to fetch drills')
      console.error('Error fetching drills:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchOrganizations = async () => {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name')

      if (error) throw error
      
      // Create a map of organization id to name
      const orgMap = {}
      data?.forEach(org => {
        orgMap[org.id] = org.name
      })
      setOrganizations(orgMap)
    } catch (err) {
      console.error('Error fetching organizations:', err)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleFeatureChange = (feature) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.includes(feature)
        ? prev.features.filter(f => f !== feature)
        : [...prev.features, feature]
    }))
  }

  const handleFilterFeatureChange = (feature) => {
    setFilters(prev => ({
      ...prev,
      selectedFeatures: prev.selectedFeatures.includes(feature)
        ? prev.selectedFeatures.filter(f => f !== feature)
        : [...prev.selectedFeatures, feature]
    }))
  }

  const handlePlayerCountChange = (e) => {
    setFilters(prev => ({
      ...prev,
      playerCount: e.target.value
    }))
  }

  const handleFilterModeChange = () => {
    setFilters(prev => ({
      ...prev,
      filterMode: prev.filterMode === 'all' ? 'any' : 'all'
    }))
  }

  const clearFilters = () => {
    setFilters({
      playerCount: '',
      selectedFeatures: [], // Reset to no features selected
      filterMode: 'all' // Reset to default mode
    })
  }

  const selectAllFeatures = () => {
    setFilters(prev => ({
      ...prev,
      selectedFeatures: [...availableFeatures]
    }))
  }

  const deselectAllFeatures = () => {
    setFilters(prev => ({
      ...prev,
      selectedFeatures: []
    }))
  }

  const resetForm = () => {
    setFormData({
      title: '',
      short_description: '',
      description: '',
      min_players: 1,
      max_players: '',
      features: [],
      is_public: false,
      level: 'beginner'
    })
    setImageFile(null)
    setImagePreview('')
    setEditingDrill(null)
    setShowAddForm(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.title || !formData.min_players) {
      setError('Please fill in all required fields')
      return
    }

    if (formData.max_players && parseInt(formData.max_players) < parseInt(formData.min_players)) {
      setError('Maximum players must be greater than or equal to minimum players')
      return
    }

    try {
      // Upload image if selected
      let imageUrl = null
      if (imageFile) {
        imageUrl = await uploadImage()
      } else if (editingDrill && editingDrill.image_url) {
        // Keep existing image if no new image is selected
        imageUrl = editingDrill.image_url
      }

      const drillData = {
        title: formData.title.trim(),
        short_description: formData.short_description.trim() || null,
        description: formData.description.trim() || null,
        min_players: parseInt(formData.min_players),
        max_players: formData.max_players ? parseInt(formData.max_players) : null,
        features: formData.features,
        image_url: imageUrl,
        is_public: formData.is_public,
        level: formData.level
      }

      if (editingDrill) {
        let query = supabase
          .from('drills')
          .update(drillData)
          .eq('id', editingDrill.id)

        // If we're in an organization context, ensure the drill belongs to the organization
        if (orgId) {
          query = query.eq('organization_id', orgId)
        } else {
          // Otherwise, ensure the drill belongs to the user who created it
          query = query.eq('created_by', user.id)
        }

        const { error } = await query

        if (error) throw error
      } else {
        const insertData = {
          ...drillData
        }

        // If we're in an organization context, set organization_id
        if (orgId) {
          insertData.organization_id = orgId
        }
        // Always set created_by to track who created the drill
        insertData.created_by = user.id

        const { error } = await supabase
          .from('drills')
          .insert(insertData)

        if (error) throw error
      }

      resetForm()
      fetchDrills()
    } catch (err) {
      setError(editingDrill ? 'Failed to update drill' : 'Failed to add drill')
      console.error('Error saving drill:', err)
    }
  }

  const handleEdit = (drill) => {
    setEditingDrill(drill)
    setFormData({
      title: drill.title || '',
      short_description: drill.short_description || '',
      description: drill.description || '',
      min_players: drill.min_players || 1,
      max_players: drill.max_players || '',
      features: drill.features || [],
      is_public: drill.is_public || false,
      level: drill.level || 'beginner'
    })
    setImageFile(null)
    setImagePreview('')
    if (drill.image_url) {
      setImagePreview(imageUrls[drill.id] || drill.image_url)
    }
    setShowAddForm(true)
  }

  const handleDelete = async (drillId) => {
    if (!confirm('Are you sure you want to delete this drill?')) return

    try {
      let query = supabase
        .from('drills')
        .delete()
        .eq('id', drillId)

      // If we're in an organization context, ensure the drill belongs to the organization
      if (orgId) {
        query = query.eq('organization_id', orgId)
      } else {
        // Otherwise, ensure the drill belongs to the user who created it
        query = query.eq('created_by', user.id)
      }

      const { error } = await query

      if (error) throw error
      
      fetchDrills()
    } catch (err) {
      setError('Failed to delete drill')
      console.error('Error deleting drill:', err)
    }
  }

  const formatFeatures = (features) => {
    if (!features || features.length === 0) return 'None'
    return features.map(feature => 
      feature.charAt(0).toUpperCase() + feature.slice(1).replace('-', ' ')
    ).join(', ')
  }

  const formatPlayerCount = (min, max) => {
    if (max) {
      return `${min}-${max} players`
    }
    return `${min}+ players`
  }

  const getVisibilityText = (drill) => {
    if (drill.is_public) {
      return 'Public'
    } else {
      const orgName = organizations[drill.organization_id] || 'Unknown Organization'
      return `${orgName} only`
    }
  }

  const filterDrills = (drills) => {
    return drills.filter(drill => {
      // Filter by player count
      if (filters.playerCount) {
        const playerCount = parseInt(filters.playerCount)
        const minPlayers = drill.min_players || 1 // Default to 1 if no minimum
        const maxPlayers = drill.max_players // Can be null for unlimited
        
        // Check if player count is within range
        if (playerCount < minPlayers) {
          return false
        }
        
        // If there's a maximum, check it
        if (maxPlayers && playerCount > maxPlayers) {
          return false
        }
      }

      // Filter by features
      if (filters.selectedFeatures.length > 0) {
        const drillFeatures = drill.features || []
        
        if (filters.filterMode === 'all') {
          // AND logic: all selected features must be present
          const hasAllSelectedFeatures = filters.selectedFeatures.every(feature => 
            drillFeatures.includes(feature)
          )
          if (!hasAllSelectedFeatures) {
            return false
          }
        } else {
          // OR logic: any selected feature must be present
          const hasAnySelectedFeature = filters.selectedFeatures.some(feature => 
            drillFeatures.includes(feature)
          )
          if (!hasAnySelectedFeature) {
            return false
          }
        }
      }
      // If no features are selected, don't filter on features (show all drills)

      return true
    })
  }

  // Image upload functions
  const handleImageChange = (e) => {
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

      setImageFile(file)
      
      // Create preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target.result)
      }
      reader.readAsDataURL(file)
      setError('')
    }
  }

  const uploadImage = async () => {
    if (!imageFile) return null

    try {
      const fileExt = imageFile.name.split('.').pop()
      const fileName = `${Date.now()}.${fileExt}`
      const filePath = `${user.id}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('drill-images')
        .upload(filePath, imageFile)

      if (uploadError) throw uploadError

      // Get signed URL instead of public URL
      const { data: { signedUrl } } = await supabase.storage
        .from('drill-images')
        .createSignedUrl(filePath, 60 * 60 * 24 * 365) // 1 year expiry

      return signedUrl
    } catch (err) {
      console.error('Error uploading image:', err)
      throw new Error('Failed to upload image')
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
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              {orgId ? (
                <OrganizationHeader title="Drills" />
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Link
                      to="/dashboard"
                      className="text-gray-600 hover:text-gray-800 font-medium"
                    >
                      ← Back to Dashboard
                    </Link>
                    <h1 className="text-3xl font-bold text-gray-900">Drills</h1>
                  </div>
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-md transition duration-150 ease-in-out"
                  >
                    Add Drill
                  </button>
                </div>
              )}
              {orgId && (
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-md transition duration-150 ease-in-out"
                  >
                    Add Drill
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

            {/* Filter Panel */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Filters</h3>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                >
                  {showFilters ? 'Hide Filters' : 'Show Filters'}
                </button>
              </div>
              
              {showFilters && (
                <div className="space-y-4">
                  {/* Player Count Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Number of Players
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={filters.playerCount}
                      onChange={handlePlayerCountChange}
                      placeholder="Enter number of players"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Only show drills that can accommodate this number of players
                    </p>
                  </div>

                  {/* Features Filter */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <label className="block text-sm font-medium text-gray-700">
                          Drill Features
                        </label>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-500">Mode:</span>
                          <button
                            type="button"
                            onClick={handleFilterModeChange}
                            className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${
                              filters.filterMode === 'all'
                                ? 'bg-indigo-100 text-indigo-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {filters.filterMode === 'all' ? 'ALL' : 'ANY'}
                          </button>
                          <span className="text-xs text-gray-500">
                            {filters.filterMode === 'all' ? '(must have all selected)' : '(must have any selected)'}
                          </span>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          type="button"
                          onClick={selectAllFeatures}
                          className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                        >
                          Select All
                        </button>
                        <button
                          type="button"
                          onClick={deselectAllFeatures}
                          className="text-xs text-gray-600 hover:text-gray-800 font-medium"
                        >
                          Deselect All
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                      {availableFeatures.map(feature => (
                        <label key={feature} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={filters.selectedFeatures.includes(feature)}
                            onChange={() => handleFilterFeatureChange(feature)}
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                          />
                          <span className="text-sm text-gray-700 capitalize">
                            {feature.replace('-', ' ')}
                          </span>
                        </label>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {filters.selectedFeatures.length === 0 
                        ? 'No features selected - showing all drills' 
                        : `${filters.selectedFeatures.length} of ${availableFeatures.length} features selected`
                      }
                    </p>
                  </div>

                  {/* Clear Filters Button */}
                  <div className="flex justify-end">
                    <button
                      onClick={clearFilters}
                      className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      Clear All Filters
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4">
              {/* Add/Edit Form */}
              {showAddForm && (
                <div className="mb-6 bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    {editingDrill ? 'Edit Drill' : 'Add New Drill'}
                  </h3>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                          Drill Title *
                        </label>
                        <input
                          type="text"
                          id="title"
                          name="title"
                          required
                          value={formData.title}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          placeholder="e.g., 3-on-3 Forechecking"
                        />
                      </div>

                      <div>
                        <label htmlFor="short_description" className="block text-sm font-medium text-gray-700 mb-2">
                          Short Description
                        </label>
                        <input
                          type="text"
                          id="short_description"
                          name="short_description"
                          value={formData.short_description}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          placeholder="Brief description of the drill"
                        />
                      </div>

                      <div>
                        <label htmlFor="min_players" className="block text-sm font-medium text-gray-700 mb-2">
                          Minimum Players *
                        </label>
                        <input
                          type="number"
                          id="min_players"
                          name="min_players"
                          required
                          min="1"
                          value={formData.min_players}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <label htmlFor="max_players" className="block text-sm font-medium text-gray-700 mb-2">
                          Maximum Players
                        </label>
                        <input
                          type="number"
                          id="max_players"
                          name="max_players"
                          min="1"
                          value={formData.max_players}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          placeholder="Leave empty for unlimited"
                        />
                      </div>

                      <div>
                        <label htmlFor="level" className="block text-sm font-medium text-gray-700 mb-2">
                          Difficulty Level
                        </label>
                        <select
                          id="level"
                          name="level"
                          value={formData.level}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        >
                          <option value="beginner">Beginner</option>
                          <option value="intermediate">Intermediate</option>
                          <option value="advanced">Advanced</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                        Detailed Description
                      </label>
                      <textarea
                        id="description"
                        name="description"
                        rows="6"
                        value={formData.description}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="Detailed instructions, setup, and execution of the drill..."
                      />
                    </div>

                    <div>
                      <label htmlFor="image" className="block text-sm font-medium text-gray-700 mb-2">
                        Drill Image
                      </label>
                      <input
                        type="file"
                        id="image"
                        name="image"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                      {imagePreview && (
                        <div className="mt-2">
                          <img
                            src={imagePreview}
                            alt="Preview"
                            className="w-32 h-32 object-cover rounded-md border border-gray-300"
                          />
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Drill Features
                      </label>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                        {availableFeatures.map(feature => (
                          <label key={feature} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={formData.features.includes(feature)}
                              onChange={() => handleFeatureChange(feature)}
                              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                            />
                            <span className="text-sm text-gray-700 capitalize">
                              {feature.replace('-', ' ')}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Visibility
                      </label>
                      <div className="flex items-center space-x-4">
                        <label className="flex items-center space-x-2">
                          <input
                            type="radio"
                            name="is_public"
                            value="false"
                            checked={!formData.is_public}
                            onChange={() => setFormData(prev => ({ ...prev, is_public: false }))}
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                          />
                          <span className="text-sm text-gray-700">
                            Private (Organization only)
                          </span>
                        </label>
                        <label className="flex items-center space-x-2">
                          <input
                            type="radio"
                            name="is_public"
                            value="true"
                            checked={formData.is_public}
                            onChange={() => setFormData(prev => ({ ...prev, is_public: true }))}
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                          />
                          <span className="text-sm text-gray-700">
                            Public (Visible to all organizations)
                          </span>
                        </label>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Public drills can be viewed by users from other organizations
                      </p>
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
                        {editingDrill ? 'Update Drill' : 'Add Drill'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Drills List */}
              {(() => {
                const filteredDrills = filterDrills(drills)
                return filteredDrills.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-gray-500 text-lg mb-4">
                      {drills.length === 0 ? 'No drills created yet' : 'No drills match your filters'}
                    </div>
                    <p className="text-gray-400">
                      {drills.length === 0 ? 'Create your first drill to get started' : 'Try adjusting your filters'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredDrills.map((drill) => (
                      <div key={drill.id} className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200">
                        <div className="p-6">
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between space-y-4 sm:space-y-0">
                            <div className="flex-1">
                              <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3 space-y-2 sm:space-y-0 mb-2">
                                <h3 className="text-xl font-semibold text-gray-900">{drill.title}</h3>
                                <div className="flex flex-wrap gap-2">
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    {formatPlayerCount(drill.min_players, drill.max_players)}
                                  </span>
                                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                    drill.is_public 
                                      ? 'bg-green-100 text-green-800' 
                                      : 'bg-gray-100 text-gray-800'
                                  }`}>
                                    {getVisibilityText(drill)}
                                  </span>
                                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                    drill.level === 'beginner' 
                                      ? 'bg-green-100 text-green-800'
                                      : drill.level === 'intermediate'
                                      ? 'bg-yellow-100 text-yellow-800'
                                      : 'bg-red-100 text-red-800'
                                  }`}>
                                    {drill.level ? drill.level.charAt(0).toUpperCase() + drill.level.slice(1) : 'Beginner'}
                                  </span>
                                </div>
                              </div>
                              
                              {drill.short_description && (
                                <p className="text-gray-600 mb-3">{drill.short_description}</p>
                              )}
                              
                              {drill.image_url && (
                                <div className="mb-3">
                                  <img
                                    src={imageUrls[drill.id] || drill.image_url}
                                    alt={`${drill.title} drill`}
                                    className="w-32 h-32 object-cover rounded-md border border-gray-300"
                                  />
                                </div>
                              )}
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                                <div>
                                  <span className="font-medium">Features:</span> {formatFeatures(drill.features)}
                                </div>
                                <div>
                                  <span className="font-medium">Level:</span> {drill.level ? drill.level.charAt(0).toUpperCase() + drill.level.slice(1) : 'Beginner'}
                                </div>
                                {drill.created_by && (
                                  <div>
                                    <span className="font-medium">Created by:</span> {drill.created_by === user.id ? 'You' : 'Another user'}
                                  </div>
                                )}
                                {drill.description && (
                                  <div className="md:col-span-2">
                                    <span className="font-medium">Description:</span>
                                    <div className="mt-1 text-gray-600 whitespace-pre-wrap">
                                      {drill.description}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 sm:ml-4">
                              <button
                                onClick={() => handleEdit(drill)}
                                className="text-green-600 hover:text-green-800 text-sm font-medium text-center sm:text-left"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDelete(drill.id)}
                                className="text-red-600 hover:text-red-800 text-sm font-medium text-center sm:text-left"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Drills 