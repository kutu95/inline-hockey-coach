import React, { useRef, useEffect, useState, useCallback } from 'react'
import { getSportConfig } from '../../src/lib/sports/config'

/**
 * SoccerAnimator - Soccer-focused animation editor with customizable field
 */
const SoccerAnimator = ({ 
  width = 800,
  height = 500,
  className = ''
}) => {
  const canvasRef = useRef(null)
  const [selectedTool, setSelectedTool] = useState('ball')
  const [placedObjects, setPlacedObjects] = useState([])
  const [currentFrame, setCurrentFrame] = useState(0)
  const [frames, setFrames] = useState([[]]) // Start with one empty frame
  const [playerColor, setPlayerColor] = useState('#ff0000') // Default red
  const [isDrawing, setIsDrawing] = useState(false)
  const [drawingPoints, setDrawingPoints] = useState([])
  const [selectedElement, setSelectedElement] = useState(null)
  const [editingText, setEditingText] = useState(null)
  const [editTextValue, setEditTextValue] = useState('')
  const [isPlaying, setIsPlaying] = useState(false)
  const [frameRate, setFrameRate] = useState(5)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [isRotating, setIsRotating] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmData, setDeleteConfirmData] = useState(null)
  
  const isPlayingRef = useRef(false)
  
  // Field customization options
  const [fieldLength, setFieldLength] = useState(105) // meters
  const [fieldWidth, setFieldWidth] = useState(68) // meters
  const [backgroundColor, setBackgroundColor] = useState('#4a7c59') // grass green
  
  // Available player colors
  const playerColors = [
    { name: 'Red', value: '#ff0000' },
    { name: 'Blue', value: '#0066cc' },
    { name: 'White', value: '#ffffff' },
    { name: 'Yellow', value: '#ffdd00' }
  ]
  
  // Soccer-specific objects
  const soccerObjects = [
    {
      id: 'ball',
      name: 'Soccer Ball',
      icon: '⚽',
      type: 'ball',
      defaultProps: {
        radius: 12,
        fill: '#ffffff',
        stroke: '#000000',
        strokeWidth: 2
      }
    },
    {
      id: 'player',
      name: 'Player',
      icon: '👤',
      type: 'player',
      defaultProps: {
        radius: 18,
        fill: playerColor,
        stroke: '#ffffff',
        strokeWidth: 2,
        text: '1'
      }
    },
    {
      id: 'cone',
      name: 'Cone',
      icon: '🔺',
      type: 'cone',
      defaultProps: {
        width: 20,
        height: 20,
        fill: '#ff8800',
        stroke: '#000000',
        strokeWidth: 1
      }
    },
    {
      id: 'goal',
      name: 'Goal',
      icon: '🥅',
      type: 'goal',
      defaultProps: {
        width: 80,
        height: 60,
        fill: 'transparent',
        stroke: '#ffffff',
        strokeWidth: 3
      }
    },
    {
      id: 'text',
      name: 'Text',
      icon: 'T',
      type: 'text',
      defaultProps: {
        text: 'Label',
        fontSize: 16,
        fill: '#000000',
        fontFamily: 'Arial'
      }
    },
    {
      id: 'arrow',
      name: 'Arrow',
      icon: '→',
      type: 'arrow',
      defaultProps: {
        points: [0, 0, 50, 0],
        stroke: '#000000',
        strokeWidth: 3,
        rotation: 0
      }
    },
    {
      id: 'draw',
      name: 'Draw',
      icon: '✏️',
      type: 'draw',
      defaultProps: {
        points: [],
        stroke: '#000000',
        strokeWidth: 3
      }
    }
  ]
  
  // Calculate field scaling
  const fieldAspectRatio = fieldLength / fieldWidth
  const canvasAspectRatio = width / height
  
  let fieldCanvasWidth, fieldCanvasHeight, fieldX, fieldY
  
  if (fieldAspectRatio > canvasAspectRatio) {
    // Field is wider than canvas
    fieldCanvasWidth = width * 0.9
    fieldCanvasHeight = fieldCanvasWidth / fieldAspectRatio
  } else {
    // Field is taller than canvas
    fieldCanvasHeight = height * 0.9
    fieldCanvasWidth = fieldCanvasHeight * fieldAspectRatio
  }
  
  fieldX = (width - fieldCanvasWidth) / 2
  fieldY = (height - fieldCanvasHeight) / 2
  
  // Helper function to check if a point is inside an element
  const isPointInElement = (x, y, element) => {
    switch (element.type) {
      case 'ball':
      case 'player':
        const radius = element.radius || 18
        const distance = Math.sqrt((x - element.x) ** 2 + (y - element.y) ** 2)
        return distance <= radius
        
      case 'cone':
        const coneWidth = element.width || 20
        const coneHeight = element.height || 20
        return Math.abs(x - element.x) <= coneWidth / 2 && 
               Math.abs(y - element.y) <= coneHeight / 2
               
      case 'goal':
        const goalWidth = element.width || 80
        const goalHeight = element.height || 60
        return Math.abs(x - element.x) <= goalWidth / 2 && 
               Math.abs(y - element.y) <= goalHeight / 2
               
      case 'text':
        // Rough text bounding box - could be improved with actual text metrics
        const textWidth = (element.text || 'Text').length * (element.fontSize || 16) * 0.6
        const textHeight = element.fontSize || 16
        return Math.abs(x - element.x) <= textWidth / 2 && 
               Math.abs(y - element.y) <= textHeight / 2
               
      case 'arrow':
        // Check if point is near the arrow line
        const arrowLength = Math.sqrt((element.points?.[2] || 50) ** 2 + (element.points?.[3] || 0) ** 2)
        const clickX = x - element.x
        const clickY = y - element.y
        const distanceToLine = Math.abs(clickX * (element.points?.[3] || 0) - clickY * (element.points?.[2] || 50)) / arrowLength
        return distanceToLine <= 10 && clickX >= -10 && clickX <= arrowLength + 10 && 
               clickY >= -10 && clickY <= arrowLength + 10
               
      case 'draw':
        // Check if point is near any part of the drawn line
        if (!element.points || element.points.length < 4) return false
        for (let i = 0; i < element.points.length - 2; i += 2) {
          const x1 = element.points[i]
          const y1 = element.points[i + 1]
          const x2 = element.points[i + 2]
          const y2 = element.points[i + 3]
          const distanceToLine = Math.abs((y2 - y1) * x - (x2 - x1) * y + x2 * y1 - y2 * x1) / 
                                Math.sqrt((y2 - y1) ** 2 + (x2 - x1) ** 2)
          if (distanceToLine <= 10) return true
        }
        return false
        
      default:
        return false
    }
  }
  
  // Handle canvas click to place objects or select elements
  const handleCanvasClick = useCallback((event) => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const rect = canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    
    // First, check if clicking on an existing element
    const currentFrameObjects = frames[currentFrame] || []
    const clickedElement = currentFrameObjects.find(obj => isPointInElement(x, y, obj))
    
    if (clickedElement) {
      // If clicking on an element, select it
      setSelectedElement(clickedElement)
      
      // Handle text editing
      if (clickedElement.type === 'text') {
        setEditingText(clickedElement.id)
        setEditTextValue(clickedElement.text || '')
      }
      
      return
    }
    
    // If no tool selected or clicking on empty space, deselect
    if (!selectedTool) {
      setSelectedElement(null)
      return
    }
    
    // Handle drawing tool differently
    if (selectedTool === 'draw') {
      setIsDrawing(true)
      setDrawingPoints([x, y])
      return
    }
    
    // Find the selected object configuration
    const objectConfig = soccerObjects.find(obj => obj.id === selectedTool)
    if (!objectConfig) return
    
    // Create new object with current player color if it's a player
    const newObject = {
      id: `obj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: objectConfig.type,
      x: x,
      y: y,
      ...objectConfig.defaultProps,
      ...(objectConfig.type === 'player' && { fill: playerColor }),
      frame: currentFrame
    }
    
    // Add to current frame
    setFrames(prev => {
      const newFrames = [...prev]
      newFrames[currentFrame] = [...(newFrames[currentFrame] || []), newObject]
      return newFrames
    })
  }, [selectedTool, soccerObjects, currentFrame, playerColor, frames, isPointInElement])
  
  // Handle mouse move for drawing and dragging
  const handleMouseMove = useCallback((event) => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const rect = canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    
    if (isDrawing && selectedTool === 'draw') {
      setDrawingPoints(prev => [...prev, x, y])
      return
    }
    
    if (isDragging && selectedElement) {
      const deltaX = x - dragStart.x
      const deltaY = y - dragStart.y
      
      // Update the selected element's position in current frame and all subsequent frames
      setFrames(prev => {
        const newFrames = [...prev]
        
        for (let frameIndex = currentFrame; frameIndex < newFrames.length; frameIndex++) {
          newFrames[frameIndex] = newFrames[frameIndex].map(obj => 
            obj.id === selectedElement.id 
              ? { ...obj, x: obj.x + deltaX, y: obj.y + deltaY }
              : obj
          )
        }
        
        return newFrames
      })
      
      // Update selected element reference
      setSelectedElement(prev => prev ? {
        ...prev,
        x: prev.x + deltaX,
        y: prev.y + deltaY
      } : null)
      
      setDragStart({ x, y })
    }
  }, [isDrawing, selectedTool, isDragging, selectedElement, dragStart, currentFrame])
  
  // Handle mouse down for dragging
  const handleMouseDown = useCallback((event) => {
    if (selectedElement && !isDrawing) {
      const canvas = canvasRef.current
      if (!canvas) return
      
      const rect = canvas.getBoundingClientRect()
      const x = event.clientX - rect.left
      const y = event.clientY - rect.top
      
      setIsDragging(true)
      setDragStart({ x, y })
    }
  }, [selectedElement, isDrawing])
  
  // Handle mouse up for drawing and dragging
  const handleMouseUp = useCallback(() => {
    if (isDrawing && selectedTool === 'draw' && drawingPoints.length >= 2) {
      // Create draw element
      const newObject = {
        id: `obj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'draw',
        points: [...drawingPoints],
        stroke: '#000000',
        strokeWidth: 3,
        frame: currentFrame
      }
      
      // Add to current frame
      setFrames(prev => {
        const newFrames = [...prev]
        newFrames[currentFrame] = [...(newFrames[currentFrame] || []), newObject]
        return newFrames
      })
    }
    
    setIsDrawing(false)
    setDrawingPoints([])
    setIsDragging(false)
  }, [isDrawing, selectedTool, drawingPoints, currentFrame])
  
  // Render soccer field with custom dimensions
  const renderField = useCallback((ctx) => {
    // Clear canvas
    ctx.clearRect(0, 0, width, height)
    
    // Set background color
    ctx.fillStyle = backgroundColor
    ctx.fillRect(0, 0, width, height)
    
    // Draw field boundary
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 3
    ctx.strokeRect(fieldX, fieldY, fieldCanvasWidth, fieldCanvasHeight)
    
    // Draw center line
    ctx.beginPath()
    ctx.moveTo(fieldX + fieldCanvasWidth / 2, fieldY)
    ctx.lineTo(fieldX + fieldCanvasWidth / 2, fieldY + fieldCanvasHeight)
    ctx.stroke()
    
    // Draw center circle
    const centerX = fieldX + fieldCanvasWidth / 2
    const centerY = fieldY + fieldCanvasHeight / 2
    const centerRadius = Math.min(fieldCanvasWidth, fieldCanvasHeight) * 0.15
    ctx.beginPath()
    ctx.arc(centerX, centerY, centerRadius, 0, 2 * Math.PI)
    ctx.stroke()
    
    // Draw center spot
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.arc(centerX, centerY, 5, 0, 2 * Math.PI)
    ctx.fill()
    
    // Draw penalty areas (18-yard box)
    const penaltyAreaWidth = fieldCanvasWidth * 0.15 // 18 yards is about 15% of field length
    const penaltyAreaHeight = fieldCanvasHeight * 0.6 // 44 yards is about 60% of field width
    
    // Left penalty area
    ctx.strokeRect(
      fieldX, 
      fieldY + (fieldCanvasHeight - penaltyAreaHeight) / 2, 
      penaltyAreaWidth, 
      penaltyAreaHeight
    )
    
    // Right penalty area
    ctx.strokeRect(
      fieldX + fieldCanvasWidth - penaltyAreaWidth, 
      fieldY + (fieldCanvasHeight - penaltyAreaHeight) / 2, 
      penaltyAreaWidth, 
      penaltyAreaHeight
    )
    
    // Draw goals
    const goalWidth = fieldCanvasWidth * 0.08
    const goalHeight = fieldCanvasHeight * 0.25
    
    // Left goal
    ctx.strokeRect(fieldX - goalWidth, fieldY + (fieldCanvasHeight - goalHeight) / 2, goalWidth, goalHeight)
    
    // Right goal
    ctx.strokeRect(fieldX + fieldCanvasWidth, fieldY + (fieldCanvasHeight - goalHeight) / 2, goalWidth, goalHeight)
    
    // Draw goal areas (6-yard box)
    const goalAreaWidth = fieldCanvasWidth * 0.05
    const goalAreaHeight = fieldCanvasHeight * 0.35
    
    // Left goal area
    ctx.strokeRect(
      fieldX, 
      fieldY + (fieldCanvasHeight - goalAreaHeight) / 2, 
      goalAreaWidth, 
      goalAreaHeight
    )
    
    // Right goal area
    ctx.strokeRect(
      fieldX + fieldCanvasWidth - goalAreaWidth, 
      fieldY + (fieldCanvasHeight - goalAreaHeight) / 2, 
      goalAreaWidth, 
      goalAreaHeight
    )
    
  }, [width, height, backgroundColor, fieldX, fieldY, fieldCanvasWidth, fieldCanvasHeight])
  
  // Render current drawing
  const renderCurrentDrawing = useCallback((ctx) => {
    if (isDrawing && drawingPoints.length > 1) {
      ctx.strokeStyle = '#000000'
      ctx.lineWidth = 3
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.beginPath()
      ctx.moveTo(drawingPoints[0], drawingPoints[1])
      for (let i = 2; i < drawingPoints.length; i += 2) {
        ctx.lineTo(drawingPoints[i], drawingPoints[i + 1])
      }
      ctx.stroke()
    }
  }, [isDrawing, drawingPoints])
  
  // Render selection indicator
  const renderSelectionIndicator = useCallback((ctx) => {
    if (!selectedElement) return
    
    ctx.save()
    ctx.strokeStyle = '#00ff00'
    ctx.lineWidth = 2
    ctx.setLineDash([5, 5])
    
    switch (selectedElement.type) {
      case 'ball':
      case 'player':
        const radius = selectedElement.radius || 18
        ctx.save()
        ctx.translate(selectedElement.x, selectedElement.y)
        if (selectedElement.rotation) {
          ctx.rotate((selectedElement.rotation * Math.PI) / 180)
        }
        ctx.beginPath()
        ctx.arc(0, 0, radius + 5, 0, 2 * Math.PI)
        ctx.stroke()
        ctx.restore()
        break
        
      case 'cone':
        const coneWidth = selectedElement.width || 20
        const coneHeight = selectedElement.height || 20
        ctx.save()
        ctx.translate(selectedElement.x, selectedElement.y)
        if (selectedElement.rotation) {
          ctx.rotate((selectedElement.rotation * Math.PI) / 180)
        }
        ctx.strokeRect(-coneWidth / 2 - 5, -coneHeight / 2 - 5, coneWidth + 10, coneHeight + 10)
        ctx.restore()
        break
        
      case 'goal':
        const goalWidth = selectedElement.width || 80
        const goalHeight = selectedElement.height || 60
        ctx.save()
        ctx.translate(selectedElement.x, selectedElement.y)
        if (selectedElement.rotation) {
          ctx.rotate((selectedElement.rotation * Math.PI) / 180)
        }
        ctx.strokeRect(-goalWidth / 2 - 5, -goalHeight / 2 - 5, goalWidth + 10, goalHeight + 10)
        ctx.restore()
        break
        
      case 'text':
        const textWidth = (selectedElement.text || 'Text').length * (selectedElement.fontSize || 16) * 0.6
        const textHeight = selectedElement.fontSize || 16
        ctx.save()
        ctx.translate(selectedElement.x, selectedElement.y)
        if (selectedElement.rotation) {
          ctx.rotate((selectedElement.rotation * Math.PI) / 180)
        }
        ctx.strokeRect(-5, -5, textWidth + 10, textHeight + 10)
        ctx.restore()
        break
        
      case 'arrow':
        const arrowLength = Math.sqrt((selectedElement.points?.[2] || 50) ** 2 + (selectedElement.points?.[3] || 0) ** 2)
        ctx.save()
        ctx.translate(selectedElement.x, selectedElement.y)
        if (selectedElement.rotation) {
          ctx.rotate((selectedElement.rotation * Math.PI) / 180)
        }
        ctx.strokeRect(-5, -5, arrowLength + 10, 20)
        ctx.restore()
        break
        
      case 'draw':
        if (selectedElement.points && selectedElement.points.length >= 4) {
          const minX = Math.min(...selectedElement.points.filter((_, i) => i % 2 === 0))
          const maxX = Math.max(...selectedElement.points.filter((_, i) => i % 2 === 0))
          const minY = Math.min(...selectedElement.points.filter((_, i) => i % 2 === 1))
          const maxY = Math.max(...selectedElement.points.filter((_, i) => i % 2 === 1))
          ctx.strokeRect(minX - 5, minY - 5, maxX - minX + 10, maxY - minY + 10)
        }
        break
    }
    
    ctx.restore()
  }, [selectedElement])
  
  // Render placed objects
  const renderObjects = useCallback((ctx) => {
    const currentFrameObjects = frames[currentFrame] || []
    
    currentFrameObjects.forEach(obj => {
      ctx.save()
      
      switch (obj.type) {
        case 'ball':
          // Apply rotation transformation
          ctx.save()
          ctx.translate(obj.x, obj.y)
          if (obj.rotation) {
            ctx.rotate((obj.rotation * Math.PI) / 180)
          }
          
          const ballRadius = obj.radius || 12
          
          // Draw the soccer ball emoji icon
          ctx.font = `${ballRadius * 2}px Arial`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText('⚽', 0, 0)
          
          ctx.restore()
          break
          
        case 'player':
          // Apply rotation transformation
          ctx.save()
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
          
          // Draw player number
          if (obj.text) {
            ctx.fillStyle = '#FFFFFF'
            ctx.font = 'bold 14px Arial'
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.fillText(obj.text, 0, 0)
          }
          
          ctx.restore()
          break
          
        case 'goal':
          // Apply rotation transformation
          ctx.save()
          ctx.translate(obj.x, obj.y)
          if (obj.rotation) {
            ctx.rotate((obj.rotation * Math.PI) / 180)
          }
          
          ctx.beginPath()
          ctx.rect(-(obj.width || 40) / 2, -(obj.height || 30) / 2, obj.width || 40, obj.height || 30)
          if (obj.fill && obj.fill !== 'transparent') {
            ctx.fillStyle = obj.fill
            ctx.fill()
          }
          if (obj.stroke) {
            ctx.strokeStyle = obj.stroke
            ctx.lineWidth = obj.strokeWidth || 3
            ctx.stroke()
          }
          
          ctx.restore()
          break
          
        case 'cone':
          // Apply rotation transformation
          ctx.save()
          ctx.translate(obj.x, obj.y)
          if (obj.rotation) {
            ctx.rotate((obj.rotation * Math.PI) / 180)
          }
          
          // Draw triangle for cone
          ctx.beginPath()
          ctx.moveTo(0, -(obj.height || 10))
          ctx.lineTo(-(obj.width || 10) / 2, (obj.height || 10))
          ctx.lineTo((obj.width || 10) / 2, (obj.height || 10))
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
          
          ctx.restore()
          break
          
        case 'text':
          // Apply rotation transformation
          ctx.save()
          ctx.translate(obj.x, obj.y)
          if (obj.rotation) {
            ctx.rotate((obj.rotation * Math.PI) / 180)
          }
          
          ctx.fillStyle = obj.fill || '#000000'
          ctx.font = `${obj.fontSize || 16}px ${obj.fontFamily || 'Arial'}`
          ctx.textAlign = 'left'
          ctx.textBaseline = 'top'
          ctx.fillText(obj.text || 'Text', 0, 0)
          
          ctx.restore()
          break
          
        case 'arrow':
          ctx.strokeStyle = obj.stroke || '#000000'
          ctx.lineWidth = obj.strokeWidth || 3
          
          // Apply rotation transformation
          ctx.save()
          ctx.translate(obj.x, obj.y)
          if (obj.rotation) {
            ctx.rotate((obj.rotation * Math.PI) / 180)
          }
          
          ctx.beginPath()
          ctx.moveTo(0, 0)
          ctx.lineTo(obj.points?.[2] || 50, obj.points?.[3] || 0)
          ctx.stroke()
          
          // Draw arrowhead
          const arrowLength = Math.sqrt((obj.points?.[2] || 50) ** 2 + (obj.points?.[3] || 0) ** 2)
          const arrowSize = Math.min(10, arrowLength * 0.2)
          const angle = Math.atan2(obj.points?.[3] || 0, obj.points?.[2] || 50)
          
          ctx.beginPath()
          ctx.moveTo(obj.points?.[2] || 50, obj.points?.[3] || 0)
          ctx.lineTo(
            (obj.points?.[2] || 50) - arrowSize * Math.cos(angle - Math.PI / 6),
            (obj.points?.[3] || 0) - arrowSize * Math.sin(angle - Math.PI / 6)
          )
          ctx.moveTo(obj.points?.[2] || 50, obj.points?.[3] || 0)
          ctx.lineTo(
            (obj.points?.[2] || 50) - arrowSize * Math.cos(angle + Math.PI / 6),
            (obj.points?.[3] || 0) - arrowSize * Math.sin(angle + Math.PI / 6)
          )
          ctx.stroke()
          
          ctx.restore()
          break
          
        case 'draw':
          if (obj.points && obj.points.length > 2) {
            ctx.strokeStyle = obj.stroke || '#000000'
            ctx.lineWidth = obj.strokeWidth || 3
            ctx.lineCap = 'round'
            ctx.lineJoin = 'round'
            ctx.beginPath()
            ctx.moveTo(obj.points[0], obj.points[1])
            for (let i = 2; i < obj.points.length; i += 2) {
              ctx.lineTo(obj.points[i], obj.points[i + 1])
            }
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
    renderCurrentDrawing(ctx)
    renderSelectionIndicator(ctx)
  }, [renderField, renderObjects, renderCurrentDrawing, renderSelectionIndicator])
  
  // Render when dependencies change
  useEffect(() => {
    render()
  }, [render])
  
  // Cleanup animation on unmount
  useEffect(() => {
    return () => {
      isPlayingRef.current = false
    }
  }, [])
  
  
  // Animation controls
  const addFrame = () => {
    setFrames(prev => {
      const currentFrameObjects = prev[currentFrame] || []
      const newFrames = [...prev, [...currentFrameObjects]] // Copy current frame objects to new frame
      return newFrames
    })
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
      // Clear selection when switching frames
      setSelectedElement(null)
    }
  }
  
  // Animation playback controls
  const playAnimation = () => {
    if (frames.length === 0) return
    
    setIsPlaying(true)
    isPlayingRef.current = true
    let frameIndex = currentFrame
    
    const playNextFrame = () => {
      if (!isPlayingRef.current) return
      
      setCurrentFrame(frameIndex)
      frameIndex = (frameIndex + 1) % frames.length
      
      setTimeout(playNextFrame, 1000 / frameRate)
    }
    
    playNextFrame()
  }
  
  const stopAnimation = () => {
    setIsPlaying(false)
    isPlayingRef.current = false
  }
  
  const pauseAnimation = () => {
    setIsPlaying(false)
    isPlayingRef.current = false
  }
  
  // Element manipulation functions
  const deleteSelectedElement = (deleteFromAllFrames = false) => {
    if (!selectedElement) return
    
    setFrames(prev => {
      const newFrames = [...prev]
      
      if (deleteFromAllFrames) {
        // Delete from all subsequent frames
        for (let frameIndex = currentFrame; frameIndex < newFrames.length; frameIndex++) {
          newFrames[frameIndex] = newFrames[frameIndex].filter(obj => obj.id !== selectedElement.id)
        }
      } else {
        // Delete only from current frame
        newFrames[currentFrame] = newFrames[currentFrame].filter(obj => obj.id !== selectedElement.id)
      }
      
      return newFrames
    })
    
    setSelectedElement(null)
  }
  
  const handleDeleteElement = () => {
    if (!selectedElement) return
    
    // Check if this is not the last frame and if the object exists in subsequent frames
    const isNotLastFrame = currentFrame < frames.length - 1
    const existsInSubsequentFrames = isNotLastFrame && frames.slice(currentFrame + 1).some(frame => 
      frame.some(obj => obj.id === selectedElement.id)
    )
    
    if (existsInSubsequentFrames) {
      // Show custom confirmation modal
      const subsequentFrameCount = frames.length - currentFrame - 1
      setDeleteConfirmData({
        elementType: selectedElement.type,
        subsequentFrameCount,
        currentFrame: currentFrame + 1
      })
      setShowDeleteConfirm(true)
    } else {
      // No subsequent instances, just delete from current frame
      deleteSelectedElement(false)
    }
  }
  
  const confirmDeleteFromAllFrames = () => {
    deleteSelectedElement(true)
    setShowDeleteConfirm(false)
    setDeleteConfirmData(null)
  }
  
  const confirmDeleteFromCurrentFrame = () => {
    deleteSelectedElement(false)
    setShowDeleteConfirm(false)
    setDeleteConfirmData(null)
  }
  
  const cancelDelete = () => {
    setShowDeleteConfirm(false)
    setDeleteConfirmData(null)
  }
  
  const rotateSelectedElement = (degrees) => {
    if (!selectedElement) return
    
    const newRotation = (selectedElement.rotation || 0) + degrees
    
    setFrames(prev => {
      const newFrames = [...prev]
      
      // Apply rotation to current frame and all subsequent frames
      for (let frameIndex = currentFrame; frameIndex < newFrames.length; frameIndex++) {
        newFrames[frameIndex] = newFrames[frameIndex].map(obj => 
          obj.id === selectedElement.id 
            ? { ...obj, rotation: newRotation }
            : obj
        )
      }
      
      return newFrames
    })
    
    setSelectedElement(prev => prev ? {
      ...prev,
      rotation: newRotation
    } : null)
  }
  
  const handleKeyDown = (event) => {
    // Handle modal keyboard shortcuts first
    if (showDeleteConfirm) {
      switch (event.key) {
        case 'Escape':
          cancelDelete()
          break
      }
      return
    }
    
    if (selectedElement) {
      switch (event.key) {
        case 'Delete':
        case 'Backspace':
          handleDeleteElement()
          break
        case 'r':
        case 'R':
          rotateSelectedElement(15)
          break
        case 'l':
        case 'L':
          rotateSelectedElement(-15)
          break
        case 'Escape':
          setSelectedElement(null)
          break
      }
    }
  }
  
  // Frame manipulation functions
  const duplicateFrame = (frameIndex) => {
    const frameToDuplicate = frames[frameIndex]
    if (!frameToDuplicate) return
    
    setFrames(prev => {
      const newFrames = [...prev]
      newFrames.splice(frameIndex + 1, 0, [...frameToDuplicate])
      return newFrames
    })
  }
  
  const deleteFrame = (frameIndex) => {
    if (frames.length <= 1) return
    
    setFrames(prev => {
      const newFrames = prev.filter((_, index) => index !== frameIndex)
      return newFrames
    })
    
    // Adjust current frame if necessary
    if (currentFrame >= frameIndex && currentFrame > 0) {
      setCurrentFrame(prev => prev - 1)
    }
  }
  
  const insertFrame = (frameIndex) => {
    setFrames(prev => {
      const newFrames = [...prev]
      newFrames.splice(frameIndex, 0, [])
      return newFrames
    })
  }
  
  return (
    <div className={`soccer-animator ${className}`}>
      {/* Field Customization */}
      <div className="mb-4 bg-gray-50 p-4 rounded-lg">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Field Customization:</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Field Length (meters):</label>
            <input
              type="number"
              value={fieldLength}
              onChange={(e) => setFieldLength(parseInt(e.target.value) || 105)}
              min="90"
              max="120"
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Field Width (meters):</label>
            <input
              type="number"
              value={fieldWidth}
              onChange={(e) => setFieldWidth(parseInt(e.target.value) || 68)}
              min="45"
              max="90"
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Background Color:</label>
            <div className="flex items-center space-x-2">
              <input
                type="color"
                value={backgroundColor}
                onChange={(e) => setBackgroundColor(e.target.value)}
                className="w-8 h-8 border border-gray-300 rounded"
              />
              <input
                type="text"
                value={backgroundColor}
                onChange={(e) => setBackgroundColor(e.target.value)}
                className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
              />
            </div>
          </div>
        </div>
        <div className="mt-2 text-xs text-gray-500">
          Current dimensions: {fieldLength}m × {fieldWidth}m | Aspect ratio: {(fieldLength / fieldWidth).toFixed(2)}
        </div>
      </div>
      
      {/* Tool Selection */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Soccer Tools:</h4>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedTool(null)}
            className={`px-3 py-1 rounded text-sm ${
              !selectedTool ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            Select
          </button>
          {soccerObjects.map(obj => (
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
      
      {/* Element Controls */}
      {selectedElement && (
        <div className="mb-4 bg-yellow-50 p-3 rounded-lg border border-yellow-200">
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            Selected: {selectedElement.type.charAt(0).toUpperCase() + selectedElement.type.slice(1)}
            {selectedElement.rotation && (
              <span className="ml-2 text-xs text-blue-600">
                ({(selectedElement.rotation || 0).toFixed(0)}°)
              </span>
            )}
          </h4>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleDeleteElement}
              className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
            >
              🗑️ Delete
            </button>
            <button
              onClick={() => rotateSelectedElement(-15)}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              ↺ Rotate Left
            </button>
            <button
              onClick={() => rotateSelectedElement(15)}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              ↻ Rotate Right
            </button>
            <button
              onClick={() => setSelectedElement(null)}
              className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              ✕ Deselect
            </button>
          </div>
          <div className="mt-2 text-xs text-gray-600">
            <strong>Keyboard shortcuts:</strong> Delete/Backspace to delete, R/L to rotate, Escape to deselect
            <br />
            <strong>Delete behavior:</strong> If object exists in subsequent frames, you'll be asked whether to delete from all frames or just current frame.
          </div>
        </div>
      )}
      
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && deleteConfirmData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              🗑️ Delete Object Confirmation
            </h3>
            
            <div className="text-gray-700 mb-6">
              <p className="mb-3">
                You're about to delete a <strong>{deleteConfirmData.elementType}</strong> from Frame {deleteConfirmData.currentFrame}.
              </p>
              
              <p className="mb-3">
                This object also appears in <strong>{deleteConfirmData.subsequentFrameCount} subsequent frame(s)</strong>.
              </p>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-blue-800 text-sm">
                  <strong>Choose your deletion option:</strong>
                </p>
              </div>
            </div>
            
            <div className="flex flex-col space-y-3">
              <button
                onClick={confirmDeleteFromAllFrames}
                className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                🗑️ Delete from ALL {deleteConfirmData.subsequentFrameCount + 1} frames
              </button>
              
              <button
                onClick={confirmDeleteFromCurrentFrame}
                className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
              >
                ✂️ Delete only from current frame (Frame {deleteConfirmData.currentFrame})
              </button>
              
              <button
                onClick={cancelDelete}
                className="w-full px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
              >
                ❌ Cancel - Don't delete anything
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onClick={handleCanvasClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        className="border border-gray-300 rounded-lg shadow-lg cursor-crosshair focus:outline-none"
        style={{ display: 'block' }}
      />
      
      {/* Frame Timeline */}
      <div className="mt-4 bg-gray-50 p-4 rounded-lg">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Frame Timeline</h4>
        <div className="flex flex-wrap gap-2 overflow-x-auto pb-2">
          {frames.map((frame, index) => (
            <div
              key={index}
              className={`relative flex-shrink-0 ${
                index === currentFrame ? 'ring-2 ring-blue-500' : ''
              }`}
            >
              <div
                className="cursor-pointer border border-gray-300 rounded bg-white hover:bg-gray-50 transition-colors"
                onClick={() => goToFrame(index)}
              >
                {/* Simple frame block */}
                <div className="w-16 h-12 bg-gray-100 rounded flex flex-col items-center justify-center">
                  <span className="text-lg font-semibold text-gray-700">
                    {index + 1}
                  </span>
                  <span className="text-xs text-gray-500">
                    {frame.length} obj{frame.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
              
              {/* Frame controls */}
              <div className="absolute top-0 right-0 flex flex-col gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    duplicateFrame(index)
                  }}
                  className="w-5 h-5 bg-green-600 text-white text-xs rounded-full hover:bg-green-700"
                  title="Duplicate frame"
                >
                  +
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    insertFrame(index)
                  }}
                  className="w-5 h-5 bg-blue-600 text-white text-xs rounded-full hover:bg-blue-700"
                  title="Insert frame before"
                >
                  I
                </button>
                {frames.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteFrame(index)
                    }}
                    className="w-5 h-5 bg-red-600 text-white text-xs rounded-full hover:bg-red-700"
                    title="Delete frame"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        
        {/* Frame info */}
        <div className="mt-2 text-xs text-gray-600">
          Click frame blocks to edit individual frames. Use controls on each frame for operations.
        </div>
      </div>
      
      {/* Animation Controls */}
      <div className="mt-4 space-y-4">
        {/* Playback Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                goToFrame(0)
                setSelectedElement(null)
              }}
              disabled={currentFrame === 0}
              className="px-2 py-1 text-sm bg-gray-200 rounded disabled:opacity-50"
            >
              ⏮
            </button>
            <button
              onClick={() => {
                goToFrame(currentFrame - 1)
                setSelectedElement(null)
              }}
              disabled={currentFrame === 0}
              className="px-2 py-1 text-sm bg-gray-200 rounded disabled:opacity-50"
            >
              ⏪
            </button>
            <button
              onClick={isPlaying ? pauseAnimation : playAnimation}
              disabled={frames.length === 0}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded disabled:opacity-50"
            >
              {isPlaying ? '⏸️ Pause' : '▶️ Play'}
            </button>
            <button
              onClick={stopAnimation}
              className="px-3 py-1 text-sm bg-gray-600 text-white rounded"
            >
              ⏹️ Stop
            </button>
            <button
              onClick={() => {
                goToFrame(currentFrame + 1)
                setSelectedElement(null)
              }}
              disabled={currentFrame >= frames.length - 1}
              className="px-2 py-1 text-sm bg-gray-200 rounded disabled:opacity-50"
            >
              ⏩
            </button>
            <button
              onClick={() => {
                goToFrame(frames.length - 1)
                setSelectedElement(null)
              }}
              disabled={currentFrame >= frames.length - 1}
              className="px-2 py-1 text-sm bg-gray-200 rounded disabled:opacity-50"
            >
              ⏭
            </button>
          </div>
          
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
        </div>
        
        {/* Frame Counter and Slider */}
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-600 min-w-[120px]">
            Frame {currentFrame + 1} of {frames.length}
          </span>
          <input
            type="range"
            min="0"
            max={Math.max(0, frames.length - 1)}
            value={currentFrame}
            onChange={(e) => {
              goToFrame(parseInt(e.target.value))
              setSelectedElement(null)
            }}
            className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
        </div>
        
        {/* Frame Management */}
        <div className="flex items-center justify-center space-x-2">
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
        {selectedElement ? (
          <span>Selected: <strong>{selectedElement.type}</strong> - Drag to move, use controls to rotate/delete</span>
        ) : selectedTool ? (
          <span>Click on the field to place a <strong>{soccerObjects.find(obj => obj.id === selectedTool)?.name}</strong></span>
        ) : (
          <span>Select a soccer tool above, then click on the field to place objects. Click objects to select and edit them.</span>
        )}
      </div>
    </div>
  )
}

export default SoccerAnimator
