import React, { useState, useRef, useEffect } from 'react'
import { supabase } from '../../src/lib/supabase'
import JerseySelector from './JerseySelector'

const KeyframeSoccerAnimatorFixed = () => {
  // Core state
  const [currentTime, setCurrentTime] = useState(0)
  const [animationDuration, setAnimationDuration] = useState(20) // seconds
  const [selectedKeyframe, setSelectedKeyframe] = useState('kf_0')
  
  // Keyframe system
  const [keyframes, setKeyframes] = useState([
    { id: 'kf_0', time: 0, objects: [] }, // Initial keyframe at time 0
  ])
  
  // Canvas and field state
  const canvasRef = useRef(null)
  const [selectedTool, setSelectedTool] = useState('player')
  const [fieldWidth, setFieldWidth] = useState(100) // meters
  const [fieldHeight, setFieldHeight] = useState(64) // meters
  const [fieldBackground, setFieldBackground] = useState('#4ade80') // green
  const [showFieldLines, setShowFieldLines] = useState(true)
  const [selectedJersey, setSelectedJersey] = useState('blue') // default blue jersey
  
  // Object manipulation state
  const [selectedElement, setSelectedElement] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [dragStarted, setDragStarted] = useState(false)
  const [isDraggingControlPoint, setIsDraggingControlPoint] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmData, setDeleteConfirmData] = useState(null)
  
  // Path drawing state
  const [isDrawingPath, setIsDrawingPath] = useState(false)
  const [currentPath, setCurrentPath] = useState(null)
  const [pathPoints, setPathPoints] = useState([])
  const [selectedPath, setSelectedPath] = useState(null)
  const [showPathControls, setShowPathControls] = useState(false)
  
  // Path length cache for performance
  const pathLengthCache = useRef(new Map())
  
  // Database state
  const [savedAnimations, setSavedAnimations] = useState([])
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [showLoadDialog, setShowLoadDialog] = useState(false)
  const [animationName, setAnimationName] = useState('')
  const [animationDescription, setAnimationDescription] = useState('')
  const [currentAnimationId, setCurrentAnimationId] = useState(null)
  
  // Animation playback state
  const [isPlaying, setIsPlaying] = useState(false)
  const [frameRate, setFrameRate] = useState(25) // FPS
  const animationRef = useRef(null)
  
  // Available tools/objects
  const availableTools = [
    { id: 'player', name: 'Player', icon: '👤', color: '#3b82f6' },
    { id: 'ball', name: 'Soccer Ball', icon: '⚽', color: '#ffffff' },
    { id: 'cone', name: 'Cone', icon: '🔺', color: '#f59e0b' },
    { id: 'goal', name: 'Goal', icon: '🥅', color: '#ffffff' },
    { id: 'path', name: 'Path', icon: '📈', color: '#8b5cf6' },
  ]

  // Keyframe dragging functions
  const handleKeyframeMouseDown = (e, keyframeId, keyframeTime) => {
    e.preventDefault()
    e.stopPropagation()
    
    const startMouseX = e.clientX
    const startTime = keyframeTime
    const timelineContainer = e.target.closest('.relative')
    const timelineWidth = timelineContainer ? timelineContainer.offsetWidth : 800
    
    // Throttling variables - more aggressive for smoother dragging
    let lastUpdate = 0
    const throttleDelay = 8 // ~120fps for smoother dragging
    let hasDragged = false
    const dragThreshold = 5 // pixels
    
    const handleMouseMove = (e) => {
      const now = performance.now() // More precise timing
      if (now - lastUpdate < throttleDelay) return
      lastUpdate = now
      
      const deltaX = Math.abs(e.clientX - startMouseX)
      
      // Only start dragging if we've moved more than the threshold
      if (deltaX > dragThreshold) {
        hasDragged = true
      }
      
      if (hasDragged) {
        const actualDeltaX = e.clientX - startMouseX
        const deltaTime = (actualDeltaX / timelineWidth) * animationDuration
        const newTime = Math.max(0, Math.min(animationDuration, startTime + deltaTime))
        
        // Use functional update to avoid dependency on stale state
        setKeyframes(prev => prev.map(kf => 
          kf.id === keyframeId ? { ...kf, time: newTime } : kf
        ))
      }
    }
    
    const handleMouseUp = () => {
      // If we haven't dragged, treat it as a click to select
      if (!hasDragged) {
        setSelectedKeyframe(keyframeId)
      }
      
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
    
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  // Field rendering functions
  const renderField = (ctx, canvas) => {
    const canvasWidth = canvas.width
    const canvasHeight = canvas.height
    
    // Clear canvas with field background
    ctx.fillStyle = fieldBackground
    ctx.fillRect(0, 0, canvasWidth, canvasHeight)
    
    // Only draw field lines if showFieldLines is true
    if (showFieldLines) {
      // Calculate field dimensions based on user input
      // Scale the field to fit the canvas while maintaining aspect ratio
      const canvasAspect = canvasWidth / canvasHeight
      const fieldAspect = fieldWidth / fieldHeight
      
      let fieldDisplayWidth, fieldDisplayHeight, fieldOffsetX, fieldOffsetY
      
      if (fieldAspect > canvasAspect) {
        // Field is wider than canvas - fit to width
        fieldDisplayWidth = canvasWidth - 20 // 10px margin on each side
        fieldDisplayHeight = fieldDisplayWidth / fieldAspect
        fieldOffsetX = 10
        fieldOffsetY = (canvasHeight - fieldDisplayHeight) / 2
      } else {
        // Field is taller than canvas - fit to height
        fieldDisplayHeight = canvasHeight - 20 // 10px margin on each side
        fieldDisplayWidth = fieldDisplayHeight * fieldAspect
        fieldOffsetX = (canvasWidth - fieldDisplayWidth) / 2
        fieldOffsetY = 10
      }
      
      // Draw field outline
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 3
      ctx.strokeRect(fieldOffsetX, fieldOffsetY, fieldDisplayWidth, fieldDisplayHeight)
      
      // Draw center line
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(fieldOffsetX + fieldDisplayWidth / 2, fieldOffsetY)
      ctx.lineTo(fieldOffsetX + fieldDisplayWidth / 2, fieldOffsetY + fieldDisplayHeight)
      ctx.stroke()
      
      // Draw center circle (proportional to field size)
      const centerCircleRadius = Math.min(fieldDisplayWidth, fieldDisplayHeight) * 0.15
      ctx.beginPath()
      ctx.arc(fieldOffsetX + fieldDisplayWidth / 2, fieldOffsetY + fieldDisplayHeight / 2, centerCircleRadius, 0, 2 * Math.PI)
      ctx.stroke()
      
      // Draw center dot
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.arc(fieldOffsetX + fieldDisplayWidth / 2, fieldOffsetY + fieldDisplayHeight / 2, 3, 0, 2 * Math.PI)
      ctx.fill()
      
      // Draw penalty areas (proportional to field size)
      const penaltyWidth = fieldDisplayWidth * 0.2 // 20% of field width
      const penaltyHeight = fieldDisplayHeight * 0.6 // 60% of field height
      
      // Left penalty area
      ctx.strokeRect(fieldOffsetX, fieldOffsetY + (fieldDisplayHeight - penaltyHeight) / 2, penaltyWidth, penaltyHeight)
      
      // Right penalty area
      ctx.strokeRect(fieldOffsetX + fieldDisplayWidth - penaltyWidth, fieldOffsetY + (fieldDisplayHeight - penaltyHeight) / 2, penaltyWidth, penaltyHeight)
      
      // Draw goals (proportional to field size) - 2.25x original size
      const goalWidth = fieldDisplayWidth * 0.1125 // 11.25% of field width (2.25x original)
      const goalHeight = fieldDisplayHeight * 0.675 // 67.5% of field height (2.25x original)
      
      ctx.strokeRect(fieldOffsetX - goalWidth/2, fieldOffsetY + (fieldDisplayHeight - goalHeight) / 2, goalWidth, goalHeight)
      ctx.strokeRect(fieldOffsetX + fieldDisplayWidth - goalWidth/2, fieldOffsetY + (fieldDisplayHeight - goalHeight) / 2, goalWidth, goalHeight)
    }
  }

  const renderObjects = (ctx, objects) => {
    objects.forEach(obj => {
      const tool = availableTools.find(t => t.id === obj.type)
      if (!tool) return
      
      // Skip rendering paths themselves in this loop
      if (obj.type === 'path') return
      
      ctx.save()
      
      // Calculate position - either static or along a path
      let renderX = obj.x
      let renderY = obj.y
      
      if (obj.pathId && isPlaying) {
        // Find the path object
        const pathObj = objects.find(o => o.id === obj.pathId)
        if (pathObj && pathObj.type === 'path') {
          // Calculate progress along path based on current time
          const pathStartTime = obj.pathStartTime || 0
          const pathDuration = obj.pathDuration || 10
          const pathProgress = Math.min(1, Math.max(0, (currentTime - pathStartTime) / pathDuration))
          
          const pathPosition = calculatePositionAlongPath(pathObj, pathProgress)
          if (pathPosition) {
            renderX = pathPosition.x
            renderY = pathPosition.y
          }
        }
      }
      
      // Apply rotation if object has rotation
      if (obj.rotation) {
        ctx.translate(renderX, renderY)
        ctx.rotate((obj.rotation * Math.PI) / 180)
        ctx.translate(-renderX, -renderY)
      }
      
      // Draw selection indicator
      if (selectedElement && selectedElement.id === obj.id) {
        ctx.strokeStyle = '#00ff00'
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.arc(renderX, renderY, 25, 0, 2 * Math.PI)
        ctx.stroke()
        
        // Draw Bezier control point if it exists
        if (obj.controlPoint) {
          ctx.strokeStyle = '#ff6b35'
          ctx.lineWidth = 2
          ctx.setLineDash([5, 5])
          
          // Draw line from object to control point
          ctx.beginPath()
          ctx.moveTo(renderX, renderY)
          ctx.lineTo(obj.controlPoint.x, obj.controlPoint.y)
          ctx.stroke()
          
          // Draw control point
          ctx.setLineDash([])
          ctx.beginPath()
          ctx.arc(obj.controlPoint.x, obj.controlPoint.y, 8, 0, 2 * Math.PI)
          ctx.fillStyle = '#ff6b35'
          ctx.fill()
          ctx.strokeStyle = '#ffffff'
          ctx.lineWidth = 2
          ctx.stroke()
        }
      }
      
      // Draw object
      if (obj.type === 'player') {
        // Draw jersey-based player icon using actual jersey images
        const jerseyType = obj.jersey || 'blue'
        const size = 30
        
        // Create image element for the jersey
        const img = new Image()
        img.src = `/jerseys/${jerseyType}-jersey.png`
        
        // Draw the jersey image
        ctx.save()
        ctx.translate(renderX, renderY)
        
        // Try to draw the image directly without placeholder or border
        img.onload = () => {
          // Redraw the canvas when image loads
          renderFrame()
        }
        
        if (img.complete) {
          // Draw the jersey image with transparent background
          ctx.globalCompositeOperation = 'source-over'
          ctx.drawImage(img, -size/2, -size/2, size, size)
        } else {
          // Only show a subtle placeholder if image hasn't loaded yet
          ctx.fillStyle = '#f0f0f0'
          ctx.globalAlpha = 0.3
          ctx.beginPath()
          ctx.roundRect(-size/2, -size/2, size, size, 4)
          ctx.fill()
          ctx.globalAlpha = 1
        }
        
        ctx.restore()
      } else {
        // Draw other objects with their icons
        ctx.font = '24px Arial'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(tool.icon, renderX, renderY)
      }
      
      ctx.restore()
    })
  }

  // Helper function to check if click is on a control point
  const isPointInControlPoint = (point, controlPoint) => {
    const distance = Math.sqrt(
      Math.pow(point.x - controlPoint.x, 2) + Math.pow(point.y - controlPoint.y, 2)
    )
    return distance <= 12 // Control point radius + some tolerance
  }

  // Helper functions for object manipulation
  const getCanvasCoordinates = (e) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    // Scale coordinates to canvas size
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    
    return {
      x: x * scaleX,
      y: y * scaleY
    }
  }

  const isPointInElement = (point, element) => {
    // Circular hit detection for all objects - use larger radius for better selection
    const radius = element.type === 'player' ? 20 : 20 // Players are 30px, so 20px radius should work well
    const dx = point.x - element.x
    const dy = point.y - element.y
    return dx * dx + dy * dy <= radius * radius
  }

  // Canvas click handler
  const handleCanvasClick = (e) => {
    // Don't handle clicks if we just finished dragging or if we're currently dragging
    if (isDragging || dragStarted) {
      console.log('Ignoring click - currently dragging or drag started')
      return
    }
    
    const canvas = canvasRef.current
    if (!canvas) return
    
    const { x: canvasX, y: canvasY } = getCanvasCoordinates(e)
    
    console.log('Canvas click:', {
      mousePos: { x: canvasX, y: canvasY },
      selectedTool,
      isDragging,
      selectedKeyframe
    })
    
    // Check if clicking on existing object
    const currentKeyframe = keyframes.find(kf => kf.id === selectedKeyframe)
    if (currentKeyframe) {
      // First check for control point clicks (only if an object is selected)
      if (selectedElement && selectedElement.controlPoint) {
        if (isPointInControlPoint({ x: canvasX, y: canvasY }, selectedElement.controlPoint)) {
          console.log('Canvas click - control point selected')
          setIsDraggingControlPoint(true)
          setDragStart({ x: canvasX, y: canvasY })
          return
        }
      }
      
      // Then check for object clicks
      const clickedElement = currentKeyframe.objects.find(obj => 
        isPointInElement({ x: canvasX, y: canvasY }, obj)
      )
      
      console.log('Object detection:', {
        currentKeyframeId: currentKeyframe.id,
        objectCount: currentKeyframe.objects.length,
        clickPos: { x: canvasX, y: canvasY },
        objects: currentKeyframe.objects.map(obj => ({
          id: obj.id,
          type: obj.type,
          pos: { x: obj.x, y: obj.y },
          distance: Math.sqrt(Math.pow(canvasX - obj.x, 2) + Math.pow(canvasY - obj.y, 2))
        })),
        clickedElement: clickedElement ? { id: clickedElement.id, type: clickedElement.type } : null
      })
      
      if (clickedElement) {
        console.log('Object clicked:', {
          elementId: clickedElement.id,
          elementType: clickedElement.type,
          elementPos: { x: clickedElement.x, y: clickedElement.y }
        })
        setSelectedElement(clickedElement)
        setIsDraggingControlPoint(false) // Reset control point dragging
        return
      }
    }
    
    // Handle path drawing
    if (selectedTool === 'path') {
      if (!selectedKeyframe) {
        console.log('Cannot draw path - no keyframe selected')
        return
      }
      
      if (!isDrawingPath) {
        // Start path drawing
        startPathDrawing()
      }
      
      // Add point to current path
      addPathPoint(canvasX, canvasY)
      return
    }
    
    // If no object clicked and we have a tool selected, add new object
    if (selectedTool && selectedTool !== 'path') {
      if (!selectedKeyframe) {
        console.log('Cannot add object - no keyframe selected')
        return
      }
      
      const newObject = {
        id: `${selectedTool}_${Date.now()}`,
        type: selectedTool,
        x: canvasX,
        y: canvasY,
        rotation: 0,
        // Add selected jersey for players
        ...(selectedTool === 'player' && { jersey: selectedJersey })
      }
      
      console.log('Adding new object:', newObject, 'to keyframe:', selectedKeyframe)
      
      // Add object to current keyframe and all subsequent keyframes
      setKeyframes(prev => {
        const currentKeyframeIndex = prev.findIndex(kf => kf.id === selectedKeyframe)
        if (currentKeyframeIndex === -1) return prev
        
        return prev.map((kf, index) => {
          // Add to current keyframe and all following keyframes
          if (index >= currentKeyframeIndex) {
            return { ...kf, objects: [...kf.objects, newObject] }
          }
          return kf
        })
      })
    } else {
      // Deselect if clicking empty space
      console.log('Deselecting - clicked empty space')
      setSelectedElement(null)
    }
  }

  // Mouse down handler for dragging
  const handleCanvasMouseDown = (e) => {
    // console.log('Mouse down on canvas')
    
    const { x: canvasX, y: canvasY } = getCanvasCoordinates(e)
    
    // console.log('Mouse down details:', {
    //   mousePos: { x: canvasX, y: canvasY },
    //   selectedTool,
    //   selectedKeyframe,
    //   hasSelectedElement: !!selectedElement
    // })
    
    // Check if clicking on existing object or control point
    const currentKeyframe = keyframes.find(kf => kf.id === selectedKeyframe)
    if (currentKeyframe) {
      // First check for control point clicks (only if an object is selected)
      if (selectedElement && selectedElement.controlPoint) {
        if (isPointInControlPoint({ x: canvasX, y: canvasY }, selectedElement.controlPoint)) {
          console.log('Mouse down - control point selected')
          setIsDraggingControlPoint(true)
          setDragStart({ x: canvasX, y: canvasY })
          return
        }
      }
      
      // Then check for object clicks
      const clickedElement = currentKeyframe.objects.find(obj => 
        isPointInElement({ x: canvasX, y: canvasY }, obj)
      )
      
      console.log('Mouse down - object check:', {
        currentKeyframeId: currentKeyframe.id,
        objectCount: currentKeyframe.objects.length,
        clickedElement: clickedElement ? { id: clickedElement.id, type: clickedElement.type } : null,
        selectedTool,
        conditionMet: !!clickedElement
      })
      
      if (clickedElement) {
        console.log('Starting drag on element:', {
          elementId: clickedElement.id,
          elementType: clickedElement.type,
          mousePos: { x: canvasX, y: canvasY },
          selectedTool
        })
        setSelectedElement(clickedElement)
        setIsDragging(true)
        setIsDraggingControlPoint(false) // Reset control point dragging
        setDragStarted(true)
        setDragStart({ x: canvasX, y: canvasY })
      }
    }
  }

  // Mouse move handler for dragging
  const handleCanvasMouseMove = (e) => {
    const { x: canvasX, y: canvasY } = getCanvasCoordinates(e)
    
    // Handle control point dragging
    if (isDraggingControlPoint && selectedElement && selectedElement.controlPoint) {
      console.log('Dragging control point:', {
        elementId: selectedElement.id,
        newControlPos: { x: canvasX, y: canvasY }
      })
      
      setKeyframes(prev => prev.map(kf => 
        kf.id === selectedKeyframe 
          ? {
              ...kf,
              objects: kf.objects.map(obj => 
                obj.id === selectedElement.id
                  ? { ...obj, controlPoint: { x: canvasX, y: canvasY } }
                  : obj
              )
            }
          : kf
      ))
      
      setSelectedElement(prev => prev ? { ...prev, controlPoint: { x: canvasX, y: canvasY } } : null)
      return
    }
    
    // Handle object dragging
    if (isDragging && selectedElement) {
      // console.log('Dragging element:', {
      //   elementId: selectedElement.id,
      //   elementType: selectedElement.type,
      //   newPos: { x: canvasX, y: canvasY },
      //   isDragging,
      //   selectedKeyframe
      // })
      
      // Update object position directly to the new mouse position
      setKeyframes(prev => prev.map(kf => 
        kf.id === selectedKeyframe 
          ? {
              ...kf,
              objects: kf.objects.map(obj => 
                obj.id === selectedElement.id
                  ? { ...obj, x: canvasX, y: canvasY }
                  : obj
              )
            }
          : kf
      ))
      
      // Also update the selectedElement state to keep it in sync
      setSelectedElement(prev => prev ? { ...prev, x: canvasX, y: canvasY } : null)
    }
  }

  // Mouse up handler
  const handleCanvasMouseUp = () => {
    console.log('Mouse up - resetting drag states')
    setIsDragging(false)
    setIsDraggingControlPoint(false)
    // Reset drag started flag after a small delay to prevent click event
    setTimeout(() => setDragStarted(false), 100)
  }

  // Rotate object
  const rotateObject = (direction) => {
    if (!selectedElement) return
    
    const rotationDelta = direction === 'left' ? -90 : 90
    
    setKeyframes(prev => prev.map(kf => 
      kf.id === selectedKeyframe 
        ? {
            ...kf,
            objects: kf.objects.map(obj => 
              obj.id === selectedElement.id
                ? { ...obj, rotation: (obj.rotation || 0) + rotationDelta }
                : obj
            )
          }
        : kf
    ))
  }

  // Delete object
  const deleteObject = (objectId) => {
    setKeyframes(prev => prev.map(kf => 
      kf.id === selectedKeyframe 
        ? { ...kf, objects: kf.objects.filter(obj => obj.id !== objectId) }
        : kf
    ))
    setSelectedElement(null)
  }

  // Path drawing functions
  const startPathDrawing = () => {
    setIsDrawingPath(true)
    setPathPoints([])
    setCurrentPath(null)
    setSelectedElement(null)
    console.log('Started path drawing mode')
  }

  const addPathPoint = (x, y) => {
    if (!isDrawingPath) return
    
    const newPoint = { 
      x, 
      y, 
      time: pathPoints.length * 2, // 2 seconds per point
      // Add control points for Bezier curves (initially at the same position)
      controlInX: x,
      controlInY: y,
      controlOutX: x,
      controlOutY: y
    }
    setPathPoints(prev => [...prev, newPoint])
    console.log('Added path point:', newPoint, 'Total points:', pathPoints.length + 1)
  }

  const finishPathDrawing = () => {
    if (pathPoints.length < 2) {
      console.log('Need at least 2 points for a path')
      return
    }

    const newPath = {
      id: `path_${Date.now()}`,
      type: 'path',
      points: [...pathPoints],
      duration: pathPoints.length * 2, // 2 seconds per point
      color: '#8b5cf6',
      visible: true
    }

    // Add path to current keyframe
    setKeyframes(prev => prev.map(kf => 
      kf.id === selectedKeyframe 
        ? { ...kf, objects: [...kf.objects, newPath] }
        : kf
    ))

    // Clear path length cache since we added a new path
    pathLengthCache.current.clear()

    setIsDrawingPath(false)
    setPathPoints([])
    setCurrentPath(null)
    setSelectedPath(newPath)
    console.log('Finished path drawing:', newPath)
  }

  const cancelPathDrawing = () => {
    setIsDrawingPath(false)
    setPathPoints([])
    setCurrentPath(null)
    console.log('Cancelled path drawing')
  }

  // Path following functions
  const calculatePathLength = (path) => {
    if (!path.points || path.points.length < 2) return 0
    
    // Create a cache key based on path structure
    const cacheKey = path.points.map(p => `${p.x},${p.y},${p.controlOutX || p.x},${p.controlOutY || p.y}`).join('|')
    
    // Check cache first
    if (pathLengthCache.current.has(cacheKey)) {
      return pathLengthCache.current.get(cacheKey)
    }
    
    let totalLength = 0
    for (let i = 0; i < path.points.length - 1; i++) {
      const startPoint = path.points[i]
      const endPoint = path.points[i + 1]
      
      // Calculate approximate length of Bezier curve using multiple sample points
      const samples = 10 // Number of samples to approximate curve length
      let segmentLength = 0
      let prevX = startPoint.x
      let prevY = startPoint.y
      
      for (let j = 1; j <= samples; j++) {
        const t = j / samples
        const x = Math.pow(1 - t, 2) * startPoint.x + 
                  2 * (1 - t) * t * (startPoint.controlOutX || startPoint.x) + 
                  Math.pow(t, 2) * endPoint.x
        const y = Math.pow(1 - t, 2) * startPoint.y + 
                  2 * (1 - t) * t * (startPoint.controlOutY || startPoint.y) + 
                  Math.pow(t, 2) * endPoint.y
        
        const dx = x - prevX
        const dy = y - prevY
        segmentLength += Math.sqrt(dx * dx + dy * dy)
        
        prevX = x
        prevY = y
      }
      
      totalLength += segmentLength
    }
    
    // Cache the result
    pathLengthCache.current.set(cacheKey, totalLength)
    
    return totalLength
  }

  const calculatePositionAlongPath = (path, progress) => {
    // progress is a value between 0 and 1
    if (!path.points || path.points.length < 2) return null
    
    const totalPathLength = calculatePathLength(path)
    if (totalPathLength === 0) return { x: path.points[0].x, y: path.points[0].y }
    
    const targetDistance = progress * totalPathLength
    let currentDistance = 0
    
    for (let i = 0; i < path.points.length - 1; i++) {
      const startPoint = path.points[i]
      const endPoint = path.points[i + 1]
      
      // Calculate length of this segment
      const samples = 20 // More samples for better accuracy
      let segmentLength = 0
      let segmentPoints = []
      
      for (let j = 0; j <= samples; j++) {
        const t = j / samples
        const x = Math.pow(1 - t, 2) * startPoint.x + 
                  2 * (1 - t) * t * (startPoint.controlOutX || startPoint.x) + 
                  Math.pow(t, 2) * endPoint.x
        const y = Math.pow(1 - t, 2) * startPoint.y + 
                  2 * (1 - t) * t * (startPoint.controlOutY || startPoint.y) + 
                  Math.pow(t, 2) * endPoint.y
        
        segmentPoints.push({ x, y })
        
        if (j > 0) {
          const dx = x - segmentPoints[j - 1].x
          const dy = y - segmentPoints[j - 1].y
          segmentLength += Math.sqrt(dx * dx + dy * dy)
        }
      }
      
      // Check if target distance falls within this segment
      if (currentDistance + segmentLength >= targetDistance) {
        // Find the exact position within this segment
        const remainingDistance = targetDistance - currentDistance
        let accumulatedDistance = 0
        
        for (let j = 1; j < segmentPoints.length; j++) {
          const dx = segmentPoints[j].x - segmentPoints[j - 1].x
          const dy = segmentPoints[j].y - segmentPoints[j - 1].y
          const segmentStep = Math.sqrt(dx * dx + dy * dy)
          
          if (accumulatedDistance + segmentStep >= remainingDistance) {
            // Interpolate between these two points
            const ratio = (remainingDistance - accumulatedDistance) / segmentStep
            return {
              x: segmentPoints[j - 1].x + ratio * dx,
              y: segmentPoints[j - 1].y + ratio * dy
            }
          }
          
          accumulatedDistance += segmentStep
        }
      }
      
      currentDistance += segmentLength
    }
    
    // If we've reached the end, return the last point
    return { x: path.points[path.points.length - 1].x, y: path.points[path.points.length - 1].y }
  }

  const assignObjectToPath = (objectId, pathId) => {
    setKeyframes(prev => prev.map(kf => 
      kf.id === selectedKeyframe 
        ? {
            ...kf,
            objects: kf.objects.map(obj => 
              obj.id === objectId
                ? { ...obj, pathId, pathStartTime: 0, pathDuration: 10 }
                : obj
            )
          }
        : kf
    ))
    console.log('Assigned object', objectId, 'to path', pathId)
  }

  // Animation playback functions
  const playAnimation = () => {
    setIsPlaying(true)
    setSelectedElement(null) // Clear selection during playback
  }

  const pauseAnimation = () => {
    setIsPlaying(false)
  }

  const stopAnimation = () => {
    setIsPlaying(false)
    setCurrentTime(0)
  }

  // Frame navigation functions
  const goToStart = () => {
    setIsPlaying(false)
    setCurrentTime(0)
  }

  const goToEnd = () => {
    setIsPlaying(false)
    setCurrentTime(animationDuration)
  }

  const stepForward = () => {
    setIsPlaying(false)
    setCurrentTime(prev => Math.min(animationDuration, prev + (1 / frameRate)))
  }

  const stepBackward = () => {
    setIsPlaying(false)
    setCurrentTime(prev => Math.max(0, prev - (1 / frameRate)))
  }

  // Export video function
  const exportVideo = async () => {
    if (keyframes.length < 2) {
      alert('Need at least 2 keyframes to export video')
      return
    }

    const canvas = canvasRef.current
    if (!canvas) return

    const exportFPS = 25
    const totalFrames = Math.ceil(animationDuration * exportFPS)
    
    // Create a temporary canvas for rendering
    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = canvas.width
    tempCanvas.height = canvas.height
    const tempCtx = tempCanvas.getContext('2d')

    // Create MediaRecorder for video export
    const stream = tempCanvas.captureStream(exportFPS)
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'video/webm;codecs=vp9'
    })

    const chunks = []
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data)
      }
    }

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `soccer-animation-${Date.now()}.webm`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }

    // Start recording
    mediaRecorder.start()

    // Render frames
    for (let frame = 0; frame < totalFrames; frame++) {
      const time = (frame / totalFrames) * animationDuration
      
      // Render field
      renderField(tempCtx, tempCanvas)
      
      // Render objects at this time
      const objectsToRender = interpolateObjects(time)
      renderObjects(tempCtx, objectsToRender)
      
      // Wait for frame to be processed
      await new Promise(resolve => setTimeout(resolve, 1000 / exportFPS))
    }

    // Stop recording
    setTimeout(() => {
      mediaRecorder.stop()
    }, 100)
  }

  // Database functions
  const loadSavedAnimations = async () => {
    try {
      const { data, error } = await supabase
        .from('animations')
        .select('*')
        .eq('sport', 'soccer')
        .order('updated_at', { ascending: false })

      if (error) throw error
      setSavedAnimations(data || [])
    } catch (error) {
      console.error('Error loading animations:', error)
      alert('Error loading saved animations')
    }
  }

  const saveAnimation = async () => {
    if (!animationName.trim()) {
      alert('Please enter a name for the animation')
      return
    }

    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      alert('You must be logged in to save animations')
      return
    }

    try {
      const animationData = {
        keyframes,
        frameRate,
        animationDuration,
        fieldWidth,
        fieldHeight,
        fieldBackground,
        showFieldLines,
        selectedJersey
      }

      const fieldSettings = {
        width: fieldWidth,
        height: fieldHeight,
        background: fieldBackground,
        showFieldLines
      }

      console.log('Attempting to save animation:', {
        user: user.id,
        name: animationName,
        keyframesCount: keyframes.length
      })

      const { data, error } = await supabase
        .from('animations')
        .upsert({
          id: currentAnimationId,
          user_id: user.id,
          name: animationName,
          description: animationDescription,
          sport: 'soccer',
          animation_data: animationData,
          field_settings: fieldSettings
        })
        .select()

      if (error) throw error

      setCurrentAnimationId(data[0].id)
      setShowSaveDialog(false)
      setAnimationName('')
      setAnimationDescription('')
      await loadSavedAnimations()
      alert('Animation saved successfully!')
    } catch (error) {
      console.error('Error saving animation:', error)
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      })
      alert(`Error saving animation: ${error.message}`)
    }
  }

  const loadAnimation = async (animationId) => {
    try {
      const { data, error } = await supabase
        .from('animations')
        .select('*')
        .eq('id', animationId)
        .single()

      if (error) throw error

      const animData = data.animation_data
      const fieldData = data.field_settings

      // Load animation data
      setKeyframes(animData.keyframes || [])
      setFrameRate(animData.frameRate || 25)
      setAnimationDuration(animData.animationDuration || 20)
      setFieldWidth(fieldData.width || 800)
      setFieldHeight(fieldData.height || 600)
      setFieldBackground(fieldData.background || '#4ade80')
      setShowFieldLines(fieldData.showFieldLines !== false)
      setSelectedJersey(animData.selectedJersey || 'blue')

      // Reset to first keyframe
      setSelectedKeyframe('kf_0')
      setCurrentTime(0)
      setSelectedElement(null)
      setCurrentAnimationId(animationId)

      setShowLoadDialog(false)
      alert('Animation loaded successfully!')
    } catch (error) {
      console.error('Error loading animation:', error)
      alert('Error loading animation')
    }
  }

  const deleteAnimation = async (animationId) => {
    if (!confirm('Are you sure you want to delete this animation?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('animations')
        .delete()
        .eq('id', animationId)

      if (error) throw error

      await loadSavedAnimations()
      if (currentAnimationId === animationId) {
        setCurrentAnimationId(null)
      }
      alert('Animation deleted successfully!')
    } catch (error) {
      console.error('Error deleting animation:', error)
      alert('Error deleting animation')
    }
  }

  // Load saved animations on component mount
  useEffect(() => {
    loadSavedAnimations()
  }, [])

  // Easing functions for different movement types
  const easingFunctions = {
    linear: (t) => t,
    easeIn: (t) => t * t,
    easeOut: (t) => 1 - Math.pow(1 - t, 2),
    easeInOut: (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
    easeInCubic: (t) => t * t * t,
    easeOutCubic: (t) => 1 - Math.pow(1 - t, 3),
    easeInOutCubic: (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
  }

  // Bezier curve calculation
  const calculateBezierPoint = (t, startPoint, controlPoint, endPoint) => {
    const x = Math.pow(1 - t, 2) * startPoint.x + 2 * (1 - t) * t * controlPoint.x + Math.pow(t, 2) * endPoint.x
    const y = Math.pow(1 - t, 2) * startPoint.y + 2 * (1 - t) * t * controlPoint.y + Math.pow(t, 2) * endPoint.y
    return { x, y }
  }

  // Interpolate objects between keyframes
  const interpolateObjects = (time) => {
    if (keyframes.length < 2) return []

    // Sort keyframes by time
    const sortedKeyframes = [...keyframes].sort((a, b) => a.time - b.time)
    
    // Find surrounding keyframes
    let prevKeyframe = null
    let nextKeyframe = null
    
    for (let i = 0; i < sortedKeyframes.length; i++) {
      if (sortedKeyframes[i].time <= time) {
        prevKeyframe = sortedKeyframes[i]
      }
      if (sortedKeyframes[i].time >= time && !nextKeyframe) {
        nextKeyframe = sortedKeyframes[i]
        break
      }
    }
    
    // If we're at or before the first keyframe
    if (!prevKeyframe) {
      return nextKeyframe ? nextKeyframe.objects : []
    }
    
    // If we're at or after the last keyframe
    if (!nextKeyframe) {
      return prevKeyframe.objects
    }
    
    // If we're exactly at a keyframe
    if (prevKeyframe.time === time) {
      return prevKeyframe.objects
    }
    
    // Interpolate between keyframes
    const timeDiff = nextKeyframe.time - prevKeyframe.time
    const progress = (time - prevKeyframe.time) / timeDiff
    
    const interpolatedObjects = []
    
    // Get all unique object IDs from both keyframes
    const allObjectIds = new Set([
      ...prevKeyframe.objects.map(obj => obj.id),
      ...nextKeyframe.objects.map(obj => obj.id)
    ])
    
    allObjectIds.forEach(objectId => {
      const prevObj = prevKeyframe.objects.find(obj => obj.id === objectId)
      const nextObj = nextKeyframe.objects.find(obj => obj.id === objectId)
      
      if (prevObj && nextObj) {
        // Get easing type from the object (default to linear)
        const easing = prevObj.easing || 'linear'
        let easedProgress = progress
        
        // Apply easing function
        if (easingFunctions[easing]) {
          easedProgress = easingFunctions[easing](progress)
        }
        
        // Check if we have Bezier control points
        if (prevObj.controlPoint) {
          // Use Bezier curve interpolation
          const bezierPoint = calculateBezierPoint(
            easedProgress,
            { x: prevObj.x, y: prevObj.y },
            prevObj.controlPoint,
            { x: nextObj.x, y: nextObj.y }
          )
          
          interpolatedObjects.push({
            ...prevObj,
            x: bezierPoint.x,
            y: bezierPoint.y,
            rotation: prevObj.rotation + (nextObj.rotation - prevObj.rotation) * easedProgress
          })
        } else {
          // Use standard linear interpolation with easing
          interpolatedObjects.push({
            ...prevObj,
            x: prevObj.x + (nextObj.x - prevObj.x) * easedProgress,
            y: prevObj.y + (nextObj.y - prevObj.y) * easedProgress,
            rotation: prevObj.rotation + (nextObj.rotation - prevObj.rotation) * easedProgress
          })
        }
      } else if (prevObj) {
        // Object exists in previous but not next
        interpolatedObjects.push(prevObj)
      } else if (nextObj) {
        // Object exists in next but not previous
        interpolatedObjects.push(nextObj)
      }
    })
    
    return interpolatedObjects
  }

  // Animation loop
  useEffect(() => {
    if (!isPlaying) return
    
    const interval = setInterval(() => {
      setCurrentTime(prev => {
        const nextTime = prev + (1 / frameRate)
        if (nextTime >= animationDuration) {
          setIsPlaying(false)
          return 0 // Loop back to start
        }
        return nextTime
      })
    }, 1000 / frameRate)
    
    return () => clearInterval(interval)
  }, [isPlaying, frameRate, animationDuration])

  // Ensure currentTime doesn't exceed animationDuration
  useEffect(() => {
    if (currentTime > animationDuration) {
      setCurrentTime(animationDuration)
    }
  }, [animationDuration, currentTime])

  // Global mouse up listener to ensure control points release
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDraggingControlPoint || isDragging) {
        console.log('Global mouse up - forcing drag release')
        setIsDragging(false)
        setIsDraggingControlPoint(false)
        setDragStarted(false)
      }
    }

    document.addEventListener('mouseup', handleGlobalMouseUp)
    return () => document.removeEventListener('mouseup', handleGlobalMouseUp)
  }, [isDraggingControlPoint, isDragging])

  // Render canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    
    // Set canvas size
    canvas.width = 800
    canvas.height = 500
    
    // Render field
    renderField(ctx, canvas)
    
    // Render objects - use interpolation when scrubbing or during playback, otherwise use selected keyframe
    let objectsToRender = []
    
    // Check if currentTime matches exactly with a keyframe
    const exactKeyframe = keyframes.find(kf => Math.abs(kf.time - currentTime) < 0.01)
    
    if (exactKeyframe) {
      // We're at an exact keyframe, show its objects
      objectsToRender = exactKeyframe.objects
      // console.log('Rendering exact keyframe:', {
      //   keyframeId: exactKeyframe.id,
      //   keyframeTime: exactKeyframe.time,
      //   currentTime,
      //   objectCount: exactKeyframe.objects.length
      // })
    } else if (keyframes.length > 0) {
      // We're between keyframes or scrubbing, use interpolation
      objectsToRender = interpolateObjects(currentTime)
      // console.log('Rendering interpolated objects:', {
      //   currentTime,
      //   objectCount: objectsToRender.length,
      //   isPlaying
      // })
    }
    
    renderObjects(ctx, objectsToRender)
    
    // Render paths separately (after objects so they appear behind)
    // Hide paths during playback for cleaner animation
    if (!isPlaying) {
      const pathObjects = objectsToRender.filter(obj => obj.type === 'path')
      pathObjects.forEach(obj => {
      const tool = availableTools.find(t => t.id === obj.type)
      if (!tool) return
      
      ctx.save()
      
      // Draw path
      ctx.strokeStyle = obj.color || '#8b5cf6'
      ctx.lineWidth = 3
      ctx.setLineDash([10, 5]) // Dashed line for paths
      
      if (obj.points && obj.points.length >= 2) {
        ctx.beginPath()
        ctx.moveTo(obj.points[0].x, obj.points[0].y)
        
        // Draw Bezier curves between points
        for (let i = 0; i < obj.points.length - 1; i++) {
          const currentPoint = obj.points[i]
          const nextPoint = obj.points[i + 1]
          
          // Use quadratic curves for now (can be upgraded to cubic later)
          const cp1x = currentPoint.controlOutX || currentPoint.x
          const cp1y = currentPoint.controlOutY || currentPoint.y
          const cp2x = nextPoint.controlInX || nextPoint.x
          const cp2y = nextPoint.controlInY || nextPoint.y
          
          ctx.quadraticCurveTo(cp1x, cp1y, nextPoint.x, nextPoint.y)
        }
        ctx.stroke()
      }
      
      // Draw path points and control points
      ctx.setLineDash([])
      ctx.fillStyle = obj.color || '#8b5cf6'
      if (obj.points) {
        obj.points.forEach((point, index) => {
          // Draw main path point
          ctx.beginPath()
          ctx.arc(point.x, point.y, 4, 0, 2 * Math.PI)
          ctx.fill()
          
          // Draw point numbers
          ctx.fillStyle = '#ffffff'
          ctx.font = '12px Arial'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(index.toString(), point.x, point.y)
          ctx.fillStyle = obj.color || '#8b5cf6'
          
          // Draw control points if they're different from the main point
          if (point.controlOutX !== point.x || point.controlOutY !== point.y) {
            // Draw control point
            ctx.fillStyle = '#ff6b35'
            ctx.beginPath()
            ctx.arc(point.controlOutX, point.controlOutY, 3, 0, 2 * Math.PI)
            ctx.fill()
            
            // Draw line from main point to control point
            ctx.strokeStyle = '#ff6b35'
            ctx.lineWidth = 1
            ctx.setLineDash([2, 2])
            ctx.beginPath()
            ctx.moveTo(point.x, point.y)
            ctx.lineTo(point.controlOutX, point.controlOutY)
            ctx.stroke()
            ctx.setLineDash([])
            
            ctx.fillStyle = obj.color || '#8b5cf6'
          }
        })
      }
      
      ctx.restore()
      })
    }
    
    // Render current path being drawn
    if (isDrawingPath && pathPoints.length > 0) {
      ctx.strokeStyle = '#8b5cf6'
      ctx.lineWidth = 3
      ctx.setLineDash([10, 5])
      ctx.globalAlpha = 0.7
      
      ctx.beginPath()
      ctx.moveTo(pathPoints[0].x, pathPoints[0].y)
      
      // Draw Bezier curves between points
      for (let i = 0; i < pathPoints.length - 1; i++) {
        const currentPoint = pathPoints[i]
        const nextPoint = pathPoints[i + 1]
        
        // Use quadratic curves for smooth paths
        const cp1x = currentPoint.controlOutX || currentPoint.x
        const cp1y = currentPoint.controlOutY || currentPoint.y
        const cp2x = nextPoint.controlInX || nextPoint.x
        const cp2y = nextPoint.controlInY || nextPoint.y
        
        ctx.quadraticCurveTo(cp1x, cp1y, nextPoint.x, nextPoint.y)
      }
      ctx.stroke()
      
      // Draw path points
      ctx.setLineDash([])
      ctx.fillStyle = '#8b5cf6'
      ctx.globalAlpha = 1
      
      pathPoints.forEach((point, index) => {
        ctx.beginPath()
        ctx.arc(point.x, point.y, 4, 0, 2 * Math.PI)
        ctx.fill()
        
        // Draw point numbers
        ctx.fillStyle = '#ffffff'
        ctx.font = '12px Arial'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(index.toString(), point.x, point.y)
        ctx.fillStyle = '#8b5cf6'
      })
    }
  }, [keyframes, selectedKeyframe, fieldBackground, selectedElement, isPlaying, currentTime, showFieldLines, fieldWidth, fieldHeight, isDrawingPath, pathPoints])

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          ⚽ Keyframe Soccer Animator - Field Added
        </h1>
        
        {/* Field Controls */}
        <div className="mb-4 bg-white rounded-lg shadow p-4">
          <h3 className="text-lg font-semibold mb-3">Field Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Field Width (m)</label>
              <input
                type="number"
                value={fieldWidth}
                onChange={(e) => setFieldWidth(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Field Height (m)</label>
              <input
                type="number"
                value={fieldHeight}
                onChange={(e) => setFieldHeight(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Background Color</label>
              <input
                type="color"
                value={fieldBackground}
                onChange={(e) => setFieldBackground(e.target.value)}
                className="w-full h-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Field Lines</label>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={showFieldLines}
                  onChange={(e) => setShowFieldLines(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="ml-2 text-sm text-gray-700">
                  {showFieldLines ? 'Show field lines' : 'Hide field lines'}
                </label>
              </div>
            </div>
          </div>
        </div>
        
        {/* Tools Panel */}
        <div className="mb-4 bg-white rounded-lg shadow p-4">
          <h3 className="text-lg font-semibold mb-3">Tools</h3>
          <div className="flex gap-2 items-center">
            <button
              onClick={() => setSelectedTool(null)}
              className={`px-4 py-2 rounded-lg border-2 transition-all ${
                !selectedTool
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
              }`}
            >
              <span className="text-2xl mr-2">↖️</span>
              Select
            </button>
            {availableTools.map(tool => (
              <button
                key={tool.id}
                onClick={() => setSelectedTool(tool.id)}
                className={`px-4 py-2 rounded-lg border-2 transition-all ${
                  selectedTool === tool.id
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                }`}
              >
                <span className="text-2xl mr-2">{tool.icon}</span>
                {tool.name}
              </button>
            ))}
            
            {/* Jersey Selector */}
            <div className="ml-4 pl-4 border-l border-gray-200">
              <JerseySelector
                selectedJersey={selectedJersey}
                onJerseyChange={setSelectedJersey}
              />
            </div>
          </div>
        </div>
        
        {/* Path Drawing Controls */}
        {isDrawingPath && (
          <div className="mb-4 bg-purple-50 rounded-lg shadow p-4 border border-purple-200">
            <h3 className="text-lg font-semibold mb-3 text-purple-800">Drawing Path</h3>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <p className="text-sm text-purple-700">
                  Click on the field to add points to your path. 
                  Current points: {pathPoints.length}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={finishPathDrawing}
                  disabled={pathPoints.length < 2}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    pathPoints.length >= 2
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  ✅ Finish Path ({pathPoints.length} points)
                </button>
                <button
                  onClick={cancelPathDrawing}
                  className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-all"
                >
                  ❌ Cancel
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Timeline Controls */}
        <div className="mb-2 bg-gray-50 p-2 rounded">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-base font-semibold">Timeline</h3>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-600">Duration:</span>
              <span className="font-bold text-blue-600 text-sm">{animationDuration}s</span>
              <button
                onClick={() => setAnimationDuration(d => Math.max(5, d - 5))}
                className="px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded text-xs"
                title="Zoom In (Decrease Duration)"
              >
                −
              </button>
              <button
                onClick={() => setAnimationDuration(d => Math.min(120, d + 5))}
                className="px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded text-xs"
                title="Zoom Out (Increase Duration)"
              >
                +
              </button>
              <button
                onClick={() => {
                  setAnimationDuration(20)
                  // Reset current time if it exceeds new duration
                  setCurrentTime(prev => Math.min(prev, 20))
                }}
                className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs"
                title="Reset to Default (20s)"
              >
                Reset
              </button>
            </div>
          </div>
          
          {/* Timeline slider */}
          <div className="bg-blue-50 p-2 rounded">
            <div className="relative">
            <input
              type="range"
              min="0"
              max={animationDuration}
              step="0.01"
              value={currentTime}
              onChange={(e) => setCurrentTime(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-600 mt-1">
              <span>0s</span>
              <span className="font-bold text-blue-600">{currentTime.toFixed(2)}s</span>
              <span>{animationDuration}s</span>
            </div>
          </div>
            <div className="text-xs text-gray-500 mt-1">
              💡 Click anywhere on the timeline to create a keyframe at that position
            </div>
          </div>
        </div>
        
        {/* Keyframe markers - clickable timeline */}
        <div className="mb-2 bg-gray-100 p-2 rounded">
          <div 
            className="relative h-8 bg-gray-200 rounded cursor-crosshair"
            onClick={(e) => {
              // Calculate the time based on click position
              const rect = e.currentTarget.getBoundingClientRect()
              const clickX = e.clientX - rect.left
              const timelineWidth = rect.width
              const clickedTime = (clickX / timelineWidth) * animationDuration
              
              // Set current time to clicked position
              setCurrentTime(clickedTime)
              
              // Create a keyframe with inherited objects at this time
              const newKeyframeId = `kf_${Date.now()}`
              
              let objectsToInherit = []
              
              if (keyframes.length === 0) {
                // First keyframe - empty objects
                objectsToInherit = []
              } else if (keyframes.length === 1) {
                // Second keyframe - copy from the first keyframe
                const firstKeyframe = keyframes[0]
                objectsToInherit = firstKeyframe.objects
              } else {
                // Subsequent keyframes - use interpolated objects
                objectsToInherit = interpolateObjects(clickedTime)
              }
              
              console.log('Creating keyframe from timeline click:', {
                newKeyframeId,
                clickedTime: clickedTime.toFixed(2),
                keyframeCount: keyframes.length,
                inheritedObjectCount: objectsToInherit.length
              })
              
              const newKeyframe = {
                id: newKeyframeId,
                time: clickedTime,
                objects: objectsToInherit.map(obj => ({
                  ...obj,
                  // Keep the same ID for proper interpolation
                  id: obj.id
                }))
              }
              
              setKeyframes(prev => [...prev, newKeyframe])
              setSelectedKeyframe(newKeyframeId)
            }}
          >
            {keyframes.map(keyframe => {
              const leftPosition = (keyframe.time / animationDuration) * 100
              const isSelected = keyframe.id === selectedKeyframe
              
              return (
                <div
                  key={keyframe.id}
                  className={`absolute top-0 w-6 h-8 cursor-pointer select-none rounded-sm transition-all duration-200 z-10 ${
                    isSelected 
                      ? 'bg-blue-700 border-2 border-blue-900 shadow-md ring-1 ring-blue-300' 
                      : 'bg-blue-400 hover:bg-blue-500'
                  }`}
                  style={{ left: `${leftPosition}%` }}
                  onMouseDown={(e) => handleKeyframeMouseDown(e, keyframe.id, keyframe.time)}
                  onClick={(e) => {
                    e.stopPropagation() // Prevent timeline click
                    setSelectedKeyframe(keyframe.id)
                    setCurrentTime(keyframe.time) // Move timeline slider to keyframe position
                  }}
                  title={`Keyframe at ${keyframe.time.toFixed(1)}s - Drag to move, click to select`}
                >
                  <div className="text-xs text-white text-center mt-0.5 font-bold">
                    {keyframe.objects.length}
                  </div>
                  {keyframes.length > 1 && (
                    <button
                      className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-red-500 text-white text-xs rounded-full hover:bg-red-600 flex items-center justify-center"
                      onClick={(e) => {
                        e.stopPropagation()
                        if (window.confirm(`Delete keyframe at ${keyframe.time.toFixed(1)}s?`)) {
                          setKeyframes(prev => {
                            const newKeyframes = prev.filter(kf => kf.id !== keyframe.id)
                            if (keyframe.id === selectedKeyframe) {
                              // Select the first remaining keyframe
                              if (newKeyframes.length > 0) {
                                setSelectedKeyframe(newKeyframes[0].id)
                              } else {
                                setSelectedKeyframe(null)
                              }
                            }
                            return newKeyframes
                          })
                        }
                      }}
                      title="Delete keyframe"
                    >
                      ×
                    </button>
                  )}
                </div>
              )
            })}
            
            {/* Current time indicator */}
            <div
              className="absolute top-0 w-1 h-12 bg-red-500 pointer-events-none"
              style={{ left: `${(currentTime / animationDuration) * 100}%` }}
            />
          </div>
        </div>
        
        {/* Animation Controls */}
        <div className="mb-4 bg-white rounded-lg shadow p-4">
          <h3 className="text-lg font-semibold mb-3">Animation Controls</h3>
          <div className="flex items-center gap-4">
            {/* Playback Controls */}
            <div className="flex gap-2">
              <button
                onClick={goToStart}
                className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm"
                title="Go to Start"
              >
                ⏮️ Start
              </button>
              <button
                onClick={stepBackward}
                className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm"
                title="Previous Frame"
              >
                ⏪ Step
              </button>
              <button
                onClick={playAnimation}
                disabled={isPlaying || keyframes.length < 2}
                className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 text-sm"
              >
                ▶️ Play
              </button>
              <button
                onClick={pauseAnimation}
                disabled={!isPlaying}
                className="px-3 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:bg-gray-400 text-sm"
              >
                ⏸️ Pause
              </button>
              <button
                onClick={stopAnimation}
                className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
              >
                ⏹️ Stop
              </button>
              <button
                onClick={stepForward}
                className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm"
                title="Next Frame"
              >
                Step ⏩
              </button>
              <button
                onClick={goToEnd}
                className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm"
                title="Go to End"
              >
                End ⏭️
              </button>
            </div>
            
            {/* Frame Rate Control */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Frame Rate:</label>
              <select
                value={frameRate}
                onChange={(e) => setFrameRate(parseInt(e.target.value))}
                className="px-2 py-1 border border-gray-300 rounded"
              >
                <option value={5}>5 FPS</option>
                <option value={10}>10 FPS</option>
                <option value={25}>25 FPS</option>
                <option value={30}>30 FPS</option>
                <option value={50}>50 FPS</option>
              </select>
            </div>

            {/* Save Animation Button */}
            <button
              onClick={() => setShowSaveDialog(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
              title="Save animation to database"
            >
              💾 Save
            </button>

            {/* Load Animation Button */}
            <button
              onClick={() => setShowLoadDialog(true)}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm font-medium"
              title="Load saved animation"
            >
              📂 Load
            </button>

            {/* Export Video Button */}
            <button
              onClick={exportVideo}
              disabled={keyframes.length < 2}
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-400 text-sm font-medium"
              title="Export 25fps video"
            >
              📹 Export Video
            </button>
            
            {/* Keyframe Controls */}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const newKeyframeId = `kf_${Date.now()}`
                  
                  let objectsToInherit = []
                  
                  if (keyframes.length === 0) {
                    // First keyframe - empty objects
                    objectsToInherit = []
                  } else if (keyframes.length === 1) {
                    // Second keyframe - copy from the first keyframe
                    const firstKeyframe = keyframes[0]
                    objectsToInherit = firstKeyframe.objects
                  } else {
                    // Subsequent keyframes - use interpolated objects
                    objectsToInherit = interpolateObjects(currentTime)
                  }
                  
                  console.log('Adding keyframe with inherited objects:', {
                    newKeyframeId,
                    currentTime,
                    keyframeCount: keyframes.length,
                    inheritedObjectCount: objectsToInherit.length
                  })
                  
                  const newKeyframe = {
                    id: newKeyframeId,
                    time: currentTime,
                    objects: objectsToInherit.map(obj => ({
                      ...obj,
                      // Keep the same ID for proper interpolation
                      id: obj.id
                    }))
                  }
                  
                  setKeyframes(prev => [...prev, newKeyframe])
                  setSelectedKeyframe(newKeyframeId)
                }}
                disabled={isPlaying}
                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
              >
                + Add Keyframe at {currentTime.toFixed(1)}s
              </button>
              
              {selectedKeyframe && keyframes.length > 1 && (
                <button
                  onClick={() => {
                    const keyframeToDelete = keyframes.find(kf => kf.id === selectedKeyframe)
                    if (keyframeToDelete && window.confirm(`Delete keyframe at ${keyframeToDelete.time.toFixed(1)}s?`)) {
                      setKeyframes(prev => {
                        const newKeyframes = prev.filter(kf => kf.id !== selectedKeyframe)
                        // Select the first remaining keyframe
                        if (newKeyframes.length > 0) {
                          setSelectedKeyframe(newKeyframes[0].id)
                        } else {
                          setSelectedKeyframe(null)
                        }
                        return newKeyframes
                      })
                    }
                  }}
                  disabled={isPlaying}
                  className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400"
                >
                  🗑️ Delete Selected Keyframe
                </button>
              )}
            </div>
          </div>
        </div>
        
        {/* Soccer Field Canvas */}
        <div className="mb-4 bg-white rounded-lg shadow p-4">
          <h3 className="text-lg font-semibold mb-3">Soccer Field</h3>
          <div className="flex justify-center">
            <canvas
              ref={canvasRef}
              onClick={handleCanvasClick}
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onMouseLeave={handleCanvasMouseUp}
              className={`border-2 border-gray-300 rounded-lg ${
                !selectedTool ? 'cursor-default' : 'cursor-crosshair'
              }`}
              style={{ maxWidth: '100%', height: 'auto' }}
            />
          </div>
          <p className="text-sm text-gray-600 mt-2 text-center">
            {!selectedTool 
              ? 'Click objects to select them, then drag to move or use controls below'
              : selectedTool === 'path'
                ? 'Click on the field to add points to your path. Use the controls above to finish or cancel.'
                : `Click on the field to place ${selectedTool === 'player' ? 'players' : selectedTool === 'ball' ? 'soccer balls' : selectedTool + 's'}`
            }
          </p>
        </div>
        
        {/* Object Controls */}
        {selectedElement && (
          <div className="mb-4 bg-white rounded-lg shadow p-4">
            <h3 className="text-lg font-semibold mb-3">Object Controls</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <p className="text-sm text-gray-600">
                    Selected: {availableTools.find(t => t.id === selectedElement.type)?.name} 
                    {selectedElement.rotation && ` (${selectedElement.rotation}°)`}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => rotateObject('left')}
                    className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                    title="Rotate Left 90°"
                  >
                    ↶ 90°
                  </button>
                  <button
                    onClick={() => rotateObject('right')}
                    className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                    title="Rotate Right 90°"
                  >
                    ↷ 90°
                  </button>
                  <button
                    onClick={() => deleteObject(selectedElement.id)}
                    className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                    title="Delete Object"
                  >
                    🗑️
                  </button>
                </div>
              </div>
              
              {/* Movement Controls */}
              <div className="border-t pt-4">
                <h4 className="text-md font-medium mb-3">Movement Settings</h4>
                
                {/* Player Color Selector */}
                {selectedElement.type === 'player' && (
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Player Color:
                    </label>
                    <div className="flex gap-2">
                      {[
                        { name: 'Red', value: '#ef4444' },
                        { name: 'Blue', value: '#3b82f6' },
                        { name: 'White', value: '#ffffff' },
                        { name: 'Yellow', value: '#facc15' }
                      ].map(color => (
                        <button
                          key={color.value}
                          onClick={() => {
                            const currentKeyframe = keyframes.find(kf => kf.id === selectedKeyframe)
                            if (currentKeyframe) {
                              setKeyframes(prev => prev.map(kf => 
                                kf.id === selectedKeyframe 
                                  ? {
                                      ...kf,
                                      objects: kf.objects.map(obj => 
                                        obj.id === selectedElement.id 
                                          ? { ...obj, color: color.value }
                                          : obj
                                      )
                                    }
                                  : kf
                              ))
                              setSelectedElement(prev => ({ ...prev, color: color.value }))
                            }
                          }}
                          className={`w-8 h-8 rounded-full border-2 ${
                            selectedElement.color === color.value 
                              ? 'border-gray-800 ring-2 ring-gray-400' 
                              : 'border-gray-300'
                          }`}
                          style={{ backgroundColor: color.value }}
                          title={color.name}
                        />
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Easing Selector */}
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Easing Type:
                  </label>
                  <select
                    value={selectedElement.easing || 'linear'}
                    onChange={(e) => {
                      const currentKeyframe = keyframes.find(kf => kf.id === selectedKeyframe)
                      if (currentKeyframe) {
                        setKeyframes(prev => prev.map(kf => 
                          kf.id === selectedKeyframe 
                            ? {
                                ...kf,
                                objects: kf.objects.map(obj => 
                                  obj.id === selectedElement.id 
                                    ? { ...obj, easing: e.target.value }
                                    : obj
                                )
                              }
                            : kf
                        ))
                        setSelectedElement(prev => ({ ...prev, easing: e.target.value }))
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="linear">Linear</option>
                    <option value="easeIn">Ease In</option>
                    <option value="easeOut">Ease Out</option>
                    <option value="easeInOut">Ease In-Out</option>
                    <option value="easeInCubic">Ease In (Cubic)</option>
                    <option value="easeOutCubic">Ease Out (Cubic)</option>
                    <option value="easeInOutCubic">Ease In-Out (Cubic)</option>
                  </select>
                </div>
                
                {/* Bezier Control Point */}
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Curved Path (Bezier):
                  </label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="checkbox"
                      checked={!!selectedElement.controlPoint}
                      onChange={(e) => {
                        const currentKeyframe = keyframes.find(kf => kf.id === selectedKeyframe)
                        if (currentKeyframe) {
                          setKeyframes(prev => prev.map(kf => 
                            kf.id === selectedKeyframe 
                              ? {
                                  ...kf,
                                  objects: kf.objects.map(obj => 
                                    obj.id === selectedElement.id 
                                      ? { 
                                          ...obj, 
                                          controlPoint: e.target.checked 
                                            ? { x: (obj.x + 50), y: (obj.y - 50) } 
                                            : undefined 
                                        }
                                      : obj
                                  )
                                }
                              : kf
                          ))
                          setSelectedElement(prev => ({ 
                            ...prev, 
                            controlPoint: e.target.checked 
                              ? { x: (prev.x + 50), y: (prev.y - 50) } 
                              : undefined 
                          }))
                        }
                      }}
                      className="rounded"
                    />
                    <span className="text-sm text-gray-600">Enable curved movement path</span>
                  </div>
                  
                  {/* Control Point Position */}
                  {selectedElement.controlPoint && (
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Control X:</label>
                        <input
                          type="number"
                          value={selectedElement.controlPoint.x}
                          onChange={(e) => {
                            const currentKeyframe = keyframes.find(kf => kf.id === selectedKeyframe)
                            if (currentKeyframe) {
                              setKeyframes(prev => prev.map(kf => 
                                kf.id === selectedKeyframe 
                                  ? {
                                      ...kf,
                                      objects: kf.objects.map(obj => 
                                        obj.id === selectedElement.id 
                                          ? { 
                                              ...obj, 
                                              controlPoint: { 
                                                ...obj.controlPoint, 
                                                x: parseFloat(e.target.value) 
                                              } 
                                            }
                                          : obj
                                      )
                                    }
                                  : kf
                              ))
                              setSelectedElement(prev => ({ 
                                ...prev, 
                                controlPoint: { 
                                  ...prev.controlPoint, 
                                  x: parseFloat(e.target.value) 
                                } 
                              }))
                            }
                          }}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Control Y:</label>
                        <input
                          type="number"
                          value={selectedElement.controlPoint.y}
                          onChange={(e) => {
                            const currentKeyframe = keyframes.find(kf => kf.id === selectedKeyframe)
                            if (currentKeyframe) {
                              setKeyframes(prev => prev.map(kf => 
                                kf.id === selectedKeyframe 
                                  ? {
                                      ...kf,
                                      objects: kf.objects.map(obj => 
                                        obj.id === selectedElement.id 
                                          ? { 
                                              ...obj, 
                                              controlPoint: { 
                                                ...obj.controlPoint, 
                                                y: parseFloat(e.target.value) 
                                              } 
                                            }
                                          : obj
                                      )
                                    }
                                  : kf
                              ))
                              setSelectedElement(prev => ({ 
                                ...prev, 
                                controlPoint: { 
                                  ...prev.controlPoint, 
                                  y: parseFloat(e.target.value) 
                                } 
                              }))
                            }
                          }}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                        />
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Path Assignment Controls */}
                <div className="border-t pt-4">
                  <h4 className="text-md font-medium mb-3">Path Following</h4>
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Assign to Path:
                    </label>
                    <div className="flex gap-2 items-center">
                      <select
                        value={selectedElement.pathId || ''}
                        onChange={(e) => {
                          if (e.target.value) {
                            assignObjectToPath(selectedElement.id, e.target.value)
                          } else {
                            // Remove path assignment
                            setKeyframes(prev => prev.map(kf => 
                              kf.id === selectedKeyframe 
                                ? {
                                    ...kf,
                                    objects: kf.objects.map(obj => 
                                      obj.id === selectedElement.id
                                        ? { ...obj, pathId: undefined, pathStartTime: undefined, pathDuration: undefined }
                                        : obj
                                    )
                                  }
                                : kf
                            ))
                          }
                        }}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="">No Path (Static Position)</option>
                        {(() => {
                          const currentKeyframe = keyframes.find(kf => kf.id === selectedKeyframe)
                          if (!currentKeyframe) return []
                          return currentKeyframe.objects.filter(obj => obj.type === 'path').map(path => (
                            <option key={path.id} value={path.id}>
                              Path ({path.points?.length || 0} points, {path.duration || 10}s)
                            </option>
                          ))
                        })()}
                      </select>
                    </div>
                    
                    {/* Path timing controls */}
                    {selectedElement.pathId && (
                      <div className="mt-3 grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Start Time (s):</label>
                          <input
                            type="number"
                            value={selectedElement.pathStartTime || 0}
                            onChange={(e) => {
                              const currentKeyframe = keyframes.find(kf => kf.id === selectedKeyframe)
                              if (currentKeyframe) {
                                setKeyframes(prev => prev.map(kf => 
                                  kf.id === selectedKeyframe 
                                    ? {
                                        ...kf,
                                        objects: kf.objects.map(obj => 
                                          obj.id === selectedElement.id
                                            ? { ...obj, pathStartTime: parseFloat(e.target.value) || 0 }
                                            : obj
                                        )
                                      }
                                    : kf
                                ))
                                setSelectedElement(prev => ({ ...prev, pathStartTime: parseFloat(e.target.value) || 0 }))
                              }
                            }}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                            min="0"
                            step="0.1"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Duration (s):</label>
                          <input
                            type="number"
                            value={selectedElement.pathDuration || 10}
                            onChange={(e) => {
                              const currentKeyframe = keyframes.find(kf => kf.id === selectedKeyframe)
                              if (currentKeyframe) {
                                setKeyframes(prev => prev.map(kf => 
                                  kf.id === selectedKeyframe 
                                    ? {
                                        ...kf,
                                        objects: kf.objects.map(obj => 
                                          obj.id === selectedElement.id
                                            ? { ...obj, pathDuration: parseFloat(e.target.value) || 10 }
                                            : obj
                                        )
                                      }
                                    : kf
                                ))
                                setSelectedElement(prev => ({ ...prev, pathDuration: parseFloat(e.target.value) || 10 }))
                              }
                            }}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                            min="0.1"
                            step="0.1"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-lg font-semibold mb-4">Debug Info</h3>
          <p>Current Time: {currentTime.toFixed(2)}s</p>
          <p>Animation Duration: {animationDuration}s</p>
          <p>Selected Keyframe: {selectedKeyframe}</p>
        </div>

        {/* Save Animation Dialog */}
        {showSaveDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-96 max-w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">Save Animation</h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Animation Name *
                </label>
                <input
                  type="text"
                  value={animationName}
                  onChange={(e) => setAnimationName(e.target.value)}
                  placeholder="Enter animation name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (optional)
                </label>
                <textarea
                  value={animationDescription}
                  onChange={(e) => setAnimationDescription(e.target.value)}
                  placeholder="Enter description"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowSaveDialog(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  onClick={saveAnimation}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Save Animation
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Load Animation Dialog */}
        {showLoadDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-96 max-w-full mx-4 max-h-96 overflow-y-auto">
              <h3 className="text-lg font-semibold mb-4">Load Animation</h3>
              
              {savedAnimations.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No saved animations found</p>
              ) : (
                <div className="space-y-3">
                  {savedAnimations.map((animation) => (
                    <div key={animation.id} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{animation.name}</h4>
                          {animation.description && (
                            <p className="text-sm text-gray-600 mt-1">{animation.description}</p>
                          )}
                          <p className="text-xs text-gray-500 mt-1">
                            Updated: {new Date(animation.updated_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex gap-2 ml-3">
                          <button
                            onClick={() => loadAnimation(animation.id)}
                            className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                          >
                            Load
                          </button>
                          <button
                            onClick={() => deleteAnimation(animation.id)}
                            className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setShowLoadDialog(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
        
      </div>
    </div>
  )
}

export default KeyframeSoccerAnimatorFixed
