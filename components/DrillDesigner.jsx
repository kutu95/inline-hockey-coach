import React, { useState, useRef, useEffect } from 'react'
import { Stage, Layer, Rect, Circle, Line, Text, Arrow, Shape, Image, Group } from 'react-konva'
import JSZip from 'jszip'
import { supabase } from '../src/lib/supabase'
import { Link, useParams, useNavigate } from 'react-router-dom'

const DrillDesigner = () => {
  const { orgId } = useParams()
  const navigate = useNavigate()
  const [selectedTool, setSelectedTool] = useState('puck')
  const [selectedColor, setSelectedColor] = useState('#ff0000')
  const [elements, setElements] = useState([])
  const [selectedElement, setSelectedElement] = useState(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [drawingPoints, setDrawingPoints] = useState([])
  const [frames, setFrames] = useState([])
  const [currentFrameIndex, setCurrentFrameIndex] = useState(-1)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [exportFormat, setExportFormat] = useState('webm')
  const [frameRate, setFrameRate] = useState(5)
  const [audioBlob, setAudioBlob] = useState(null)
  const [isRecordingAudio, setIsRecordingAudio] = useState(false)
  const [mediaRecorder, setMediaRecorder] = useState(null)
  const [startFrame, setStartFrame] = useState(null)
  const [endFrame, setEndFrame] = useState(null)
  const [tweenFrames, setTweenFrames] = useState(5)
  const [editingText, setEditingText] = useState(null)
  const [editTextValue, setEditTextValue] = useState('')
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [saveTitle, setSaveTitle] = useState('')
  const [saveDescription, setSaveDescription] = useState('')
  const [saveType, setSaveType] = useState('drill')
  const [selectedDrillId, setSelectedDrillId] = useState('')
  const [selectedSessionId, setSelectedSessionId] = useState('')
  const [availableDrills, setAvailableDrills] = useState([])
  const [availableSessions, setAvailableSessions] = useState([])
  const [isSaving, setIsSaving] = useState(false)
  
  // Mobile responsiveness state
  const [isMobile, setIsMobile] = useState(false)
  const [canvasScale, setCanvasScale] = useState(1)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [selectedPlayer, setSelectedPlayer] = useState('player')
  const [showPlayerDropdown, setShowPlayerDropdown] = useState(false)
  const [dynamicPlayerTools, setDynamicPlayerTools] = useState([])
  const [isLoadingPlayers, setIsLoadingPlayers] = useState(true)
  const [flippedPlayers, setFlippedPlayers] = useState(new Set())
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [draggedFrameIndex, setDraggedFrameIndex] = useState(null)
  const [dragOverFrameIndex, setDragOverFrameIndex] = useState(null)
  
  const stageRef = useRef()
  const animationRef = useRef()
  const audioChunksRef = useRef([])
  const isPlayingRef = useRef(false)
  


  // Load dynamic players on component mount
  useEffect(() => {
    loadDynamicPlayers()
  }, [])

  // Mobile detection effect
  useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice = window.innerWidth < 768
      setIsMobile(isMobileDevice)
      setCanvasScale(isMobileDevice ? 0.6 : 1)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showPlayerDropdown && !event.target.closest('.player-dropdown')) {
        setShowPlayerDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showPlayerDropdown])

  // Load available drills and sessions
  useEffect(() => {
    loadAvailableDrills()
    loadAvailableSessions()
  }, [orgId])

  // Cleanup animation on unmount
  useEffect(() => {
    return () => {
      isPlayingRef.current = false
    }
  }, [])

  // Keyboard shortcuts for frame navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Only handle keyboard shortcuts when not editing text
      if (editingText) return
      
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault()
          goToPreviousFrame()
          break
        case 'ArrowRight':
          e.preventDefault()
          goToNextFrame()
          break
        case 'Home':
          e.preventDefault()
          goToFirstFrame()
          break
        case 'End':
          e.preventDefault()
          goToLastFrame()
          break
        case ' ':
          e.preventDefault()
          if (isPlaying) {
            stopAnimation()
          } else {
            playAnimation()
          }
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [frames.length, currentFrameIndex, isPlaying, editingText])

  // Navigation guard to prevent accidental data loss
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        // Standard way to show browser's "Leave Site?" dialog
        e.preventDefault()
        e.returnValue = ''
        return ''
      }
    }

    // Store the current location when component mounts
    const currentLocation = window.location.pathname

    // Intercept all link clicks to check for unsaved changes
    const handleLinkClick = (e) => {
      if (hasUnsavedChanges) {
        const link = e.target.closest('a')
        if (link && link.href && !link.href.includes('javascript:') && !link.href.includes('#')) {
          console.log('Navigation guard: Intercepting link click to', link.href)
          const confirmed = window.confirm(
            'You have unsaved changes. Are you sure you want to leave? All work will be lost.'
          )
          if (!confirmed) {
            console.log('Navigation guard: User cancelled navigation')
            e.preventDefault()
            e.stopPropagation()
            return false
          }
          console.log('Navigation guard: User confirmed navigation')
        }
      }
    }

    // Create a custom navigation function that checks for unsaved changes
    const safeNavigate = (to) => {
      if (hasUnsavedChanges) {
        const confirmed = window.confirm(
          'You have unsaved changes. Are you sure you want to leave? All work will be lost.'
        )
        if (confirmed) {
          navigate(to)
        }
      } else {
        navigate(to)
      }
    }

    // Make the safeNavigate function available globally for this component
    window.safeNavigate = safeNavigate

    // Add event listeners
    window.addEventListener('beforeunload', handleBeforeUnload)
    document.addEventListener('click', handleLinkClick, true) // Use capture phase

    // Cleanup
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('click', handleLinkClick, true)
      // Clean up global function
      delete window.safeNavigate
    }
  }, [hasUnsavedChanges, navigate])

  // Navigation guard for browser back button using popstate
  useEffect(() => {
    console.log('Navigation guard: Setting up popstate guard, hasUnsavedChanges:', hasUnsavedChanges)
    
    // Push a state when component mounts to ensure we can intercept back button
    const currentPath = window.location.pathname
    window.history.pushState({ fromDrillDesigner: true }, '', currentPath)
    
    const handlePopState = (e) => {
      console.log('Navigation guard: Popstate event detected, hasUnsavedChanges:', hasUnsavedChanges, 'state:', e.state)
      
      if (hasUnsavedChanges) {
        console.log('Navigation guard: Popstate event detected with unsaved changes')
        
        const confirmed = window.confirm(
          'You have unsaved changes. Are you sure you want to leave? All work will be lost.'
        )
        
        if (!confirmed) {
          console.log('Navigation guard: User cancelled popstate navigation')
          // Push the current state back to prevent navigation
          window.history.pushState({ fromDrillDesigner: true }, '', currentPath)
        } else {
          console.log('Navigation guard: User confirmed popstate navigation')
        }
      }
    }

    // Add popstate listener
    window.addEventListener('popstate', handlePopState)

    return () => {
      console.log('Navigation guard: Cleaning up popstate guard')
      window.removeEventListener('popstate', handlePopState)
    }
  }, [hasUnsavedChanges])

  // Enhanced navigation guard using history state
  useEffect(() => {
    console.log('Navigation guard: Setting up enhanced guard, hasUnsavedChanges:', hasUnsavedChanges)
    
    if (hasUnsavedChanges) {
      // Add a state entry when there are unsaved changes
      const currentPath = window.location.pathname
      console.log('Navigation guard: Replacing state with hasUnsavedChanges flag')
      window.history.replaceState({ hasUnsavedChanges: true }, '', currentPath)
      
      const handleBeforePopState = (e) => {
        console.log('Navigation guard: Enhanced popstate handler triggered, state:', e.state)
        if (e.state?.hasUnsavedChanges) {
          console.log('Navigation guard: Detected unsaved changes in state')
          const confirmed = window.confirm(
            'You have unsaved changes. Are you sure you want to leave? All work will be lost.'
          )
          if (!confirmed) {
            console.log('Navigation guard: User cancelled enhanced navigation')
            // Prevent navigation
            window.history.pushState({ hasUnsavedChanges: true }, '', currentPath)
          } else {
            console.log('Navigation guard: User confirmed enhanced navigation')
          }
        }
      }
      
      window.addEventListener('popstate', handleBeforePopState)
      
      return () => {
        console.log('Navigation guard: Cleaning up enhanced guard')
        window.removeEventListener('popstate', handleBeforePopState)
      }
    }
  }, [hasUnsavedChanges])

  // Dynamic player loading
  const loadDynamicPlayers = async () => {
    try {
      setIsLoadingPlayers(true)
      
      // Dynamic file discovery - try to load files with common naming patterns
      // This approach tries to discover all player and goalie files automatically
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
          
          // Successfully loaded - no need to log every file
        } catch (error) {
          // Silently skip files that don't exist - this is expected for discovery
          // No need to log every missing file
        }
      }
      
      console.log('Loaded players:', loadedPlayers)
      setDynamicPlayerTools(loadedPlayers)
      
      // Set the first player as default if we have any
      if (loadedPlayers.length > 0) {
        setSelectedPlayer(loadedPlayers[0].id)
        console.log('Set default player:', loadedPlayers[0].id)
      }
      
    } catch (error) {
      console.error('Error loading dynamic players:', error)
    } finally {
      setIsLoadingPlayers(false)
    }
  }



  // Rink dimensions and scaling
  const rinkLength = 60 // meters
  const rinkWidth = 30 // meters
  const cornerRadius = 8.5 // meters
  
  // Responsive canvas dimensions
  const baseCanvasWidth = 1200
  const baseCanvasHeight = 600
  const canvasWidth = Math.floor(baseCanvasWidth * (canvasScale || 1))
  const canvasHeight = Math.floor(baseCanvasHeight * (canvasScale || 1))
  
  const scaleX = canvasWidth / rinkLength
  const scaleY = canvasHeight / rinkWidth
  
  // Rink colors
  const rinkColor = '#87CEEB' // Light blue
  const lineColor = '#FF0000' // Red lines
  const borderColor = '#000000' // Black border



  // Convert meters to pixels
  const mToPx = (meters) => meters * scaleX
  const mToPxY = (meters) => meters * scaleY

  // Tool options (non-player tools)
  const tools = [
    { id: 'puck', label: 'Puck', icon: '●' },
    { id: 'arrow', label: 'Arrow', icon: '→' },
    { id: 'text', label: 'Text', icon: 'T' },
    { id: 'draw', label: 'Draw', icon: '✏️' }
  ]



  // Color options
  const colors = [
    '#ff0000', '#00ff00', '#000000', '#ffffff', '#ff8c00'
  ]

  const addElement = (type, x, y) => {
    // If the selected tool is a player type, use the selectedPlayer instead
    const elementType = (type === 'player') 
      ? selectedPlayer 
      : type
    
    const newElement = {
      id: Date.now(),
      type: elementType,
      x,
      y,
      ...getDefaultProperties(elementType)
    }
    setElements([...elements, newElement])
    setHasUnsavedChanges(true)
  }

  const getDefaultProperties = (type) => {
    switch (type) {
      case 'puck':
        return { radius: 8, fill: selectedColor }
      case 'arrow':
        return { 
          points: [0, 0, 50, 0], 
          stroke: selectedColor, 
          strokeWidth: 3,
          fill: selectedColor
        }
      case 'text':
        return { 
          text: 'Label', 
          fontSize: 16, 
          fill: selectedColor,
          fontFamily: 'Arial'
        }

      case 'draw':
        return {
          points: [],
          stroke: selectedColor,
          strokeWidth: 3,
          tension: 0.5,
          lineCap: 'round',
          lineJoin: 'round'
        }
      default:
        // Handle dynamic player IDs (they start with 'dynamic-player-')
        if (type.startsWith('dynamic-player-')) {
          return { 
            fill: selectedColor,
            stroke: '#ffffff',
            strokeWidth: 2
          }
        }
        return {}
    }
  }

  const handleStageClick = (e) => {
    // Only add element if clicking on the stage itself, not on elements
    if (e.target === e.target.getStage()) {
      const pos = e.target.getStage().getPointerPosition()
      console.log('Adding element:', selectedTool, 'at position:', pos)
      
      // If selectedTool is a player type, use selectedPlayer
      const toolToAdd = (selectedTool === 'player') 
        ? selectedPlayer 
        : selectedTool
      
      addElement(toolToAdd, pos.x, pos.y)
    }
  }

  const handleMouseDown = (e) => {
    if (selectedTool === 'draw') {
      setIsDrawing(true)
      const pos = e.target.getStage().getPointerPosition()
      setDrawingPoints([pos.x, pos.y])
    }
  }

  const handleMouseMove = (e) => {
    if (!isDrawing || selectedTool !== 'draw') return

    const pos = e.target.getStage().getPointerPosition()
    setDrawingPoints([...drawingPoints, pos.x, pos.y])
  }

  const handleMouseUp = () => {
    if (isDrawing && selectedTool === 'draw' && drawingPoints.length > 2) {
      const newElement = {
        id: Date.now(),
        type: 'draw',
        points: drawingPoints,
        stroke: selectedColor,
        strokeWidth: 3,
        tension: 0.5,
        lineCap: 'round',
        lineJoin: 'round'
      }
      setElements([...elements, newElement])
      setHasUnsavedChanges(true)
    }
    setIsDrawing(false)
    setDrawingPoints([])
  }

  const handleElementClick = (element) => {
    setSelectedElement(element)
  }

  const handleTextDoubleClick = (element) => {
    setEditingText(element.id)
    setEditTextValue(element.text)
  }

  const handleTextEdit = () => {
    if (editingText) {
          setElements(elements.map(el => 
      el.id === editingText 
        ? { ...el, text: editTextValue }
        : el
    ))
    setHasUnsavedChanges(true)
      setEditingText(null)
      setEditTextValue('')
    }
  }

  const handleTextEditKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleTextEdit()
    } else if (e.key === 'Escape') {
      setEditingText(null)
      setEditTextValue('')
    }
  }

  const handleDragEnd = (e, elementId) => {
    const pos = e.target.position()
    console.log('Drag end:', elementId, pos, 'Original element:', elements.find(el => el.id === elementId))
    
    const updatedElements = elements.map(el => 
      el.id === elementId 
        ? { ...el, x: pos.x, y: pos.y }
        : el
    )
    
    console.log('Updated elements:', updatedElements)
    setElements(updatedElements)
    setHasUnsavedChanges(true)
  }

  const deleteSelectedElement = () => {
    if (selectedElement) {
      setElements(elements.filter(el => el.id !== selectedElement.id))
      setSelectedElement(null)
      setHasUnsavedChanges(true)
    }
  }

  const duplicateSelectedElement = () => {
    if (selectedElement) {
      const newElement = {
        ...selectedElement,
        id: Date.now(),
        x: selectedElement.x + 20,
        y: selectedElement.y + 20
      }
      setElements([...elements, newElement])
      setSelectedElement(newElement) // Select the new copy
      setHasUnsavedChanges(true)
    }
  }

  const flipSelectedElement = () => {
    if (selectedElement && selectedElement.type.startsWith('dynamic-player-')) {
      const newFlippedPlayers = new Set(flippedPlayers)
      if (newFlippedPlayers.has(selectedElement.id)) {
        newFlippedPlayers.delete(selectedElement.id)
      } else {
        newFlippedPlayers.add(selectedElement.id)
      }
      setFlippedPlayers(newFlippedPlayers)
      setHasUnsavedChanges(true)
    }
  }

  const exportImage = () => {
    const dataURL = stageRef.current.toDataURL()
    const link = document.createElement('a')
    link.download = 'drill-design.png'
    link.href = dataURL
    link.click()
  }

  // Frame management functions
  const captureFrame = () => {
    console.log('Capturing frame, current elements:', elements.length)
    console.log('Elements by type:', elements.reduce((acc, el) => {
      acc[el.type] = (acc[el.type] || 0) + 1
      return acc
    }, {}))
    console.log('All elements:', elements)
    
    const newFrame = {
      id: Date.now(),
      elements: JSON.parse(JSON.stringify(elements)), // Deep copy
      timestamp: Date.now(),
      frameNumber: frames.length + 1
    }
    
    setFrames([...frames, newFrame])
    setCurrentFrameIndex(frames.length)
    setHasUnsavedChanges(true)
    console.log('Frame captured:', newFrame.frameNumber, 'Total frames:', frames.length + 1)
  }

  const deleteFrame = (frameIndex) => {
    if (frameIndex >= 0 && frameIndex < frames.length) {
      const newFrames = frames.filter((_, index) => index !== frameIndex)
      setFrames(newFrames)
      
      // Update frame numbers
      const updatedFrames = newFrames.map((frame, index) => ({
        ...frame,
        frameNumber: index + 1
      }))
      setFrames(updatedFrames)
      
      // Adjust current frame index
      if (currentFrameIndex >= frameIndex) {
        setCurrentFrameIndex(Math.max(0, currentFrameIndex - 1))
      }
      setHasUnsavedChanges(true)
    }
  }

  const loadFrame = (frameIndex) => {
    if (frameIndex >= 0 && frameIndex < frames.length) {
      console.log('Loading frame:', frameIndex, 'Elements:', frames[frameIndex].elements)
      const frameElements = JSON.parse(JSON.stringify(frames[frameIndex].elements))
      console.log('Frame elements by type:', frameElements.reduce((acc, el) => {
        acc[el.type] = (acc[el.type] || 0) + 1
        return acc
      }, {}))
      setElements(frameElements)
      setCurrentFrameIndex(frameIndex)
      setSelectedElement(null)
    }
  }

  const duplicateFrame = (frameIndex) => {
    if (frameIndex >= 0 && frameIndex < frames.length) {
      const frameToDuplicate = frames[frameIndex]
      const newFrame = {
        ...frameToDuplicate,
        id: Date.now() + Math.random(),
        frameNumber: frames.length + 1
      }
      
      // Insert the duplicate right after the original frame
      const newFrames = [...frames]
      newFrames.splice(frameIndex + 1, 0, newFrame)
      
      // Update frame numbers for all frames after the insertion
      for (let i = frameIndex + 2; i < newFrames.length; i++) {
        newFrames[i] = { ...newFrames[i], frameNumber: i + 1 }
      }
      
      setFrames(newFrames)
      setHasUnsavedChanges(true)
    }
  }

  const handleFrameDragStart = (e, frameIndex) => {
    setDraggedFrameIndex(frameIndex)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/html', frameIndex.toString())
    
    // Add a small delay to show the dragged state
    setTimeout(() => {
      if (draggedFrameIndex === frameIndex) {
        e.target.style.opacity = '0.5'
      }
    }, 0)
  }

  const handleFrameDragOver = (e, frameIndex) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverFrameIndex(frameIndex)
  }

  const handleFrameDragLeave = (e) => {
    setDragOverFrameIndex(null)
  }

  const handleFrameDrop = (e, dropIndex) => {
    e.preventDefault()
    setDragOverFrameIndex(null)
    
    if (draggedFrameIndex !== null && draggedFrameIndex !== dropIndex) {
      const newFrames = [...frames]
      const draggedFrame = newFrames[draggedFrameIndex]
      
      // Remove the dragged frame from its original position
      newFrames.splice(draggedFrameIndex, 1)
      
      // Insert it at the new position
      const actualDropIndex = draggedFrameIndex < dropIndex ? dropIndex - 1 : dropIndex
      newFrames.splice(actualDropIndex, 0, draggedFrame)
      
      // Update frame numbers
      newFrames.forEach((frame, index) => {
        frame.frameNumber = index + 1
      })
      
      // Update current frame index if it was affected
      let newCurrentIndex = currentFrameIndex
      if (currentFrameIndex === draggedFrameIndex) {
        newCurrentIndex = actualDropIndex
      } else if (draggedFrameIndex < currentFrameIndex && currentFrameIndex <= actualDropIndex) {
        newCurrentIndex = currentFrameIndex - 1
      } else if (actualDropIndex <= currentFrameIndex && currentFrameIndex < draggedFrameIndex) {
        newCurrentIndex = currentFrameIndex + 1
      }
      
      setFrames(newFrames)
      setCurrentFrameIndex(newCurrentIndex)
      setHasUnsavedChanges(true)
    }
    
    setDraggedFrameIndex(null)
  }

  const handleFrameDragEnd = () => {
    setDraggedFrameIndex(null)
    setDragOverFrameIndex(null)
  }

  const playAnimation = () => {
    console.log('Play animation called, frames.length:', frames.length)
    if (frames.length === 0) {
      console.log('No frames to play')
      return
    }
    
    console.log('Starting animation with frameRate:', frameRate)
    setIsPlaying(true)
    isPlayingRef.current = true
    let frameIndex = 0
    
    const playNextFrame = () => {
      console.log('playNextFrame called, frameIndex:', frameIndex, 'isPlayingRef.current:', isPlayingRef.current)
      if (!isPlayingRef.current) {
        console.log('Animation stopped')
        return
      }
      
      console.log('Loading frame:', frameIndex)
      // Load frame without triggering unsaved changes during playback
      if (frameIndex >= 0 && frameIndex < frames.length) {
        const frameElements = JSON.parse(JSON.stringify(frames[frameIndex].elements))
        setElements(frameElements)
        setCurrentFrameIndex(frameIndex)
        setSelectedElement(null)
      }
      frameIndex = (frameIndex + 1) % frames.length
      
      setTimeout(playNextFrame, 1000 / frameRate)
    }
    
    playNextFrame()
  }

  const stopAnimation = () => {
    setIsPlaying(false)
    isPlayingRef.current = false
  }

  const goToFirstFrame = () => {
    if (frames.length > 0) {
      loadFrame(0)
    }
  }

  const goToLastFrame = () => {
    if (frames.length > 0) {
      loadFrame(frames.length - 1)
    }
  }

  const goToPreviousFrame = () => {
    if (frames.length > 0) {
      const newIndex = currentFrameIndex > 0 ? currentFrameIndex - 1 : frames.length - 1
      loadFrame(newIndex)
    }
  }

  const goToNextFrame = () => {
    if (frames.length > 0) {
      const newIndex = currentFrameIndex < frames.length - 1 ? currentFrameIndex + 1 : 0
      loadFrame(newIndex)
    }
  }

  const exportAnimation = async () => {
    if (frames.length === 0) return

    if (exportFormat === 'image') {
      // Export current frame as image
      const canvas = document.createElement('canvas')
      canvas.width = canvasWidth
      canvas.height = canvasHeight
      const ctx = canvas.getContext('2d')
      
      // Render current frame to canvas
      const currentFrame = frames[currentFrameIndex >= 0 ? currentFrameIndex : 0]
      if (currentFrame) {
        // Render rink background and elements (same as video export)
        ctx.fillStyle = rinkColor
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        
        // Render elements from the frame
        currentFrame.elements.forEach(element => {
          renderElementToCanvas(ctx, element)
        })
      }
      
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.download = 'drill-frame.png'
        link.href = url
        link.click()
        URL.revokeObjectURL(url)
      })
    } else if (exportFormat === 'zip') {
      // Export as ZIP of frames
      setIsExporting(true)
      
      try {
        const zip = new JSZip()
        
        for (let i = 0; i < frames.length; i++) {
          const frame = frames[i]
          const canvas = document.createElement('canvas')
          canvas.width = canvasWidth
          canvas.height = canvasHeight
          const ctx = canvas.getContext('2d')
          
          // Render frame to canvas
          ctx.fillStyle = rinkColor
          ctx.fillRect(0, 0, canvas.width, canvas.height)
          
          frame.elements.forEach(element => {
            renderElementToCanvas(ctx, element)
          })
          
          // Convert canvas to blob and add to ZIP
          const blob = await new Promise(resolve => canvas.toBlob(resolve))
          zip.file(`frame-${i + 1}.png`, blob)
        }
        
        const zipBlob = await zip.generateAsync({ type: 'blob' })
        const url = URL.createObjectURL(zipBlob)
        const link = document.createElement('a')
        link.download = 'drill-animation-frames.zip'
        link.href = url
        link.click()
        URL.revokeObjectURL(url)
        
        setIsExporting(false)
      } catch (error) {
        console.error('Error creating ZIP:', error)
        setIsExporting(false)
        alert('Error creating ZIP file. Please try again.')
      }
    } else {
      // Export as video
      await exportVideo()
    }
  }

  const exportVideo = async () => {
    if (frames.length === 0) return

    setIsExporting(true)
    console.log('Starting video export...')

    try {
      // Create a canvas for video recording
      const canvas = document.createElement('canvas')
      canvas.width = canvasWidth
      canvas.height = canvasHeight
      const ctx = canvas.getContext('2d')

      // Set up video stream
      const videoStream = canvas.captureStream(frameRate)
      
      // Check what formats are supported
      const supportedTypes = [
        'video/webm;codecs=vp9',
        'video/webm;codecs=vp8',
        'video/webm',
        'video/mp4'
      ]
      
      let mimeType = 'video/webm'
      for (const type of supportedTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          mimeType = type
          break
        }
      }
      
      console.log('Using MIME type:', mimeType)
      
      // If we have audio, we need to use a different approach
      if (audioBlob) {
        console.log('Audio detected, using combined recording approach')
        
        // Create a new MediaStream that includes both video and audio
        const audioUrl = URL.createObjectURL(audioBlob)
        const audio = new Audio(audioUrl)
        
        // Wait for audio to load
        await new Promise((resolve) => {
          audio.addEventListener('loadedmetadata', resolve)
          audio.load()
        })
        
        // Create a MediaRecorder with just video first
        const videoRecorder = new MediaRecorder(videoStream, {
          mimeType: mimeType,
          videoBitsPerSecond: 5000000 // 5 Mbps for good quality
        })

        const videoChunks = []
        videoRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            videoChunks.push(event.data)
          }
        }

        // Start video recording
        videoRecorder.start()
        
        // Render frames to canvas
        for (let i = 0; i < frames.length; i++) {
          const frame = frames[i]
          
          // Clear canvas
          ctx.clearRect(0, 0, canvas.width, canvas.height)
          
          // Render complete rink background with all elements
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
          
          // Render elements from the frame
          frame.elements.forEach(element => {
            renderElementToCanvas(ctx, element)
          })
          
          // Wait for the frame duration
          await new Promise(resolve => setTimeout(resolve, 1000 / frameRate))
        }
        
        // Stop video recording
        videoRecorder.stop()
        
        // Wait for video recording to complete
        await new Promise((resolve) => {
          videoRecorder.onstop = () => {
            const videoBlob = new Blob(videoChunks, { type: mimeType })
            
            // For now, we'll export the video without audio and provide instructions
            const url = URL.createObjectURL(videoBlob)
            const link = document.createElement('a')
            
            let fileExtension = 'webm'
            if (mimeType.includes('mp4')) {
              fileExtension = 'mp4'
            }
            
            link.download = `drill-animation-video.${fileExtension}`
            link.href = url
            link.click()
            URL.revokeObjectURL(url)
            
            // Also export the audio separately
            const audioUrl = URL.createObjectURL(audioBlob)
            const audioLink = document.createElement('a')
            audioLink.download = 'drill-commentary.webm'
            audioLink.href = audioUrl
            audioLink.click()
            URL.revokeObjectURL(audioUrl)
            
            setIsExporting(false)
            console.log('Video and audio export complete!')
            
            alert('Video and audio exported separately due to browser limitations. You can combine them using video editing software like iMovie, Premiere Pro, or online tools like Clipchamp.')
            
            resolve()
          }
        })
        
      } else {
        // No audio - use the original video-only approach
        const mediaRecorder = new MediaRecorder(videoStream, {
          mimeType: mimeType,
          videoBitsPerSecond: 5000000 // 5 Mbps for good quality
        })

        const chunks = []
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            chunks.push(event.data)
          }
        }

        mediaRecorder.onstop = () => {
          const blob = new Blob(chunks, { type: mimeType })
          const url = URL.createObjectURL(blob)
          const link = document.createElement('a')
          
          let fileExtension = 'webm'
          if (mimeType.includes('mp4')) {
            fileExtension = 'mp4'
          }
          
          link.download = `drill-animation.${fileExtension}`
          link.href = url
          link.click()
          URL.revokeObjectURL(url)
          setIsExporting(false)
          console.log('Video export complete!')
          
          if (fileExtension === 'webm') {
            alert('Video exported as WebM format. This format works best in modern browsers and can be converted to MP4 using online tools if needed.')
          }
        }

        // Start recording
        mediaRecorder.start()

        // Render frames to canvas (same as above)
        for (let i = 0; i < frames.length; i++) {
          const frame = frames[i]
          
          // Clear canvas
          ctx.clearRect(0, 0, canvas.width, canvas.height)
          
          // Render complete rink background with all elements
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
          
          // Render elements from the frame
          frame.elements.forEach(element => {
            renderElementToCanvas(ctx, element)
          })
          
          // Wait for the frame duration
          await new Promise(resolve => setTimeout(resolve, 1000 / frameRate))
        }
        
        // Stop recording
        mediaRecorder.stop()
      }
      
    } catch (error) {
      console.error('Error exporting video:', error)
      setIsExporting(false)
      alert('Error exporting video. Please try again.')
    }
  }

  const renderElementToCanvas = (ctx, element) => {
    switch (element.type) {
      case 'puck':
        ctx.fillStyle = element.fill || '#000000'
        ctx.beginPath()
        ctx.arc(element.x, element.y, element.radius || 8, 0, 2 * Math.PI)
        ctx.fill()
        break
        
      default:
        // Handle dynamic player IDs (they start with 'dynamic-player-')
        if (element.type.startsWith('dynamic-player-')) {
          // Find the corresponding player in dynamicPlayerTools
          const dynamicPlayer = dynamicPlayerTools.find(p => p.id === element.type)
          const currentPlayerImage = dynamicPlayer?.image
          const isFlipped = flippedPlayers.has(element.id)
          
          if (currentPlayerImage) {
            // Draw the player image
            const imageWidth = currentPlayerImage.width
            const imageHeight = currentPlayerImage.height
            
            ctx.save()
            ctx.translate(element.x, element.y)
            if (isFlipped) {
              ctx.scale(-1, 1)
              ctx.translate(-imageWidth, 0)
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
        }
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
    }
  }

  // Tweening functions
  const captureStartFrame = () => {
    const newStartFrame = {
      id: Date.now(),
      elements: JSON.parse(JSON.stringify(elements)),
      timestamp: Date.now(),
      frameNumber: 'Start'
    }
    setStartFrame(newStartFrame)
    console.log('Start frame set with', elements.length, 'elements')
  }

  const captureEndFrame = () => {
    const newEndFrame = {
      id: Date.now(),
      elements: JSON.parse(JSON.stringify(elements)),
      timestamp: Date.now(),
      frameNumber: 'End'
    }
    setEndFrame(newEndFrame)
    console.log('End frame set with', elements.length, 'elements')
  }

  const generateTweenFrames = () => {
    if (!startFrame || !endFrame) {
      alert('Please set both start and end frames first!')
      return
    }

    console.log('Generating', tweenFrames, 'tween frames between start and end')
    
    const newFrames = []
    
    for (let i = 1; i <= tweenFrames; i++) {
      const progress = i / (tweenFrames + 1) // Progress from 0 to 1
      const tweenedElements = interpolateElements(startFrame.elements, endFrame.elements, progress)
      
      const newFrame = {
        id: Date.now() + i,
        elements: tweenedElements,
        timestamp: Date.now() + i,
        frameNumber: `Tween ${i}`
      }
      
      newFrames.push(newFrame)
    }
    
    // Insert the new frames between start and end
    const updatedFrames = [...frames, ...newFrames]
    setFrames(updatedFrames)
    
    console.log('Generated', newFrames.length, 'tween frames')
  }

  const interpolateElements = (startElements, endElements, progress) => {
    const interpolatedElements = []
    
    // Create a map of end elements by ID for easy lookup
    const endElementsMap = {}
    endElements.forEach(el => {
      endElementsMap[el.id] = el
    })
    
    startElements.forEach(startEl => {
      const endEl = endElementsMap[startEl.id]
      
      if (endEl && startEl.type === endEl.type) {
        // Interpolate position for elements that exist in both frames
        const interpolatedElement = {
          ...startEl,
          x: startEl.x + (endEl.x - startEl.x) * progress,
          y: startEl.y + (endEl.y - startEl.y) * progress
        }
        
        // Interpolate other numeric properties if they exist
        if (startEl.radius !== undefined && endEl.radius !== undefined) {
          interpolatedElement.radius = startEl.radius + (endEl.radius - startEl.radius) * progress
        }
        
        if (startEl.fontSize !== undefined && endEl.fontSize !== undefined) {
          interpolatedElement.fontSize = startEl.fontSize + (endEl.fontSize - startEl.fontSize) * progress
        }
        
        interpolatedElements.push(interpolatedElement)
      } else {
        // Keep start element as is if it doesn't exist in end frame
        interpolatedElements.push(startEl)
      }
    })
    
    // Add end elements that don't exist in start frame
    const startElementsMap = {}
    startElements.forEach(el => {
      startElementsMap[el.id] = el
    })
    
    endElements.forEach(endEl => {
      if (!startElementsMap[endEl.id]) {
        interpolatedElements.push(endEl)
      }
    })
    
    return interpolatedElements
  }

  const clearTweenFrames = () => {
    setStartFrame(null)
    setEndFrame(null)
  }

  // Audio recording functions
  const startAudioRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      setAudioStream(stream)
      
      const recorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      })
      
      const chunks = []
      setAudioChunks(chunks)
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data)
        }
      }
      
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' })
        setAudioBlob(blob)
        setAudioChunks([])
      }
      
      recorder.start()
      setMediaRecorder(recorder)
      setIsRecordingAudio(true)
      
      console.log('Audio recording started')
    } catch (error) {
      console.error('Error starting audio recording:', error)
      alert('Could not access microphone. Please check permissions.')
    }
  }

  const stopAudioRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop()
    }
    
    if (audioStream) {
      audioStream.getTracks().forEach(track => track.stop())
      setAudioStream(null)
    }
    
    setIsRecordingAudio(false)
    setMediaRecorder(null)
    console.log('Audio recording stopped')
  }

  const clearAudioRecording = () => {
    setAudioBlob(null)
    setAudioChunks([])
  }

  const clearAllData = () => {
    const confirmed = window.confirm(
      'Are you sure you want to clear all data? This will remove all elements, frames, and audio. This action cannot be undone.'
    )
    if (confirmed) {
      setElements([])
      setFrames([])
      setCurrentFrameIndex(-1)
      setSelectedElement(null)
      setAudioBlob(null)
      setHasUnsavedChanges(false)
      setFlippedPlayers(new Set())
    }
  }

  // Load available drills and sessions
  const loadAvailableDrills = async () => {
    try {
      const { data, error } = await supabase
        .from('drills')
        .select('id, title')
        .order('title')
      
      if (error) throw error
      setAvailableDrills(data || [])
    } catch (error) {
      console.error('Error loading drills:', error)
    }
  }

  const loadAvailableSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select('id, title, date')
        .order('date', { ascending: false })
      
      if (error) throw error
      setAvailableSessions(data || [])
    } catch (error) {
      console.error('Error loading sessions:', error)
    }
  }

  // Save animation to drill or session
  const saveAnimationToDrillOrSession = async (mediaBlob, mediaType, fileName) => {
    if (!saveTitle.trim()) {
      alert('Please enter a title for the media')
      return
    }

    if (saveType === 'drill' && !selectedDrillId) {
      alert('Please select a drill')
      return
    }

    if (saveType === 'session' && !selectedSessionId) {
      alert('Please select a session')
      return
    }

    setIsSaving(true)

    try {
      console.log('Starting save process...')
      console.log('Media blob size:', mediaBlob.size)
      console.log('Media type:', mediaType)
      console.log('File name:', fileName)
      
      // Upload file to Supabase Storage
      const filePath = `media/${Date.now()}_${fileName}`
      console.log('Uploading to path:', filePath)
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('media')
        .upload(filePath, mediaBlob, {
          contentType: mediaBlob.type,
          cacheControl: '3600'
        })

      if (uploadError) {
        console.error('Upload error:', uploadError)
        throw new Error(`Upload failed: ${uploadError.message}`)
      }

      console.log('File uploaded successfully')

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('media')
        .getPublicUrl(filePath)

      // Create media attachment record
      const mediaData = {
        title: saveTitle,
        description: saveDescription,
        file_type: mediaType,
        file_name: fileName,
        file_size: mediaBlob.size,
        mime_type: mediaBlob.type,
        storage_path: filePath,
        duration_seconds: mediaType === 'video' || mediaType === 'audio' ? Math.round(frames.length / frameRate) : null,
        frame_count: mediaType === 'animation' ? frames.length : null,
        frame_rate: mediaType === 'animation' ? frameRate : null
      }

      console.log('Creating media attachment record:', mediaData)

      const { data: mediaRecord, error: mediaError } = await supabase
        .from('media_attachments')
        .insert(mediaData)
        .select()
        .single()

      if (mediaError) {
        console.error('Media record creation error:', mediaError)
        throw new Error(`Media record creation failed: ${mediaError.message}`)
      }

      console.log('Media record created:', mediaRecord)

      // Link media to drill or session
      if (saveType === 'drill') {
        console.log('Linking to drill:', selectedDrillId)
        const { error: linkError } = await supabase
          .from('drill_media')
          .insert({
            drill_id: selectedDrillId,
            media_id: mediaRecord.id
          })

        if (linkError) {
          console.error('Drill link error:', linkError)
          throw new Error(`Drill linking failed: ${linkError.message}`)
        }
      } else {
        console.log('Linking to session:', selectedSessionId)
        const { error: linkError } = await supabase
          .from('session_media')
          .insert({
            session_id: selectedSessionId,
            media_id: mediaRecord.id
          })

        if (linkError) {
          console.error('Session link error:', linkError)
          throw new Error(`Session linking failed: ${linkError.message}`)
        }
      }

      console.log('Save completed successfully')
      alert(`Animation saved successfully to ${saveType}!`)
      setShowSaveDialog(false)
      setSaveTitle('')
      setSaveDescription('')
      setSelectedDrillId('')
      setSelectedSessionId('')
      setHasUnsavedChanges(false) // Clear unsaved changes flag after successful save

    } catch (error) {
      console.error('Error saving animation:', error)
      alert(`Error saving animation: ${error.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  // Open save dialog
  const openSaveDialog = async () => {
    if (frames.length === 0) {
      alert('Please create some frames before saving')
      return
    }

    await loadAvailableDrills()
    await loadAvailableSessions()
    setShowSaveDialog(true)
  }

  // Helper functions to create media blobs
  const createVideoBlob = async () => {
    // Create a canvas for video recording
    const canvas = document.createElement('canvas')
    canvas.width = canvasWidth
    canvas.height = canvasHeight
    const ctx = canvas.getContext('2d')

    // Set up video stream
    const videoStream = canvas.captureStream(frameRate)
    
    // Check what formats are supported
    const supportedTypes = [
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm'
    ]
    
    let mimeType = 'video/webm'
    for (const type of supportedTypes) {
      if (MediaRecorder.isTypeSupported(type)) {
        mimeType = type
        break
      }
    }
    
    const mediaRecorder = new MediaRecorder(videoStream, {
      mimeType: mimeType,
      videoBitsPerSecond: 5000000
    })

    return new Promise((resolve) => {
      const chunks = []
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType })
        resolve(blob)
      }

      // Start recording
      mediaRecorder.start()

      // Render frames to canvas
      let frameIndex = 0
      const renderNextFrame = async () => {
        if (frameIndex >= frames.length) {
          mediaRecorder.stop()
          return
        }

        const frame = frames[frameIndex]
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        
        // Render complete rink background with all elements
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
        
        // Render elements from the frame
        frame.elements.forEach(element => {
          renderElementToCanvas(ctx, element)
        })
        
        frameIndex++
        
        // Wait for the frame duration
        setTimeout(renderNextFrame, 1000 / frameRate)
      }

      renderNextFrame()
    })
  }

  const createZipBlob = async () => {
    const zip = new JSZip()
    
    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i]
      const canvas = document.createElement('canvas')
      canvas.width = canvasWidth
      canvas.height = canvasHeight
      const ctx = canvas.getContext('2d')
      
      // Render complete rink background with all elements
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
      
      frame.elements.forEach(element => {
        renderElementToCanvas(ctx, element)
      })
      
      // Convert canvas to blob and add to ZIP
      const blob = await new Promise(resolve => canvas.toBlob(resolve))
      zip.file(`frame-${i + 1}.png`, blob)
    }
    
    return await zip.generateAsync({ type: 'blob' })
  }

  const createImageBlob = async () => {
    const canvas = document.createElement('canvas')
    canvas.width = canvasWidth
    canvas.height = canvasHeight
    const ctx = canvas.getContext('2d')
    
    // Render current frame to canvas
    const currentFrame = frames[currentFrameIndex >= 0 ? currentFrameIndex : 0]
    if (currentFrame) {
      // Render complete rink background with all elements
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
      
      // Render elements from the frame
      currentFrame.elements.forEach(element => {
        renderElementToCanvas(ctx, element)
      })
    }
    
    return new Promise(resolve => canvas.toBlob(resolve))
  }

  return (
    <div className="min-h-screen bg-gray-100 p-2 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-3 md:p-6">
          {/* Header with Logo and Navigation */}
          <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-4 md:mb-6 space-y-2 md:space-y-0">
            <div className="flex items-center space-x-2 md:space-x-4">
              <img 
                src="/Backcheck_small.png" 
                alt="Backcheck Logo" 
                className="h-8 md:h-12 w-auto"
              />
              <div className="flex items-center space-x-2">
                <h1 className="text-lg md:text-2xl font-bold text-gray-900">Drill Designer</h1>
                {hasUnsavedChanges && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    <span className="w-2 h-2 bg-yellow-400 rounded-full mr-1"></span>
                    Unsaved
                  </span>
                )}
              </div>
            </div>
            
            {orgId && (
              <button
                onClick={() => {
                  if (hasUnsavedChanges) {
                    const confirmed = window.confirm(
                      'You have unsaved changes. Are you sure you want to leave? All work will be lost.'
                    )
                    if (confirmed) {
                      navigate(`/organisations/${orgId}`)
                    }
                  } else {
                    navigate(`/organisations/${orgId}`)
                  }
                }}
                className="text-indigo-600 hover:text-indigo-800 font-medium flex items-center space-x-1 text-sm md:text-base"
              >
                <span>←</span>
                <span>Back to Organisation</span>
              </button>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          {isMobile && (
            <div className="mb-4">
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-md transition duration-150 ease-in-out flex items-center justify-center space-x-2"
              >
                <span>{showMobileMenu ? '▼' : '▲'}</span>
                <span>{showMobileMenu ? 'Hide Controls' : 'Show Controls'}</span>
              </button>
            </div>
          )}

          {/* Toolbar and Color Picker - Responsive */}
          <div className={`${isMobile && !showMobileMenu ? 'hidden' : ''} mb-4 p-3 md:p-4 bg-gray-50 rounded-lg`}>
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-3 lg:space-y-0">
              {/* Tools Section */}
              <div className="flex flex-wrap gap-2 md:gap-2">
                {tools.map((tool) => (
                  <button
                    key={tool.id}
                    onClick={() => setSelectedTool(tool.id)}
                    className={`px-3 md:px-4 py-3 md:py-2 rounded-md border-2 transition-colors text-sm md:text-base ${
                      selectedTool === tool.id
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    {tool.image ? (
                      <img 
                        src={tool.image.src} 
                        alt={tool.label} 
                        className="w-6 h-6 md:w-8 md:h-8"
                        style={{ filter: selectedTool === tool.id ? 'brightness(1.2)' : 'none' }}
                      />
                    ) : (
                      <>
                        <span className="text-base md:text-lg mr-1 md:mr-2">{tool.icon}</span>
                        <span className="hidden md:inline">{tool.label}</span>
                      </>
                    )}
                  </button>
                ))}
                
                {/* Player Tool with Dropdown */}
                <div className="relative player-dropdown">
                  <button
                    onClick={() => {
                      setSelectedTool('player')
                      setShowPlayerDropdown(!showPlayerDropdown)
                    }}
                    className={`px-3 md:px-4 py-3 md:py-2 rounded-md border-2 transition-colors text-sm md:text-base ${
                      selectedTool === 'player'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    <span className="text-base md:text-lg mr-1 md:mr-2">🏒</span>
                    <span className="hidden md:inline">Player</span>
                    <span className="ml-1">▼</span>
                  </button>
                  
                  {/* Player Dropdown */}
                  {showPlayerDropdown && (
                    <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-50 min-w-48">
                      {isLoadingPlayers ? (
                        <div className="px-4 py-2 text-sm text-gray-500">Loading players...</div>
                      ) : (
                        <>
                          <div className="px-4 py-2 text-sm text-gray-500">Debug: {dynamicPlayerTools.length} players loaded</div>
                          {dynamicPlayerTools.map((player) => (
                            <button
                              key={player.id}
                              onClick={() => {
                                setSelectedPlayer(player.id)
                                setSelectedTool('player')
                                setShowPlayerDropdown(false)
                              }}
                              className={`w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center space-x-2 ${
                                selectedPlayer === player.id ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                              }`}
                            >
                              {player.image ? (
                                <img 
                                  src={player.image.src} 
                                  alt={player.label} 
                                  className="w-6 h-6"
                                />
                              ) : (
                                <span className="text-lg">{player.icon}</span>
                              )}
                              <span className="text-sm">{player.label}</span>
                              {selectedPlayer === player.id && (
                                <span className="ml-auto text-blue-600">✓</span>
                              )}
                            </button>
                          ))}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Color Picker Section - Only show on larger screens */}
              <div className="hidden lg:flex lg:items-center lg:space-x-4">
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-gray-700 text-sm md:text-base">Color:</span>
                  <div className="flex space-x-1 md:space-x-2">
                    {colors.map((color) => (
                      <button
                        key={color}
                        onClick={() => setSelectedColor(color)}
                        className={`w-8 h-8 md:w-8 md:h-8 rounded-full border-2 transition-all ${
                          selectedColor === color
                            ? 'border-gray-800 scale-110'
                            : 'border-gray-300 hover:scale-105'
                        }`}
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs md:text-sm text-gray-600">Selected:</span>
                  <div 
                    className="w-6 h-6 rounded border border-gray-300"
                    style={{ backgroundColor: selectedColor }}
                  />
                </div>
              </div>
            </div>

            {/* Color Picker - Mobile/Tablet (below tools) */}
            <div className="lg:hidden flex flex-col md:flex-row md:items-center space-y-2 md:space-y-0 md:space-x-4 mt-3 pt-3 border-t border-gray-200">
              <div className="flex items-center space-x-2">
                <span className="font-medium text-gray-700 text-sm md:text-base">Color:</span>
                <div className="flex space-x-1 md:space-x-2">
                  {colors.map((color) => (
                    <button
                      key={color}
                      onClick={() => setSelectedColor(color)}
                      className={`w-8 h-8 md:w-8 md:h-8 rounded-full border-2 transition-all ${
                        selectedColor === color
                          ? 'border-gray-800 scale-110'
                          : 'border-gray-300 hover:scale-105'
                      }`}
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs md:text-sm text-gray-600">Selected:</span>
                <div 
                  className="w-6 h-6 rounded border border-gray-300"
                  style={{ backgroundColor: selectedColor }}
                />
              </div>
            </div>
          </div>

          {/* Tweening and Frame Management */}
          <div className={`${isMobile && !showMobileMenu ? 'hidden' : ''} mb-4 p-3 md:p-4 bg-blue-50 rounded-lg`}>

            {/* Tweening Controls */}
            <div className="border-t border-blue-200 pt-3 mb-3">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-blue-800">Auto Tweening</h4>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-blue-700">Frames:</span>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={tweenFrames}
                    onChange={(e) => setTweenFrames(Number(e.target.value))}
                    className="w-16 px-2 py-1 border border-blue-300 rounded text-sm"
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={captureStartFrame}
                  className={`px-3 py-1 rounded text-xs font-medium ${
                    startFrame 
                      ? 'bg-green-600 text-white' 
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {startFrame ? '✓ Start Set' : '🎯 Set Start'}
                </button>
                <button
                  onClick={captureEndFrame}
                  className={`px-3 py-1 rounded text-xs font-medium ${
                    endFrame 
                      ? 'bg-green-600 text-white' 
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {endFrame ? '✓ End Set' : '🎯 Set End'}
                </button>
                <button
                  onClick={generateTweenFrames}
                  disabled={!startFrame || !endFrame}
                  className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white px-3 py-1 rounded text-xs font-medium"
                >
                  ✨ Generate Tween
                </button>
                <button
                  onClick={clearTweenFrames}
                  disabled={!startFrame && !endFrame}
                  className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white px-3 py-1 rounded text-xs font-medium"
                >
                  🗑️ Clear
                </button>
                
                {/* Separator */}
                <div className="w-px h-6 bg-blue-300 mx-2"></div>
                
                {/* Element Controls */}
                <button
                  onClick={duplicateSelectedElement}
                  disabled={!selectedElement}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-3 py-1 rounded text-xs font-medium"
                >
                  📋 Duplicate
                </button>
                <button
                  onClick={flipSelectedElement}
                  disabled={!selectedElement || !selectedElement.type.startsWith('dynamic-player-')}
                  className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white px-3 py-1 rounded text-xs font-medium"
                >
                  🔄 Flip
                </button>
                <button
                  onClick={deleteSelectedElement}
                  disabled={!selectedElement}
                  className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-3 py-1 rounded text-xs font-medium"
                >
                  🗑️ Delete
                </button>
              </div>
              {(startFrame || endFrame) && (
                <div className="mt-2 text-xs text-blue-600">
                  {startFrame && <span className="mr-3">Start: {startFrame.elements.length} elements</span>}
                  {endFrame && <span>End: {endFrame.elements.length} elements</span>}
                </div>
              )}
            </div>

            {/* Frame Timeline */}
            {frames.length > 0 && (
              <div className="border-t border-blue-200 pt-3">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-sm font-medium text-blue-700">Frames ({frames.length}):</span>
                  <span className="text-xs text-blue-600">
                    Current: {currentFrameIndex >= 0 ? currentFrameIndex + 1 : 'None'}
                  </span>
                  <span className="text-xs text-gray-500 ml-auto">
                    💡 Drag to reorder • Click to select • Use buttons to duplicate/delete
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 overflow-y-auto max-h-32 pb-2">
                  {frames.map((frame, index) => (
                    <div
                      key={frame.id}
                      draggable
                      onDragStart={(e) => handleFrameDragStart(e, index)}
                      onDragOver={(e) => handleFrameDragOver(e, index)}
                      onDragLeave={handleFrameDragLeave}
                      onDrop={(e) => handleFrameDrop(e, index)}
                      onDragEnd={handleFrameDragEnd}
                      className={`flex-shrink-0 px-3 py-2 rounded border-2 text-xs font-medium transition-colors flex items-center cursor-move ${
                        currentFrameIndex === index
                          ? 'border-blue-500 bg-blue-100 text-blue-700'
                          : draggedFrameIndex === index
                          ? 'border-purple-500 bg-purple-100 text-purple-700 opacity-50'
                          : dragOverFrameIndex === index
                          ? 'border-green-500 bg-green-100 text-green-700'
                          : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                      }`}
                      title={`Frame ${frame.frameNumber} - Drag to reorder`}
                    >
                      <button
                        onClick={() => loadFrame(index)}
                        className="flex-1 text-left"
                        title="Load this frame"
                      >
                        {frame.frameNumber}
                      </button>
                      <div className="flex items-center space-x-1 ml-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            duplicateFrame(index)
                          }}
                          className="text-blue-500 hover:text-blue-700"
                          title="Duplicate frame"
                        >
                          📋
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteFrame(index)
                          }}
                          className="text-red-500 hover:text-red-700"
                          title="Delete frame"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Animation Controls */}
          <div className={`${isMobile && !showMobileMenu ? 'hidden' : ''} mb-4 p-3 md:p-4 bg-blue-50 rounded-lg border border-blue-200`}>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-blue-800 text-sm md:text-base">🎬 Animation Controls</h4>
              <span className="text-xs text-blue-600">
                {frames.length > 0 ? `Frame ${currentFrameIndex + 1} of ${frames.length}` : 'No frames yet'}
              </span>
            </div>
            
            {/* Combined Playback and Frame Navigation Controls */}
            <div className="flex items-center space-x-2">
              {/* Capture Frame Button - Left Aligned */}
              <button
                onClick={captureFrame}
                className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-md text-sm font-medium"
                title="Capture current frame"
              >
                📸 Capture Frame ({frames.length + 1})
              </button>
              
              {/* Centered Navigation and Playback Controls */}
              <div className="flex-1 flex items-center justify-center space-x-2">
                <button
                  onClick={goToFirstFrame}
                  disabled={frames.length === 0 || currentFrameIndex === 0}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-3 py-2 rounded-md text-sm"
                  title="Go to first frame (Home)"
                >
                  ⏮️ First
                </button>
                <button
                  onClick={goToPreviousFrame}
                  disabled={frames.length === 0}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-3 py-2 rounded-md text-sm"
                  title="Previous frame (←)"
                >
                  ⏪ Previous
                </button>
                <button
                  onClick={playAnimation}
                  disabled={frames.length === 0 || isPlaying}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md text-sm font-medium"
                  title="Play animation (Spacebar)"
                >
                  ▶️ Play
                </button>
                <button
                  onClick={stopAnimation}
                  disabled={!isPlaying}
                  className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md text-sm font-medium"
                  title="Stop animation (Spacebar)"
                >
                  ⏹️ Stop
                </button>
                <button
                  onClick={goToNextFrame}
                  disabled={frames.length === 0}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-3 py-2 rounded-md text-sm"
                  title="Next frame (→)"
                >
                  Next ⏩
                </button>
                <button
                  onClick={goToLastFrame}
                  disabled={frames.length === 0 || currentFrameIndex === frames.length - 1}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-3 py-2 rounded-md text-sm"
                  title="Go to last frame (End)"
                >
                  Last ⏭️
                </button>
              </div>
            </div>
            
            {/* Frame Counter Display */}
            <div className="flex justify-center mt-2">
              <div className="px-4 py-2 bg-white border border-blue-300 rounded-md text-sm font-medium text-blue-700 min-w-[80px] text-center">
                {frames.length > 0 ? currentFrameIndex + 1 : '0'}
              </div>
            </div>
          </div>

          {/* Canvas - Responsive */}
          <div className="border-2 border-gray-300 rounded-lg overflow-hidden relative mb-4">
            <div className="flex justify-center">
              <Stage
                ref={stageRef}
                width={canvasWidth}
                height={canvasHeight}
                onClick={handleStageClick}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onTouchStart={handleMouseDown}
                onTouchMove={handleMouseMove}
                onTouchEnd={handleMouseUp}
                style={{ 
                  maxWidth: '100%', 
                  height: 'auto',
                  touchAction: 'none' // Prevents default touch behaviors
                }}
              >
                <Layer>
                  {/* Rink Background - only inside the rounded border */}
                  <Rect
                    x={0}
                    y={0}
                    width={canvasWidth}
                    height={canvasHeight}
                    fill={rinkColor}
                    cornerRadius={mToPx(cornerRadius)}
                    listening={false}
                  />

                  {/* Rink Border - single clean border */}
                  <Rect
                    x={0}
                    y={0}
                    width={canvasWidth}
                    height={canvasHeight}
                    stroke={borderColor}
                    strokeWidth={3}
                    fill="transparent"
                    cornerRadius={mToPx(cornerRadius)}
                    listening={false}
                  />

                  {/* Center Line */}
                  <Line
                    points={[canvasWidth / 2, 0, canvasWidth / 2, canvasHeight]}
                    stroke={lineColor}
                    strokeWidth={3}
                    listening={false}
                  />

                  {/* Face-off Circles */}
                  <Circle
                    x={canvasWidth / 2}
                    y={canvasHeight / 2}
                    radius={mToPx(2.25)}
                    stroke={lineColor}
                    strokeWidth={3}
                    listening={false}
                  />
                  <Circle
                    x={mToPx(14)}
                    y={mToPxY(7)}
                    radius={mToPx(2.25)}
                    stroke={lineColor}
                    strokeWidth={3}
                    listening={false}
                  />
                  <Circle
                    x={canvasWidth - mToPx(14)}
                    y={mToPxY(7)}
                    radius={mToPx(2.25)}
                    stroke={lineColor}
                    strokeWidth={3}
                    listening={false}
                  />
                  <Circle
                    x={mToPx(14)}
                    y={canvasHeight - mToPxY(7)}
                    radius={mToPx(2.25)}
                    stroke={lineColor}
                    strokeWidth={3}
                    listening={false}
                  />
                  <Circle
                    x={canvasWidth - mToPx(14)}
                    y={canvasHeight - mToPxY(7)}
                    radius={mToPx(2.25)}
                    stroke={lineColor}
                    strokeWidth={3}
                    listening={false}
                  />

                  {/* Hash Marks at Face-off Circles */}
                  {/* Top Left Face-off Circle */}
                  <Rect
                    x={mToPx(14) - mToPx(0.3)}
                    y={mToPxY(7) - mToPxY(0.3)}
                    width={mToPx(0.6)}
                    height={mToPxY(0.6)}
                    fill={lineColor}
                    listening={false}
                  />

                  {/* Top Right Face-off Circle */}
                  <Rect
                    x={canvasWidth - mToPx(14) - mToPx(0.3)}
                    y={mToPxY(7) - mToPxY(0.3)}
                    width={mToPx(0.6)}
                    height={mToPxY(0.6)}
                    fill={lineColor}
                    listening={false}
                  />

                  {/* Bottom Left Face-off Circle */}
                  <Rect
                    x={mToPx(14) - mToPx(0.3)}
                    y={canvasHeight - mToPxY(7) - mToPxY(0.3)}
                    width={mToPx(0.6)}
                    height={mToPxY(0.6)}
                    fill={lineColor}
                    listening={false}
                  />

                  {/* Bottom Right Face-off Circle */}
                  <Rect
                    x={canvasWidth - mToPx(14) - mToPx(0.3)}
                    y={canvasHeight - mToPxY(7) - mToPxY(0.3)}
                    width={mToPx(0.6)}
                    height={mToPxY(0.6)}
                    fill={lineColor}
                    listening={false}
                  />

                  {/* Center Ice Hash Mark */}
                  <Rect
                    x={canvasWidth / 2 - mToPx(0.3)}
                    y={canvasHeight / 2 - mToPxY(0.3)}
                    width={mToPx(0.6)}
                    height={mToPxY(0.6)}
                    fill="#0000FF"
                    listening={false}
                  />

                  {/* Goal Lines */}
                  <Line
                    points={[mToPx(4.5), 10, mToPx(4.5), canvasHeight - 10]}
                    stroke={lineColor}
                    strokeWidth={3}
                    listening={false}
                  />
                  <Line
                    points={[canvasWidth - mToPx(4.5), 10, canvasWidth - mToPx(4.5), canvasHeight - 10]}
                    stroke={lineColor}
                    strokeWidth={3}
                    listening={false}
                  />

                  {/* Goals */}
                  {/* Left Goal */}
                  <Rect
                    x={mToPx(4.5) - mToPxY(1.5)}
                    y={canvasHeight / 2 - mToPx(1.35)}
                    width={mToPxY(1.5)}
                    height={mToPx(2.7)}
                    fill="#FFFFFF"
                    stroke="#000000"
                    strokeWidth={2}
                    listening={false}
                  />

                  {/* Right Goal */}
                  <Rect
                    x={canvasWidth - mToPx(4.5)}
                    y={canvasHeight / 2 - mToPx(1.35)}
                    width={mToPxY(1.5)}
                    height={mToPx(2.7)}
                    fill="#FFFFFF"
                    stroke="#000000"
                    strokeWidth={2}
                    listening={false}
                  />

                  {/* Neutral Zone Dots */}
                  <Circle
                    x={canvasWidth / 2}
                    y={mToPxY(3)}
                    radius={mToPx(0.3)}
                    fill={lineColor}
                    listening={false}
                  />
                  <Circle
                    x={canvasWidth / 2}
                    y={canvasHeight - mToPxY(3)}
                    radius={mToPx(0.3)}
                    fill={lineColor}
                    listening={false}
                  />

                  {/* Center Ice Dot */}
                  <Circle
                    x={canvasWidth / 2}
                    y={canvasHeight / 2}
                    radius={mToPx(0.3)}
                    fill={lineColor}
                    listening={false}
                  />

                  {/* Draw Elements */}
                  {elements.map((element) => {
                    const isSelected = selectedElement?.id === element.id
                    
                    switch (element.type) {
                      case 'puck':
                        return (
                          <Circle
                            key={element.id}
                            x={element.x}
                            y={element.y}
                            radius={element.radius}
                            fill={element.fill}
                            stroke={isSelected ? '#00ff00' : 'transparent'}
                            strokeWidth={isSelected ? 3 : 0}
                            onClick={() => handleElementClick(element)}
                            onDragEnd={(e) => handleDragEnd(e, element.id)}
                            draggable
                          />
                        )
                      case 'arrow':
                        return (
                          <Arrow
                            key={element.id}
                            x={element.x}
                            y={element.y}
                            points={element.points}
                            stroke={isSelected ? '#00ff00' : element.stroke}
                            strokeWidth={isSelected ? 5 : element.strokeWidth}
                            fill={element.fill}
                            onClick={() => handleElementClick(element)}
                            onDragEnd={(e) => handleDragEnd(e, element.id)}
                            draggable
                          />
                        )
                      case 'text':
                        return (
                          <Text
                            key={element.id}
                            x={element.x}
                            y={element.y}
                            text={element.text}
                            fontSize={element.fontSize}
                            fill={element.fill}
                            fontFamily={element.fontFamily}
                            stroke={isSelected ? '#00ff00' : 'transparent'}
                            strokeWidth={isSelected ? 1 : 0}
                            onClick={() => handleElementClick(element)}
                            onDblClick={() => handleTextDoubleClick(element)}
                            onDragEnd={(e) => handleDragEnd(e, element.id)}
                            draggable
                          />
                        )

                      case 'draw':
                        return (
                          <Line
                            key={element.id}
                            points={element.points}
                            stroke={isSelected ? '#00ff00' : element.stroke}
                            strokeWidth={isSelected ? 5 : element.strokeWidth}
                            tension={element.tension}
                            lineCap={element.lineCap}
                            lineJoin={element.lineJoin}
                            onClick={() => handleElementClick(element)}
                            onDragEnd={(e) => handleDragEnd(e, element.id)}
                            draggable
                          />
                        )
                      default:
                        // Handle dynamic player IDs (they start with 'dynamic-player-')
                        if (element.type.startsWith('dynamic-player-')) {
                          // Find the corresponding player in dynamicPlayerTools
                          const dynamicPlayer = dynamicPlayerTools.find(p => p.id === element.type)
                          const currentPlayerImage = dynamicPlayer?.image
                          const isFlipped = flippedPlayers.has(element.id)
                          
                          return (
                            <Group
                              key={element.id}
                              x={element.x}
                              y={element.y}
                              onClick={() => handleElementClick(element)}
                              onDragStart={(e) => {
                                console.log('Dynamic player drag start:', e.target.position())
                              }}
                              onDragMove={(e) => {
                                console.log('Dynamic player drag move:', e.target.position())
                              }}
                              onDragEnd={(e) => {
                                console.log('Dynamic player drag end:', e.target.position())
                                handleDragEnd(e, element.id)
                              }}
                              draggable={true}
                            >
                              {currentPlayerImage && (
                                <Image
                                  image={currentPlayerImage}
                                  x={isFlipped ? currentPlayerImage.width / 2 : -currentPlayerImage.width / 2}
                                  y={-currentPlayerImage.height / 2}
                                  width={currentPlayerImage.width}
                                  height={currentPlayerImage.height}
                                  scaleX={isFlipped ? -1 : 1}
                                />
                              )}
                              {isSelected && (
                                <Circle
                                  x={0}
                                  y={0}
                                  radius={Math.max(currentPlayerImage ? currentPlayerImage.width / 2 : 25, 25)}
                                  fill="transparent"
                                  stroke="#00ff00"
                                  strokeWidth={4}
                                />
                              )}
                            </Group>
                          )
                        }
                        return null
                    }
                  })}

                  {/* Current drawing line */}
                  {isDrawing && drawingPoints.length > 2 && (
                    <Line
                      points={drawingPoints}
                      stroke={selectedColor}
                      strokeWidth={3}
                      tension={0.5}
                      lineCap="round"
                      lineJoin="round"
                    />
                  )}
                </Layer>
              </Stage>
            </div>
          </div>

          {/* Audio Commentary Panel - Moved here for better accessibility */}
          <div className={`${isMobile && !showMobileMenu ? 'hidden' : ''} mb-4 p-3 md:p-4 bg-green-50 rounded-lg border border-green-200`}>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-green-800 text-sm md:text-base">🎤 Audio Commentary</h4>
              {audioBlob && (
                <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                  ✓ Audio recorded
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={isRecordingAudio ? stopAudioRecording : startAudioRecording}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  isRecordingAudio
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                {isRecordingAudio ? '🔴 Stop Recording' : '🎤 Start Recording'}
              </button>
              {audioBlob && (
                <>
                  <button
                    onClick={clearAudioRecording}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm"
                  >
                    🗑️ Clear Audio
                  </button>
                  <span className="text-xs text-green-600">
                    Audio will be included in video export
                  </span>
                </>
              )}
            </div>
            {isRecordingAudio && (
              <div className="mt-2 text-xs text-red-600 animate-pulse">
                🔴 Recording audio... Speak clearly into your microphone
              </div>
            )}
          </div>

          {/* Save and Export */}
          <div className={`${isMobile && !showMobileMenu ? 'hidden' : ''} mb-4 p-3 md:p-4 bg-blue-50 rounded-lg`}>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-3 space-y-2 md:space-y-0">
              <h3 className="font-semibold text-blue-900 text-sm md:text-base">Save and Export</h3>
              <div className="flex flex-col md:flex-row md:items-center space-y-2 md:space-y-0 md:space-x-4">
                <div className="flex items-center space-x-2">
                  <span className="text-xs md:text-sm text-blue-700">Frame Rate:</span>
                  <select 
                    value={frameRate} 
                    onChange={(e) => setFrameRate(Number(e.target.value))}
                    className="px-2 py-1 border border-blue-300 rounded text-xs md:text-sm"
                  >
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
                <div className="flex items-center space-x-2">
                  <span className="text-xs md:text-sm text-blue-700">Export Format:</span>
                  <select 
                    value={exportFormat} 
                    onChange={(e) => setExportFormat(e.target.value)}
                    className="px-2 py-1 border border-blue-300 rounded text-xs md:text-sm"
                  >
                    <option value="webm">WebM Video</option>
                    <option value="zip">ZIP (Frames)</option>
                    <option value="image">Still Image</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2 mb-3">
              <button
                onClick={exportAnimation}
                disabled={frames.length === 0 || isExporting}
                className="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white px-3 md:px-4 py-2 md:py-2 rounded-md text-xs md:text-sm flex-1 md:flex-none"
              >
                {isExporting ? '⏳ Exporting...' : `📦 Export ${exportFormat.toUpperCase()}`}
              </button>
              <button
                onClick={openSaveDialog}
                disabled={frames.length === 0}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-3 md:px-4 py-2 md:py-2 rounded-md text-xs md:text-sm flex-1 md:flex-none"
              >
                💾 Save to Drill/Session
              </button>
              <button
                onClick={clearAllData}
                className="bg-gray-600 hover:bg-gray-700 text-white px-3 md:px-4 py-2 md:py-2 rounded-md text-xs md:text-sm flex-1 md:flex-none"
              >
                🗑️ Clear All
              </button>
            </div>
          </div>

          {/* Text Edit Overlay */}
          {editingText && (
            <div 
              className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50"
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  setEditingText(null)
                  setEditTextValue('')
                }
              }}
            >
              <div className="bg-white p-4 rounded-lg shadow-lg">
                <h3 className="text-lg font-semibold mb-2">Edit Text</h3>
                <input
                  type="text"
                  value={editTextValue}
                  onChange={(e) => setEditTextValue(e.target.value)}
                  onKeyDown={handleTextEditKeyDown}
                  onBlur={handleTextEdit}
                  className="w-64 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
                <div className="mt-3 flex space-x-2">
                  <button
                    onClick={handleTextEdit}
                    className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setEditingText(null)
                      setEditTextValue('')
                    }}
                    className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Instructions - Mobile Responsive */}
          <div className={`${isMobile && !showMobileMenu ? 'hidden' : ''} mt-4 p-3 md:p-4 bg-blue-50 rounded-lg`}>
            <h3 className="font-semibold text-blue-900 mb-2 text-sm md:text-base">How to Use:</h3>
            <ul className="text-xs md:text-sm text-blue-800 space-y-1">
              <li>• Select a tool from the toolbar above (Puck, Arrow, Text, Player, or Draw)</li>
              <li>• Choose a color from the color picker (affects Puck, Text, and Player colors)</li>
              <li>• Click on empty space on the rink to add elements (except for Draw tool)</li>
              <li>• <strong>For freehand drawing:</strong> Select the Draw tool, then click and drag to draw</li>
              <li>• Click and drag elements to reposition them</li>
              <li>• Click on elements to select them (green outline)</li>
              <li>• <strong>Double-click on text elements to edit them</strong></li>
              <li>• <strong>Use the Duplicate button to copy selected elements</strong></li>
              <li>• <strong>Use the Flip button to flip selected players horizontally</strong></li>
              <li>• Use the Delete Selected button to remove elements</li>
              <li>• <strong>Frame Timeline:</strong> Drag frames to reorder, use 📋 to duplicate, × to delete</li>
              <li>• <strong>Frame Navigation:</strong> Use ⏮️⏪⏩⏭️ buttons or keyboard shortcuts (←→ Home End)</li>
              <li>• <strong>Playback:</strong> Press Spacebar to play/pause animation</li>
              <li>• Use the Export button to save your drill as an image</li>
              {isMobile && (
                <li>• <strong>Mobile:</strong> Use touch gestures to interact with the canvas</li>
              )}
            </ul>
          </div>
        </div>
      </div>

      {/* Save Dialog Modal */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Save Animation</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Media Title *
                </label>
                <input
                  type="text"
                  value={saveTitle}
                  onChange={(e) => setSaveTitle(e.target.value)}
                  placeholder="Enter a title for this animation"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={saveDescription}
                  onChange={(e) => setSaveDescription(e.target.value)}
                  placeholder="Optional description"
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Save to
                </label>
                <select
                  value={saveType}
                  onChange={(e) => setSaveType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="drill">Drill</option>
                  <option value="session">Session</option>
                </select>
              </div>

              {saveType === 'drill' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Drill *
                  </label>
                  <select
                    value={selectedDrillId}
                    onChange={(e) => setSelectedDrillId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Choose a drill...</option>
                    {availableDrills.map(drill => (
                      <option key={drill.id} value={drill.id}>
                        {drill.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {saveType === 'session' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Session *
                  </label>
                  <select
                    value={selectedSessionId}
                    onChange={(e) => setSelectedSessionId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Choose a session...</option>
                    {availableSessions.map(session => (
                      <option key={session.id} value={session.id}>
                        {session.title} - {new Date(session.date).toLocaleDateString()}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="text-sm text-gray-600">
                <p>This will save:</p>
                <ul className="list-disc list-inside mt-1">
                  <li>Animation video ({frames.length} frames, {frameRate} FPS)</li>
                  {audioBlob && <li>Audio commentary</li>}
                  <li>Animation data for future editing</li>
                </ul>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowSaveDialog(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  // Create the media blob based on export format
                  let mediaBlob, mediaType, fileName
                  
                  if (exportFormat === 'webm') {
                    // For now, we'll save the video without audio due to browser limitations
                    // In a real implementation, you'd want to combine them server-side
                    mediaBlob = await createVideoBlob()
                    mediaType = 'video'
                    fileName = 'drill-animation.webm'
                  } else if (exportFormat === 'zip') {
                    mediaBlob = await createZipBlob()
                    mediaType = 'animation'
                    fileName = 'drill-animation.zip'
                  } else {
                    mediaBlob = await createImageBlob()
                    mediaType = 'image'
                    fileName = 'drill-frame.png'
                  }
                  
                  await saveAnimationToDrillOrSession(mediaBlob, mediaType, fileName)
                }}
                disabled={isSaving || !saveTitle.trim() || (saveType === 'drill' && !selectedDrillId) || (saveType === 'session' && !selectedSessionId)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DrillDesigner 