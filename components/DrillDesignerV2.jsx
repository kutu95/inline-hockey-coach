import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { supabase } from '../src/lib/supabase'
import { useAuth } from '../src/contexts/AuthContext'

const DrillDesignerV2 = () => {
  const navigate = useNavigate()
  const { orgId, drillId } = useParams()
  const { user } = useAuth()
  const canvasRef = useRef(null)
  const animationRef = useRef(null)
  const selectedToolRef = useRef('select')
  const selectedPlayerTypeRef = useRef(null)
  const objectsRef = useRef([])
  const keyframesRef = useRef([])

  // Core animation state
  const [keyframes, setKeyframes] = useState([])
  const [currentFrame, setCurrentFrame] = useState(0)
  const [totalFrames, setTotalFrames] = useState(60) // 2 seconds at 30fps
  const [fps, setFps] = useState(30)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  
  // Objects state
  const [objects, setObjects] = useState([])
  const [selectedObject, setSelectedObject] = useState(null)
  const [nextObjectId, setNextObjectId] = useState(1)
  
  // Tools and UI state
  const [selectedTool, setSelectedTool] = useState('select') // select, add-player, add-puck, delete
  const [showOnionSkin, setShowOnionSkin] = useState(true)
  const [onionSkinOpacity, setOnionSkinOpacity] = useState(0.3)
  const [onionSkinFrames, setOnionSkinFrames] = useState(3)
  const [showTimeline, setShowTimeline] = useState(true)
  const [showPlayerDropdown, setShowPlayerDropdown] = useState(false)
  
  // Player types
  const [playerTypes, setPlayerTypes] = useState([])
  const [selectedPlayerType, setSelectedPlayerType] = useState(null)
  const [isLoadingPlayers, setIsLoadingPlayers] = useState(true)
  
  // Export state
  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)
  
  // Canvas dimensions
  const canvasWidth = 1200
  const canvasHeight = 600

  // Drag state
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })

  // Load player types on mount
  useEffect(() => {
    loadPlayerTypes()
  }, [])

  const loadPlayerTypes = async () => {
    try {
      setIsLoadingPlayers(true)
      const playerFiles = []
      
      // Try to discover player files
      for (let i = 1; i <= 20; i++) {
        const fileName = i === 1 ? 'player-silhouette.png' : `player-silhouette${i}.png`
        playerFiles.push(fileName)
      }
      
      // Try goalie files
      for (let i = 1; i <= 10; i++) {
        const fileName = i === 1 ? 'goalie-silhouette.png' : `goalie-silhouette${i}.png`
        playerFiles.push(fileName)
      }
      
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
          
          const baseName = fileName.replace('.png', '')
          const isGoalie = baseName.includes('goalie')
          const playerNumber = baseName.match(/\d+/)?.[0] || ''
          
          const playerId = `player-${i}`
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
      
      setPlayerTypes(loadedPlayers)
      if (loadedPlayers.length > 0) {
        setSelectedPlayerType(loadedPlayers[0].id)
      }
    } catch (error) {
      console.error('Error loading player types:', error)
    } finally {
      setIsLoadingPlayers(false)
    }
  }

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    canvas.width = canvasWidth
    canvas.height = canvasHeight

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

  // Debug tool changes
  useEffect(() => {
    console.log('Selected tool changed to:', selectedTool)
    selectedToolRef.current = selectedTool
  }, [selectedTool])

  // Debug player type changes
  useEffect(() => {
    console.log('Selected player type changed to:', selectedPlayerType)
    selectedPlayerTypeRef.current = selectedPlayerType
  }, [selectedPlayerType])

  // Redraw canvas when state changes
  useEffect(() => {
    console.log('Redraw effect triggered:', { currentFrame, objectsCount: objects.length, keyframesCount: keyframes.length })
    redrawCanvas()
  }, [currentFrame, objects, keyframes, showOnionSkin, onionSkinOpacity, onionSkinFrames])

  // Update refs when state changes
  useEffect(() => {
    objectsRef.current = objects
  }, [objects])

  useEffect(() => {
    keyframesRef.current = keyframes
  }, [keyframes])

  // Animation playback
  useEffect(() => {
    if (!isPlaying) return

    const interval = setInterval(() => {
      setCurrentFrame(prev => {
        const next = prev + playbackSpeed
        if (next >= totalFrames) {
          setIsPlaying(false)
          return 0
        }
        return next
      })
    }, 1000 / fps)

    return () => clearInterval(interval)
  }, [isPlaying, fps, playbackSpeed, totalFrames])

  const redrawCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    // Draw rink background
    drawRinkBackground(ctx)
    
    // Draw onion skin frames
    if (showOnionSkin) {
      drawOnionSkin(ctx)
    }
    
    // Draw current frame objects
    console.log('Redrawing canvas, current frame:', currentFrame, 'objects count:', objects.length)
    drawFrameObjects(ctx, currentFrame)
    
    // Draw selection indicators
    if (selectedObject) {
      drawSelectionIndicator(ctx, selectedObject)
    }
  }

  const drawRinkBackground = (ctx) => {
    const rinkColor = '#87CEEB'
    const lineColor = '#FF0000'
    const borderColor = '#000000'
    
    const rinkLength = 60
    const rinkWidth = 30
    const scaleX = canvasWidth / rinkLength
    const scaleY = canvasHeight / rinkWidth
    const cornerRadius = 8.5
    
    const mToPx = (meters) => meters * scaleX
    const mToPxY = (meters) => meters * scaleY
    
    // Rink Background
    ctx.fillStyle = rinkColor
    ctx.fillRect(0, 0, canvasWidth, canvasHeight)
    
    // Rink Border
    ctx.strokeStyle = borderColor
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.roundRect(0, 0, canvasWidth, canvasHeight, mToPx(cornerRadius))
    ctx.stroke()
    
    // Center Line
    ctx.strokeStyle = lineColor
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(canvasWidth / 2, 0)
    ctx.lineTo(canvasWidth / 2, canvasHeight)
    ctx.stroke()
    
    // Face-off Circles
    ctx.strokeStyle = lineColor
    ctx.lineWidth = 3
    
    // Center face-off circle
    ctx.beginPath()
    ctx.arc(canvasWidth / 2, canvasHeight / 2, mToPx(2.25), 0, 2 * Math.PI)
    ctx.stroke()
    
    // Corner face-off circles
    ctx.beginPath()
    ctx.arc(mToPx(14), mToPxY(7), mToPx(2.25), 0, 2 * Math.PI)
    ctx.stroke()
    
    ctx.beginPath()
    ctx.arc(canvasWidth - mToPx(14), mToPxY(7), mToPx(2.25), 0, 2 * Math.PI)
    ctx.stroke()
    
    ctx.beginPath()
    ctx.arc(mToPx(14), canvasHeight - mToPxY(7), mToPx(2.25), 0, 2 * Math.PI)
    ctx.stroke()
    
    ctx.beginPath()
    ctx.arc(canvasWidth - mToPx(14), canvasHeight - mToPxY(7), mToPx(2.25), 0, 2 * Math.PI)
    ctx.stroke()
    
    // Goals
    ctx.fillStyle = '#FFFFFF'
    ctx.strokeStyle = '#000000'
    ctx.lineWidth = 2
    
    // Left Goal
    ctx.fillRect(mToPx(4.5) - mToPxY(1), canvasHeight / 2 - mToPx(0.9), mToPxY(1), mToPx(1.8))
    ctx.strokeRect(mToPx(4.5) - mToPxY(1), canvasHeight / 2 - mToPx(0.9), mToPxY(1), mToPx(1.8))
    
    // Right Goal
    ctx.fillRect(canvasWidth - mToPx(4.5), canvasHeight / 2 - mToPx(0.9), mToPxY(1), mToPx(1.8))
    ctx.strokeRect(canvasWidth - mToPx(4.5), canvasHeight / 2 - mToPx(0.9), mToPxY(1), mToPx(1.8))
  }

  const drawOnionSkin = (ctx) => {
    // Draw previous frames with reduced opacity
    for (let i = 1; i <= onionSkinFrames; i++) {
      const frameIndex = currentFrame - i
      if (frameIndex >= 0) {
        ctx.globalAlpha = onionSkinOpacity * (1 - i / (onionSkinFrames + 1))
        drawFrameObjects(ctx, frameIndex)
      }
    }
    ctx.globalAlpha = 1
  }

  const drawFrameObjects = (ctx, frameIndex) => {
    const frameObjects = getObjectsAtFrame(frameIndex)
    
    console.log(`Drawing frame ${frameIndex}, objects:`, frameObjects)
    
    frameObjects.forEach(obj => {
      if (obj.type === 'puck') {
        drawPuck(ctx, obj)
      } else if (obj.type === 'player') {
        drawPlayer(ctx, obj)
      }
      
      // Draw selection indicator if this object is selected
      if (selectedObject && selectedObject.id === obj.id) {
        drawSelectionIndicator(ctx, obj)
      }
    })
  }

  const drawPuck = (ctx, puck) => {
    ctx.beginPath()
    ctx.arc(puck.x, puck.y, 8, 0, 2 * Math.PI)
    ctx.fillStyle = '#000000'
    ctx.fill()
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 2
    ctx.stroke()
    
    // Draw "P" label
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 12px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('P', puck.x, puck.y + 4)
  }

  const drawPlayer = (ctx, player) => {
    const playerType = playerTypes.find(p => p.id === player.playerType)
    
    if (playerType && playerType.image) {
      const imageSize = 50
      const halfSize = imageSize / 2
      
      ctx.save()
      ctx.translate(player.x, player.y)
      if (player.flipped) {
        ctx.scale(-1, 1)
      }
      ctx.drawImage(
        playerType.image,
        -halfSize,
        -halfSize,
        imageSize,
        imageSize
      )
      ctx.restore()
    } else {
      // Fallback circle
      ctx.beginPath()
      ctx.arc(player.x, player.y, 25, 0, 2 * Math.PI)
      ctx.fillStyle = '#ff0000'
      ctx.fill()
      ctx.strokeStyle = '#000000'
      ctx.lineWidth = 2
      ctx.stroke()
    }
  }

  const drawSelectionIndicator = (ctx, obj) => {
    ctx.strokeStyle = '#00ff00'
    ctx.lineWidth = 3
    ctx.setLineDash([5, 5])
    ctx.beginPath()
    ctx.arc(obj.x, obj.y, 35, 0, 2 * Math.PI)
    ctx.stroke()
    ctx.setLineDash([])
  }

  const getObjectsAtFrame = (frameIndex) => {
    return getObjectsAtFrameWithData(frameIndex, objects, keyframes)
  }

  const getObjectsAtFrameWithData = (frameIndex, objectsData, keyframesData) => {
    // Get all objects that have keyframes at or before this frame
    const frameObjects = []
    
    console.log('getObjectsAtFrameWithData called with frameIndex:', frameIndex)
    console.log('Total objects:', objectsData.length)
    console.log('Total keyframes:', keyframesData.length)
    
    objectsData.forEach(obj => {
      console.log('Processing object:', obj.id, 'type:', obj.type)
      const objKeyframes = keyframesData.filter(k => k.objectId === obj.id && k.frame <= frameIndex)
      console.log('Found keyframes for object', obj.id, ':', objKeyframes.length)
      
      if (objKeyframes.length > 0) {
        // Find the most recent keyframe for this object
        const latestKeyframe = objKeyframes.reduce((latest, current) => 
          current.frame > latest.frame ? current : latest
        )
        
        // Interpolate if there's a next keyframe
        const nextKeyframe = keyframesData.find(k => 
          k.objectId === obj.id && k.frame > frameIndex
        )
        
        if (nextKeyframe) {
          // Interpolate between keyframes
          const progress = (frameIndex - latestKeyframe.frame) / (nextKeyframe.frame - latestKeyframe.frame)
          frameObjects.push({
            ...obj,
            x: latestKeyframe.x + (nextKeyframe.x - latestKeyframe.x) * progress,
            y: latestKeyframe.y + (nextKeyframe.y - latestKeyframe.y) * progress,
            flipped: latestKeyframe.flipped
          })
        } else {
          // Use the latest keyframe as-is
          frameObjects.push({
            ...obj,
            x: latestKeyframe.x,
            y: latestKeyframe.y,
            flipped: latestKeyframe.flipped
          })
        }
      } else {
        // If no keyframes exist for this object, use its default position
        // This ensures objects show up immediately when added
        console.log('No keyframes found for object', obj.id, '- using default position')
        frameObjects.push({
          ...obj,
          x: obj.x,
          y: obj.y,
          flipped: obj.flipped || false
        })
      }
    })
    
    console.log('Returning frame objects:', frameObjects.length)
    return frameObjects
  }

  const handleCanvasClick = (e) => {
    const canvas = canvasRef.current
    if (!canvas) {
      console.log('Canvas ref is null')
      return
    }

    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    
    const x = (e.clientX - rect.left) * scaleX
    const y = (e.clientY - rect.top) * scaleY

    // Use refs to get current values (avoid closure issues)
    const currentTool = selectedToolRef.current
    const currentPlayerType = selectedPlayerTypeRef.current

    console.log('Canvas click:', { 
      x, y, selectedTool: currentTool, selectedPlayerType: currentPlayerType,
      clientX: e.clientX, clientY: e.clientY,
      rectLeft: rect.left, rectTop: rect.top,
      scaleX, scaleY
    })

    if (currentTool === 'add-player') {
      console.log('Adding player...')
      addPlayer(x, y)
    } else if (currentTool === 'add-puck') {
      console.log('Adding puck...')
      addPuck(x, y)
    } else if (currentTool === 'select') {
      console.log('Selecting object...')
      const clickedObject = selectObjectAtPosition(x, y)
      setSelectedObject(clickedObject)
    } else {
      console.log('Unknown tool:', currentTool)
    }
  }

  const handleMouseDown = (e) => {
    const rect = canvasRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    if (selectedTool === 'select') {
      const clickedObject = selectObjectAtPosition(x, y)
      if (clickedObject) {
        setSelectedObject(clickedObject)
        setIsDragging(true)
        setDragOffset({
          x: x - clickedObject.x,
          y: y - clickedObject.y
        })
      } else {
        setSelectedObject(null)
      }
    }
  }

  const handleMouseMove = (e) => {
    if (isDragging && selectedObject) {
      const rect = canvasRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left - dragOffset.x
      const y = e.clientY - rect.top - dragOffset.y

      // Update the selected object's position
      const updatedObject = { ...selectedObject, x, y }
      setSelectedObject(updatedObject)

      // Update the object in the objects array
      setObjects(prev => prev.map(obj => 
        obj.id === selectedObject.id ? updatedObject : obj
      ))

      // Update the keyframe if one exists at current frame
      const existingKeyframeIndex = keyframes.findIndex(k => 
        k.objectId === selectedObject.id && k.frame === currentFrame
      )
      
      if (existingKeyframeIndex >= 0) {
        const updatedKeyframes = [...keyframes]
        updatedKeyframes[existingKeyframeIndex] = {
          ...updatedKeyframes[existingKeyframeIndex],
          x,
          y
        }
        setKeyframes(updatedKeyframes)
      }
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const addPlayer = (x, y) => {
    const currentPlayerType = selectedPlayerTypeRef.current
    if (!currentPlayerType) {
      console.log('No player type selected')
      return
    }
    
    console.log('Adding player at:', x, y, 'with type:', currentPlayerType)
    
    // Generate unique ID using timestamp + random number
    const uniqueId = Date.now() + Math.random()
    
    const newPlayer = {
      id: uniqueId,
      type: 'player',
      playerType: currentPlayerType,
      x: x,
      y: y,
      flipped: false
    }
    
    console.log('New player object:', newPlayer)
    
    setObjects(prev => {
      const newObjects = [...prev, newPlayer]
      console.log('Updated objects array:', newObjects)
      return newObjects
    })
    
    // Add keyframe for this player at current frame
    const newKeyframe = {
      id: Date.now() + Math.random(),
      objectId: uniqueId,
      frame: currentFrame,
      x: x,
      y: y,
      flipped: false
    }
    
    setKeyframes(prev => {
      const newKeyframes = [...prev, newKeyframe]
      console.log('Added keyframe for new player:', newKeyframe)
      return newKeyframes
    })
  }

  const addPuck = (x, y) => {
    console.log('Adding puck at:', x, y)
    
    // Generate unique ID using timestamp + random number
    const uniqueId = Date.now() + Math.random()
    
    const newPuck = {
      id: uniqueId,
      type: 'puck',
      x: x,
      y: y
    }
    
    console.log('New puck object:', newPuck)
    
    setObjects(prev => {
      const newObjects = [...prev, newPuck]
      console.log('Updated objects array:', newObjects)
      return newObjects
    })
    
    // Add keyframe for this puck at current frame
    const newKeyframe = {
      id: Date.now() + Math.random(),
      objectId: uniqueId,
      frame: currentFrame,
      x: x,
      y: y,
      flipped: false
    }
    
    setKeyframes(prev => {
      const newKeyframes = [...prev, newKeyframe]
      console.log('Added keyframe for new puck:', newKeyframe)
      return newKeyframes
    })
  }

  const selectObjectAtPosition = (x, y) => {
    console.log('selectObjectAtPosition called with currentFrame:', currentFrame)
    console.log('Current objects array (from ref):', objectsRef.current)
    console.log('Current keyframes array (from ref):', keyframesRef.current)
    
    // Use refs to get current values (avoid closure issues)
    const currentObjects = objectsRef.current
    const currentKeyframes = keyframesRef.current
    
    const frameObjects = getObjectsAtFrameWithData(currentFrame, currentObjects, currentKeyframes)
    console.log('Selecting object at position:', x, y, 'frame objects:', frameObjects)
    
    const clickedObject = frameObjects.find(obj => {
      const distance = Math.sqrt((x - obj.x) ** 2 + (y - obj.y) ** 2)
      console.log('Checking object:', obj.id, 'distance:', distance, 'threshold: 30')
      return distance <= 30
    })
    
    console.log('Selected object:', clickedObject)
    return clickedObject || null
  }

  // Add keyframe for selected object at current frame
  const addKeyframe = () => {
    console.log('addKeyframe called with selectedObject:', selectedObject, 'currentFrame:', currentFrame)
    
    if (!selectedObject) {
      alert('Please select an object first')
      return
    }

    const existingKeyframe = keyframes.find(k => k.objectId === selectedObject.id && k.frame === currentFrame)
    if (existingKeyframe) {
      alert('A keyframe already exists at this frame')
      return
    }

    const newKeyframe = {
      id: Date.now() + Math.random(),
      objectId: selectedObject.id,
      frame: currentFrame,
      x: selectedObject.x,
      y: selectedObject.y,
      flipped: selectedObject.flipped || false
    }

    console.log('Creating new keyframe:', newKeyframe)
    setKeyframes(prev => {
      const newKeyframes = [...prev, newKeyframe]
      console.log('Updated keyframes array:', newKeyframes)
      return newKeyframes
    })
    console.log('Created keyframe:', newKeyframe)
  }

  // Update keyframe for selected object at current frame
  const updateKeyframe = () => {
    if (!selectedObject) {
      alert('Please select an object first')
      return
    }

    const existingKeyframeIndex = keyframes.findIndex(k => k.objectId === selectedObject.id && k.frame === currentFrame)
    if (existingKeyframeIndex === -1) {
      alert('No keyframe exists at this frame. Use "Create Keyframe" instead.')
      return
    }

    const updatedKeyframes = [...keyframes]
    updatedKeyframes[existingKeyframeIndex] = {
      ...updatedKeyframes[existingKeyframeIndex],
      x: selectedObject.x,
      y: selectedObject.y,
      flipped: selectedObject.flipped || false
    }

    setKeyframes(updatedKeyframes)
    console.log('Updated keyframe:', updatedKeyframes[existingKeyframeIndex])
  }

  // Delete keyframe for selected object at current frame
  const deleteKeyframe = () => {
    if (!selectedObject) {
      alert('Please select an object first')
      return
    }

    const existingKeyframeIndex = keyframes.findIndex(k => k.objectId === selectedObject.id && k.frame === currentFrame)
    if (existingKeyframeIndex === -1) {
      alert('No keyframe exists at this frame')
      return
    }

    const updatedKeyframes = keyframes.filter((_, index) => index !== existingKeyframeIndex)
    setKeyframes(updatedKeyframes)
    console.log('Deleted keyframe at frame:', currentFrame)
  }

  const deleteObject = (objectId) => {
    setObjects(prev => prev.filter(obj => obj.id !== objectId))
    setKeyframes(prev => prev.filter(k => k.objectId !== objectId))
    setSelectedObject(null)
  }

  const flipObject = () => {
    if (!selectedObject) return
    
    const currentKeyframe = keyframes.find(k => 
      k.objectId === selectedObject.id && k.frame === currentFrame
    )
    
    const newFlipped = currentKeyframe ? !currentKeyframe.flipped : true
    updateKeyframe(selectedObject.id, selectedObject.x, selectedObject.y, newFlipped)
  }

  const playAnimation = () => {
    setIsPlaying(true)
  }

  const pauseAnimation = () => {
    setIsPlaying(false)
  }

  const stopAnimation = () => {
    setIsPlaying(false)
    setCurrentFrame(0)
  }

  const goToFrame = (frame) => {
    setCurrentFrame(Math.max(0, Math.min(frame, totalFrames - 1)))
  }

  const goToPreviousFrame = () => {
    setCurrentFrame(prev => Math.max(0, prev - 1))
  }

  const goToNextFrame = () => {
    setCurrentFrame(prev => Math.min(totalFrames - 1, prev + 1))
  }

  const exportAnimation = async () => {
    setIsExporting(true)
    setExportProgress(0)
    
    try {
      const canvas = document.createElement('canvas')
      canvas.width = canvasWidth
      canvas.height = canvasHeight
      const ctx = canvas.getContext('2d')
      
      const stream = canvas.captureStream(fps)
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9'
      })
      
      const chunks = []
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data)
        }
      }
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.download = 'drill-animation.webm'
        link.href = url
        link.click()
        URL.revokeObjectURL(url)
        setIsExporting(false)
        setExportProgress(0)
      }
      
      mediaRecorder.start()
      
      // Render all frames
      for (let frame = 0; frame < totalFrames; frame++) {
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        
        // Draw rink background
        drawRinkBackground(ctx)
        
        // Draw frame objects
        drawFrameObjects(ctx, frame)
        
        // Update progress
        setExportProgress((frame / totalFrames) * 100)
        
        // Wait for frame duration
        await new Promise(resolve => setTimeout(resolve, 1000 / fps))
      }
      
      mediaRecorder.stop()
      
    } catch (error) {
      console.error('Error exporting animation:', error)
      setIsExporting(false)
      setExportProgress(0)
    }
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
                    <p className="text-gray-600 mt-1">Advanced Stop Motion Animation</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={exportAnimation}
                    disabled={isExporting}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-md transition duration-150 ease-in-out"
                  >
                    {isExporting ? `Exporting... ${Math.round(exportProgress)}%` : 'Export Video'}
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
                  <h2 className="text-lg font-semibold text-gray-900">Animation Canvas</h2>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={stopAnimation}
                      className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm"
                    >
                      ⏹
                    </button>
                    <button
                      onClick={goToPreviousFrame}
                      className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm"
                    >
                      ⏮
                    </button>
                    <button
                      onClick={isPlaying ? pauseAnimation : playAnimation}
                      className={`px-4 py-1 rounded text-sm font-medium transition duration-150 ease-in-out ${
                        isPlaying 
                          ? 'bg-red-600 hover:bg-red-700 text-white' 
                          : 'bg-green-600 hover:bg-green-700 text-white'
                      }`}
                    >
                      {isPlaying ? '⏸' : '▶'}
                    </button>
                    <button
                      onClick={goToNextFrame}
                      className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm"
                    >
                      ⏭
                    </button>
                    <span className="text-sm text-gray-600 ml-2">
                      Frame {currentFrame + 1} / {totalFrames}
                    </span>
                  </div>
                </div>
                
                <div className="border-2 rounded-lg overflow-hidden relative border-gray-300">
                  <canvas
                    ref={canvasRef}
                    className={`w-full h-auto ${isDragging ? 'cursor-grabbing' : 'cursor-crosshair'}`}
                    style={{ maxHeight: '600px' }}
                    onClick={handleCanvasClick}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                  />
                </div>
                {isDragging && (
                  <div className="absolute inset-0 bg-blue-500 bg-opacity-10 pointer-events-none flex items-center justify-center">
                    <div className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg">
                      Dragging object...
                    </div>
                  </div>
                )}
                
                {/* Tools */}
                <div className="mt-4 p-4 bg-gray-100 rounded-lg border">
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Tools</h3>
                  <div className="flex items-center space-x-6">
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="select"
                        name="tool"
                        value="select"
                        checked={selectedTool === 'select'}
                        onChange={(e) => {
                          console.log('Select tool clicked, new value:', e.target.value)
                          setSelectedTool(e.target.value)
                        }}
                        className="text-blue-600"
                      />
                      <label htmlFor="select" className="text-sm font-medium text-gray-700">
                        Select
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="add-player"
                        name="tool"
                        value="add-player"
                        checked={selectedTool === 'add-player'}
                        onChange={(e) => {
                          console.log('Add player tool clicked, new value:', e.target.value)
                          setSelectedTool(e.target.value)
                        }}
                        className="text-blue-600"
                      />
                      <label htmlFor="add-player" className="text-sm font-medium text-gray-700">
                        Add Player
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="add-puck"
                        name="tool"
                        value="add-puck"
                        checked={selectedTool === 'add-puck'}
                        onChange={(e) => {
                          console.log('Add puck tool clicked, new value:', e.target.value)
                          setSelectedTool(e.target.value)
                        }}
                        className="text-blue-600"
                      />
                      <label htmlFor="add-puck" className="text-sm font-medium text-gray-700">
                        Add Puck
                      </label>
                    </div>
                    
                    {/* Player Selection */}
                    {selectedTool === 'add-player' && (
                      <div className="flex items-center space-x-2">
                        <div className="relative player-dropdown">
                          <button
                            type="button"
                            onClick={() => setShowPlayerDropdown(!showPlayerDropdown)}
                            className="flex items-center space-x-2 px-3 py-1 bg-white border border-gray-300 rounded text-sm hover:bg-gray-50"
                          >
                            {(() => {
                              const selectedPlayerData = playerTypes.find(p => p.id === selectedPlayerType)
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
                              {playerTypes.find(p => p.id === selectedPlayerType)?.label || 'Select Player'}
                            </span>
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                          
                          {/* Player Dropdown */}
                          {showPlayerDropdown && (
                            <div className="absolute z-10 mt-1 w-56 bg-white shadow-lg border border-gray-200 rounded-md max-h-60 overflow-y-auto">
                              {playerTypes.map((player) => (
                                <button
                                  key={player.id}
                                  onClick={() => {
                                    console.log('Player selected:', player.id, player.label)
                                    setSelectedPlayerType(player.id)
                                    setShowPlayerDropdown(false)
                                  }}
                                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${
                                    selectedPlayerType === player.id ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
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
                                    {selectedPlayerType === player.id && (
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
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Controls Panel */}
            <div className="lg:col-span-1">
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Animation Controls</h3>
                
                {/* Frame Controls */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Frame {currentFrame + 1} / {totalFrames}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max={totalFrames - 1}
                    value={currentFrame}
                    onChange={(e) => goToFrame(parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>

                {/* Animation Settings */}
                <div className="mb-4 space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      FPS
                    </label>
                    <select
                      value={fps}
                      onChange={(e) => setFps(parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value={15}>15 FPS</option>
                      <option value={24}>24 FPS</option>
                      <option value={30}>30 FPS</option>
                      <option value={60}>60 FPS</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Total Frames
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="300"
                      value={totalFrames}
                      onChange={(e) => setTotalFrames(parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Playback Speed
                    </label>
                    <select
                      value={playbackSpeed}
                      onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value={0.25}>0.25x</option>
                      <option value={0.5}>0.5x</option>
                      <option value={1}>1x</option>
                      <option value={2}>2x</option>
                      <option value={4}>4x</option>
                    </select>
                  </div>
                </div>

                {/* Onion Skin Controls */}
                <div className="mb-4 p-3 bg-blue-50 rounded border">
                  <div className="flex items-center space-x-2 mb-2">
                    <input
                      type="checkbox"
                      id="onion-skin"
                      checked={showOnionSkin}
                      onChange={(e) => setShowOnionSkin(e.target.checked)}
                      className="text-blue-600"
                    />
                    <label htmlFor="onion-skin" className="text-sm font-medium text-blue-900">
                      Onion Skin
                    </label>
                  </div>
                  
                  {showOnionSkin && (
                    <div className="space-y-2">
                      <div>
                        <label className="block text-xs text-blue-700 mb-1">
                          Opacity
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.1"
                          value={onionSkinOpacity}
                          onChange={(e) => setOnionSkinOpacity(parseFloat(e.target.value))}
                          className="w-full"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-xs text-blue-700 mb-1">
                          Frames
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={onionSkinFrames}
                          onChange={(e) => setOnionSkinFrames(parseInt(e.target.value))}
                          className="w-full px-2 py-1 border border-blue-200 rounded text-xs"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Keyframe Controls */}
                <div className="bg-white p-4 rounded-lg shadow-md mb-4">
                  <h3 className="text-lg font-semibold mb-3">Keyframe Controls</h3>
                  <div className="flex gap-2 mb-3">
                    <button
                      onClick={addKeyframe}
                      className="px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400"
                      disabled={!selectedObject}
                    >
                      Create Keyframe
                    </button>
                    <button
                      onClick={updateKeyframe}
                      className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
                      disabled={!selectedObject}
                    >
                      Update Keyframe
                    </button>
                    <button
                      onClick={deleteKeyframe}
                      className="px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:bg-gray-400"
                      disabled={!selectedObject}
                    >
                      Delete Keyframe
                    </button>
                  </div>
                  <div className="text-sm text-gray-600">
                    <p><strong>How to create keyframes:</strong></p>
                    <ol className="list-decimal list-inside mt-2 space-y-1">
                      <li>Select an object on the rink (click on it)</li>
                      <li>Move to a different frame using the timeline below</li>
                      <li>Drag the object to a new position (click and drag)</li>
                      <li>Click "Create Keyframe" to save the position</li>
                      <li>Repeat for more animation frames</li>
                    </ol>
                    {selectedObject && (
                      <div className="mt-3 p-2 bg-blue-50 rounded">
                        <p><strong>Selected:</strong> {selectedObject.type} at ({Math.round(selectedObject.x)}, {Math.round(selectedObject.y)})</p>
                        <p><strong>Current Frame:</strong> {currentFrame}</p>
                        {isDragging && <p className="text-blue-600 font-semibold">Dragging object...</p>}
                        
                        {/* Keyframe Status */}
                        {(() => {
                          const hasKeyframe = keyframes.some(k => k.objectId === selectedObject.id && k.frame === currentFrame)
                          return (
                            <div className="mt-2">
                              <p className={`font-semibold ${hasKeyframe ? 'text-green-600' : 'text-red-600'}`}>
                                {hasKeyframe ? '✓ Keyframe exists at this frame' : '✗ No keyframe at this frame'}
                              </p>
                              <p className="text-xs text-gray-500">
                                Total keyframes for this object: {keyframes.filter(k => k.objectId === selectedObject.id).length}
                              </p>
                            </div>
                          )
                        })()}
                      </div>
                    )}
                  </div>
                </div>

                {/* Object Controls */}
                {selectedObject && (
                  <div className="mb-4 p-3 bg-green-50 rounded border">
                    <h4 className="text-sm font-medium text-green-900 mb-2">
                      Selected: {selectedObject.type === 'puck' ? 'Puck' : 'Player'}
                    </h4>
                    <div className="space-y-2">
                      <button
                        onClick={() => updateKeyframe(selectedObject.id, selectedObject.x, selectedObject.y, selectedObject.flipped)}
                        className="w-full bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
                      >
                        Set Keyframe
                      </button>
                      <button
                        onClick={flipObject}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
                      >
                        Flip
                      </button>
                      <button
                        onClick={() => deleteObject(selectedObject.id)}
                        className="w-full bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}

                {/* Debug Info */}
                <div className="mb-4 p-3 bg-yellow-50 rounded border">
                  <h4 className="text-sm font-medium text-yellow-900 mb-2">Debug Info</h4>
                  <div className="text-xs text-yellow-800 space-y-1">
                    <div>Selected Tool: {selectedTool}</div>
                    <div>Selected Player Type: {selectedPlayerType || 'None'}</div>
                    <div>Objects Count: {objects.length}</div>
                    <div>Keyframes Count: {keyframes.length}</div>
                    <div>Current Frame: {currentFrame}</div>
                    <div>Selected Object: {selectedObject ? `${selectedObject.type} (${selectedObject.id})` : 'None'}</div>
                    <div>Is Dragging: {isDragging ? 'Yes' : 'No'}</div>
                    {selectedObject && (
                      <div>
                        Keyframes for selected object: {keyframes.filter(k => k.objectId === selectedObject.id).length}
                      </div>
                    )}
                  </div>
                </div>

                {/* Objects List */}
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Objects ({objects.length})
                  </h4>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {objects.map(obj => (
                      <div
                        key={obj.id}
                        onClick={() => setSelectedObject(obj)}
                        className={`p-2 rounded text-sm cursor-pointer ${
                          selectedObject?.id === obj.id
                            ? 'bg-blue-100 border border-blue-300'
                            : 'bg-gray-100 hover:bg-gray-200'
                        }`}
                      >
                        {obj.type === 'puck' ? 'Puck' : 'Player'} {obj.id} - ({obj.x}, {obj.y})
                      </div>
                    ))}
                  </div>
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