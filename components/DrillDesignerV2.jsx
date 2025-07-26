import React, { useState, useRef, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { supabase } from '../src/lib/supabase'
import { useAuth } from '../src/contexts/AuthContext'

const DrillDesignerV2 = () => {
  const navigate = useNavigate()
  const { orgId, drillId } = useParams()
  const { user } = useAuth()
  const canvasRef = useRef(null)
  const dynamicPlayerToolsRef = useRef([])
  const currentPlayerTypeRef = useRef(null)
  const toolRef = useRef('add')
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
  const [currentPlayerType, setCurrentPlayerType] = useState(null)
  const [showPlayerDropdown, setShowPlayerDropdown] = useState(false)
  const [dynamicPlayerTools, setDynamicPlayerTools] = useState([])
  const [isLoadingPlayers, setIsLoadingPlayers] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Load dynamic players (same as V1)
  const loadDynamicPlayers = async () => {
    try {
      setIsLoadingPlayers(true)
      
      // Dynamic file discovery - try to load files with common naming patterns
      const playerFiles = []
      
      // Try to discover player files (player-silhouette.png, player-silhouette2.png, etc.)
      for (let i = 1; i <= 50; i++) {
        const fileName = i === 1 ? 'player-silhouette.png' : `player-silhouette${i}.png`
        playerFiles.push(fileName)
      }
      
      // Try to discover goalie files (goalie-silhouette.png, goalie-silhouette2.png, etc.)
      for (let i = 1; i <= 20; i++) {
        const fileName = i === 1 ? 'goalie-silhouette.png' : `goalie-silhouette${i}.png`
        playerFiles.push(fileName)
      }
      
      // Also try alternative naming patterns
      const alternativePatterns = [
        'player.png', 'player1.png', 'player2.png', 'player3.png', 'player4.png', 'player5.png', 'player6.png',
        'goalie.png', 'goalie1.png', 'goalie2.png', 'goalie3.png', 'goalie4.png', 'goalie5.png'
      ]
      
      alternativePatterns.forEach(fileName => {
        if (!playerFiles.includes(fileName)) {
          playerFiles.push(fileName)
        }
      })
      
      const loadedPlayers = []
      
      for (let i = 0; i < playerFiles.length; i++) {
        const fileName = playerFiles[i]
        const imagePath = `/images/players/${fileName}`
        
        try {
          const img = new window.Image()
          await new Promise((resolve, reject) => {
            img.onload = resolve
            img.onerror = reject
            img.src = imagePath
          })
          
          // Generate a unique ID and label based on filename
          const baseName = fileName.replace('.png', '')
          const isGoalie = baseName.includes('goalie')
          
          // Extract number from filename
          let playerNumber = ''
          if (baseName.includes('player-silhouette')) {
            const match = baseName.match(/player-silhouette(\d+)/)
            playerNumber = match ? match[1] : ''
          } else if (baseName.includes('goalie-silhouette')) {
            const match = baseName.match(/goalie-silhouette(\d+)/)
            playerNumber = match ? match[1] : ''
          } else if (baseName.match(/^(player|goalie)(\d+)$/)) {
            const match = baseName.match(/^(player|goalie)(\d+)$/)
            playerNumber = match ? match[2] : ''
          }
          
          const playerId = `dynamic-player-${i}`
          const playerLabel = isGoalie 
            ? `Goalie ${playerNumber || '1'}`
            : `Player ${playerNumber || (i + 1)}`
          
          loadedPlayers.push({
            id: playerId,
            label: playerLabel,
            icon: '🏒',
            image: img,
            fileName: fileName
          })
          
        } catch (error) {
          // Silently skip files that don't exist
        }
      }
      
      console.log('Loaded players:', loadedPlayers)
      setDynamicPlayerTools(loadedPlayers)
      
    } catch (error) {
      console.error('Error loading dynamic players:', error)
    } finally {
      setIsLoadingPlayers(false)
    }
  }

  // Handle click outside dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showPlayerDropdown && !event.target.closest('.player-dropdown')) {
        setShowPlayerDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showPlayerDropdown])

  // Debug currentPlayerType changes
  useEffect(() => {
    console.log('currentPlayerType changed to:', currentPlayerType)
  }, [currentPlayerType])

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    // Use same dimensions as V1: 1200x600 (2:1 aspect ratio)
    canvas.width = 1200
    canvas.height = 600

    // Load dynamic players
    loadDynamicPlayers()

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

  // Update refs when state changes
  useEffect(() => {
    dynamicPlayerToolsRef.current = dynamicPlayerTools
  }, [dynamicPlayerTools])

  useEffect(() => {
    currentPlayerTypeRef.current = currentPlayerType
  }, [currentPlayerType])

  useEffect(() => {
    toolRef.current = tool
  }, [tool])

  // Ensure currentPlayerType is set when dynamicPlayerTools loads
  useEffect(() => {
    if (dynamicPlayerTools.length > 0 && !currentPlayerType) {
      const defaultPlayerId = dynamicPlayerTools[0].id
      setCurrentPlayerType(defaultPlayerId)
      console.log('Setting default player from useEffect:', defaultPlayerId)
    }
  }, [dynamicPlayerTools, currentPlayerType])

  // Redraw canvas when paths change
  useEffect(() => {
    redrawCanvas()
  }, [paths, currentPath, isPlaying, currentTime, elements])

  const drawElement = (ctx, element) => {
    console.log('Drawing element:', element)
    
    if (element.type === 'puck') {
      // Draw puck as a black circle
      ctx.beginPath()
      ctx.arc(element.x, element.y, element.radius, 0, 2 * Math.PI)
      ctx.fillStyle = '#000000'
      ctx.fill()
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 2
      ctx.stroke()
      
      // Draw "P" label for puck
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 12px Arial'
      ctx.textAlign = 'center'
      ctx.fillText('P', element.x, element.y + 4)
    } else if (element.type === 'player' && element.playerType) {
      // Draw player using the selected player image (use refs to avoid closure issues)
      const currentDynamicPlayerTools = dynamicPlayerToolsRef.current
      const selectedPlayerData = currentDynamicPlayerTools.find(p => p.id === element.playerType)
      console.log('Selected player data:', selectedPlayerData)
      
      if (selectedPlayerData && selectedPlayerData.image) {
        // Calculate image dimensions (doubled from V1 for better visibility)
        const imageSize = 60 // pixels
        const halfSize = imageSize / 2
        
        console.log('Drawing player image at:', element.x - halfSize, element.y - halfSize)
        
        // Draw the player image
        ctx.save()
        ctx.drawImage(
          selectedPlayerData.image,
          element.x - halfSize,
          element.y - halfSize,
          imageSize,
          imageSize
        )
        ctx.restore()
      } else {
        console.log('No player image found, using fallback')
        // Fallback to red circle if image not found
        ctx.beginPath()
        ctx.arc(element.x, element.y, element.radius, 0, 2 * Math.PI)
        ctx.fillStyle = '#ff0000'
        ctx.fill()
        ctx.strokeStyle = '#000000'
        ctx.lineWidth = 2
        ctx.stroke()
      }
    } else {
      console.log('Unknown element type:', element.type)
      // Fallback for unknown element types
      ctx.beginPath()
      ctx.arc(element.x, element.y, element.radius, 0, 2 * Math.PI)
      ctx.fillStyle = element.fill || '#ff0000'
      ctx.fill()
      ctx.strokeStyle = '#000000'
      ctx.lineWidth = 2
      ctx.stroke()
    }
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

  const addElement = (type, x, y, playerTypeOverride = null) => {
    // Get the player type to use (use refs to avoid closure issues)
    const currentDynamicPlayerTools = dynamicPlayerToolsRef.current
    const currentPlayerTypeValue = currentPlayerTypeRef.current
    const playerType = playerTypeOverride || currentPlayerTypeValue || currentDynamicPlayerTools[0]?.id
    
    const newElement = {
      id: Date.now() + Math.random(),
      type: type,
      x: x,
      y: y,
      fill: type === 'puck' ? '#000000' : '#ff0000',
      radius: type === 'puck' ? 8 : 15,
      playerType: type === 'player' ? playerType : type
    }
    console.log('Adding element:', newElement)
    console.log('Using player type:', playerType)
    console.log('Dynamic player tools length:', currentDynamicPlayerTools.length)
    setElements([...elements, newElement])
  }

  const handleCanvasClick = (e) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    // Calculate the scale factor between CSS pixels and canvas pixels
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    
    const x = (e.clientX - rect.left) * scaleX
    const y = (e.clientY - rect.top) * scaleY

    // Use refs to get current values (avoid closure issues)
    const currentDynamicPlayerTools = dynamicPlayerToolsRef.current
    const currentPlayerTypeValue = currentPlayerTypeRef.current
    const currentTool = toolRef.current

    console.log('Canvas click:', { 
      x, y, tool: currentTool, 
      currentPlayerType: currentPlayerTypeValue, 
      dynamicPlayerToolsLength: currentDynamicPlayerTools.length 
    })
    console.log('Current tool is:', currentTool)

    if (currentTool === 'add') {
      // Check if player data is loaded and a player is selected
      if (currentDynamicPlayerTools.length === 0) {
        console.log('Player data not loaded yet, please wait...')
        return
      }
      
      // Get the current player type from the refs
      const currentPlayer = currentPlayerTypeValue || currentDynamicPlayerTools[0]?.id
      if (!currentPlayer) {
        console.log('No player selected, please select a player first')
        return
      }
      
      console.log('Adding player with type:', currentPlayer)
      // Add a player at click position
      addElement('player', x, y, currentPlayer)
    } else if (currentTool === 'add-puck') {
      // Add a puck at click position
      addElement('puck', x, y)
    } else if (currentTool === 'path') {
      // Check if clicking on an element to select it for path drawing
      const clickedElement = findElementAtPosition(x, y)
      console.log('Path tool - clicked element:', clickedElement)
      if (clickedElement) {
        console.log('Setting selected path element:', clickedElement)
        setSelectedPathElement(clickedElement)
        setCurrentPath([{ x: clickedElement.x, y: clickedElement.y, time: 0 }])
      } else {
        console.log('No element found at click position for path drawing')
      }
    }
  }

  const findElementAtPosition = (x, y) => {
    console.log('Finding element at position:', { x, y, elementsCount: elements.length })
    
    const foundElement = elements.find(element => {
      const distance = Math.sqrt((x - element.x) ** 2 + (y - element.y) ** 2)
      
      // Use appropriate radius based on element type
      let detectionRadius = element.radius
      
      if (element.type === 'player') {
        // For players, use the image size for better click detection
        detectionRadius = 30 // Half of the 60px image size
      }
      
      const isWithinRadius = distance <= detectionRadius
      console.log('Checking element:', { 
        elementId: element.id, 
        elementType: element.type, 
        distance: distance.toFixed(2), 
        detectionRadius, 
        isWithinRadius 
      })
      
      return isWithinRadius
    })
    
    console.log('Found element:', foundElement)
    return foundElement
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
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Tools - Current tool: <span className="text-blue-600 font-bold">{tool}</span></h3>
                  <div className="flex items-center space-x-6">
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="add"
                        name="tool"
                        value="add"
                        checked={tool === 'add'}
                        onChange={(e) => {
                          console.log('Add tool selected! New value:', e.target.value)
                          setTool(e.target.value)
                        }}
                        className="text-blue-600"
                      />
                      <label htmlFor="add" className="text-sm font-medium text-gray-700">
                        Add Players
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="add-puck"
                        name="tool"
                        value="add-puck"
                        checked={tool === 'add-puck'}
                        onChange={(e) => {
                          console.log('Add puck tool selected! New value:', e.target.value)
                          setTool(e.target.value)
                        }}
                        className="text-blue-600"
                      />
                      <label htmlFor="add-puck" className="text-sm font-medium text-gray-700">
                        Add Puck
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="path"
                        name="tool"
                        value="path"
                        checked={tool === 'path'}
                        onChange={(e) => {
                          console.log('Path tool selected! New value:', e.target.value)
                          setTool(e.target.value)
                        }}
                        className="text-blue-600"
                      />
                      <label htmlFor="path" className="text-sm font-medium text-gray-700">
                        Draw Paths
                      </label>
                    </div>
                    
                    {/* Player Selection Dropdown */}
                    {tool === 'add' && (
                      <div className="relative player-dropdown">
                        {isLoadingPlayers ? (
                          <div className="flex items-center space-x-2 px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-sm text-gray-500">
                            <span>Loading players...</span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setShowPlayerDropdown(!showPlayerDropdown)}
                            className="flex items-center space-x-2 px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            {(() => {
                              const selectedPlayerData = dynamicPlayerTools.find(p => p.id === currentPlayerType)
                              return selectedPlayerData && selectedPlayerData.image ? (
                                <img 
                                  src={selectedPlayerData.image.src} 
                                  alt={selectedPlayerData.label}
                                  className="w-6 h-6 object-contain"
                                />
                              ) : (
                                <span>🏒</span>
                              )
                            })()}
                            <span>
                              {dynamicPlayerTools.find(p => p.id === currentPlayerType)?.label || 'Select Player'}
                            </span>
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                        )}
                        
                        {/* Player Dropdown */}
                        {showPlayerDropdown && !isLoadingPlayers && (
                          <div className="absolute z-10 mt-1 w-56 bg-white shadow-lg border border-gray-200 rounded-md max-h-60 overflow-y-auto">
                            {dynamicPlayerTools.map((player) => (
                              <button
                                key={player.id}
                                onClick={() => {
                                  setCurrentPlayerType(player.id)
                                  setShowPlayerDropdown(false)
                                }}
                                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${
                                  currentPlayerType === player.id ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                                }`}
                              >
                                <div className="flex items-center space-x-2">
                                  {player.image ? (
                                    <img 
                                      src={player.image.src} 
                                      alt={player.label}
                                      className="w-6 h-6 object-contain"
                                    />
                                  ) : (
                                    <span>{player.icon}</span>
                                  )}
                                  <span>{player.label}</span>
                                  {currentPlayerType === player.id && (
                                    <svg className="h-4 w-4 ml-auto text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                  )}
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    
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