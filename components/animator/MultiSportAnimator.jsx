import React, { useState, useCallback, useRef } from 'react'
import { getSportConfig, getAllSports, SPORT_TYPES } from '../../src/lib/sports/config'
import AnimationEngine from './core/AnimationEngine'
import CanvasRenderer from './core/CanvasRenderer'
import ElementManager from './core/ElementManager'

/**
 * MultiSportAnimator - Main component for multi-sport drill animation
 * Integrates AnimationEngine, CanvasRenderer, and ElementManager
 */
const MultiSportAnimator = ({ 
  initialSport = SPORT_TYPES.HOCKEY,
  onAnimationChange,
  onExport,
  className = ''
}) => {
  const [currentSport, setCurrentSport] = useState(initialSport)
  const [showFieldMarkings, setShowFieldMarkings] = useState(true)
  const [showOnionSkin, setShowOnionSkin] = useState(false)
  const [onionSkinFrames, setOnionSkinFrames] = useState(3)
  const [onionSkinOpacity, setOnionSkinOpacity] = useState(0.3)
  const [selectedElement, setSelectedElement] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  
  const canvasRef = useRef(null)
  const sportConfig = getSportConfig(currentSport)
  const availableSports = getAllSports()
  
  // Handle sport change
  const handleSportChange = useCallback((newSport) => {
    setCurrentSport(newSport)
    setSelectedElement(null) // Clear selection when changing sports
  }, [])
  
  // Handle element creation
  const handleElementCreate = useCallback((element) => {
    console.log('Element created:', element)
    onAnimationChange?.({
      type: 'element_created',
      element,
      sport: currentSport
    })
  }, [currentSport, onAnimationChange])
  
  // Handle element update
  const handleElementUpdate = useCallback((elementId, element) => {
    console.log('Element updated:', elementId, element)
    onAnimationChange?.({
      type: 'element_updated',
      elementId,
      element,
      sport: currentSport
    })
  }, [currentSport, onAnimationChange])
  
  // Handle element deletion
  const handleElementDelete = useCallback((elementId) => {
    console.log('Element deleted:', elementId)
    onAnimationChange?.({
      type: 'element_deleted',
      elementId,
      sport: currentSport
    })
  }, [currentSport, onAnimationChange])
  
  // Handle frame changes
  const handleFrameChange = useCallback((frame, frameIndex) => {
    console.log('Frame changed:', frameIndex, frame)
    onAnimationChange?.({
      type: 'frame_changed',
      frame,
      frameIndex,
      sport: currentSport
    })
  }, [currentSport, onAnimationChange])
  
  // Handle playback state changes
  const handlePlaybackStateChange = useCallback((playing) => {
    setIsPlaying(playing)
    onAnimationChange?.({
      type: 'playback_state_changed',
      isPlaying: playing,
      sport: currentSport
    })
  }, [currentSport, onAnimationChange])
  
  // Handle canvas click for element creation
  const handleCanvasClick = useCallback((event) => {
    if (!canvasRef.current) return
    
    const rect = canvasRef.current.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    
    console.log('Canvas clicked at:', { x, y })
    
    // Here you would handle element creation based on selected tool
    // This would integrate with the ElementManager
  }, [])
  
  // Export animation
  const handleExport = useCallback((format = 'json') => {
    // This would use the AnimationEngine's export functionality
    onExport?.(format)
  }, [onExport])
  
  return (
    <div className={`multi-sport-animator ${className}`}>
      {/* Sport Selection Header */}
      <div className="flex items-center justify-between p-4 bg-gray-100 border-b">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-semibold">Multi-Sport Drill Animator</h2>
          
          {/* Sport Selector */}
          <select
            value={currentSport}
            onChange={(e) => handleSportChange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {availableSports.map(sport => (
              <option key={sport.id} value={sport.id}>
                {sport.displayName}
              </option>
            ))}
          </select>
        </div>
        
        {/* Display Controls */}
        <div className="flex items-center space-x-4">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={showFieldMarkings}
              onChange={(e) => setShowFieldMarkings(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm">Show Field</span>
          </label>
          
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={showOnionSkin}
              onChange={(e) => setShowOnionSkin(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm">Onion Skin</span>
          </label>
          
          {showOnionSkin && (
            <div className="flex items-center space-x-2">
              <label className="text-sm">Frames:</label>
              <input
                type="number"
                min="1"
                max="10"
                value={onionSkinFrames}
                onChange={(e) => setOnionSkinFrames(parseInt(e.target.value))}
                className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
              />
              <label className="text-sm">Opacity:</label>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.1"
                value={onionSkinOpacity}
                onChange={(e) => setOnionSkinOpacity(parseFloat(e.target.value))}
                className="w-20"
              />
            </div>
          )}
        </div>
      </div>
      
      {/* Main Animation Area */}
      <div className="flex-1 flex">
        {/* Canvas Area */}
        <div className="flex-1 p-4">
          <AnimationEngine
            sportId={currentSport}
            onFrameChange={handleFrameChange}
            onPlaybackStateChange={handlePlaybackStateChange}
          >
            <ElementManager
              sportId={currentSport}
              onElementCreate={handleElementCreate}
              onElementUpdate={handleElementUpdate}
              onElementDelete={handleElementDelete}
            >
              <div className="relative">
                <CanvasRenderer
                  ref={canvasRef}
                  sportId={currentSport}
                  width={sportConfig.canvas.defaultWidth}
                  height={sportConfig.canvas.defaultHeight}
                  showFieldMarkings={showFieldMarkings}
                  showOnionSkin={showOnionSkin}
                  onionSkinFrames={onionSkinFrames}
                  onionSkinOpacity={onionSkinOpacity}
                  onClick={handleCanvasClick}
                  className="mx-auto shadow-lg"
                />
                
                {/* Playback Status */}
                {isPlaying && (
                  <div className="absolute top-2 left-2 bg-green-500 text-white px-2 py-1 rounded text-sm">
                    ▶ Playing
                  </div>
                )}
              </div>
            </ElementManager>
          </AnimationEngine>
        </div>
        
        {/* Sidebar - Tools and Properties */}
        <div className="w-80 bg-gray-50 border-l p-4">
          <MultiSportSidebar
            sportId={currentSport}
            selectedElement={selectedElement}
            onElementSelect={setSelectedElement}
            onExport={handleExport}
          />
        </div>
      </div>
    </div>
  )
}

// Sidebar component for tools and properties
const MultiSportSidebar = ({ 
  sportId, 
  selectedElement, 
  onElementSelect, 
  onExport 
}) => {
  const sportConfig = getSportConfig(sportId)
  
  // Get tools by category
  const getToolsByCategory = () => {
    const categories = {}
    sportConfig.objects.forEach(obj => {
      if (!categories[obj.category]) {
        categories[obj.category] = []
      }
      categories[obj.category].push(obj)
    })
    return categories
  }
  
  const toolCategories = getToolsByCategory()
  
  return (
    <div className="space-y-6">
      {/* Sport Info */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="font-semibold text-lg mb-2">{sportConfig.displayName}</h3>
        <div className="text-sm text-gray-600 space-y-1">
          <div>Field: {sportConfig.field.width}m × {sportConfig.field.height}m</div>
          <div>Canvas: {sportConfig.canvas.defaultWidth} × {sportConfig.canvas.defaultHeight}px</div>
        </div>
      </div>
      
      {/* Tools */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="font-semibold mb-3">Tools</h3>
        {Object.entries(toolCategories).map(([category, tools]) => (
          <div key={category} className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2 capitalize">
              {category}
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {tools.map(tool => (
                <button
                  key={tool.id}
                  className="flex flex-col items-center p-2 border border-gray-200 rounded hover:bg-gray-100 transition-colors"
                  title={tool.name}
                >
                  <span className="text-lg mb-1">{tool.icon}</span>
                  <span className="text-xs text-center">{tool.name}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      
      {/* Element Properties */}
      {selectedElement && (
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-semibold mb-3">Properties</h3>
          <div className="space-y-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">Type</label>
              <input
                type="text"
                value={selectedElement.type}
                readOnly
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm bg-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">X Position</label>
              <input
                type="number"
                value={selectedElement.x || 0}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Y Position</label>
              <input
                type="number"
                value={selectedElement.y || 0}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
              />
            </div>
          </div>
        </div>
      )}
      
      {/* Export Options */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="font-semibold mb-3">Export</h3>
        <div className="space-y-2">
          <button
            onClick={() => onExport('json')}
            className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 transition-colors"
          >
            Export as JSON
          </button>
          <button
            onClick={() => onExport('video')}
            className="w-full bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600 transition-colors"
          >
            Export as Video
          </button>
        </div>
      </div>
    </div>
  )
}

export default MultiSportAnimator
