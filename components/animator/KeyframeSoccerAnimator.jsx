import React, { useState, useRef, useEffect, useCallback } from 'react'

const KeyframeSoccerAnimator = () => {
  const canvasRef = useRef(null)
  const [width, setWidth] = useState(800)
  const [height, setHeight] = useState(600)
  
  // Keyframe system state
  const [keyframes, setKeyframes] = useState([
    { id: 'kf_0', time: 0, objects: [] }, // Initial keyframe at time 0
  ])
  const [currentTime, setCurrentTime] = useState(0)
  const [animationDuration, setAnimationDuration] = useState(20) // seconds
  const [frameRate, setFrameRate] = useState(25) // FPS
  
  // Current editing state
  const [selectedKeyframe, setSelectedKeyframe] = useState('kf_0')
  const [selectedTool, setSelectedTool] = useState('player')
  const [selectedElement, setSelectedElement] = useState(null)
  
  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false)
  const [drawingPoints, setDrawingPoints] = useState([])
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  
  // Player color selection
  const [playerColor, setPlayerColor] = useState('#ff0000')
  const playerColors = [
    { name: 'Red', value: '#ff0000' },
    { name: 'Blue', value: '#0066cc' },
    { name: 'White', value: '#ffffff' },
    { name: 'Yellow', value: '#ffdd00' }
  ]
  
  // Field customization
  const [fieldLength, setFieldLength] = useState(105)
  const [fieldWidth, setFieldWidth] = useState(68)
  const [backgroundColor, setBackgroundColor] = useState('#4a7c59')
  
  // Animation playback
  const [isPlaying, setIsPlaying] = useState(false)
  const isPlayingRef = useRef(false)
  const animationRef = useRef(null)
  
  // Keyframe dragging
  const [isDraggingKeyframe, setIsDraggingKeyframe] = useState(false)
  const [draggedKeyframeId, setDraggedKeyframeId] = useState(null)
  const timelineRef = useRef(null)
  
  // Timeline help modal
  const [showTimelineHelp, setShowTimelineHelp] = useState(false)
  
  // Drag state tracking
  const [dragInProgress, setDragInProgress] = useState(false)
  
  
  // Soccer objects configuration
  const soccerObjects = {
    player: {
      type: 'player',
      name: 'Player',
      icon: '👤',
      defaultProps: {
        radius: 18,
        fill: playerColor,
        stroke: '#ffffff',
        strokeWidth: 2,
        text: '1'
      }
    },
    ball: {
      type: 'ball',
      name: 'Soccer Ball',
      icon: '⚽',
      defaultProps: {
        radius: 12
      }
    },
    cone: {
      type: 'cone',
      name: 'Cone',
      icon: '🔺',
      defaultProps: {
        radius: 15,
        fill: '#ff6b35',
        stroke: '#d63031',
        strokeWidth: 2
      }
    },
    goal: {
      type: 'goal',
      name: 'Goal',
      icon: '🥅',
      defaultProps: {
        width: 40,
        height: 30,
        stroke: '#ffffff',
        strokeWidth: 3
      }
    },
    text: {
      type: 'text',
      name: 'Text',
      icon: '📝',
      defaultProps: {
        text: 'Text',
        fontSize: 16,
        fill: '#ffffff',
        fontFamily: 'Arial'
      }
    },
    arrow: {
      type: 'arrow',
      name: 'Arrow',
      icon: '➡️',
      defaultProps: {
        length: 50,
        stroke: '#ffffff',
        strokeWidth: 3,
        rotation: 0
      }
    },
    draw: {
      type: 'draw',
      name: 'Draw',
      icon: '✏️',
      defaultProps: {
        points: [],
        stroke: '#ffffff',
        strokeWidth: 2
      }
    }
  }
  
  // Get current keyframe
  const getCurrentKeyframe = useCallback(() => {
    return keyframes.find(kf => kf.id === selectedKeyframe) || keyframes[0]
  }, [keyframes, selectedKeyframe])
  
  // Calculate interpolated frames for playback
  const calculateInterpolatedFrames = useCallback(() => {
    const sortedKeyframes = [...keyframes].sort((a, b) => a.time - b.time)
    const totalFrames = Math.floor(animationDuration * frameRate)
    const interpolatedFrames = []
    
    for (let frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
      const time = (frameIndex / frameRate)
      const frame = interpolateFrameAtTime(sortedKeyframes, time)
      interpolatedFrames.push(frame)
    }
    
    return interpolatedFrames
  }, [keyframes, animationDuration, frameRate])
  
  // Interpolate objects between keyframes at a specific time
  const interpolateFrameAtTime = (sortedKeyframes, time) => {
    if (sortedKeyframes.length === 0) return []
    if (sortedKeyframes.length === 1) return sortedKeyframes[0].objects
    
    // Find surrounding keyframes
    let beforeKeyframe = null
    let afterKeyframe = null
    
    for (let i = 0; i < sortedKeyframes.length; i++) {
      if (sortedKeyframes[i].time <= time) {
        beforeKeyframe = sortedKeyframes[i]
      }
      if (sortedKeyframes[i].time >= time && !afterKeyframe) {
        afterKeyframe = sortedKeyframes[i]
        break
      }
    }
    
    // If time is before first keyframe or after last keyframe
    if (!beforeKeyframe) return sortedKeyframes[0].objects
    if (!afterKeyframe) return beforeKeyframe.objects
    
    // If time matches a keyframe exactly
    if (beforeKeyframe.time === time) return beforeKeyframe.objects
    
    // Interpolate between keyframes
    const timeDiff = afterKeyframe.time - beforeKeyframe.time
    const progress = (time - beforeKeyframe.time) / timeDiff
    
    return interpolateObjects(beforeKeyframe.objects, afterKeyframe.objects, progress)
  }
  
  // Interpolate between two sets of objects
  const interpolateObjects = (objectsA, objectsB, progress) => {
    const interpolatedObjects = []
    
    // Get all unique object IDs from both frames
    const allIds = new Set([
      ...objectsA.map(obj => obj.id),
      ...objectsB.map(obj => obj.id)
    ])
    
    for (const id of allIds) {
      const objA = objectsA.find(obj => obj.id === id)
      const objB = objectsB.find(obj => obj.id === id)
      
      if (objA && objB) {
        // Both objects exist - interpolate properties
        interpolatedObjects.push(interpolateObject(objA, objB, progress))
      } else if (objA && !objB) {
        // Object exists in A but not B - keep at A position with full opacity
        // This handles objects that are removed from later keyframes
        interpolatedObjects.push(objA)
      } else if (!objA && objB) {
        // Object exists in B but not A - keep at B position with full opacity
        // This handles objects that are added to later keyframes
        interpolatedObjects.push(objB)
      }
    }
    
    return interpolatedObjects
  }
  
  // Interpolate a single object between two states
  const interpolateObject = (objA, objB, progress) => {
    const interpolated = { ...objA }
    
    // Interpolate position
    if (objA.x !== undefined && objB.x !== undefined) {
      interpolated.x = objA.x + (objB.x - objA.x) * progress
    }
    if (objA.y !== undefined && objB.y !== undefined) {
      interpolated.y = objA.y + (objB.y - objA.y) * progress
    }
    
    // Interpolate rotation
    if (objA.rotation !== undefined && objB.rotation !== undefined) {
      let rotationDiff = objB.rotation - objA.rotation
      // Handle rotation wrapping
      if (rotationDiff > 180) rotationDiff -= 360
      if (rotationDiff < -180) rotationDiff += 360
      interpolated.rotation = objA.rotation + rotationDiff * progress
    }
    
    // Interpolate scale/size
    if (objA.radius !== undefined && objB.radius !== undefined) {
      interpolated.radius = objA.radius + (objB.radius - objA.radius) * progress
    }
    
    // For now, keep other properties from objA (could be enhanced)
    return interpolated
  }
  
  // Canvas event handlers
  const handleCanvasClick = (event) => {
    // Prevent event if we're dragging or drawing
    if (isDragging || isDrawing || dragInProgress) {
      console.log('Click prevented - dragging or drawing active')
      return
    }
    
    const canvas = canvasRef.current
    if (!canvas) return
    
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    
    const x = (event.clientX - rect.left) * scaleX
    const y = (event.clientY - rect.top) * scaleY
    
    console.log('Canvas click at:', x, y)
    
    // Check if clicking on existing element
    const currentKeyframe = getCurrentKeyframe()
    console.log('Current keyframe:', currentKeyframe.id, 'Objects:', currentKeyframe.objects.length)
    
    if (currentKeyframe.objects.length > 0) {
      console.log('Checking objects:', currentKeyframe.objects)
      
      const clickedElement = currentKeyframe.objects.find(obj => {
        const isHit = isPointInElement(x, y, obj)
        console.log('Checking object:', obj.type, 'at', obj.x, obj.y, 'radius:', obj.radius, 'Hit:', isHit)
        return isHit
      })
      
      if (clickedElement) {
        console.log('Element clicked:', clickedElement.type, clickedElement.id)
        setSelectedElement(clickedElement)
        event.stopPropagation()
        return
      }
    }
    
    // Place new object
    if (selectedTool === 'draw') {
      setIsDrawing(true)
      setDrawingPoints([{ x, y }])
      return
    }
    
    const objectConfig = soccerObjects[selectedTool]
    if (objectConfig) {
      const newObject = {
        id: `obj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: objectConfig.type,
        x: x,
        y: y,
        ...objectConfig.defaultProps,
        ...(objectConfig.type === 'player' && { fill: playerColor }),
        keyframeId: selectedKeyframe
      }
      
      setKeyframes(prev => prev.map(kf => 
        kf.id === selectedKeyframe 
          ? { ...kf, objects: [...kf.objects, newObject] }
          : kf
      ))
    }
  }
  
  const handleMouseMove = (event) => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    
    const x = (event.clientX - rect.left) * scaleX
    const y = (event.clientY - rect.top) * scaleY
    
    // Update cursor based on what's under the mouse
    if (!isDragging && !isDrawing) {
      const currentKeyframe = getCurrentKeyframe()
      const hoveredElement = currentKeyframe.objects.find(obj => isPointInElement(x, y, obj))
      canvas.style.cursor = hoveredElement ? 'pointer' : 'crosshair'
    }
    
    if (isDrawing && selectedTool === 'draw') {
      setDrawingPoints(prev => [...prev, { x, y }])
    }
    
    if (isDragging && selectedElement) {
      const deltaX = x - dragStart.x
      const deltaY = y - dragStart.y
      
      console.log('Dragging element:', selectedElement.type, 'delta:', deltaX, deltaY)
      
      setKeyframes(prev => prev.map(kf => 
        kf.id === selectedKeyframe 
          ? {
              ...kf,
              objects: kf.objects.map(obj => 
                obj.id === selectedElement.id 
                  ? { ...obj, x: obj.x + deltaX, y: obj.y + deltaY }
                  : obj
              )
            }
          : kf
      ))
      
      setSelectedElement(prev => prev ? {
        ...prev,
        x: prev.x + deltaX,
        y: prev.y + deltaY
      } : null)
      
      setDragStart({ x, y })
    }
  }
  
  const handleMouseDown = (event) => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    
    const x = (event.clientX - rect.left) * scaleX
    const y = (event.clientY - rect.top) * scaleY
    
    console.log('Mouse down at:', x, y, 'Selected element:', selectedElement?.type)
    
    if (selectedElement) {
      console.log('Starting drag of element:', selectedElement.type)
      setIsDragging(true)
      setDragInProgress(true)
      setDragStart({ x, y })
    }
  }
  
  const handleMouseUp = () => {
    console.log('Mouse up - isDragging:', isDragging, 'isDrawing:', isDrawing)
    
    if (isDrawing && selectedTool === 'draw') {
      // Create draw object
      const newObject = {
        id: `obj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'draw',
        points: drawingPoints,
        stroke: '#ffffff',
        strokeWidth: 2,
        keyframeId: selectedKeyframe
      }
      
      setKeyframes(prev => prev.map(kf => 
        kf.id === selectedKeyframe 
          ? { ...kf, objects: [...kf.objects, newObject] }
          : kf
      ))
      
      setIsDrawing(false)
      setDrawingPoints([])
    }
    
    if (isDragging) {
      console.log('Ending drag of element:', selectedElement?.type)
    }
    
    setIsDragging(false)
    setDragInProgress(false)
  }
  
  // Utility functions
  const isPointInElement = (x, y, obj) => {
    switch (obj.type) {
      case 'player':
      case 'ball':
      case 'cone':
        return Math.sqrt((x - obj.x) ** 2 + (y - obj.y) ** 2) <= (obj.radius || 15)
      case 'goal':
        return x >= obj.x - obj.width/2 && x <= obj.x + obj.width/2 &&
               y >= obj.y - obj.height/2 && y <= obj.y + obj.height/2
      case 'text':
        // Approximate text hitbox based on font size
        const textRadius = (obj.fontSize || 16) * 1.5
        return Math.sqrt((x - obj.x) ** 2 + (y - obj.y) ** 2) <= textRadius
      case 'arrow':
        // Check if point is near the arrow line
        const arrowLength = obj.length || 50
        const tolerance = 10
        return x >= obj.x - tolerance && x <= obj.x + arrowLength + tolerance &&
               y >= obj.y - tolerance && y <= obj.y + tolerance
      case 'draw':
        // Check if point is near any of the drawing points
        if (!obj.points || obj.points.length === 0) return false
        return obj.points.some(point => 
          Math.sqrt((x - point.x) ** 2 + (y - point.y) ** 2) <= 5
        )
      default:
        return false
    }
  }
  
  // Keyframe management
  const addKeyframe = () => {
    const newTime = Math.min(currentTime + 1, animationDuration)
    
    // Find the most recent keyframe before the new time to inherit objects from
    const sortedKeyframes = [...keyframes].sort((a, b) => a.time - b.time)
    const previousKeyframe = sortedKeyframes
      .filter(kf => kf.time <= newTime)
      .pop() // Get the last (most recent) keyframe before or at newTime
    
    // Copy objects from the previous keyframe keeping the same IDs
    const inheritedObjects = previousKeyframe ? previousKeyframe.objects.map(obj => ({
      ...obj,
      // Keep the same ID so interpolation works correctly
      keyframeId: `kf_${Date.now()}` // Update keyframe reference only
    })) : []
    
    console.log('Creating new keyframe at time:', newTime, 'with objects:', inheritedObjects.length)
    console.log('Previous keyframe:', previousKeyframe?.id, 'at time:', previousKeyframe?.time)
    
    const newKeyframe = {
      id: `kf_${Date.now()}`,
      time: newTime,
      objects: inheritedObjects
    }
    
    console.log('New keyframe created:', newKeyframe.id, 'at time:', newKeyframe.time)
    
    setKeyframes(prev => {
      const updated = [...prev, newKeyframe]
      console.log('Updated keyframes:', updated.map(kf => ({ id: kf.id, time: kf.time })))
      return updated
    })
    setSelectedKeyframe(newKeyframe.id)
  }
  
  const deleteKeyframe = (keyframeId) => {
    if (keyframes.length <= 1) return // Keep at least one keyframe
    
    setKeyframes(prev => {
      const newKeyframes = prev.filter(kf => kf.id !== keyframeId)
      
      // If we're deleting the selected keyframe, select the first remaining keyframe
      if (selectedKeyframe === keyframeId && newKeyframes.length > 0) {
        setSelectedKeyframe(newKeyframes[0].id)
      }
      
      return newKeyframes
    })
  }
  
  // Keyframe dragging functions
  const handleKeyframeMouseDown = (event, keyframeId) => {
    event.preventDefault()
    setIsDraggingKeyframe(true)
    setDraggedKeyframeId(keyframeId)
    
    // Set up a timer to detect if this is a click vs drag
    const startTime = Date.now()
    const startX = event.clientX
    const startY = event.clientY
    
    const handleMouseMove = (e) => {
      // Don't interfere with slider interactions
      if (e.target.tagName === 'INPUT' && e.target.type === 'range') {
        return
      }
      if (e.target.closest('.bg-blue-50')) {
        return
      }
      
      const deltaX = Math.abs(e.clientX - startX)
      const deltaY = Math.abs(e.clientY - startY)
      
      // If mouse moved more than 5 pixels, it's a drag
      if (deltaX > 5 || deltaY > 5) {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
    
    const handleMouseUp = (e) => {
      // Don't interfere with slider interactions
      if (e.target.tagName === 'INPUT' && e.target.type === 'range') {
        return
      }
      if (e.target.closest('.bg-blue-50')) {
        return
      }
      
      const duration = Date.now() - startTime
      const deltaX = Math.abs(e.clientX - startX)
      const deltaY = Math.abs(e.clientY - startY)
      
      // If it was a short click with minimal movement, treat as click
      if (duration < 200 && deltaX <= 5 && deltaY <= 5) {
        if (!isDraggingKeyframe) {
          setSelectedKeyframe(keyframeId)
        }
      }
      
      setIsDraggingKeyframe(false)
      setDraggedKeyframeId(null)
      
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
    
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }
  
  const handleTimelineMouseMove = (event) => {
    if (!isDraggingKeyframe || !draggedKeyframeId) return
    
    // Don't interfere with slider interactions
    if (event.target.tagName === 'INPUT') return
    
    const timelineElement = timelineRef.current
    if (!timelineElement) return
    
    const timelineRect = timelineElement.getBoundingClientRect()
    const x = event.clientX - timelineRect.left
    const timelineWidth = timelineRect.width
    const newTime = Math.max(0, Math.min(animationDuration, (x / timelineWidth) * animationDuration))
    
    setKeyframes(prev => prev.map(kf => 
      kf.id === draggedKeyframeId 
        ? { ...kf, time: newTime }
        : kf
    ))
  }
  
  const handleKeyframeMouseUp = () => {
    setIsDraggingKeyframe(false)
    setDraggedKeyframeId(null)
  }
  
  // Animation controls
  const playAnimation = () => {
    setIsPlaying(true)
    isPlayingRef.current = true
    animate()
  }
  
  const stopAnimation = () => {
    setIsPlaying(false)
    isPlayingRef.current = false
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
    }
    setCurrentTime(0)
  }
  
  const animate = () => {
    if (!isPlayingRef.current) return
    
    setCurrentTime(prev => {
      const newTime = prev + (1 / frameRate)
      if (newTime >= animationDuration) {
        setIsPlaying(false)
        isPlayingRef.current = false
        return 0
      }
      return newTime
    })
    
    animationRef.current = requestAnimationFrame(animate)
  }
  
  // Rendering functions
  const renderField = (ctx) => {
    // Clear canvas
    ctx.fillStyle = backgroundColor
    ctx.fillRect(0, 0, width, height)
    
    // Calculate field dimensions
    const fieldPadding = 40
    const fieldDisplayWidth = width - (fieldPadding * 2)
    const fieldDisplayHeight = height - (fieldPadding * 2)
    
    // Draw field outline
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 2
    ctx.strokeRect(fieldPadding, fieldPadding, fieldDisplayWidth, fieldDisplayHeight)
    
    // Draw center line
    ctx.beginPath()
    ctx.moveTo(width / 2, fieldPadding)
    ctx.lineTo(width / 2, height - fieldPadding)
    ctx.stroke()
    
    // Draw center circle
    ctx.beginPath()
    ctx.arc(width / 2, height / 2, 50, 0, 2 * Math.PI)
    ctx.stroke()
    
    // Draw penalty areas
    const penaltyWidth = 40
    const penaltyHeight = 80
    
    // Left penalty area
    ctx.strokeRect(fieldPadding, height / 2 - penaltyHeight / 2, penaltyWidth, penaltyHeight)
    
    // Right penalty area
    ctx.strokeRect(width - fieldPadding - penaltyWidth, height / 2 - penaltyHeight / 2, penaltyWidth, penaltyHeight)
  }
  
  const renderObjects = (ctx, objects) => {
    objects.forEach((obj, index) => {
      ctx.save()
      
      if (obj.opacity) {
        ctx.globalAlpha = obj.opacity
      }
      
      switch (obj.type) {
        case 'player':
          ctx.translate(obj.x, obj.y)
          if (obj.rotation) {
            ctx.rotate((obj.rotation * Math.PI) / 180)
          }
          
          ctx.beginPath()
          ctx.arc(0, 0, obj.radius || 18, 0, 2 * Math.PI)
          if (obj.fill) {
            ctx.fillStyle = obj.fill
            ctx.fill()
          }
          if (obj.stroke) {
            ctx.strokeStyle = obj.stroke
            ctx.lineWidth = obj.strokeWidth || 2
            ctx.stroke()
          }
          
          if (obj.text) {
            ctx.fillStyle = '#FFFFFF'
            ctx.font = 'bold 14px Arial'
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.fillText(obj.text, 0, 0)
          }
          break
          
        case 'ball':
          ctx.translate(obj.x, obj.y)
          if (obj.rotation) {
            ctx.rotate((obj.rotation * Math.PI) / 180)
          }
          
          ctx.font = `${(obj.radius || 12) * 2}px Arial`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText('⚽', 0, 0)
          break
          
        case 'cone':
          ctx.translate(obj.x, obj.y)
          if (obj.rotation) {
            ctx.rotate((obj.rotation * Math.PI) / 180)
          }
          
          ctx.beginPath()
          ctx.arc(0, 0, obj.radius || 15, 0, 2 * Math.PI)
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
          
        case 'goal':
          ctx.translate(obj.x, obj.y)
          if (obj.rotation) {
            ctx.rotate((obj.rotation * Math.PI) / 180)
          }
          
          ctx.strokeStyle = obj.stroke || '#ffffff'
          ctx.lineWidth = obj.strokeWidth || 3
          ctx.strokeRect(-obj.width/2, -obj.height/2, obj.width, obj.height)
          break
          
        case 'text':
          ctx.translate(obj.x, obj.y)
          if (obj.rotation) {
            ctx.rotate((obj.rotation * Math.PI) / 180)
          }
          
          ctx.fillStyle = obj.fill || '#ffffff'
          ctx.font = `${obj.fontSize || 16}px ${obj.fontFamily || 'Arial'}`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(obj.text, 0, 0)
          break
          
        case 'arrow':
          ctx.translate(obj.x, obj.y)
          if (obj.rotation) {
            ctx.rotate((obj.rotation * Math.PI) / 180)
          }
          
          ctx.strokeStyle = obj.stroke || '#ffffff'
          ctx.lineWidth = obj.strokeWidth || 3
          ctx.beginPath()
          ctx.moveTo(0, 0)
          ctx.lineTo(obj.length || 50, 0)
          ctx.stroke()
          
          // Arrowhead
          ctx.beginPath()
          ctx.moveTo(obj.length || 50, 0)
          ctx.lineTo((obj.length || 50) - 10, -5)
          ctx.lineTo((obj.length || 50) - 10, 5)
          ctx.closePath()
          ctx.fill()
          break
          
        case 'draw':
          if (obj.points && obj.points.length > 1) {
            ctx.strokeStyle = obj.stroke || '#ffffff'
            ctx.lineWidth = obj.strokeWidth || 2
            ctx.beginPath()
            ctx.moveTo(obj.points[0].x, obj.points[0].y)
            for (let i = 1; i < obj.points.length; i++) {
              ctx.lineTo(obj.points[i].x, obj.points[i].y)
            }
            ctx.stroke()
          }
          break
      }
      
      ctx.restore()
    })
  }
  
  const renderSelectionIndicator = (ctx, element) => {
    if (!element) return
    
    ctx.save()
    ctx.strokeStyle = '#00ff00'
    ctx.lineWidth = 2
    ctx.setLineDash([5, 5])
    
    switch (element.type) {
      case 'player':
      case 'ball':
      case 'cone':
        const radius = element.radius || 18
        ctx.translate(element.x, element.y)
        if (element.rotation) {
          ctx.rotate((element.rotation * Math.PI) / 180)
        }
        ctx.beginPath()
        ctx.arc(0, 0, radius + 5, 0, 2 * Math.PI)
        ctx.stroke()
        break
        
      case 'goal':
        ctx.translate(element.x, element.y)
        if (element.rotation) {
          ctx.rotate((element.rotation * Math.PI) / 180)
        }
        ctx.strokeRect(-element.width/2 - 5, -element.height/2 - 5, element.width + 10, element.height + 10)
        break
    }
    
    ctx.restore()
  }
  
  const renderCurrentDrawing = (ctx) => {
    if (isDrawing && drawingPoints.length > 1) {
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(drawingPoints[0].x, drawingPoints[0].y)
      for (let i = 1; i < drawingPoints.length; i++) {
        ctx.lineTo(drawingPoints[i].x, drawingPoints[i].y)
      }
      ctx.stroke()
    }
  }
  
  // Main render function
  const render = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    
    renderField(ctx)
    
    if (isPlaying) {
      // Render interpolated frame during playback
      const interpolatedFrames = calculateInterpolatedFrames()
      const currentFrameIndex = Math.floor(currentTime * frameRate)
      const currentFrame = interpolatedFrames[currentFrameIndex] || []
      renderObjects(ctx, currentFrame)
    } else {
      // Render current keyframe during editing
      const currentKeyframe = getCurrentKeyframe()
      renderObjects(ctx, currentKeyframe.objects)
      renderSelectionIndicator(ctx, selectedElement)
    }
    
    renderCurrentDrawing(ctx)
  }, [
    width, height, backgroundColor, isPlaying, currentTime, frameRate,
    keyframes, selectedKeyframe, selectedElement, isDrawing, drawingPoints,
    calculateInterpolatedFrames, getCurrentKeyframe
  ])
  
  // Effects
  useEffect(() => {
    render()
  }, [render])
  
  // Force re-render when selected keyframe changes
  useEffect(() => {
    if (!isPlaying && !dragInProgress) {
      // Clear selected element when switching keyframes (but not during dragging)
      setSelectedElement(null)
      // Don't call render() here - it's already handled by the main render useEffect
    }
  }, [selectedKeyframe, isPlaying, dragInProgress, getCurrentKeyframe])
  
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])
  
  // Global mouse events for keyframe dragging - TEMPORARILY DISABLED TO TEST SLIDER
  useEffect(() => {
    // Temporarily disable global mouse events to test if they're interfering with slider
    // if (isDraggingKeyframe) {
    //   const handleGlobalMouseMove = (event) => {
    //     // Don't interfere with slider interactions at all
    //     if (event.target.tagName === 'INPUT' && event.target.type === 'range') {
    //       return
    //     }
    //     // Also check if the event is coming from within the slider container
    //     if (event.target.closest('.bg-blue-50')) {
    //       return
    //     }
    //     // Don't interfere if the event is coming from any input element
    //     if (event.target.tagName === 'INPUT') {
    //       return
    //     }
    //     handleTimelineMouseMove(event)
    //   }
    //   const handleGlobalMouseUp = () => {
    //     handleKeyframeMouseUp()
    //   }
    //   
    //   document.addEventListener('mousemove', handleGlobalMouseMove, { passive: false })
    //   document.addEventListener('mouseup', handleGlobalMouseUp, { passive: false })
    //   
    //   return () => {
    //     document.removeEventListener('mousemove', handleGlobalMouseMove)
    //     document.removeEventListener('mouseup', handleGlobalMouseUp)
    //   }
    // }
  }, [isDraggingKeyframe, draggedKeyframeId, animationDuration])
  
  // Timeline component
  const Timeline = () => (
    <div className="bg-gray-100 p-4 rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Timeline</h3>
        <button
          onClick={() => setShowTimelineHelp(true)}
          className="w-6 h-6 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors flex items-center justify-center text-sm font-bold"
          title="Timeline Help"
        >
          ?
        </button>
      </div>
      
      {/* Timeline slider - protected from keyframe dragging interference */}
      <div className="mb-4 bg-blue-50 p-3 rounded">
        <div className="relative">
          <input
            type="range"
            min="0"
            max={animationDuration}
            step="0.01"
            value={currentTime}
            onChange={(e) => setCurrentTime(parseFloat(e.target.value))}
            onInput={(e) => setCurrentTime(parseFloat(e.target.value))}
            className="w-full h-3 bg-gray-300 rounded-lg appearance-none cursor-pointer"
            disabled={isPlaying}
          />
          <div className="flex justify-between text-xs text-gray-600 mt-2">
            <span>0s</span>
            <span className="font-bold text-blue-600">{currentTime.toFixed(2)}s</span>
            <span>{animationDuration}s</span>
          </div>
        </div>
      </div>
      
      {/* Keyframe markers */}
      <div 
        ref={timelineRef}
        className="relative h-12 bg-gray-200 rounded mb-4"
      >
        {keyframes.map(keyframe => {
          const leftPosition = (keyframe.time / animationDuration) * 100
          const isSelected = keyframe.id === selectedKeyframe
          const isDragged = isDraggingKeyframe && keyframe.id === draggedKeyframeId
          
          return (
            <div
              key={keyframe.id}
              className={`absolute top-0 w-5 h-12 cursor-move select-none rounded-sm transition-all duration-200 z-10 ${
                isSelected 
                  ? 'bg-blue-700 border-3 border-blue-900 shadow-lg ring-2 ring-blue-300' 
                  : 'bg-blue-400 hover:bg-blue-500'
              } ${isDragged ? 'opacity-75 scale-110' : ''}`}
              style={{ left: `${leftPosition}%` }}
              onMouseDown={(e) => handleKeyframeMouseDown(e, keyframe.id)}
              title={`Keyframe at ${keyframe.time.toFixed(1)}s - Drag to move`}
            >
              <div className="text-xs text-white text-center mt-1 font-bold">
                {keyframe.objects.length}
              </div>
            </div>
          )
        })}
        
        {/* Current time indicator */}
        <div
          className="absolute top-0 w-1 h-12 bg-red-500 pointer-events-none"
          style={{ left: `${(currentTime / animationDuration) * 100}%` }}
        />
      </div>
      
      {/* Keyframe info */}
      <div className="mb-3 p-3 rounded-lg text-sm shadow-sm border-2">
        {selectedKeyframe ? (
          <div className="bg-blue-100 border-blue-300">
            <div className="flex justify-between items-center">
              <span className="text-blue-900 font-semibold">
                📍 Selected Keyframe: {keyframes.find(kf => kf.id === selectedKeyframe)?.time.toFixed(1)}s
              </span>
              <span className="text-blue-700 font-medium bg-blue-200 px-2 py-1 rounded">
                {keyframes.find(kf => kf.id === selectedKeyframe)?.objects.length} objects
              </span>
            </div>
          </div>
        ) : (
          <div className="bg-gray-100 border-gray-300">
            <div className="flex items-center">
              <span className="text-gray-600 font-medium">
                💡 Click a keyframe marker to select it for editing
              </span>
            </div>
          </div>
        )}
      </div>
      
      {/* Keyframe controls */}
      <div className="flex gap-2">
        <button
          onClick={addKeyframe}
          className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
        >
          + Add Keyframe
        </button>
        <button
          onClick={() => deleteKeyframe(selectedKeyframe)}
          disabled={keyframes.length <= 1}
          className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400"
        >
          - Delete Keyframe
        </button>
      </div>
      
    </div>
  )
  
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          ⚽ Keyframe Soccer Animator
        </h1>
        
        {/* Tools Row */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <h3 className="text-lg font-semibold mb-4">Tools</h3>
          
          {/* Tool Selection */}
          <div className="grid grid-cols-7 gap-3 mb-4">
            {Object.entries(soccerObjects).map(([key, config]) => (
              <button
                key={key}
                onClick={() => setSelectedTool(key)}
                className={`p-3 rounded-lg border-2 transition-colors ${
                  selectedTool === key
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <div className="text-2xl mb-1">{config.icon}</div>
                <div className="text-xs font-medium">{config.name}</div>
              </button>
            ))}
          </div>
          
          {/* Player Color Selection */}
          {selectedTool === 'player' && (
            <div className="mb-4 bg-blue-50 p-3 rounded-lg">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Player Color:</h4>
              <div className="flex flex-wrap gap-2">
                {playerColors.map(color => (
                  <button
                    key={color.value}
                    onClick={() => setPlayerColor(color.value)}
                    className={`px-3 py-2 rounded text-sm flex items-center space-x-2 border-2 ${
                      playerColor === color.value 
                        ? 'border-blue-500 bg-blue-100' 
                        : 'border-gray-300 bg-white hover:bg-gray-50'
                    }`}
                  >
                    <div 
                      className="w-4 h-4 rounded-full border border-gray-400"
                      style={{ backgroundColor: color.value }}
                    />
                    <span>{color.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Animation Controls Row */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex gap-2">
              <button
                onClick={playAnimation}
                disabled={isPlaying}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
              >
                ▶️ Play
              </button>
              <button
                onClick={stopAnimation}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                ⏹️ Stop
              </button>
            </div>
            
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-700">Duration:</label>
              <input
                type="number"
                value={animationDuration}
                onChange={(e) => setAnimationDuration(parseFloat(e.target.value))}
                className="w-16 px-2 py-1 text-sm border rounded"
                min="1"
                max="60"
              />
              <span className="text-sm text-gray-700">seconds</span>
            </div>
            
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-700">FPS:</label>
              <select
                value={frameRate}
                onChange={(e) => setFrameRate(parseInt(e.target.value))}
                className="px-2 py-1 text-sm border rounded"
              >
                <option value={50}>50</option>
                <option value={30}>30</option>
                <option value={25}>25</option>
                <option value={10}>10</option>
                <option value={5}>5</option>
              </select>
            </div>

            {/* Field Settings */}
            <div className="flex items-center gap-4 ml-auto">
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-700">Length:</label>
                <input
                  type="number"
                  value={fieldLength}
                  onChange={(e) => setFieldLength(parseInt(e.target.value))}
                  className="w-16 px-2 py-1 text-sm border rounded"
                />
                <span className="text-sm text-gray-700">m</span>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-700">Width:</label>
                <input
                  type="number"
                  value={fieldWidth}
                  onChange={(e) => setFieldWidth(parseInt(e.target.value))}
                  className="w-16 px-2 py-1 text-sm border rounded"
                />
                <span className="text-sm text-gray-700">m</span>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-700">Background:</label>
                <input
                  type="color"
                  value={backgroundColor}
                  onChange={(e) => setBackgroundColor(e.target.value)}
                  className="w-8 h-8 border rounded"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Timeline - Full Width */}
        <div className="mb-6">
          <Timeline />
        </div>

        {/* Timeline Help Modal */}
        {showTimelineHelp && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  📊 Timeline Controls Help
                </h3>
                <button
                  onClick={() => setShowTimelineHelp(false)}
                  className="text-gray-400 hover:text-gray-600 text-xl font-bold"
                >
                  ×
                </button>
              </div>
              
              <div className="text-gray-700 space-y-3">
                <div>
                  <h4 className="font-medium text-blue-900 mb-1">🎯 Keyframe Markers</h4>
                  <p className="text-sm">Click blue markers to select keyframes for editing. Numbers show object count.</p>
                </div>
                
                <div>
                  <h4 className="font-medium text-blue-900 mb-1">🖱️ Dragging Keyframes</h4>
                  <p className="text-sm">Drag keyframe markers along the timeline to change their timing. Visual feedback shows when dragging.</p>
                </div>
                
                <div>
                  <h4 className="font-medium text-blue-900 mb-1">⏯️ Timeline Slider</h4>
                  <p className="text-sm">Use the slider to scrub through your animation and preview at any time.</p>
                </div>
                
                <div>
                  <h4 className="font-medium text-blue-900 mb-1">➕ Adding Keyframes</h4>
                  <p className="text-sm">New keyframes inherit all objects from the previous keyframe, ready for editing.</p>
                </div>
                
                <div>
                  <h4 className="font-medium text-blue-900 mb-1">🎬 Animation Flow</h4>
                  <p className="text-sm">Objects automatically interpolate between keyframes during playback.</p>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowTimelineHelp(false)}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  Got it!
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Canvas Area */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow p-4">
              {/* Canvas */}
              <canvas
                ref={canvasRef}
                width={width}
                height={height}
                onClick={handleCanvasClick}
                onMouseMove={handleMouseMove}
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
                className="border border-gray-300 rounded"
                style={{ maxWidth: '100%', height: 'auto', cursor: 'crosshair' }}
              />
              
              {/* Instructions */}
              <div className="mt-4 text-sm text-gray-600">
                <p><strong>Instructions:</strong></p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Select a tool and click on the field to place objects</li>
                  <li>Click on objects to select them (green outline)</li>
                  <li>Drag selected objects to move them</li>
                  <li>Add keyframes - new keyframes inherit objects from previous keyframe</li>
                  <li>Edit/delete objects in each keyframe to create movement</li>
                  <li>Objects will automatically interpolate between keyframes</li>
                </ul>
              </div>
            </div>
          </div>
          
          {/* Element Controls Panel */}
          <div className="lg:col-span-1">
            {selectedElement && (
              <div className="bg-white rounded-lg shadow p-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  Selected: {selectedElement.type.charAt(0).toUpperCase() + selectedElement.type.slice(1)}
                </h4>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      const currentKeyframe = getCurrentKeyframe()
                      setKeyframes(prev => prev.map(kf => 
                        kf.id === selectedKeyframe 
                          ? { ...kf, objects: kf.objects.filter(obj => obj.id !== selectedElement.id) }
                          : kf
                      ))
                      setSelectedElement(null)
                    }}
                    className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    🗑️ Delete
                  </button>
                  <button
                    onClick={() => setSelectedElement(null)}
                    className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
                  >
                    ✕ Deselect
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default KeyframeSoccerAnimator
