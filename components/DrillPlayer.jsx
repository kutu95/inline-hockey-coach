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
  
  const animationRef = useRef()
  const canvasRef = useRef()
  const isPlayingRef = useRef(false)

  useEffect(() => {
    if (mediaId) {
      loadAnimationData()
    }
  }, [mediaId])

  useEffect(() => {
    return () => {
      isPlayingRef.current = false
    }
  }, [])

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
      
      // Load first frame
      if (animationData.frames && animationData.frames.length > 0) {
        renderFrame(0)
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

    // Render rink background (simplified version)
    ctx.fillStyle = '#87CEEB' // Light blue for rink
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Render rink border
    ctx.strokeStyle = '#000000'
    ctx.lineWidth = 3
    ctx.strokeRect(0, 0, canvas.width, canvas.height)

    // Render center line
    ctx.strokeStyle = '#FF0000'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(canvas.width / 2, 0)
    ctx.lineTo(canvas.width / 2, canvas.height)
    ctx.stroke()

    // Render elements from the frame
    if (frame.elements) {
      frame.elements.forEach(element => {
        renderElement(ctx, element)
      })
    }
  }

  const renderElement = (ctx, element) => {
    switch (element.type) {
      case 'puck':
        ctx.fillStyle = element.color || '#000000'
        ctx.beginPath()
        ctx.arc(element.x, element.y, 8, 0, 2 * Math.PI)
        ctx.fill()
        break
        
      case 'player':
        ctx.fillStyle = element.color || '#FF0000'
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
        break
        
      case 'arrow':
        ctx.strokeStyle = element.color || '#0000FF'
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.moveTo(element.x, element.y)
        ctx.lineTo(element.x + element.width, element.y + element.height)
        ctx.stroke()
        // Draw arrowhead
        const angle = Math.atan2(element.height, element.width)
        const arrowLength = 10
        ctx.beginPath()
        ctx.moveTo(element.x + element.width, element.y + element.height)
        ctx.lineTo(
          element.x + element.width - arrowLength * Math.cos(angle - Math.PI / 6),
          element.y + element.height - arrowLength * Math.sin(angle - Math.PI / 6)
        )
        ctx.moveTo(element.x + element.width, element.y + element.height)
        ctx.lineTo(
          element.x + element.width - arrowLength * Math.cos(angle + Math.PI / 6),
          element.y + element.height - arrowLength * Math.sin(angle + Math.PI / 6)
        )
        ctx.stroke()
        break
        
      case 'text':
        ctx.fillStyle = element.color || '#000000'
        ctx.font = `${element.fontSize || 16}px Arial`
        ctx.textAlign = 'left'
        ctx.fillText(element.text, element.x, element.y)
        break
        
      case 'drawing':
        if (element.points && element.points.length > 1) {
          ctx.strokeStyle = element.color || '#000000'
          ctx.lineWidth = element.lineWidth || 2
          ctx.beginPath()
          ctx.moveTo(element.points[0].x, element.points[0].y)
          for (let i = 1; i < element.points.length; i++) {
            ctx.lineTo(element.points[i].x, element.points[i].y)
          }
          ctx.stroke()
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