import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../src/lib/supabase'
import { useAuth } from '../src/contexts/AuthContext'

const ViewSession = () => {
  const [session, setSession] = useState(null)
  const [organization, setOrganization] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notesBlocks, setNotesBlocks] = useState([])
  const [sessionDrills, setSessionDrills] = useState([])
  
  const { user, hasRole } = useAuth()
  
  // Determine user permissions
  const canEditPlan = hasRole('superadmin') || hasRole('admin') || hasRole('coach')
  const canEditSession = hasRole('superadmin') || hasRole('admin')
  const params = useParams()
  const navigate = useNavigate()
  const sessionId = params.sessionId
  const orgId = params.orgId

  useEffect(() => {
    if (sessionId) {
      fetchSessionData()
      if (orgId) {
        fetchOrganization()
      }
    }
  }, [sessionId, orgId])

  const fetchOrganization = async () => {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', orgId)
        .single()

      if (error) throw error
      setOrganization(data)
    } catch (err) {
      console.error('Error fetching organization:', err)
    }
  }

  const fetchSessionData = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase.rpc('get_session_with_planning', {
        session_uuid: sessionId
      })

      if (error) throw error

      if (data) {
        setSession(data.session)
        setNotesBlocks(data.notes_blocks || [])
        setSessionDrills(data.session_drills || [])
      }
    } catch (err) {
      setError('Failed to fetch session data')
      console.error('Error fetching session data:', err)
    } finally {
      setLoading(false)
    }
  }

  const renderBlock = (block) => {
    switch (block.block_type) {
      case 'heading':
        return (
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
            <h3 className="text-xl font-bold text-blue-900">{block.content}</h3>
          </div>
        )
      
      case 'drill':
        return (
          <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-4">
            <h3 className="text-xl font-bold text-green-800 mb-3">
              {block.drill?.title || 'Drill'}
            </h3>
            
            {/* Drill Image */}
            {block.drill?.image_url && (
              <div className="mb-3">
                <img 
                  src={block.drill.image_url} 
                  alt={block.drill.title}
                  className="w-full max-w-md h-48 object-cover rounded-lg border border-green-200"
                />
              </div>
            )}
            
            {/* Short Description */}
            {block.drill?.short_description && (
              <div className="mb-3">
                <h4 className="text-sm font-semibold text-green-700 mb-1">Short Description:</h4>
                <p className="text-sm text-green-700 bg-white p-2 rounded border border-green-200">
                  {block.drill.short_description}
                </p>
              </div>
            )}
            
            {/* Detailed Description */}
            {block.drill?.description && (
              <div className="mb-3">
                <h4 className="text-sm font-semibold text-green-700 mb-1">Detailed Description:</h4>
                <div className="text-sm text-green-700 bg-white p-2 rounded border border-green-200 max-h-32 overflow-y-auto">
                  {block.drill.description}
                </div>
              </div>
            )}
            
            {/* Drill Details */}
            <div className="mb-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-green-700">
              {block.drill?.min_players && (
                <div className="bg-white p-2 rounded border border-green-200">
                  <span className="font-medium">Min Players:</span> {block.drill.min_players}
                </div>
              )}
              {block.drill?.max_players && (
                <div className="bg-white p-2 rounded border border-green-200">
                  <span className="font-medium">Max Players:</span> {block.drill.max_players}
                </div>
              )}
              {block.drill?.duration_minutes && (
                <div className="bg-white p-2 rounded border border-green-200">
                  <span className="font-medium">Duration:</span> {block.drill.duration_minutes} min
                </div>
              )}
              {block.drill?.difficulty_level && (
                <div className="bg-white p-2 rounded border border-green-200">
                  <span className="font-medium">Level:</span> {block.drill.difficulty_level}
                </div>
              )}
            </div>
            
            {/* Session-specific notes */}
            {block.content && (
              <div>
                <h4 className="text-sm font-semibold text-green-700 mb-1">Session Notes:</h4>
                <div className="text-sm text-green-800 bg-white p-3 rounded border border-green-200">
                  {block.content}
                </div>
              </div>
            )}
          </div>
        )
      
      case 'text':
      default:
        return (
          <div className="bg-gray-50 border-l-4 border-gray-400 p-4 mb-4">
            <div className="text-gray-800 whitespace-pre-wrap">{block.content}</div>
          </div>
        )
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Session not found</h2>
          <button
            onClick={() => navigate(-1)}
            className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow rounded-lg">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200">
              {orgId ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Link
                      to={`/organisations/${orgId}/sessions`}
                      className="text-gray-600 hover:text-gray-800 font-medium"
                    >
                      ← Back to Sessions
                    </Link>
                    <h1 className="text-3xl font-bold text-gray-900">Session Details</h1>
                  </div>
                  <div className="flex space-x-2">
                    {canEditSession && (
                      <Link
                        to={orgId ? `/organisations/${orgId}/sessions/${sessionId}/edit` : `/sessions/${sessionId}/edit`}
                        className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
                      >
                        Edit Session
                      </Link>
                    )}
                    {canEditPlan && (
                      <Link
                        to={orgId ? `/organisations/${orgId}/sessions/${sessionId}/planner` : `/sessions/${sessionId}/planner`}
                        className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
                      >
                        Edit Plan
                      </Link>
                    )}
                    <Link
                      to={orgId ? `/organisations/${orgId}/sessions/${sessionId}/pdf` : `/sessions/${sessionId}/pdf`}
                      className="bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700"
                    >
                      Export PDF
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={() => navigate(-1)}
                      className="text-gray-600 hover:text-gray-800 font-medium"
                    >
                      ← Back
                    </button>
                    <h1 className="text-3xl font-bold text-gray-900">Session Details</h1>
                  </div>
                  <div className="flex space-x-2">
                    {canEditSession && (
                      <Link
                        to={`/sessions/${sessionId}/edit`}
                        className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
                      >
                        Edit Session
                      </Link>
                    )}
                    {canEditPlan && (
                      <Link
                        to={`/sessions/${sessionId}/planner`}
                        className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
                      >
                        Edit Plan
                      </Link>
                    )}
                    <Link
                      to={`/sessions/${sessionId}/pdf`}
                      className="bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700"
                    >
                      Export PDF
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Session Info */}
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">{session.title}</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                <div>
                  <span className="font-medium">Date:</span> {new Date(session.date).toLocaleDateString()}
                </div>
                <div>
                  <span className="font-medium">Time:</span> {session.start_time}
                </div>
                <div>
                  <span className="font-medium">Duration:</span> {session.duration_minutes} minutes
                </div>
                <div>
                  <span className="font-medium">Location:</span> {session.location}
                </div>
              </div>
              {session.description && (
                <div className="mt-4">
                  <span className="font-medium text-gray-700">Description:</span>
                  <p className="text-gray-600 mt-1">{session.description}</p>
                </div>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="px-6 py-4">
                <div className="rounded-md bg-red-50 p-4">
                  <div className="text-sm text-red-700">{error}</div>
                </div>
              </div>
            )}

            {/* Session Plan Content */}
            <div className="px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Session Plan</h3>
              
              {notesBlocks.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No session plan created yet.</p>
                  {canEditPlan && (
                    <Link
                      to={orgId ? `/organisations/${orgId}/sessions/${sessionId}/planner` : `/sessions/${sessionId}/planner`}
                      className="inline-block mt-4 bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
                    >
                      Create Session Plan
                    </Link>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {notesBlocks.map((block) => (
                    <div key={block.id}>
                      {renderBlock(block)}
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

export default ViewSession 