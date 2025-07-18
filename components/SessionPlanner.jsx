import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../src/lib/supabase'
import { useAuth } from '../src/contexts/AuthContext'
import OrganizationHeader from './OrganizationHeader'

const SessionPlanner = () => {
  const [session, setSession] = useState(null)
  const [drills, setDrills] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [notesBlocks, setNotesBlocks] = useState([])
  const [sessionDrills, setSessionDrills] = useState([])
  const [showDrillSelector, setShowDrillSelector] = useState(false)
  const [selectedDrill, setSelectedDrill] = useState(null)
  const [insertPosition, setInsertPosition] = useState(0)
  
  const { user } = useAuth()
  const params = useParams()
  const navigate = useNavigate()
  const sessionId = params.sessionId
  const orgId = params.orgId

  useEffect(() => {
    if (sessionId) {
      fetchSessionData()
      fetchDrills()
    }
  }, [sessionId])

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

  const fetchDrills = async () => {
    try {
      let query = supabase
        .from('drills')
        .select('*')
        .order('title', { ascending: true })

      if (orgId) {
        query = query.eq('organization_id', orgId)
      } else {
        query = query.eq('created_by', user.id)
      }

      const { data, error } = await query
      if (error) throw error
      setDrills(data || [])
    } catch (err) {
      console.error('Error fetching drills:', err)
    }
  }

  const addTextBlock = (position) => {
    const newBlock = {
      id: `temp-${Date.now()}`,
      block_type: 'text',
      content: '',
      order_index: position,
      isEditing: true
    }
    
    const updatedBlocks = [...notesBlocks]
    updatedBlocks.splice(position, 0, newBlock)
    
    // Update order indices
    updatedBlocks.forEach((block, index) => {
      block.order_index = index
    })
    
    setNotesBlocks(updatedBlocks)
  }

  const addHeadingBlock = (position) => {
    const newBlock = {
      id: `temp-${Date.now()}`,
      block_type: 'heading',
      content: '',
      order_index: position,
      isEditing: true
    }
    
    const updatedBlocks = [...notesBlocks]
    updatedBlocks.splice(position, 0, newBlock)
    
    // Update order indices
    updatedBlocks.forEach((block, index) => {
      block.order_index = index
    })
    
    setNotesBlocks(updatedBlocks)
  }

  const addDrillBlock = (position) => {
    setInsertPosition(position)
    setShowDrillSelector(true)
  }

  const selectDrill = (drill) => {
    const newBlock = {
      id: `temp-${Date.now()}`,
      block_type: 'drill',
      content: '',
      drill_id: drill.id,
      order_index: insertPosition,
      drill: drill,
      isEditing: true
    }
    
    const updatedBlocks = [...notesBlocks]
    updatedBlocks.splice(insertPosition, 0, newBlock)
    
    // Update order indices
    updatedBlocks.forEach((block, index) => {
      block.order_index = index
    })
    
    setNotesBlocks(updatedBlocks)
    setShowDrillSelector(false)
    setSelectedDrill(null)
  }

  const updateBlockContent = (blockId, content) => {
    setNotesBlocks(prev => prev.map(block => 
      block.id === blockId ? { ...block, content } : block
    ))
  }

  const deleteBlock = (blockId) => {
    setNotesBlocks(prev => prev.filter(block => block.id !== blockId))
  }

  const moveBlock = (blockId, direction) => {
    const currentIndex = notesBlocks.findIndex(block => block.id === blockId)
    if (currentIndex === -1) return

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    if (newIndex < 0 || newIndex >= notesBlocks.length) return

    const updatedBlocks = [...notesBlocks]
    const [movedBlock] = updatedBlocks.splice(currentIndex, 1)
    updatedBlocks.splice(newIndex, 0, movedBlock)

    // Update order indices
    updatedBlocks.forEach((block, index) => {
      block.order_index = index
    })

    setNotesBlocks(updatedBlocks)
  }

  const saveSessionPlan = async () => {
    try {
      setSaving(true)
      setError('')
      setSuccess('')

      // Prepare data for saving
      const notesBlocksData = notesBlocks.map(block => ({
        block_type: block.block_type,
        content: block.content,
        drill_id: block.drill_id,
        order_index: block.order_index
      }))

      const sessionDrillsData = sessionDrills.map(drill => ({
        drill_id: drill.drill_id,
        order_index: drill.order_index,
        duration_minutes: drill.duration_minutes,
        notes: drill.notes
      }))

      const { data, error } = await supabase.rpc('save_session_planning', {
        session_uuid: sessionId,
        notes_blocks_data: notesBlocksData,
        session_drills_data: sessionDrillsData
      })

      if (error) throw error

      if (data) {
        setSuccess('Session plan saved successfully!')
        // Refresh the data to get the real IDs
        await fetchSessionData()
      }
    } catch (err) {
      setError('Failed to save session plan')
      console.error('Error saving session plan:', err)
    } finally {
      setSaving(false)
    }
  }

  const renderBlock = (block) => {
    switch (block.block_type) {
      case 'heading':
        return (
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
            <input
              type="text"
              value={block.content}
              onChange={(e) => updateBlockContent(block.id, e.target.value)}
              placeholder="Enter heading..."
              className="w-full text-xl font-bold bg-transparent border-none outline-none"
            />
          </div>
        )
      
      case 'drill':
        return (
          <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-green-800">
                {block.drill?.title || 'Selected Drill'}
              </h3>
              <div className="flex space-x-2">
                <button
                  onClick={() => moveBlock(block.id, 'up')}
                  className="text-green-600 hover:text-green-800"
                >
                  ↑
                </button>
                <button
                  onClick={() => moveBlock(block.id, 'down')}
                  className="text-green-600 hover:text-green-800"
                >
                  ↓
                </button>
                <button
                  onClick={() => deleteBlock(block.id)}
                  className="text-red-600 hover:text-red-800"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="text-sm text-green-700 mb-2">
              {block.drill?.short_description || block.drill?.description}
            </div>
            <textarea
              value={block.content}
              onChange={(e) => updateBlockContent(block.id, e.target.value)}
              placeholder="Add session-specific notes for this drill..."
              className="w-full p-2 border border-green-300 rounded-md bg-white"
              rows="3"
            />
          </div>
        )
      
      case 'text':
      default:
        return (
          <div className="bg-gray-50 border-l-4 border-gray-400 p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Text Block</span>
              <div className="flex space-x-2">
                <button
                  onClick={() => moveBlock(block.id, 'up')}
                  className="text-gray-600 hover:text-gray-800"
                >
                  ↑
                </button>
                <button
                  onClick={() => moveBlock(block.id, 'down')}
                  className="text-gray-600 hover:text-gray-800"
                >
                  ↓
                </button>
                <button
                  onClick={() => deleteBlock(block.id)}
                  className="text-red-600 hover:text-red-800"
                >
                  ×
                </button>
              </div>
            </div>
            <textarea
              value={block.content}
              onChange={(e) => updateBlockContent(block.id, e.target.value)}
              placeholder="Enter your notes..."
              className="w-full p-2 border border-gray-300 rounded-md bg-white"
              rows="4"
            />
          </div>
        )
    }
  }

  const renderAddButtons = (position) => (
    <div className="flex justify-center space-x-2 mb-4">
      <button
        onClick={() => addTextBlock(position)}
        className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600"
      >
        + Text
      </button>
      <button
        onClick={() => addHeadingBlock(position)}
        className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        + Heading
      </button>
      <button
        onClick={() => addDrillBlock(position)}
        className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600"
      >
        + Drill
      </button>
    </div>
  )

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
                <OrganizationHeader title="Session Planner" />
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={() => navigate(-1)}
                      className="text-gray-600 hover:text-gray-800 font-medium"
                    >
                      ← Back
                    </button>
                    <h1 className="text-3xl font-bold text-gray-900">Session Planner</h1>
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
            </div>

            {/* Error/Success Messages */}
            {error && (
              <div className="px-6 py-4">
                <div className="rounded-md bg-red-50 p-4">
                  <div className="text-sm text-red-700">{error}</div>
                </div>
              </div>
            )}

            {success && (
              <div className="px-6 py-4">
                <div className="rounded-md bg-green-50 p-4">
                  <div className="text-sm text-green-700">{success}</div>
                </div>
              </div>
            )}

            {/* Session Planner Content */}
            <div className="px-6 py-4">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Session Plan</h3>
                <button
                  onClick={saveSessionPlan}
                  disabled={saving}
                  className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Plan'}
                </button>
              </div>

              {/* Add buttons at the top */}
              {renderAddButtons(0)}

              {/* Session Plan Blocks */}
              <div className="space-y-4">
                {notesBlocks.map((block, index) => (
                  <div key={block.id}>
                    {renderBlock(block)}
                    {renderAddButtons(index + 1)}
                  </div>
                ))}
              </div>

              {/* Add buttons at the bottom if no blocks */}
              {notesBlocks.length === 0 && renderAddButtons(0)}
            </div>
          </div>
        </div>
      </div>

      {/* Drill Selector Modal */}
      {showDrillSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-96 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Select a Drill</h3>
              <button
                onClick={() => setShowDrillSelector(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-2">
              {drills.map(drill => (
                <div
                  key={drill.id}
                  onClick={() => selectDrill(drill)}
                  className="p-3 border border-gray-200 rounded cursor-pointer hover:bg-gray-50"
                >
                  <h4 className="font-medium text-gray-900">{drill.title}</h4>
                  <p className="text-sm text-gray-600">{drill.short_description || drill.description}</p>
                  <div className="text-xs text-gray-500 mt-1">
                    {drill.min_players}-{drill.max_players || '∞'} players
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SessionPlanner 