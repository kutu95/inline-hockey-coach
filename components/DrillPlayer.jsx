import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../src/lib/supabase'

const DrillPlayer = ({ mediaId, title, description }) => {
  const [animationData, setAnimationData] = useState(null)
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [canvasWidth, setCanvasWidth] = useState(800)
  const [canvasHeight, setCanvasHeight] = useState(600)
  const [frameRate, setFrameRate] = useState(5)
  const [dynamicPlayerTools, setDynamicPlayerTools] = useState([])
  const [flipHistory, setFlipHistory] = useState({})
  
  const animationRef = useRef()
  const canvasRef = useRef()
  const isPlayingRef = useRef(false)

  // Helper function to calculate if a player is flipped at a given frame
  const isPlayerFlippedAtFrame = (playerId, frameIndex) => {
    const flipFrames = flipHistory[playerId] || []
    // Count how many flips occurred before or at this frame
    const flipCount = flipFrames.filter(frameNum => frameNum <= frameIndex).length
    // Player is flipped if there's an odd number of flips
    return flipCount % 2 === 1
  }

  useEffect(() => {
    if (mediaId) {
      loadAnimationData()
    }
  }, [mediaId])

  useEffect(() => {
    loadDynamicPlayers()
  }, [])

  // Render first frame when animation data is loaded
  useEffect(() => {
    if (animationData && animationData.frames && animationData.frames.length > 0) {
      // Small delay to ensure canvas is ready
      setTimeout(() => {
        renderFrame(0)
      }, 100)
    }
  }, [animationData])

  useEffect(() => {
    return () => {
      isPlayingRef.current = false
    }
  }, [])

  const loadDynamicPlayers = async () => {
    try {
      // Dynamic file discovery - try to load files with common naming patterns
      const playerFiles = []
      
      // Try to discover player files (player-silhouette.png, player-silhouette2.png, etc.)
      for (let i = 1; i <= 50; i++) { // Try up to 50 players
        const fileName = i === 1 ? 'player-silhouette.png' : `player-silhouette${i}.png`
        playerFiles.push(fileName)
      }
      
      // Try to discover goalie files (goalie-silhouette.png, goalie-silhouette2.png, etc.)
      for (let i = 1; i <= 20; i++) { // Try up to 20 goalies
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
          
          // Extract number from filename (e.g., "player-silhouette6" -> "6")
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
          // Silently skip files that don't exist - this is expected for discovery
        }
      }
      
      setDynamicPlayerTools(loadedPlayers)
      
    } catch (error) {
      console.error('Error loading dynamic players:', error)
    }
  }

  const loadAnimationData = async () => {
    try {
      setLoading(true)
      setError('')
      
      // Get the media attachment record
      const { data: mediaRecord, error: mediaError } = await supabase
        .from('media_attachments')
        .select('*')
        .eq('id', mediaId)
        .single()

      if (mediaError) {
        throw new Error(`Failed to fetch media record: ${mediaError.message}`)
      }

      if (!mediaRecord.animation_data_path) {
        throw new Error('This media does not contain animation data')
      }

      // Download the animation data JSON file
      const { data, error } = await supabase.storage
        .from('media')
        .download(mediaRecord.animation_data_path)

      if (error) {
        throw new Error(`Failed to download animation data: ${error.message}`)
      }

      // Parse the JSON data
      const text = await data.text()
      const animationData = JSON.parse(text)
      
      setAnimationData(animationData)
      setFrameRate(animationData.frameRate || 5)
      setCanvasWidth(animationData.canvasWidth || 800)
      setCanvasHeight(animationData.canvasHeight || 600)
      setCurrentFrameIndex(0)
      
      // Load flip history - first check animation level, then fall back to frame level
      if (animationData.flipHistory) {
        // Use flip history stored at animation level (newer format)
        setFlipHistory(animationData.flipHistory)
        console.log('DrillPlayer restored flip history from animation level:', animationData.flipHistory)
      } else if (animationData.frames && animationData.frames.length > 0) {
        // Fall back to finding the most recent frame with flip history (older format)
        let latestFlipHistory = {}
        for (let i = animationData.frames.length - 1; i >= 0; i--) {
          if (animationData.frames[i].flipHistory) {
            latestFlipHistory = animationData.frames[i].flipHistory
            break
          }
        }
        setFlipHistory(latestFlipHistory)
        console.log('DrillPlayer restored flip history from frame level:', latestFlipHistory)
      }
      
    } catch (err) {
      console.error('Error loading animation:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const renderFrame = (frameIndex) => {
    if (!animationData || !animationData.frames || frameIndex >= animationData.frames.length) {
      return
    }

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    const frame = animationData.frames[frameIndex]

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Rink dimensions and scaling (same as DrillDesigner)
    const rinkLength = 60 // meters
    const rinkWidth = 30 // meters
    const cornerRadius = 8.5 // meters
    const scaleX = canvas.width / rinkLength
    const scaleY = canvas.height / rinkWidth
    
    // Rink colors
    const rinkColor = '#87CEEB' // Light blue
    const lineColor = '#FF0000' // Red lines
    const borderColor = '#000000' // Black border
    
    // Convert meters to pixels
    const mToPx = (meters) => meters * scaleX
    const mToPxY = (meters) => meters * scaleY

    // Render complete rink background with all elements
    // Rink Background
    ctx.fillStyle = rinkColor
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    
    // Rink Border with rounded corners
    ctx.strokeStyle = borderColor
    ctx.lineWidth = 3
    ctx.beginPath()
    // Use a more compatible approach for rounded rectangles
    const radius = mToPx(cornerRadius)
    ctx.moveTo(radius, 0)
    ctx.lineTo(canvas.width - radius, 0)
    ctx.quadraticCurveTo(canvas.width, 0, canvas.width, radius)
    ctx.lineTo(canvas.width, canvas.height - radius)
    ctx.quadraticCurveTo(canvas.width, canvas.height, canvas.width - radius, canvas.height)
    ctx.lineTo(radius, canvas.height)
    ctx.quadraticCurveTo(0, canvas.height, 0, canvas.height - radius)
    ctx.lineTo(0, radius)
    ctx.quadraticCurveTo(0, 0, radius, 0)
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

    // Render elements from the frame
    if (frame.elements) {
      frame.elements.forEach(element => {
        renderElement(ctx, element, frameIndex)
      })
    }
  }

  const renderElement = (ctx, element, frameIndex) => {
    switch (element.type) {
      case 'puck':
        ctx.fillStyle = element.fill || '#000000'
        ctx.beginPath()
        ctx.arc(element.x, element.y, element.radius || 8, 0, 2 * Math.PI)
        ctx.fill()
        break
        
      case 'arrow':
        ctx.strokeStyle = element.stroke || '#000000'
        ctx.lineWidth = element.strokeWidth || 3
        ctx.beginPath()
        ctx.moveTo(element.x, element.y)
        ctx.lineTo(element.x + (element.points?.[2] || 50), element.y + (element.points?.[3] || 0))
        ctx.stroke()
        break
        
      case 'text':
        ctx.fillStyle = element.fill || '#000000'
        ctx.font = `${element.fontSize || 16}px ${element.fontFamily || 'Arial'}`
        ctx.fillText(element.text || 'Text', element.x, element.y)
        break
        
      case 'draw':
        if (element.points && element.points.length > 2) {
          ctx.strokeStyle = element.stroke || '#000000'
          ctx.lineWidth = element.strokeWidth || 3
          ctx.beginPath()
          ctx.moveTo(element.points[0], element.points[1])
          for (let i = 2; i < element.points.length; i += 2) {
            ctx.lineTo(element.points[i], element.points[i + 1])
          }
          ctx.stroke()
        }
        break
        
      default:
        // Handle dynamic player IDs (they start with 'dynamic-player-')
        if (element.type.startsWith('dynamic-player-')) {
          // Find the corresponding player in dynamicPlayerTools
          const dynamicPlayer = dynamicPlayerTools.find(p => p.id === element.type)
          const currentPlayerImage = dynamicPlayer?.image
          
          if (currentPlayerImage) {
            // Draw the player image
            const imageWidth = currentPlayerImage.width
            const imageHeight = currentPlayerImage.height
            const isFlipped = isPlayerFlippedAtFrame(element.id, frameIndex)
            
            ctx.save()
            ctx.translate(element.x, element.y)
            if (isFlipped) {
              ctx.scale(-1, 1)
              // Adjust x position to center the flipped image (same as Konva logic)
              ctx.translate(imageWidth / 2, 0)
            }
            ctx.drawImage(
              currentPlayerImage,
              -imageWidth / 2,
              -imageHeight / 2,
              imageWidth,
              imageHeight
            )
            ctx.restore()
          } else {
            // Fallback to colored circle if image not loaded
            const fillColor = element.fill || '#ff0000'
            const strokeColor = element.stroke || '#ffffff'
            const strokeWidth = element.strokeWidth || 2
            
            ctx.fillStyle = fillColor
            ctx.strokeStyle = strokeColor
            ctx.lineWidth = strokeWidth
            
            ctx.beginPath()
            ctx.arc(element.x, element.y, 25, 0, 2 * Math.PI)
            ctx.fill()
            ctx.stroke()
          }
          
          // Draw player number if available
          if (element.text) {
            ctx.fillStyle = '#FFFFFF'
            ctx.font = '12px Arial'
            ctx.textAlign = 'center'
            ctx.fillText(element.text, element.x, element.y + 4)
          }
        } else {
          // Handle regular player type
          ctx.fillStyle = element.fill || '#FF0000'
          ctx.beginPath()
          ctx.arc(element.x, element.y, 15, 0, 2 * Math.PI)
          ctx.fill()
          // Draw player number if available
          if (element.text) {
            ctx.fillStyle = '#FFFFFF'
            ctx.font = '12px Arial'
            ctx.textAlign = 'center'
            ctx.fillText(element.text, element.x, element.y + 4)
          }
        }
        break
    }
  }

  const playAnimation = () => {
    if (!animationData || !animationData.frames || animationData.frames.length === 0) {
      return
    }
    
    setIsPlaying(true)
    isPlayingRef.current = true
    let frameIndex = currentFrameIndex
    
    const playNextFrame = () => {
      if (!isPlayingRef.current) {
        return
      }
      
      renderFrame(frameIndex)
      setCurrentFrameIndex(frameIndex)
      
      frameIndex = (frameIndex + 1) % animationData.frames.length
      
      setTimeout(playNextFrame, 1000 / frameRate)
    }
    
    playNextFrame()
  }

  const stopAnimation = () => {
    setIsPlaying(false)
    isPlayingRef.current = false
  }

  const goToFirstFrame = () => {
    if (animationData && animationData.frames && animationData.frames.length > 0) {
      setCurrentFrameIndex(0)
      renderFrame(0)
    }
  }

  const goToLastFrame = () => {
    if (animationData && animationData.frames && animationData.frames.length > 0) {
      const lastIndex = animationData.frames.length - 1
      setCurrentFrameIndex(lastIndex)
      renderFrame(lastIndex)
    }
  }

  const goToPreviousFrame = () => {
    if (animationData && animationData.frames && animationData.frames.length > 0) {
      const newIndex = currentFrameIndex > 0 ? currentFrameIndex - 1 : animationData.frames.length - 1
      setCurrentFrameIndex(newIndex)
      renderFrame(newIndex)
    }
  }

  const goToNextFrame = () => {
    if (animationData && animationData.frames && animationData.frames.length > 0) {
      const newIndex = (currentFrameIndex + 1) % animationData.frames.length
      setCurrentFrameIndex(newIndex)
      renderFrame(newIndex)
    }
  }

  const goToFrame = (frameIndex) => {
    if (animationData && animationData.frames && frameIndex >= 0 && frameIndex < animationData.frames.length) {
      setCurrentFrameIndex(frameIndex)
      renderFrame(frameIndex)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center text-red-600">
          <p>Error loading animation: {error}</p>
        </div>
      </div>
    )
  }

  if (!animationData || !animationData.frames || animationData.frames.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center text-gray-500">
          <p>No animation data available</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {title || 'Animation Player'}
        </h3>
        {description && (
          <p className="text-sm text-gray-600 mb-4">{description}</p>
        )}
      </div>

      {/* Animation Canvas */}
      <div className="flex justify-center mb-4">
        <canvas
          ref={canvasRef}
          width={canvasWidth}
          height={canvasHeight}
          className="border-2 border-gray-300 rounded-lg"
          style={{ maxWidth: '100%', height: 'auto' }}
        />
      </div>

      {/* Playback Controls */}
      <div className="flex flex-col items-center space-y-4">
        {/* Main Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={goToFirstFrame}
            disabled={currentFrameIndex === 0}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-3 py-2 rounded-md text-sm"
            title="Go to first frame"
          >
            ⏮️ First
          </button>
          <button
            onClick={goToPreviousFrame}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-md text-sm"
            title="Previous frame"
          >
            ⏪ Previous
          </button>
          <button
            onClick={isPlaying ? stopAnimation : playAnimation}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            title={isPlaying ? 'Stop animation' : 'Play animation'}
          >
            {isPlaying ? '⏹️ Stop' : '▶️ Play'}
          </button>
          <button
            onClick={goToNextFrame}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-md text-sm"
            title="Next frame"
          >
            Next ⏩
          </button>
          <button
            onClick={goToLastFrame}
            disabled={currentFrameIndex === animationData.frames.length - 1}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-3 py-2 rounded-md text-sm"
            title="Go to last frame"
          >
            Last ⏭️
          </button>
        </div>

        {/* Frame Counter and Slider */}
        <div className="flex items-center space-x-4 w-full max-w-md">
          <span className="text-sm text-gray-600 min-w-[60px]">
            Frame {currentFrameIndex + 1} of {animationData.frames.length}
          </span>
          <input
            type="range"
            min="0"
            max={animationData.frames.length - 1}
            value={currentFrameIndex}
            onChange={(e) => goToFrame(parseInt(e.target.value))}
            className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        {/* Frame Rate Control */}
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">Frame Rate:</span>
          <select
            value={frameRate}
            onChange={(e) => setFrameRate(Number(e.target.value))}
            className="px-2 py-1 border border-gray-300 rounded text-sm"
          >
            <option value={1}>1 FPS</option>
            <option value={2}>2 FPS</option>
            <option value={3}>3 FPS</option>
            <option value={4}>4 FPS</option>
            <option value={5}>5 FPS</option>
            <option value={6}>6 FPS</option>
            <option value={7}>7 FPS</option>
            <option value={8}>8 FPS</option>
            <option value={9}>9 FPS</option>
            <option value={10}>10 FPS</option>
          </select>
        </div>

        {/* Animation Info */}
        <div className="text-xs text-gray-500 text-center">
          <p>Duration: {Math.round(animationData.frames.length / frameRate)} seconds</p>
          <p>Total Frames: {animationData.frames.length}</p>
        </div>
      </div>
    </div>
  )
}

export default DrillPlayer 