import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../src/lib/supabase'
import { useAuth } from '../src/contexts/AuthContext'

const AddDrill = () => {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const { user } = useAuth()
  const params = useParams()
  const navigate = useNavigate()
  const { orgId } = params

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
    'skating', 'Warm down', 'Warm up'
  ]

  // State for image upload
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState('')

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
      setSaving(true)
      
      // Upload image if selected
      let imageUrl = null
      if (imageFile) {
        imageUrl = await uploadImage()
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

      // Navigate back to drills list
      if (orgId) {
        navigate(`/organisations/${orgId}/drills`)
      } else {
        navigate('/drills')
      }
    } catch (err) {
      setError('Failed to add drill')
      console.error('Error saving drill:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    // Navigate back to drills list
    if (orgId) {
      navigate(`/organisations/${orgId}/drills`)
    } else {
      navigate('/drills')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={handleCancel}
                    className="text-gray-600 hover:text-gray-800 font-medium"
                  >
                    ← Back to Drills
                  </button>
                  <h1 className="text-2xl font-bold text-gray-900">Add New Drill</h1>
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

            <div className="px-6 py-4">
              <form onSubmit={handleSubmit} className="space-y-6">
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

                <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? 'Saving...' : 'Add Drill'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AddDrill 