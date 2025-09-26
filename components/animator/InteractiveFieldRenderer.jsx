import React, { useRef, useEffect, useState, useCallback } from 'react'
import { getSportConfig, getSportObjects } from '../../src/lib/sports/config'

/**
 * InteractiveFieldRenderer - Click-to-place objects on sport fields
 */
const InteractiveFieldRenderer = ({ 
  sportId = 'hockey',
  width = 600,
  height = 400,
  className = ''
}) => {
  const canvasRef = useRef(null)
  const [selectedTool, setSelectedTool] = useState(null)
  const [placedObjects, setPlacedObjects] = useState([])
  const [currentFrame, setCurrentFrame] = useState(0)
  const [frames, setFrames] = useState([[]]) // Start with one empty frame
  
  const sportConfig = getSportConfig(sportId)
  const availableObjects = getSportObjects(sportId)
  
  // Handle canvas click to place objects
  const handleCanvasClick = useCallback((event) => {
    if (!selectedTool) return
    
    const canvas = canvasRef.current
    if (!canvas) return
    
    const rect = canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    
    // Find the selected object configuration
    const objectConfig = availableObjects.find(obj => obj.id === selectedTool)
    if (!objectConfig) return
    
    // Create new object
    const newObject = {
      id: `obj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: objectConfig.type,
      x: x,
      y: y,
      ...objectConfig.defaultProps,
      frame: currentFrame
    }
    
    // Add to current frame
    setFrames(prev => {
      const newFrames = [...prev]
      newFrames[currentFrame] = [...(newFrames[currentFrame] || []), newObject]
      return newFrames
    })
  }, [selectedTool, availableObjects, currentFrame])
  
  // Render field background and markings
  const renderField = useCallback((ctx) => {
    // Clear canvas
    ctx.clearRect(0, 0, width, height)
    
    // Set background color
    ctx.fillStyle = sportConfig.canvas.backgroundColor
    ctx.fillRect(0, 0, width, height)
    
    // Draw field boundary
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 3
    ctx.strokeRect(10, 10, width - 20, height - 20)
    
    // Draw center line
    ctx.beginPath()
    ctx.moveTo(width / 2, 10)
    ctx.lineTo(width / 2, height - 10)
    ctx.stroke()
    
    // Draw center circle
    ctx.beginPath()
    ctx.arc(width / 2, height / 2, Math.min(width, height) * 0.15, 0, 2 * Math.PI)
    ctx.stroke()
    
    // Add sport-specific elements
    if (sportId === 'hockey') {
      // Draw goal lines
      ctx.strokeStyle = '#ff0000'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(50, 10)
      ctx.lineTo(50, height - 10)
      ctx.moveTo(width - 50, 10)
      ctx.lineTo(width - 50, height - 10)
      ctx.stroke()
      
      // Draw faceoff circles
      ctx.strokeStyle = '#ff0000'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(150, 100, 20, 0, 2 * Math.PI)
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(width - 150, 100, 20, 0, 2 * Math.PI)
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(150, height - 100, 20, 0, 2 * Math.PI)
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(width - 150, height - 100, 20, 0, 2 * Math.PI)
      ctx.stroke()
      
    } else if (sportId === 'soccer') {
      // Draw penalty areas
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 2
      ctx.strokeRect(50, height * 0.3, 80, height * 0.4)
      ctx.strokeRect(width - 130, height * 0.3, 80, height * 0.4)
      
      // Draw goals
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 3
      ctx.strokeRect(30, height * 0.4, 20, height * 0.2)
      ctx.strokeRect(width - 50, height * 0.4, 20, height * 0.2)
      
    } else if (sportId === 'basketball') {
      // Draw three-point lines (simplified)
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(150, height / 2, 120, 0, Math.PI)
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(width - 150, height / 2, 120, 0, Math.PI)
      ctx.stroke()
    }
  }, [sportId, width, height, sportConfig.canvas.backgroundColor])
  
  // Render placed objects
  const renderObjects = useCallback((ctx) => {
    const currentFrameObjects = frames[currentFrame] || []
    
    currentFrameObjects.forEach(obj => {
      ctx.save()
      
      switch (obj.type) {
        case 'puck':
        case 'ball':
          ctx.beginPath()
          ctx.arc(obj.x, obj.y, obj.radius || 10, 0, 2 * Math.PI)
          if (obj.fill) {
            ctx.fillStyle = obj.fill
            ctx.fill()
          }
          if (obj.stroke) {
            ctx.strokeStyle = obj.stroke
            ctx.lineWidth = obj.strokeWidth || 2
            ctx.stroke()
          }
          break
          
        case 'dynamic-player':
        case 'player':
          ctx.beginPath()
          ctx.arc(obj.x, obj.y, obj.radius || 15, 0, 2 * Math.PI)
          if (obj.fill) {
            ctx.fillStyle = obj.fill
            ctx.fill()
          }
          if (obj.stroke) {
            ctx.strokeStyle = obj.stroke
            ctx.lineWidth = obj.strokeWidth || 2
            ctx.stroke()
          }
          
          // Draw player number
          if (obj.text) {
            ctx.fillStyle = '#FFFFFF'
            ctx.font = '12px Arial'
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.fillText(obj.text, obj.x, obj.y)
          }
          break
          
        case 'goal':
        case 'basket':
          ctx.beginPath()
          ctx.rect(obj.x - (obj.width || 30) / 2, obj.y - (obj.height || 20) / 2, obj.width || 30, obj.height || 20)
          if (obj.fill && obj.fill !== 'transparent') {
            ctx.fillStyle = obj.fill
            ctx.fill()
          }
          if (obj.stroke) {
            ctx.strokeStyle = obj.stroke
            ctx.lineWidth = obj.strokeWidth || 3
            ctx.stroke()
          }
          break
          
        case 'cone':
          // Draw triangle for cone
          ctx.beginPath()
          ctx.moveTo(obj.x, obj.y - (obj.height || 10))
          ctx.lineTo(obj.x - (obj.width || 10) / 2, obj.y + (obj.height || 10))
          ctx.lineTo(obj.x + (obj.width || 10) / 2, obj.y + (obj.height || 10))
          ctx.closePath()
          if (obj.fill) {
            ctx.fillStyle = obj.fill
            ctx.fill()
          }
          if (obj.stroke) {
            ctx.strokeStyle = obj.stroke
            ctx.lineWidth = obj.strokeWidth || 1
            ctx.stroke()
          }
          break
      }
      
      ctx.restore()
    })
  }, [frames, currentFrame])
  
  // Main render function
  const render = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    renderField(ctx)
    renderObjects(ctx)
  }, [renderField, renderObjects])
  
  // Render when dependencies change
  useEffect(() => {
    render()
  }, [render, sportId])
  
  // Animation controls
  const addFrame = () => {
    setFrames(prev => [...prev, []])
    setCurrentFrame(prev => prev + 1)
  }
  
  const removeFrame = () => {
    if (frames.length > 1) {
      setFrames(prev => prev.filter((_, index) => index !== currentFrame))
      setCurrentFrame(prev => Math.max(0, prev - 1))
    }
  }
  
  const goToFrame = (frameIndex) => {
    if (frameIndex >= 0 && frameIndex < frames.length) {
      setCurrentFrame(frameIndex)
    }
  }
  
  return (
    <div className={`interactive-field-renderer ${className}`}>
      {/* Tool Selection */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Tools:</h4>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedTool(null)}
            className={`px-3 py-1 rounded text-sm ${
              !selectedTool ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            Select
          </button>
          {availableObjects.map(obj => (
            <button
              key={obj.id}
              onClick={() => setSelectedTool(obj.id)}
              className={`px-3 py-1 rounded text-sm flex items-center space-x-1 ${
                selectedTool === obj.id ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
              }`}
            >
              <span>{obj.icon}</span>
              <span>{obj.name}</span>
            </button>
          ))}
        </div>
      </div>
      
      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onClick={handleCanvasClick}
        className="border border-gray-300 rounded-lg shadow-lg cursor-crosshair"
        style={{ display: 'block' }}
      />
      
      {/* Animation Controls */}
      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => goToFrame(0)}
            disabled={currentFrame === 0}
            className="px-2 py-1 text-sm bg-gray-200 rounded disabled:opacity-50"
          >
            ⏮
          </button>
          <button
            onClick={() => goToFrame(currentFrame - 1)}
            disabled={currentFrame === 0}
            className="px-2 py-1 text-sm bg-gray-200 rounded disabled:opacity-50"
          >
            ⏪
          </button>
          <span className="text-sm font-medium">
            Frame {currentFrame + 1} of {frames.length}
          </span>
          <button
            onClick={() => goToFrame(currentFrame + 1)}
            disabled={currentFrame >= frames.length - 1}
            className="px-2 py-1 text-sm bg-gray-200 rounded disabled:opacity-50"
          >
            ⏩
          </button>
          <button
            onClick={() => goToFrame(frames.length - 1)}
            disabled={currentFrame >= frames.length - 1}
            className="px-2 py-1 text-sm bg-gray-200 rounded disabled:opacity-50"
          >
            ⏭
          </button>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={addFrame}
            className="px-3 py-1 text-sm bg-green-600 text-white rounded"
          >
            + Add Frame
          </button>
          <button
            onClick={removeFrame}
            disabled={frames.length <= 1}
            className="px-3 py-1 text-sm bg-red-600 text-white rounded disabled:opacity-50"
          >
            - Remove Frame
          </button>
        </div>
      </div>
      
      {/* Instructions */}
      <div className="mt-2 text-xs text-gray-600">
        {selectedTool ? (
          <span>Click on the field to place a <strong>{availableObjects.find(obj => obj.id === selectedTool)?.name}</strong></span>
        ) : (
          <span>Select a tool above, then click on the field to place objects</span>
        )}
      </div>
    </div>
  )
}

export default InteractiveFieldRenderer
