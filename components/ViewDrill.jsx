import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../src/lib/supabase'
import { useAuth } from '../src/contexts/AuthContext'
import MediaAttachments from './MediaAttachments'
import OrganizationHeader from './OrganizationHeader'

const ViewDrill = () => {
  const [drill, setDrill] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [imageUrl, setImageUrl] = useState(null)
  const { user, hasRole, userRoles } = useAuth()
  const { id, orgId } = useParams()

  useEffect(() => {
    fetchDrill()
  }, [id])

  const fetchDrill = async () => {
    try {
      setLoading(true)
      
      let query = supabase
        .from('drills')
        .select('*')
        .eq('id', id)

      // If we're in an organization context, also filter by organization_id
      if (orgId && orgId !== 'undefined') {
        query = query.eq('organization_id', orgId)
      }

      const { data, error } = await query.single()

      if (error) throw error
      
      setDrill(data)
      
      // Get signed URL for drill image if it exists
      if (data.image_url) {
        const signedUrl = await getSignedUrl(data.image_url)
        setImageUrl(signedUrl)
      }
      
    } catch (err) {
      console.error('Error fetching drill:', err)
      setError('Failed to fetch drill details')
    } finally {
      setLoading(false)
    }
  }

  const getSignedUrl = async (url) => {
    if (!url) return null
    
    try {
      const urlParts = url.split('/')
      const filePath = urlParts.slice(-2).join('/')
      
      const { data: { signedUrl } } = await supabase.storage
        .from('drill-images')
        .createSignedUrl(filePath, 60 * 60 * 24 * 7)
      
      return signedUrl
    } catch (err) {
      console.error('Error getting signed URL:', err)
      return url
    }
  }

  const formatFeatures = (features) => {
    if (!features || features.length === 0) return 'None'
    return features.map(feature => 
      feature.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())
    ).join(', ')
  }

  const formatPlayerCount = (min, max) => {
    if (!min) return 'No minimum'
    if (min === max) return `${min} players`
    if (!max) return `${min} up players`
    return `${min}-${max} players`
  }

  const getVisibilityText = (drill) => {
    return drill.is_public ? 'Public' : 'Private'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (error || !drill) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Drill Not Found</h1>
          <p className="text-gray-600 mb-4">{error || 'The requested drill could not be found.'}</p>
          <Link
            to={orgId ? `/organisations/${orgId}/drills` : "/drills"}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-md transition duration-150 ease-in-out"
          >
            Back to Drills
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {orgId && <OrganizationHeader />}
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Link
                  to={orgId ? `/organisations/${orgId}/drills` : "/drills"}
                  className="text-gray-600 hover:text-gray-800 font-medium"
                >
                  ← Back to Drills
                </Link>
                <h1 className="text-3xl font-bold text-gray-900">{drill.title}</h1>
              </div>
              
                             {(hasRole('admin') || hasRole('superadmin') || hasRole('coach')) && (
                 <div className="flex space-x-2">
                   <Link
                     to={orgId ? `/organisations/${orgId}/drills/${drill.id}/edit` : `/drills/${drill.id}/edit`}
                     className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-md transition duration-150 ease-in-out"
                   >
                     Edit Drill
                   </Link>
                   <Link
                     to={orgId ? `/organisations/${orgId}/drill-designer/${drill.id}?from=drill-details` : "#"}
                     className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-md transition duration-150 ease-in-out"
                   >
                     Edit Animation
                   </Link>
                 </div>
               )}
            </div>
          </div>

          {/* Drill Details */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="p-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                      {formatPlayerCount(drill.min_players, drill.max_players)}
                    </span>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      drill.is_public 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {getVisibilityText(drill)}
                    </span>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      drill.level === 'beginner' 
                        ? 'bg-green-100 text-green-800'
                        : drill.level === 'intermediate'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {drill.level ? drill.level.charAt(0).toUpperCase() + drill.level.slice(1) : 'Beginner'}
                    </span>
                  </div>

                  {drill.short_description && (
                    <p className="text-lg text-gray-700 mb-4">{drill.short_description}</p>
                  )}

                  {drill.description && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Description</h3>
                      <div className="text-gray-700 whitespace-pre-wrap">{drill.description}</div>
                    </div>
                  )}

                  {drill.instructions && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Instructions</h3>
                      <div className="text-gray-700 whitespace-pre-wrap">{drill.instructions}</div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-900">Features:</span>
                      <p className="text-gray-700 mt-1">{formatFeatures(drill.features)}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-900">Duration:</span>
                      <p className="text-gray-700 mt-1">{drill.duration_minutes ? `${drill.duration_minutes} minutes` : 'Not specified'}</p>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-1">
                  {imageUrl && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Drill Image</h3>
                      <img
                        src={imageUrl}
                        alt={`${drill.title} drill`}
                        className="w-full h-64 object-cover rounded-lg border border-gray-300"
                      />
                    </div>
                  )}

                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Drill Information</h3>
                    <dl className="space-y-2 text-sm">
                      <div>
                        <dt className="font-medium text-gray-900">Created:</dt>
                        <dd className="text-gray-700">
                          {new Date(drill.created_at).toLocaleDateString()}
                        </dd>
                      </div>
                      {drill.updated_at && drill.updated_at !== drill.created_at && (
                        <div>
                          <dt className="font-medium text-gray-900">Last Updated:</dt>
                          <dd className="text-gray-700">
                            {new Date(drill.updated_at).toLocaleDateString()}
                          </dd>
                        </div>
                      )}
                      {drill.created_by && (
                        <div>
                          <dt className="font-medium text-gray-900">Created by:</dt>
                          <dd className="text-gray-700">
                            {drill.created_by === user.id ? 'You' : 'Another user'}
                          </dd>
                        </div>
                      )}
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Media Attachments */}
          <div className="mt-6">
            <MediaAttachments 
              type="drill" 
              itemId={drill.id}
              userRoles={userRoles || []}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default ViewDrill 