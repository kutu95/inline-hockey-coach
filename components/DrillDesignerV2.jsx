import React, { useState, useRef, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { supabase } from '../src/lib/supabase'
import { useAuth } from '../src/contexts/AuthContext'

const DrillDesignerV2 = () => {
  const navigate = useNavigate()
  const { orgId, drillId } = useParams()
  const { user } = useAuth()
  const canvasRef = useRef(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentPath, setCurrentPath] = useState([])
  const [paths, setPaths] = useState([])
  const [selectedPlayer, setSelectedPlayer] = useState(null)
  const [players, setPlayers] = useState([])
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [animationDuration, setAnimationDuration] = useState(10) // seconds
  const [tool, setTool] = useState('add') // 'add', 'path', 'select'
  const [selectedElement, setSelectedElement] = useState(null)
  const [elements, setElements] = useState([])
  const [selectedPathElement, setSelectedPathElement] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    // Use same dimensions as V1: 1200x600 (2:1 aspect ratio)
    canvas.width = 1200
    canvas.height = 600

    // Add event listeners
    canvas.addEventListener('click', handleCanvasClick)
    canvas.addEventListener('mousedown', handleMouseDown)
    canvas.addEventListener('mousemove', handleMouseMove)
    canvas.addEventListener('mouseup', handleMouseUp)

    return () => {
      canvas.removeEventListener('click', handleCanvasClick)
      canvas.removeEventListener('mousedown', handleMouseDown)
      canvas.removeEventListener('mousemove', handleMouseMove)
      canvas.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  // Redraw canvas when paths change
  useEffect(() => {
    redrawCanvas()
  }, [paths, currentPath, isPlaying, currentTime, elements])

  const drawElement = (ctx, element) => {
    ctx.beginPath()
    ctx.arc(element.x, element.y, element.radius, 0, 2 * Math.PI)
    ctx.fillStyle = element.fill
    ctx.fill()
    ctx.strokeStyle = '#000000'
    ctx.lineWidth = 2
    ctx.stroke()
    
    // Draw element type label
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 12px Arial'
    ctx.textAlign = 'center'
    ctx.fillText(element.type === 'puck' ? 'P' : 'P', element.x, element.y + 4)
  }

  const drawRinkBackground = (ctx) => {
    const canvas = ctx.canvas
    const rinkColor = '#87CEEB' // Light blue (same as V1)
    const lineColor = '#FF0000' // Red lines (same as V1)
    const borderColor = '#000000' // Black border (same as V1)
    
    // Rink dimensions and scaling (same as V1)
    const rinkLength = 60 // meters
    const rinkWidth = 30 // meters
    const scaleX = canvas.width / rinkLength
    const scaleY = canvas.height / rinkWidth
    const cornerRadius = 8.5 // meters (same as V1)
    
    // Convert meters to pixels
    const mToPx = (meters) => meters * scaleX
    const mToPxY = (meters) => meters * scaleY
    
    // Rink Background
    ctx.fillStyle = rinkColor
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    
    // Rink Border with rounded corners
    ctx.strokeStyle = borderColor
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.roundRect(0, 0, canvas.width, canvas.height, mToPx(cornerRadius))
    ctx.stroke()
    
    // Center Line
    ctx.strokeStyle = lineColor
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(canvas.width / 2, 0)
    ctx.lineTo(canvas.width / 2, canvas.height)
    ctx.stroke()
    
    // Face-off Circles
    ctx.strokeStyle = lineColor
    ctx.lineWidth = 3
    
    // Center face-off circle
    ctx.beginPath()
    ctx.arc(canvas.width / 2, canvas.height / 2, mToPx(2.25), 0, 2 * Math.PI)
    ctx.stroke()
    
    // Corner face-off circles
    ctx.beginPath()
    ctx.arc(mToPx(14), mToPxY(7), mToPx(2.25), 0, 2 * Math.PI)
    ctx.stroke()
    
    ctx.beginPath()
    ctx.arc(canvas.width - mToPx(14), mToPxY(7), mToPx(2.25), 0, 2 * Math.PI)
    ctx.stroke()
    
    ctx.beginPath()
    ctx.arc(mToPx(14), canvas.height - mToPxY(7), mToPx(2.25), 0, 2 * Math.PI)
    ctx.stroke()
    
    ctx.beginPath()
    ctx.arc(canvas.width - mToPx(14), canvas.height - mToPxY(7), mToPx(2.25), 0, 2 * Math.PI)
    ctx.stroke()
    
    // Hash Marks at Face-off Circles
    ctx.fillStyle = lineColor
    
    // Top Left Face-off Circle
    ctx.fillRect(mToPx(14) - mToPx(0.3), mToPxY(7) - mToPxY(0.3), mToPx(0.6), mToPxY(0.6))
    
    // Top Right Face-off Circle
    ctx.fillRect(canvas.width - mToPx(14) - mToPx(0.3), mToPxY(7) - mToPxY(0.3), mToPx(0.6), mToPxY(0.6))
    
    // Bottom Left Face-off Circle
    ctx.fillRect(mToPx(14) - mToPx(0.3), canvas.height - mToPxY(7) - mToPxY(0.3), mToPx(0.6), mToPxY(0.6))
    
    // Bottom Right Face-off Circle
    ctx.fillRect(canvas.width - mToPx(14) - mToPx(0.3), canvas.height - mToPxY(7) - mToPxY(0.3), mToPx(0.6), mToPxY(0.6))
    
    // Center Ice Hash Mark
    ctx.fillStyle = '#0000FF'
    ctx.fillRect(canvas.width / 2 - mToPx(0.3), canvas.height / 2 - mToPxY(0.3), mToPx(0.6), mToPxY(0.6))
    
    // Goal Lines
    ctx.strokeStyle = lineColor
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(mToPx(4.5), 10)
    ctx.lineTo(mToPx(4.5), canvas.height - 10)
    ctx.stroke()
    
    ctx.beginPath()
    ctx.moveTo(canvas.width - mToPx(4.5), 10)
    ctx.lineTo(canvas.width - mToPx(4.5), canvas.height - 10)
    ctx.stroke()
    
    // Goals
    // Left Goal
    ctx.fillStyle = '#FFFFFF'
    ctx.strokeStyle = '#000000'
    ctx.lineWidth = 2
    ctx.fillRect(mToPx(4.5) - mToPxY(1), canvas.height / 2 - mToPx(0.9), mToPxY(1), mToPx(1.8))
    ctx.strokeRect(mToPx(4.5) - mToPxY(1), canvas.height / 2 - mToPx(0.9), mToPxY(1), mToPx(1.8))
    
    // Right Goal
    ctx.fillRect(canvas.width - mToPx(4.5), canvas.height / 2 - mToPx(0.9), mToPxY(1), mToPx(1.8))
    ctx.strokeRect(canvas.width - mToPx(4.5), canvas.height / 2 - mToPx(0.9), mToPxY(1), mToPx(1.8))
    
    // Neutral Zone Dots
    ctx.fillStyle = lineColor
    ctx.beginPath()
    ctx.arc(canvas.width / 2, mToPxY(3), mToPx(0.3), 0, 2 * Math.PI)
    ctx.fill()
    
    ctx.beginPath()
    ctx.arc(canvas.width / 2, canvas.height - mToPxY(3), mToPx(0.3), 0, 2 * Math.PI)
    ctx.fill()
    
    // Center Ice Dot
    ctx.beginPath()
    ctx.arc(canvas.width / 2, canvas.height / 2, mToPx(0.3), 0, 2 * Math.PI)
    ctx.fill()
  }

  const redrawCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    // Draw rink background (same as V1)
    drawRinkBackground(ctx)
    
    // Draw all elements (players, pucks)
    elements.forEach(element => {
      drawElement(ctx, element)
    })
    
    // Draw all completed paths
    paths.forEach((path, index) => {
      drawPath(ctx, path, index === selectedPlayer)
    })
    
    // Draw current path being drawn
    if (currentPath.length > 0) {
      drawPath(ctx, currentPath, false, true)
    }
    
    // Draw players at current time if playing
    if (isPlaying) {
      drawPlayersAtTime(ctx, currentTime)
    }
  }

  const drawPath = (ctx, path, isSelected = false, isDrawing = false) => {
    if (path.length < 2) return

    ctx.beginPath()
    ctx.moveTo(path[0].x, path[0].y)
    
    for (let i = 1; i < path.length; i++) {
      ctx.lineTo(path[i].x, path[i].y)
    }
    
    ctx.strokeStyle = isSelected ? '#ff0000' : isDrawing ? '#00ff00' : '#0000ff'
    ctx.lineWidth = isSelected ? 3 : 2
    ctx.stroke()
    
    // Draw points
    path.forEach((point, index) => {
      ctx.beginPath()
      ctx.arc(point.x, point.y, 4, 0, 2 * Math.PI)
      ctx.fillStyle = isSelected ? '#ff0000' : '#0000ff'
      ctx.fill()
      
      // Draw time labels
      if (index % 5 === 0) {
        ctx.fillStyle = '#000000'
        ctx.font = '12px Arial'
        ctx.fillText(`${point.time}s`, point.x + 5, point.y - 5)
      }
    })
  }

  const drawPlayersAtTime = (ctx, time) => {
    paths.forEach((path, playerIndex) => {
      const position = getPlayerPositionAtTime(path, time)
      if (position) {
        ctx.beginPath()
        ctx.arc(position.x, position.y, 15, 0, 2 * Math.PI)
        ctx.fillStyle = `hsl(${playerIndex * 60}, 70%, 50%)`
        ctx.fill()
        ctx.strokeStyle = '#000000'
        ctx.lineWidth = 2
        ctx.stroke()
        
        // Draw player number
        ctx.fillStyle = '#ffffff'
        ctx.font = 'bold 14px Arial'
        ctx.textAlign = 'center'
        ctx.fillText(`${playerIndex + 1}`, position.x, position.y + 4)
      }
    })
  }

  const getPlayerPositionAtTime = (path, time) => {
    if (path.length < 2) return null
    
    // Find the two points that bracket the current time
    let startIndex = 0
    for (let i = 0; i < path.length - 1; i++) {
      if (path[i].time <= time && path[i + 1].time >= time) {
        startIndex = i
        break
      }
    }
    
    if (startIndex >= path.length - 1) {
      return path[path.length - 1]
    }
    
    const start = path[startIndex]
    const end = path[startIndex + 1]
    const progress = (time - start.time) / (end.time - start.time)
    
    return {
      x: start.x + (end.x - start.x) * progress,
      y: start.y + (end.y - start.y) * progress
    }
  }

  const handleMouseDown = (e) => {
    if (tool !== 'path' || !selectedPathElement) return
    
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    setIsDrawing(true)
    setCurrentPath([{ x: selectedPathElement.x, y: selectedPathElement.y, time: 0 }])
  }

  const handleMouseMove = (e) => {
    if (!isDrawing || tool !== 'path' || !selectedPathElement) return
    
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    const time = currentPath.length * 0.5 // 0.5 seconds per point
    setCurrentPath(prev => [...prev, { x, y, time }])
  }

  const handleMouseUp = () => {
    if (!isDrawing) return
    
    setIsDrawing(false)
    if (currentPath.length > 1) {
      setPaths(prev => [...prev, currentPath])
      setCurrentPath([])
    }
  }

  const startAnimation = () => {
    setIsPlaying(true)
    setCurrentTime(0)
    
    const interval = setInterval(() => {
      setCurrentTime(prev => {
        if (prev >= animationDuration) {
          setIsPlaying(false)
          clearInterval(interval)
          return 0
        }
        return prev + 0.1
      })
    }, 100)
  }

  const stopAnimation = () => {
    setIsPlaying(false)
    setCurrentTime(0)
  }

  const clearAllPaths = () => {
    setPaths([])
    setCurrentPath([])
    setSelectedPlayer(null)
  }

  const deleteSelectedPath = () => {
    if (selectedPlayer !== null) {
      setPaths(prev => prev.filter((_, index) => index !== selectedPlayer))
      setSelectedPlayer(null)
    }
  }

  const addElement = (type, x, y) => {
    const newElement = {
      id: Date.now() + Math.random(),
      type: type,
      x: x,
      y: y,
      fill: type === 'puck' ? '#000000' : '#ff0000',
      radius: type === 'puck' ? 8 : 15
    }
    setElements([...elements, newElement])
  }

  const handleCanvasClick = (e) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    if (tool === 'add') {
      // Add a player at click position
      addElement('player', x, y)
    } else if (tool === 'path') {
      // Check if clicking on an element to select it for path drawing
      const clickedElement = findElementAtPosition(x, y)
      if (clickedElement) {
        setSelectedPathElement(clickedElement)
        setCurrentPath([{ x: clickedElement.x, y: clickedElement.y, time: 0 }])
      }
    }
  }

  const findElementAtPosition = (x, y) => {
    return elements.find(element => {
      const distance = Math.sqrt((x - element.x) ** 2 + (y - element.y) ** 2)
      return distance <= element.radius
    })
  }

  const selectPath = (index) => {
    setSelectedPlayer(index)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header */}
          <div className="bg-white shadow rounded-lg mb-6">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Link
                    to={orgId ? `/organisations/${orgId}/drills` : '/drills'}
                    className="text-gray-600 hover:text-gray-800 font-medium"
                  >
                    ← Back to Drills
                  </Link>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">Drill Designer V2</h1>
                    <p className="text-gray-600 mt-1">Path-driven animation designer</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={clearAllPaths}
                    className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-md transition duration-150 ease-in-out"
                  >
                    Clear All
                  </button>
                  <button
                    onClick={deleteSelectedPath}
                    disabled={selectedPlayer === null}
                    className="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-md transition duration-150 ease-in-out"
                  >
                    Delete Selected
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Canvas */}
            <div className="lg:col-span-3">
              <div className="bg-white shadow rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Rink Canvas</h2>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={isPlaying ? stopAnimation : startAnimation}
                      className={`px-4 py-2 rounded-md font-medium transition duration-150 ease-in-out ${
                        isPlaying 
                          ? 'bg-red-600 hover:bg-red-700 text-white' 
                          : 'bg-green-600 hover:bg-green-700 text-white'
                      }`}
                    >
                      {isPlaying ? 'Stop' : 'Play'}
                    </button>
                    <span className="text-sm text-gray-600">
                      {currentTime.toFixed(1)}s / {animationDuration}s
                    </span>
                  </div>
                </div>
                
                <div className="border-2 border-gray-300 rounded-lg overflow-hidden">
                  <canvas
                    ref={canvasRef}
                    className="w-full h-auto cursor-crosshair"
                    style={{ maxHeight: '600px' }}
                  />
                </div>
                
                {/* Toolbar */}
                <div className="mt-4 p-4 bg-gray-100 rounded-lg border">
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Tools</h3>
                  <div className="flex items-center space-x-6">
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="add"
                        name="tool"
                        value="add"
                        checked={tool === 'add'}
                        onChange={(e) => setTool(e.target.value)}
                        className="text-blue-600"
                      />
                      <label htmlFor="add" className="text-sm font-medium text-gray-700">
                        Add Players
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="path"
                        name="tool"
                        value="path"
                        checked={tool === 'path'}
                        onChange={(e) => setTool(e.target.value)}
                        className="text-blue-600"
                      />
                      <label htmlFor="path" className="text-sm font-medium text-gray-700">
                        Draw Paths
                      </label>
                    </div>
                    <div className="text-sm text-gray-500">
                      Current tool: <span className="font-medium">{tool}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Controls Panel */}
            <div className="lg:col-span-1">
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Controls</h3>
                
                {/* Animation Duration */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Animation Duration (seconds)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={animationDuration}
                    onChange={(e) => setAnimationDuration(parseFloat(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Paths List */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Player Paths ({paths.length})
                  </label>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {paths.map((path, index) => (
                      <div
                        key={index}
                        onClick={() => selectPath(index)}
                        className={`p-2 rounded-md cursor-pointer transition duration-150 ease-in-out ${
                          selectedPlayer === index
                            ? 'bg-blue-100 border-2 border-blue-500'
                            : 'bg-gray-100 hover:bg-gray-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Player {index + 1}</span>
                          <span className="text-xs text-gray-500">
                            {path.length} points
                          </span>
                        </div>
                        <div className="text-xs text-gray-500">
                          Duration: {path[path.length - 1]?.time?.toFixed(1) || 0}s
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Instructions */}
                <div className="mt-6 p-4 bg-blue-50 rounded-md">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">How to Use:</h4>
                  <ul className="text-xs text-blue-800 space-y-1">
                    <li>• Select "Add Players" tool</li>
                    <li>• Click on the rink to add players</li>
                    <li>• Select "Draw Paths" tool</li>
                    <li>• Click on a player to select it</li>
                    <li>• Click and drag to draw movement path</li>
                    <li>• Click "Play" to see animation</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DrillDesignerV2 