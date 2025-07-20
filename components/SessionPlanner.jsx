import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../src/lib/supabase'
import { useAuth } from '../src/contexts/AuthContext'

const SessionPlanner = () => {
  const [session, setSession] = useState(null)
  const [organization, setOrganization] = useState(null)
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
  
  // Filter state for drill selector
  const [drillFilters, setDrillFilters] = useState({
    playerCount: '',
    selectedFeatures: [],
    filterMode: 'all'
  })
  
  const availableFeatures = [
    'agility', 'back-checking', 'break outs', 'defense', 'face-offs', 
    'fitness', 'fore-checking', 'fun', 'goalie', 'Offensive cycling', 
    'off-ice', 'passing', 'penalty kills', 'power plays', 'puck handling', 'shooting', 
    'skating', 'Warm down', 'Warm up'
  ]
  
  const { user } = useAuth()
  const params = useParams()
  const navigate = useNavigate()
  const sessionId = params.sessionId
  const orgId = params.orgId

  useEffect(() => {
    if (sessionId) {
      fetchSessionData()
      fetchDrills()
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

  // Filter functions for drill selector
  const handleFilterFeatureChange = (feature) => {
    setDrillFilters(prev => ({
      ...prev,
      selectedFeatures: prev.selectedFeatures.includes(feature)
        ? prev.selectedFeatures.filter(f => f !== feature)
        : [...prev.selectedFeatures, feature]
    }))
  }

  const handlePlayerCountChange = (e) => {
    setDrillFilters(prev => ({
      ...prev,
      playerCount: e.target.value
    }))
  }

  const handleFilterModeChange = () => {
    setDrillFilters(prev => ({
      ...prev,
      filterMode: prev.filterMode === 'all' ? 'any' : 'all'
    }))
  }

  const clearDrillFilters = () => {
    setDrillFilters({
      playerCount: '',
      selectedFeatures: [],
      filterMode: 'all'
    })
  }

  const selectAllFeatures = () => {
    setDrillFilters(prev => ({
      ...prev,
      selectedFeatures: [...availableFeatures]
    }))
  }

  const deselectAllFeatures = () => {
    setDrillFilters(prev => ({
      ...prev,
      selectedFeatures: []
    }))
  }

  const filterDrills = (drills) => {
    return drills.filter(drill => {
      // Filter by player count
      if (drillFilters.playerCount) {
        const playerCount = parseInt(drillFilters.playerCount)
        const minPlayers = drill.min_players || 1
        const maxPlayers = drill.max_players
        
        if (playerCount < minPlayers) {
          return false
        }
        
        if (maxPlayers && playerCount > maxPlayers) {
          return false
        }
      }

      // Filter by features
      if (drillFilters.selectedFeatures.length > 0) {
        const drillFeatures = drill.features || []
        
        if (drillFilters.filterMode === 'all') {
          // AND logic: all selected features must be present
          const hasAllSelectedFeatures = drillFilters.selectedFeatures.every(feature => 
            drillFeatures.includes(feature)
          )
          if (!hasAllSelectedFeatures) {
            return false
          }
        } else {
          // OR logic: any selected feature must be present
          const hasAnySelectedFeature = drillFilters.selectedFeatures.some(feature => 
            drillFeatures.includes(feature)
          )
          if (!hasAnySelectedFeature) {
            return false
          }
        }
      }

      return true
    })
  }

  const saveSessionPlan = async () => {
    try {
      setSaving(true)
      setError('')
      setSuccess('')

      console.log('Saving session plan for session:', sessionId)
      console.log('Notes blocks:', notesBlocks)
      console.log('Session drills:', sessionDrills)

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

      console.log('Prepared notes blocks data:', notesBlocksData)
      console.log('Prepared session drills data:', sessionDrillsData)

      const { data, error } = await supabase.rpc('save_session_planning', {
        session_uuid: sessionId,
        notes_blocks_data: notesBlocksData,
        session_drills_data: sessionDrillsData
      })

      console.log('RPC response:', { data, error })

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
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xl font-bold text-green-800">
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
            <div>
              <h4 className="text-sm font-semibold text-green-700 mb-1">Session Notes:</h4>
              <textarea
                value={block.content}
                onChange={(e) => updateBlockContent(block.id, e.target.value)}
                placeholder="Add session-specific notes for this drill..."
                className="w-full p-2 border border-green-300 rounded-md bg-white"
                rows="3"
              />
            </div>
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
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Link
                      to={`/organisations/${orgId}/sessions`}
                      className="text-gray-600 hover:text-gray-800 font-medium"
                    >
                      ← Back to Sessions
                    </Link>
                    <h1 className="text-3xl font-bold text-gray-900">Session Planner</h1>
                  </div>
                  <div className="flex space-x-2">
                    <Link
                      to={`/organisations/${orgId}/sessions/${sessionId}`}
                      className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
                    >
                      View Session
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
                    <h1 className="text-3xl font-bold text-gray-900">Session Planner</h1>
                  </div>
                  <div className="flex space-x-2">
                    <Link
                      to={`/sessions/${sessionId}`}
                      className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
                    >
                      View Session
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
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Select a Drill</h3>
              <button
                onClick={() => setShowDrillSelector(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>
            
            {/* Filter Panel */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="text-md font-medium text-gray-900 mb-3">Filter Drills</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Player Count Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Number of Players
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={drillFilters.playerCount}
                    onChange={handlePlayerCountChange}
                    placeholder="Enter number of players"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                {/* Filter Mode */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Filter Mode
                  </label>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={handleFilterModeChange}
                      className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                        drillFilters.filterMode === 'all'
                          ? 'bg-indigo-100 text-indigo-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {drillFilters.filterMode === 'all' ? 'ALL' : 'ANY'}
                    </button>
                    <span className="text-xs text-gray-500">
                      {drillFilters.filterMode === 'all' ? '(must have all selected)' : '(must have any selected)'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Features Filter */}
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Drill Features
                  </label>
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
                    <button
                      onClick={clearDrillFilters}
                      className="text-xs text-gray-600 hover:text-gray-800 font-medium"
                    >
                      Clear All
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {availableFeatures.map(feature => (
                    <label key={feature} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={drillFilters.selectedFeatures.includes(feature)}
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
                  {drillFilters.selectedFeatures.length === 0 
                    ? 'No features selected - showing all drills' 
                    : `${drillFilters.selectedFeatures.length} of ${availableFeatures.length} features selected`
                  }
                </p>
              </div>
            </div>
            
            {/* Drills List */}
            <div className="space-y-2">
              {(() => {
                const filteredDrills = filterDrills(drills)
                return filteredDrills.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-gray-500 text-lg mb-2">
                      {drills.length === 0 ? 'No drills available' : 'No drills match your filters'}
                    </div>
                    <p className="text-gray-400 text-sm">
                      {drills.length === 0 ? 'Create some drills first' : 'Try adjusting your filters'}
                    </p>
                  </div>
                ) : (
                  filteredDrills.map(drill => (
                    <div
                      key={drill.id}
                      onClick={() => selectDrill(drill)}
                      className="p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 mb-1">{drill.title}</h4>
                          {drill.short_description && (
                            <p className="text-sm text-gray-600 mb-2">{drill.short_description}</p>
                          )}
                          <div className="flex flex-wrap gap-2 text-xs">
                            <span className="inline-flex items-center px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                              {drill.min_players}-{drill.max_players || '∞'} players
                            </span>
                            {drill.features && drill.features.length > 0 && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full bg-green-100 text-green-800">
                                {drill.features.slice(0, 2).join(', ')}
                                {drill.features.length > 2 && '...'}
                              </span>
                            )}
                            {drill.difficulty_level && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full bg-purple-100 text-purple-800">
                                {drill.difficulty_level}
                              </span>
                            )}
                          </div>
                        </div>
                        {drill.image_url && (
                          <img
                            src={drill.image_url}
                            alt={drill.title}
                            className="w-16 h-16 object-cover rounded-md border border-gray-300 ml-3"
                          />
                        )}
                      </div>
                    </div>
                  ))
                )
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SessionPlanner 