import React from 'react'
import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../src/lib/supabase'
import { useAuth } from '../src/contexts/AuthContext'
import DrillPlayer from './DrillPlayer'


const ViewSession = () => {
  const [session, setSession] = useState(null)
  const [organization, setOrganization] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notesBlocks, setNotesBlocks] = useState([])
  const [sessionDrills, setSessionDrills] = useState([])
  const [imageUrls, setImageUrls] = useState({})
  
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

  const getSignedUrl = async (url) => {
    if (!url) return null
    
    try {
      // Extract file path from the URL
      const urlParts = url.split('/')
      const filePath = urlParts.slice(-2).join('/') // Get user_id/filename
      
      const { data, error } = await supabase.storage
        .from('drill-images')
        .createSignedUrl(filePath, 60 * 60 * 24 * 7) // 7 days expiry
      
      if (error) {
        console.error('Error creating signed URL:', error)
        return null
      }
      
      return data?.signedUrl || null
    } catch (err) {
      console.error('Error getting signed URL:', err)
      return null
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
        
        // Get signed URLs for all drill images
        await resolveDrillImages(data.notes_blocks || [], data.session_drills || [])
      }
    } catch (err) {
      setError('Failed to fetch session data')
      console.error('Error fetching session data:', err)
    } finally {
      setLoading(false)
    }
  }

  // Simple function to convert markdown-style links to clickable HTML
  const renderMarkdownLinks = (text) => {
    if (!text) return ''
    
    // Convert markdown links [text](url) to clickable links
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g
    
    // Use a simple approach: find all matches and replace them
    const result = []
    let lastIndex = 0
    let match
    
    // Reset regex state
    linkRegex.lastIndex = 0
    
    while ((match = linkRegex.exec(text)) !== null) {
      const [fullMatch, linkText, linkUrl] = match
      const matchStart = match.index
      const matchEnd = matchStart + fullMatch.length
      
      // Add text before this link
      if (matchStart > lastIndex) {
        const textBefore = text.slice(lastIndex, matchStart)
        result.push(
          <React.Fragment key={`text-${matchStart}`}>
            {textBefore.split('\n').map((line, index) => (
              <React.Fragment key={`line-${matchStart}-${index}`}>
                {line}
                {index < textBefore.split('\n').length - 1 && <br />}
              </React.Fragment>
            ))}
          </React.Fragment>
        )
      }
      
      // Add the clickable link
      result.push(
        <a
          key={`link-${matchStart}`}
          href={linkUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 underline"
        >
          {linkText}
        </a>
      )
      
      lastIndex = matchEnd
    }
    
    // Add any remaining text after the last link
    if (lastIndex < text.length) {
      const remainingText = text.slice(lastIndex)
      result.push(
        <React.Fragment key={`text-end`}>
          {remainingText.split('\n').map((line, index) => (
            <React.Fragment key={`line-end-${index}`}>
              {line}
              {index < remainingText.split('\n').length - 1 && <br />}
            </React.Fragment>
          ))}
        </React.Fragment>
      )
    }
    
    // If no links were found, just return the text with line breaks
    if (result.length === 0) {
      return text.split('\n').map((line, index) => (
        <React.Fragment key={index}>
          {line}
          {index < text.split('\n').length - 1 && <br />}
        </React.Fragment>
      ))
    }
    
    return result
  }

  const resolveDrillImages = async (notesBlocksData, sessionDrillsData) => {
    const urls = {}
    
    // Process notes blocks for drill images
    for (const block of notesBlocksData) {
      if (block.block_type === 'drill' && block.drill?.image_url) {
        const signedUrl = await getSignedUrl(block.drill.image_url)
        if (signedUrl) {
          urls[`block-${block.id}`] = signedUrl
        }
      }
    }
    
    // Process session drills for drill images
    for (const sessionDrill of sessionDrillsData) {
      if (sessionDrill.drill?.image_url) {
        const signedUrl = await getSignedUrl(sessionDrill.drill.image_url)
        if (signedUrl) {
          urls[`drill-${sessionDrill.id}`] = signedUrl
        }
      }
    }
    
    setImageUrls(urls)
  }

  // Animation Player Component for Drills
  const AnimationPlayer = ({ drillId, drillTitle }) => {
    const [hasAnimation, setHasAnimation] = useState(false)
    const [animationMediaId, setAnimationMediaId] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
      checkForAnimation()
    }, [drillId])

    const checkForAnimation = async () => {
      try {
        setLoading(true)
        // Check if this drill has any media attachments with animation data
        // Use the drill_media junction table to find media for this drill
        const { data: drillMediaRecords, error: drillMediaError } = await supabase
          .from('drill_media')
          .select(`
            media_id,
            media:media_attachments(
              id,
              animation_data_path,
              file_type,
              storage_path
            )
          `)
          .eq('drill_id', drillId)

        if (drillMediaError) throw drillMediaError

        console.log('Drill media records found:', drillMediaRecords)

        // Find media with animation data
        if (drillMediaRecords && drillMediaRecords.length > 0) {
          for (const record of drillMediaRecords) {
            console.log('Checking media record:', record)
            if (record.media) {
              // Check for animation data path or animation file type
              if (record.media.animation_data_path || 
                  (record.media.file_type === 'animation')) {
                console.log('Animation found:', record.media)
                setHasAnimation(true)
                setAnimationMediaId(record.media.id)
                break
              }
            }
          }
        } else {
          console.log('No drill media records found for drill:', drillId)
        }
      } catch (err) {
        console.error('Error checking for animation:', err)
      } finally {
        setLoading(false)
      }
    }

    if (loading) {
      return (
        <div className="flex items-center justify-center p-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
        </div>
      )
    }

    if (!hasAnimation) {
      return null // Don't show anything if no animation
    }

    return (
      <div className="bg-green-100 p-3 rounded-lg border border-green-300">
        <h4 className="text-sm font-semibold text-green-800 mb-2">Animation:</h4>
        <div className="bg-white rounded border border-green-200">
          <DrillPlayer 
            mediaId={animationMediaId}
            title={`${drillTitle || 'Drill'} Animation`}
            description="Animation for this drill"
          />
        </div>
      </div>
    )
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
                  src={imageUrls[`block-${block.id}`] || block.drill.image_url} 
                  alt={block.drill.title}
                  className="w-full max-w-md h-48 object-cover rounded-lg border border-green-200"
                  onError={(e) => {
                    console.log('Failed to load drill image:', block.drill.image_url)
                    e.target.style.display = 'none'
                  }}
                />
              </div>
            )}
            
            {/* Animation Player - Check if drill has animation data */}
            {block.drill?.id && (
              <div className="mb-3">
                <AnimationPlayer 
                  drillId={block.drill.id} 
                  drillTitle={block.drill.title}
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
            <div className="text-gray-800">
              {renderMarkdownLinks(block.content)}
            </div>
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
              
              {/* Game Management Links for Game Sessions */}
              {session.event_type === 'game' && user && (
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link
                    to={orgId ? `/organisations/${orgId}/sessions/${sessionId}/game-management` : `/sessions/${sessionId}/game-management`}
                    className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Manage Game
                  </Link>
                  <Link
                    to={orgId ? `/organisations/${orgId}/sessions/${sessionId}/game-viewer` : `/sessions/${sessionId}/game-viewer`}
                    className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    Live Game View
                  </Link>
                  <Link
                    to={orgId ? `/organisations/${orgId}/sessions/${sessionId}/game-stats` : `/sessions/${sessionId}/game-stats`}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    View Game Stats
                  </Link>
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

            {/* Session Drills Section */}
            {sessionDrills.length > 0 && (
              <div className="px-6 py-4 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Session Drills</h3>
                <div className="space-y-6">
                  {sessionDrills.map((sessionDrill) => (
                    <div key={sessionDrill.id} className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-lg">
                      <div className="flex items-start justify-between mb-3">
                        <h4 className="text-lg font-semibold text-blue-900">
                          {sessionDrill.drill?.title || 'Drill'}
                        </h4>
                        <div className="text-sm text-blue-700">
                          {sessionDrill.duration_minutes && (
                            <span className="bg-blue-200 px-2 py-1 rounded mr-2">
                              {sessionDrill.duration_minutes} min
                            </span>
                          )}
                          <span className="bg-blue-200 px-2 py-1 rounded">
                            #{sessionDrill.order_index + 1}
                          </span>
                        </div>
                      </div>

                      {/* Drill Description */}
                      {sessionDrill.drill?.short_description && (
                        <p className="text-blue-800 mb-3">{sessionDrill.drill.short_description}</p>
                      )}

                      {/* Drill Image */}
                      {sessionDrill.drill?.image_url && (
                        <div className="mb-3">
                          <img 
                            src={imageUrls[`drill-${sessionDrill.id}`] || sessionDrill.drill.image_url} 
                            alt={sessionDrill.drill.title}
                            className="w-full max-w-md h-48 object-cover rounded-lg border border-blue-200"
                            onError={(e) => {
                              console.log('Failed to load session drill image:', sessionDrill.drill.image_url)
                              e.target.style.display = 'none'
                            }}
                          />
                        </div>
                      )}

                      {/* Animation Player for Session Drill */}
                      {sessionDrill.drill?.id && (
                        <div className="mb-3">
                          <AnimationPlayer 
                            drillId={sessionDrill.drill.id} 
                            drillTitle={sessionDrill.drill.title}
                          />
                        </div>
                      )}

                      {/* Session-specific notes */}
                      {sessionDrill.notes && (
                        <div className="mt-3 p-3 bg-white rounded border border-blue-200">
                          <h5 className="text-sm font-semibold text-blue-700 mb-1">Session Notes:</h5>
                          <p className="text-sm text-blue-800">{sessionDrill.notes}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ViewSession 