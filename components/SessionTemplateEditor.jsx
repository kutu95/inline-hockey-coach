import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../src/lib/supabase'
import { useAuth } from '../src/contexts/AuthContext'
import OrganizationHeader from './OrganizationHeader'

const SessionTemplateEditor = () => {
  const [template, setTemplate] = useState({
    title: '',
    description: '',
    duration_minutes: ''
  })
  const [organization, setOrganization] = useState(null)
  const [drills, setDrills] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [notesBlocks, setNotesBlocks] = useState([])
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
  
  const { user, hasRole } = useAuth()
  const params = useParams()
  const navigate = useNavigate()
  const templateId = params.templateId
  const orgId = params.orgId
  const isNew = !templateId

  useEffect(() => {
    if (isNew || templateId) {
      fetchDrills()
      if (orgId) {
        fetchOrganization()
      }
      if (!isNew) {
        fetchTemplateData()
      } else {
        setLoading(false)
      }
    }
  }, [templateId, orgId, isNew])

  // Debug template state changes
  useEffect(() => {
    console.log('Template state changed:', template)
  }, [template])

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

  const fetchTemplateData = async () => {
    try {
      setLoading(true)
      console.log('Fetching template data for ID:', templateId)
      
      const { data, error } = await supabase.rpc('get_template_with_blocks', {
        template_uuid: templateId
      })

      console.log('Template data response:', { data, error })

      if (error) throw error

      if (data && data.length > 0 && data[0].template) {
        console.log('Setting template data:', data[0].template)
        console.log('Setting template blocks:', data[0].template_blocks)
        setTemplate(data[0].template)
        setNotesBlocks(data[0].template_blocks || [])
      } else {
        console.log('No data returned from get_template_with_blocks')
        setError('Template not found or access denied')
      }
    } catch (err) {
      setError('Failed to fetch template data')
      console.error('Error fetching template data:', err)
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
      id: Date.now(),
      block_type: 'text',
      content: '',
      order_index: position
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
      id: Date.now(),
      block_type: 'heading',
      content: '',
      order_index: position
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
      id: Date.now(),
      block_type: 'drill',
      content: drill.title,
      drill_id: drill.id,
      order_index: insertPosition
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
    setNotesBlocks(blocks => 
      blocks.map(block => 
        block.id === blockId ? { ...block, content } : block
      )
    )
  }

  const deleteBlock = (blockId) => {
    const updatedBlocks = notesBlocks.filter(block => block.id !== blockId)
    
    // Update order indices
    updatedBlocks.forEach((block, index) => {
      block.order_index = index
    })
    
    setNotesBlocks(updatedBlocks)
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
      filterMode: prev.filterMode === 'all' ? 'filtered' : 'all'
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
    if (drillFilters.filterMode === 'all') return drills

    return drills.filter(drill => {
      // Filter by player count
      if (drillFilters.playerCount) {
        const playerCount = parseInt(drillFilters.playerCount)
        if (drill.min_players > playerCount || (drill.max_players && drill.max_players < playerCount)) {
          return false
        }
      }

      // Filter by features
      if (drillFilters.selectedFeatures.length > 0) {
        if (!drill.features || drill.features.length === 0) return false
        
        const hasMatchingFeature = drill.features.some(feature => 
          drillFilters.selectedFeatures.includes(feature)
        )
        if (!hasMatchingFeature) return false
      }

      return true
    })
  }

  const saveTemplate = async () => {
    if (!template?.title || !template?.duration_minutes) {
      setError('Please fill in all required fields')
      return
    }

    try {
      setSaving(true)
      setError('')
      setSuccess('')

      const templateData = {
        title: template.title.trim(),
        description: template.description?.trim() || null,
        duration_minutes: parseInt(template.duration_minutes),
        author_id: user.id,
        organization_id: orgId || null
      }

      const templateBlocksData = notesBlocks.map(block => ({
        block_type: block.block_type,
        content: block.content,
        drill_id: block.drill_id,
        order_index: block.order_index
      }))

      const { data: savedTemplateId, error } = await supabase.rpc('save_template_with_blocks', {
        template_uuid: isNew ? null : templateId,
        template_data: templateData,
        template_blocks_data: templateBlocksData
      })

      if (error) throw error

      setSuccess('Template saved successfully!')
      
      // Navigate to template view after a short delay
      setTimeout(() => {
        navigate(orgId 
          ? `/organisations/${orgId}/session-templates/${savedTemplateId}`
          : `/session-templates/${savedTemplateId}`
        )
      }, 1500)

    } catch (err) {
      setError('Failed to save template')
      console.error('Error saving template:', err)
    } finally {
      setSaving(false)
    }
  }

  const renderBlock = (block) => {
    switch (block.block_type) {
      case 'text':
        return (
          <div className="bg-white border border-gray-300 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Text Block</span>
              <div className="flex space-x-2">
                <button
                  onClick={() => moveBlock(block.id, 'up')}
                  className="text-gray-400 hover:text-gray-600"
                  disabled={notesBlocks.indexOf(block) === 0}
                >
                  ↑
                </button>
                <button
                  onClick={() => moveBlock(block.id, 'down')}
                  className="text-gray-400 hover:text-gray-600"
                  disabled={notesBlocks.indexOf(block) === notesBlocks.length - 1}
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
              placeholder="Enter text content..."
              className="w-full h-32 p-2 border border-gray-300 rounded-md resize-none"
            />
          </div>
        )

      case 'heading':
        return (
          <div className="bg-white border border-gray-300 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Heading</span>
              <div className="flex space-x-2">
                <button
                  onClick={() => moveBlock(block.id, 'up')}
                  className="text-gray-400 hover:text-gray-600"
                  disabled={notesBlocks.indexOf(block) === 0}
                >
                  ↑
                </button>
                <button
                  onClick={() => moveBlock(block.id, 'down')}
                  className="text-gray-400 hover:text-gray-600"
                  disabled={notesBlocks.indexOf(block) === notesBlocks.length - 1}
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
            <input
              type="text"
              value={block.content}
              onChange={(e) => updateBlockContent(block.id, e.target.value)}
              placeholder="Enter heading..."
              className="w-full p-2 border border-gray-300 rounded-md text-lg font-semibold"
            />
          </div>
        )

      case 'drill':
        const drill = drills.find(d => d.id === block.drill_id)
        return (
          <div className="bg-white border border-gray-300 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Drill</span>
              <div className="flex space-x-2">
                <button
                  onClick={() => moveBlock(block.id, 'up')}
                  className="text-gray-400 hover:text-gray-600"
                  disabled={notesBlocks.indexOf(block) === 0}
                >
                  ↑
                </button>
                <button
                  onClick={() => moveBlock(block.id, 'down')}
                  className="text-gray-400 hover:text-gray-600"
                  disabled={notesBlocks.indexOf(block) === notesBlocks.length - 1}
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
            {drill ? (
              <div className="bg-gray-50 p-3 rounded-md">
                <h4 className="font-semibold text-gray-900">{drill.title}</h4>
                {drill.short_description && (
                  <p className="text-sm text-gray-600 mt-1">{drill.short_description}</p>
                )}
                <div className="flex flex-wrap gap-1 mt-2">
                  {drill.features?.map(feature => (
                    <span key={feature} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {feature}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-red-600 text-sm">Drill not found</div>
            )}
          </div>
        )

      default:
        return null
    }
  }

  const renderAddButtons = (position) => (
    <div className="flex justify-center space-x-2 mb-4">
      <button
        onClick={() => addTextBlock(position)}
        className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded-md text-sm"
      >
        + Text
      </button>
      <button
        onClick={() => addHeadingBlock(position)}
        className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded-md text-sm"
      >
        + Heading
      </button>
      <button
        onClick={() => addDrillBlock(position)}
        className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded-md text-sm"
      >
        + Drill
      </button>
    </div>
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {orgId && <OrganizationHeader />}
      <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Link
                  to={orgId ? `/organisations/${orgId}/session-templates` : "/session-templates"}
                  className="text-gray-600 hover:text-gray-800 font-medium"
                >
                  ← Back to Templates
                </Link>
                <h1 className="text-3xl font-bold text-gray-900">
                  {isNew ? 'Create Session Template' : 'Edit Session Template'}
                </h1>
              </div>
              
              <div className="flex space-x-2">
                <button
                  onClick={saveTemplate}
                  disabled={saving}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium py-2 px-4 rounded-md transition duration-150 ease-in-out"
                >
                  {saving ? 'Saving...' : 'Save Template'}
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
              <div className="text-red-800">{error}</div>
            </div>
          )}

          {success && (
            <div className="mb-6 bg-green-50 border border-green-200 rounded-md p-4">
              <div className="text-green-800">{success}</div>
            </div>
          )}

          {/* Template Details */}
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Template Title *
                </label>
                <input
                  type="text"
                  value={template?.title || ''}
                  onChange={(e) => {
                    console.log('Updating title:', e.target.value)
                    setTemplate(prev => ({ ...prev, title: e.target.value }))
                  }}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  placeholder="Enter template title..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Duration (minutes) *
                </label>
                <input
                  type="number"
                  min="1"
                  value={template?.duration_minutes || ''}
                  onChange={(e) => {
                    console.log('Updating duration:', e.target.value)
                    setTemplate(prev => ({ ...prev, duration_minutes: e.target.value }))
                  }}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  placeholder="60"
                />
              </div>
            </div>
            
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={template?.description || ''}
                onChange={(e) => {
                  console.log('Updating description:', e.target.value)
                  setTemplate(prev => ({ ...prev, description: e.target.value }))
                }}
                className="w-full p-2 border border-gray-300 rounded-md h-24 resize-none"
                placeholder="Enter template description..."
              />
            </div>
          </div>

          {/* Template Content */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Template Content</h2>
            
            {renderAddButtons(0)}
            
            {notesBlocks.map((block, index) => (
              <div key={block.id}>
                {renderBlock(block)}
                {renderAddButtons(index + 1)}
              </div>
            ))}
            
            {notesBlocks.length === 0 && (
              <div className="text-center text-gray-500 py-8">
                <p>No content blocks yet. Add some content to your template.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Drill Selector Modal */}
      {showDrillSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Select Drill</h3>
              <button
                onClick={() => setShowDrillSelector(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            {/* Filters */}
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Player Count
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={drillFilters.playerCount}
                    onChange={handlePlayerCountChange}
                    className="w-full p-2 border border-gray-300 rounded-md"
                    placeholder="Any"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Features
                  </label>
                  <div className="flex flex-wrap gap-1">
                    {availableFeatures.map(feature => (
                      <button
                        key={feature}
                        onClick={() => handleFilterFeatureChange(feature)}
                        className={`px-2 py-1 rounded text-xs ${
                          drillFilters.selectedFeatures.includes(feature)
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        {feature}
                      </button>
                    ))}
                  </div>
                  <div className="flex space-x-2 mt-2">
                    <button
                      onClick={selectAllFeatures}
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      Select All
                    </button>
                    <button
                      onClick={deselectAllFeatures}
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      Clear All
                    </button>
                  </div>
                </div>
                
                <div className="flex items-end space-x-2">
                  <button
                    onClick={handleFilterModeChange}
                    className={`px-3 py-2 rounded-md text-sm ${
                      drillFilters.filterMode === 'filtered'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    {drillFilters.filterMode === 'filtered' ? 'Show Filtered' : 'Show All'}
                  </button>
                  <button
                    onClick={clearDrillFilters}
                    className="px-3 py-2 bg-gray-200 text-gray-700 rounded-md text-sm hover:bg-gray-300"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>

            {/* Drills List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filterDrills(drills).map(drill => (
                <div
                  key={drill.id}
                  onClick={() => selectDrill(drill)}
                  className="border border-gray-300 rounded-lg p-4 cursor-pointer hover:bg-gray-50"
                >
                  <h4 className="font-semibold text-gray-900">{drill.title}</h4>
                  {drill.short_description && (
                    <p className="text-sm text-gray-600 mt-1">{drill.short_description}</p>
                  )}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {drill.features?.map(feature => (
                      <span key={feature} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {feature}
                      </span>
                    ))}
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    {drill.min_players}{drill.max_players ? `-${drill.max_players}` : '+'} players
                  </div>
                </div>
              ))}
            </div>

            {filterDrills(drills).length === 0 && (
              <div className="text-center text-gray-500 py-8">
                <p>No drills match your filters.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default SessionTemplateEditor 