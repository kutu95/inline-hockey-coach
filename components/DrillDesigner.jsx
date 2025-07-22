import React, { useState, useRef, useEffect } from 'react'
import { Stage, Layer, Rect, Circle, Line, Text, Arrow, Shape, Image, Group } from 'react-konva'
import JSZip from 'jszip'
import { supabase } from '../src/lib/supabase'
import { Link, useParams, useNavigate } from 'react-router-dom'
import AIGeneratorPanel from './AIGeneratorPanel'
import { generateHockeyAnimation } from '../src/lib/ai'

const DrillDesigner = () => {
  const { orgId, drillId } = useParams()
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
  const [startFrameIndex, setStartFrameIndex] = useState(null)
  const [endFrameIndex, setEndFrameIndex] = useState(null)
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
  
  // Load dialog state
  const [showLoadDialog, setShowLoadDialog] = useState(false)
  const [loadType, setLoadType] = useState('drill')
  const [selectedLoadDrillId, setSelectedLoadDrillId] = useState('')
  const [selectedLoadSessionId, setSelectedLoadSessionId] = useState('')
  const [availableAnimations, setAvailableAnimations] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  
  // Mobile responsiveness state
  const [isMobile, setIsMobile] = useState(false)
  const [canvasScale, setCanvasScale] = useState(1)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [selectedPlayer, setSelectedPlayer] = useState('player')
  const [showPlayerDropdown, setShowPlayerDropdown] = useState(false)
  const [dynamicPlayerTools, setDynamicPlayerTools] = useState([])
  const [isLoadingPlayers, setIsLoadingPlayers] = useState(true)

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [draggedFrameIndex, setDraggedFrameIndex] = useState(null)
  const [dragOverFrameIndex, setDragOverFrameIndex] = useState(null)
  const [frameSavedMessage, setFrameSavedMessage] = useState('')
  const [drillTitle, setDrillTitle] = useState('')
  const [backNavigation, setBackNavigation] = useState({ type: 'organisation', url: '' })
  const [flipHistory, setFlipHistory] = useState({}) // { playerId: [frameNumbers] }
  
  const stageRef = useRef()
  const animationRef = useRef()
  const audioChunksRef = useRef([])
  const isPlayingRef = useRef(false)
  const [showAIPanel, setShowAIPanel] = useState(false)
  
  // Path drawing state
  const [isPathDrawingMode, setIsPathDrawingMode] = useState(false)
  const [pathPoints, setPathPoints] = useState([])
  const [selectedPathPlayer, setSelectedPathPlayer] = useState(null)
  const [pathFrames, setPathFrames] = useState(10)
  const [showPathPanel, setShowPathPanel] = useState(false)
  const [isDrawingPath, setIsDrawingPath] = useState(false)
  const [pathInsertMode, setPathInsertMode] = useState('append') // 'append', 'insert', 'replace', 'merge'

  // Helper function to filter out unwanted elements (like path artifacts)
  const filterValidElements = (elements) => {
    if (!Array.isArray(elements)) return []
    
    return elements.filter(element => {
      // Only allow valid element types
      const validTypes = [
        'puck',
        'arrow', 
        'text',
        'draw',
        'player',
        'dynamic-player-0',
        'dynamic-player-1', 
        'dynamic-player-2',
        'dynamic-player-3',
        'dynamic-player-4',
        'dynamic-player-5',
        'dynamic-player-6',
        'dynamic-player-7',
        'dynamic-player-8',
        'dynamic-player-9',
        'dynamic-player-10',
        'dynamic-player-11',
        'dynamic-player-12'
      ]
      
      // Check if element type is valid
      const isValidType = validTypes.includes(element.type) || 
                         (element.type && element.type.startsWith('dynamic-player-'))
      
      // Additional validation: ensure element has required properties
      const hasRequiredProps = element && 
                              typeof element.x === 'number' && 
                              typeof element.y === 'number' &&
                              element.id
      
      return isValidType && hasRequiredProps
    })
  }

  // Helper function to calculate if a player is flipped at a given frame
  const isPlayerFlippedAtFrame = (playerId, frameIndex) => {
    const flipFrames = flipHistory[playerId] || []
    
    // Handle the case where no frames have been captured yet
    let effectiveFrameIndex = frameIndex
    if (frameIndex < 0 && frames.length === 0) {
      // No frames captured yet, use frame 0 for calculations
      effectiveFrameIndex = 0
    }
    
    // Count how many flips occurred before or at this frame
    const flipCount = flipFrames.filter(frameNum => frameNum <= effectiveFrameIndex).length
    // Player is flipped if there's an odd number of flips
    return flipCount % 2 === 1
  }

  // Helper function to get current flip state for a player
  const getCurrentPlayerFlipState = (playerId) => {
    if (currentFrameIndex < 0) return false
    return isPlayerFlippedAtFrame(playerId, currentFrameIndex)
  }
  


  // Load dynamic players on component mount
  useEffect(() => {
    loadDynamicPlayers()
  }, [])

  // Load drill title and existing animation data if drillId is provided
  useEffect(() => {
    if (drillId) {
      loadDrillTitle()
      loadExistingAnimationForDrill()
    }
  }, [drillId])

  // Determine back navigation based on URL parameters and referrer
  useEffect(() => {
    const determineBackNavigation = () => {
      const urlParams = new URLSearchParams(window.location.search)
      const fromParam = urlParams.get('from')
      
      if (fromParam === 'drills') {
        setBackNavigation({ type: 'drills', url: `/organisations/${orgId}/drills` })
      } else if (fromParam === 'drill-details' && drillId) {
        setBackNavigation({ type: 'drill-details', url: `/organisations/${orgId}/drills/${drillId}` })
      } else if (drillId) {
        // If editing an existing drill but no specific source, default to drill details
        setBackNavigation({ type: 'drill-details', url: `/organisations/${orgId}/drills/${drillId}` })
      } else {
        // Default to organisation
        setBackNavigation({ type: 'organisation', url: `/organisations/${orgId}` })
      }
    }
    
    determineBackNavigation()
  }, [orgId, drillId])

  // Function to load drill title
  const loadDrillTitle = async () => {
    try {
      const { data, error } = await supabase
        .from('drills')
        .select('title')
        .eq('id', drillId)
        .single()

      if (error) {
        console.error('Error loading drill title:', error)
        return
      }

      if (data) {
        setDrillTitle(data.title)
      }
    } catch (err) {
      console.error('Error loading drill title:', err)
    }
  }

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
      
      // Don't handle shortcuts if user is typing in an input or textarea
      const target = e.target
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') {
        return
      }
      
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
        case 's':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            if (currentFrameIndex >= 0 && frames.length > 0) {
              saveFrameChanges()
            }
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
    { id: 'draw', label: 'Draw', icon: '✏️' },
    { id: 'path', label: 'Path', icon: '🛤️' }
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
    // Don't add elements when path tool is active
    if (e.target === e.target.getStage() && selectedTool !== 'path') {
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
    } else if (selectedTool === 'path' && selectedPathPlayer) {
      handlePathMouseDown(e)
    }
  }

  const handleMouseMove = (e) => {
    if (isDrawing && selectedTool === 'draw') {
      const pos = e.target.getStage().getPointerPosition()
      setDrawingPoints([...drawingPoints, pos.x, pos.y])
    } else if (selectedTool === 'path' && selectedPathPlayer) {
      handlePathMouseMove(e)
    }
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
    
    // Stop path drawing
    if (selectedTool === 'path' && isDrawingPath) {
      setIsDrawingPath(false)
    }
  }

  const handleElementClick = (element) => {
    setSelectedElement(element)
    
    // Handle path drawing player selection
    if (selectedTool === 'path') {
      handlePathPlayerSelect(element)
    }
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

  // Path drawing functions
  const startPathDrawing = () => {
    setIsPathDrawingMode(true)
    setPathPoints([])
    setSelectedPathPlayer(null)
    setShowPathPanel(true)
    setSelectedTool('path') // Set the tool to path mode
  }

  const stopPathDrawing = () => {
    setIsPathDrawingMode(false)
    setPathPoints([])
    setSelectedPathPlayer(null)
    setShowPathPanel(false)
    setIsDrawingPath(false)
    setSelectedTool('puck') // Reset to default tool
  }

  const handlePathPlayerSelect = (element) => {
    if (selectedTool !== 'path') return
    
    // Check if element is a player or puck
    if (element.type && (element.type.startsWith('player') || element.type.startsWith('dynamic-player') || element.type === 'puck')) {
      setSelectedPathPlayer(element)
      setPathPoints([{ x: element.x, y: element.y }])
      console.log('Selected element for path:', element)
    }
  }

  const handlePathMouseMove = (e) => {
    if (selectedTool !== 'path' || !selectedPathPlayer || !isDrawingPath) return
    
    // For pucks, don't add points during mouse move - only on clicks
    if (selectedPathPlayer.type === 'puck') return
    
    const pos = e.target.getStage().getPointerPosition()
    // Add new point during drag for curved path (with throttling to avoid too many points)
    setPathPoints(prev => {
      // Only add point if it's significantly different from the last one (to avoid too many points)
      if (prev.length === 0) {
        return [{ x: pos.x, y: pos.y }]
      }
      const lastPoint = prev[prev.length - 1]
      const distance = Math.sqrt((pos.x - lastPoint.x) ** 2 + (pos.y - lastPoint.y) ** 2)
      
      // Only add point if it's at least 5 pixels away from the last point
      if (distance > 5) {
        return [...prev, { x: pos.x, y: pos.y }]
      }
      return prev
    })
  }

  const handlePathMouseDown = (e) => {
    if (selectedTool !== 'path' || !selectedPathPlayer) return
    
    const pos = e.target.getStage().getPointerPosition()
    setIsDrawingPath(true)
    
    // For pucks, add a new point on each click
    if (selectedPathPlayer.type === 'puck') {
      setPathPoints(prev => [...prev, { x: pos.x, y: pos.y }])
    } else {
      // For players, start the path
      setPathPoints([...pathPoints, { x: pos.x, y: pos.y }])
    }
  }

  const clearPath = () => {
    setPathPoints([])
    setSelectedPathPlayer(null)
    setIsDrawingPath(false)
  }

  const generatePathAnimation = () => {
    if (pathPoints.length < 2 || !selectedPathPlayer) {
      alert('Please draw a path with at least 2 points')
      return
    }

    // Generate path points - smooth for players, straight for pucks
    let path
    if (pathInsertMode === 'append') {
      // For append mode, include the player's current position as the starting point
      const currentPosition = { x: selectedPathPlayer.x, y: selectedPathPlayer.y }
      const pathWithStart = [currentPosition, ...pathPoints]
      path = selectedPathPlayer.type === 'puck' ? pathWithStart : generateSmoothPath(pathWithStart)
    } else {
      // For other modes, use the drawn path as is
      path = selectedPathPlayer.type === 'puck' ? pathPoints : generateSmoothPath(pathPoints)
    }
    
    // Create frames for the animation
    const newFrames = []
    for (let i = 0; i < pathFrames; i++) {
      const progress = i / (pathFrames - 1)
      const position = interpolateAlongPath(path, progress)
      
      // Create frame elements with player at new position
      const frameElements = elements.map(element => {
        if (element.id === selectedPathPlayer.id) {
          return { ...element, x: position.x, y: position.y }
        }
        return element
      })
      
      // Filter out unwanted elements before saving
      const filteredElements = filterValidElements(frameElements)
      
      newFrames.push({
        id: Date.now() + i,
        elements: JSON.parse(JSON.stringify(filteredElements)), // Deep copy of filtered elements
        flipHistory: JSON.parse(JSON.stringify(flipHistory)), // Include flip history
        timestamp: Date.now() + i,
        frameNumber: 0 // Will be set based on insertion mode
      })
    }
    
    // Insert frames based on mode
    let updatedFrames = [...frames]
    
    if (pathInsertMode === 'append') {
      // Add to end (current behavior)
      newFrames.forEach((frame, index) => {
        frame.frameNumber = frames.length + index + 1
      })
      updatedFrames = [...frames, ...newFrames]
    } else if (pathInsertMode === 'insert') {
      // Insert at current frame position
      const insertIndex = currentFrameIndex >= 0 ? currentFrameIndex : 0
      newFrames.forEach((frame, index) => {
        frame.frameNumber = insertIndex + index + 1
      })
      
      // Update frame numbers for existing frames after insertion point
      const framesAfterInsert = frames.slice(insertIndex).map((frame, index) => ({
        ...frame,
        frameNumber: insertIndex + pathFrames + index + 1
      }))
      
      updatedFrames = [
        ...frames.slice(0, insertIndex),
        ...newFrames,
        ...framesAfterInsert
      ]
    } else if (pathInsertMode === 'replace') {
      // Replace frames starting from current position
      const replaceIndex = currentFrameIndex >= 0 ? currentFrameIndex : 0
      const framesToReplace = Math.min(pathFrames, frames.length - replaceIndex)
      
      newFrames.forEach((frame, index) => {
        frame.frameNumber = replaceIndex + index + 1
      })
      
      // Update frame numbers for remaining frames
      const remainingFrames = frames.slice(replaceIndex + framesToReplace).map((frame, index) => ({
        ...frame,
        frameNumber: replaceIndex + pathFrames + index + 1
      }))
      
      updatedFrames = [
        ...frames.slice(0, replaceIndex),
        ...newFrames,
        ...remainingFrames
      ]
    } else if (pathInsertMode === 'merge') {
      // Merge path animation with existing frames
      const mergeIndex = currentFrameIndex >= 0 ? currentFrameIndex : 0
      const framesToMerge = Math.min(pathFrames, frames.length - mergeIndex)
      
      // Create merged frames by combining path animation with existing frame elements
      const mergedFrames = []
      
      // Always use current canvas state as the base for merging
      // This ensures any new elements added to the current frame are included
      const currentCanvasElements = elements
      
      // Handle case where we have existing frames to merge with
      if (framesToMerge > 0) {
        for (let i = 0; i < framesToMerge; i++) {
          const progress = i / (framesToMerge - 1)
          const position = interpolateAlongPath(path, progress)
          
          // Get the existing frame at merge position
          const existingFrame = frames[mergeIndex + i]
          
          // Start with current canvas state, then merge with existing frame data
          let baseElements = [...currentCanvasElements]
          
          // If there's an existing frame, merge its elements with current canvas state
          if (existingFrame) {
            // Create a map of existing frame elements by ID for quick lookup
            const existingElementsMap = {}
            existingFrame.elements.forEach(el => {
              existingElementsMap[el.id] = el
            })
            
            // Update base elements with existing frame data, but keep current canvas elements
            baseElements = baseElements.map(element => {
              // If this element exists in the existing frame, use its position
              if (existingElementsMap[element.id]) {
                return { ...element, ...existingElementsMap[element.id] }
              }
              return element
            })
          }
          
          // Create merged elements: update selected player position, keep others as they are
          const mergedElements = baseElements.map(element => {
            if (element.id === selectedPathPlayer.id) {
              return { ...element, x: position.x, y: position.y }
            }
            return element
          })
          
          // Filter out unwanted elements before saving
          const filteredMergedElements = filterValidElements(mergedElements)
          
          mergedFrames.push({
            id: Date.now() + i,
            elements: JSON.parse(JSON.stringify(filteredMergedElements)),
            flipHistory: existingFrame ? JSON.parse(JSON.stringify(existingFrame.flipHistory)) : JSON.parse(JSON.stringify(flipHistory)),
            timestamp: Date.now() + i,
            frameNumber: mergeIndex + i + 1
          })
        }
      }
      
      // If we have more path frames than existing frames, add the remaining path frames
      if (pathFrames > framesToMerge) {
        for (let i = framesToMerge; i < pathFrames; i++) {
          const progress = i / (pathFrames - 1)
          const position = interpolateAlongPath(path, progress)
          
          // Use current canvas state as base for remaining frames to include any new elements
          const baseElements = elements
          
          const remainingElements = baseElements.map(element => {
            if (element.id === selectedPathPlayer.id) {
              return { ...element, x: position.x, y: position.y }
            }
            return element
          })
          
          // Filter out unwanted elements before saving
          const filteredRemainingElements = filterValidElements(remainingElements)
          
          mergedFrames.push({
            id: Date.now() + i,
            elements: JSON.parse(JSON.stringify(filteredRemainingElements)),
            flipHistory: JSON.parse(JSON.stringify(flipHistory)),
            timestamp: Date.now() + i,
            frameNumber: mergeIndex + i + 1
          })
        }
      }
      
      // If no frames to merge with, create all frames from current elements
      if (framesToMerge === 0) {
        for (let i = 0; i < pathFrames; i++) {
          const progress = i / (pathFrames - 1)
          const position = interpolateAlongPath(path, progress)
          
          const mergedElements = elements.map(element => {
            if (element.id === selectedPathPlayer.id) {
              return { ...element, x: position.x, y: position.y }
            }
            return element
          })
          
          // Filter out unwanted elements before saving
          const filteredMergedElements = filterValidElements(mergedElements)
          
          mergedFrames.push({
            id: Date.now() + i,
            elements: JSON.parse(JSON.stringify(filteredMergedElements)),
            flipHistory: JSON.parse(JSON.stringify(flipHistory)),
            timestamp: Date.now() + i,
            frameNumber: mergeIndex + i + 1
          })
        }
      }
      
      // Update frame numbers for frames after the merge
      const framesAfterMerge = frames.slice(mergeIndex + framesToMerge).map((frame, index) => ({
        ...frame,
        frameNumber: mergeIndex + mergedFrames.length + index + 1
      }))
      
      updatedFrames = [
        ...frames.slice(0, mergeIndex),
        ...mergedFrames,
        ...framesAfterMerge
      ]
    }
    
    setFrames(updatedFrames)
    setHasUnsavedChanges(true)
    
    // Clear path and exit drawing mode
    stopPathDrawing()
    setSelectedTool('puck') // Ensure we're back to default tool
    
    console.log(`Generated ${pathFrames} frames for path animation in ${pathInsertMode} mode`)
  }

  const generateSmoothPath = (points) => {
    if (points.length < 2) return points
    
    const smoothPoints = []
    const tension = 0.5
    
    for (let i = 0; i < points.length - 1; i++) {
      const current = points[i]
      const next = points[i + 1]
      
      // Add current point
      smoothPoints.push(current)
      
      // Add intermediate points for smoothness
      if (i < points.length - 2) {
        const nextNext = points[i + 2]
        for (let j = 1; j <= 5; j++) {
          const t = j / 6
          const x = current.x + (next.x - current.x) * t + 
                   (nextNext.x - current.x) * tension * t * (1 - t)
          const y = current.y + (next.y - current.y) * t + 
                   (nextNext.y - current.y) * tension * t * (1 - t)
          smoothPoints.push({ x, y })
        }
      }
    }
    
    // Add last point
    smoothPoints.push(points[points.length - 1])
    
    return smoothPoints
  }

  const interpolateAlongPath = (path, progress) => {
    if (path.length < 2) return path[0] || { x: 0, y: 0 }
    
    const totalLength = path.length - 1
    const targetIndex = progress * totalLength
    const index1 = Math.floor(targetIndex)
    const index2 = Math.min(index1 + 1, path.length - 1)
    const t = targetIndex - index1
    
    const point1 = path[index1]
    const point2 = path[index2]
    
        return {
      x: point1.x + (point2.x - point1.x) * t,
      y: point1.y + (point2.y - point1.y) * t
    }
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
    console.log('Flip button clicked!')
    console.log('Selected element:', selectedElement)
    console.log('Selected element type:', selectedElement?.type)
    
    if (selectedElement && selectedElement.type.startsWith('dynamic-player-')) {
      const playerId = selectedElement.id
      
      // Handle the case where no frames have been captured yet
      let currentFrame
      if (currentFrameIndex >= 0) {
        // We're editing an existing frame
        currentFrame = currentFrameIndex
      } else if (frames.length > 0) {
        // We have frames but none selected, use the last frame
        currentFrame = frames.length - 1
      } else {
        // No frames captured yet, use frame 0 (will be the first frame)
        currentFrame = 0
      }
      
      console.log('Flipping player:', playerId, 'at frame:', currentFrame)
      
      // Add flip event to history
      setFlipHistory(prev => {
        const playerFlipFrames = prev[playerId] || []
        const newFlipFrames = [...playerFlipFrames, currentFrame]
        const newHistory = {
          ...prev,
          [playerId]: newFlipFrames
        }
        console.log('New flip history:', newHistory)
        return newHistory
      })
      
      setHasUnsavedChanges(true)
      console.log(`Player ${playerId} flipped at frame ${currentFrame}`)
      
      // Force a re-render by updating elements state
      // This ensures the visual flip is immediately visible
      setElements(prev => [...prev])
    } else {
      console.log('No dynamic player selected or invalid element type')
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
    
    // Filter out unwanted elements before saving
    const filteredElements = filterValidElements(elements)
    
    const newFrame = {
      id: Date.now(),
      elements: JSON.parse(JSON.stringify(filteredElements)), // Deep copy of filtered elements
      flipHistory: JSON.parse(JSON.stringify(flipHistory)), // Include flip history
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
      
      // Filter out unwanted elements (like path artifacts)
      const filteredElements = filterValidElements(frameElements)
      
      console.log('Frame elements by type:', filteredElements.reduce((acc, el) => {
        acc[el.type] = (acc[el.type] || 0) + 1
        return acc
      }, {}))
      setElements(filteredElements)
      
      // Don't overwrite flip history when loading frames - it should persist across all frames
      // The flip history is already restored when loading the animation
      
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

  const editFrame = (frameIndex) => {
    if (frameIndex >= 0 && frameIndex < frames.length) {
      // Load the frame to edit
      loadFrame(frameIndex)
      console.log('Editing frame:', frameIndex)
      
      // Show visual feedback that we're in edit mode
      setFrameSavedMessage(`Now editing frame ${frameIndex + 1} - Make changes and click "Save Frame"`)
      setTimeout(() => setFrameSavedMessage(''), 3000)
    }
  }

  const saveFrameChanges = () => {
    if (currentFrameIndex >= 0 && currentFrameIndex < frames.length) {
      // Create a deep copy of current elements and filter out unwanted ones
      const updatedElements = JSON.parse(JSON.stringify(elements))
      const filteredElements = filterValidElements(updatedElements)
      
      // Update the frame with filtered elements
      const updatedFrames = [...frames]
      updatedFrames[currentFrameIndex] = {
        ...updatedFrames[currentFrameIndex],
        elements: filteredElements,
        timestamp: Date.now()
      }
      
      setFrames(updatedFrames)
      setHasUnsavedChanges(true)
      console.log('Frame changes saved:', currentFrameIndex + 1)
      
      // Show success message
      setFrameSavedMessage(`Frame ${currentFrameIndex + 1} saved!`)
      setTimeout(() => setFrameSavedMessage(''), 2000)
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
    
    // Clean up all frames before playing to remove any existing red dots
    const cleanedFrames = frames.map(frame => ({
      ...frame,
      elements: filterValidElements(frame.elements)
    }))
    
    // Update frames with cleaned data
    setFrames(cleanedFrames)
    setHasUnsavedChanges(true)
    
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
      if (frameIndex >= 0 && frameIndex < cleanedFrames.length) {
        const frameElements = JSON.parse(JSON.stringify(cleanedFrames[frameIndex].elements))
        
        // Filter out unwanted elements (like path artifacts)
        const filteredElements = filterValidElements(frameElements)
        
        setElements(filteredElements)
        setCurrentFrameIndex(frameIndex)
        setSelectedElement(null)
      }
      frameIndex = (frameIndex + 1) % cleanedFrames.length
      
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
          const isFlipped = isPlayerFlippedAtFrame(element.id, currentFrameIndex)
          
          if (currentPlayerImage) {
            // Draw the player image
            const imageWidth = currentPlayerImage.width
            const imageHeight = currentPlayerImage.height
            
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
    // Capture the current frame as the start frame
    const startFrameIndex = currentFrameIndex >= 0 ? currentFrameIndex : frames.length - 1
    if (startFrameIndex < 0) {
      alert('Please create at least one frame first!')
      return
    }
    
    setStartFrameIndex(startFrameIndex)
    console.log('Start frame set to frame', startFrameIndex + 1)
  }

  const captureEndFrame = () => {
    // Capture the current frame as the end frame
    const endFrameIndex = currentFrameIndex >= 0 ? currentFrameIndex : frames.length - 1
    if (endFrameIndex < 0) {
      alert('Please create at least one frame first!')
      return
    }
    
    setEndFrameIndex(endFrameIndex)
    console.log('End frame set to frame', endFrameIndex + 1)
  }

  const generateTweenFrames = () => {
    if (startFrameIndex === null || endFrameIndex === null) {
      alert('Please set both start and end frames first!')
      return
    }

    if (startFrameIndex === endFrameIndex) {
      alert('Start and end frames must be different!')
      return
    }

    console.log('Generating', tweenFrames, 'tween frames between frames', startFrameIndex + 1, 'and', endFrameIndex + 1)
    
    const newFrames = []
    const startElements = frames[startFrameIndex].elements
    const endElements = frames[endFrameIndex].elements
    
    for (let i = 1; i <= tweenFrames; i++) {
      const progress = i / (tweenFrames + 1) // Progress from 0 to 1
      const tweenedElements = interpolateElements(startElements, endElements, progress)
      
      const newFrame = {
        id: Date.now() + i,
        elements: tweenedElements,
        timestamp: Date.now() + i,
        frameNumber: `Tween ${i}`
      }
      
      newFrames.push(newFrame)
    }
    
    // Insert the new frames between start and end frames
    const minIndex = Math.min(startFrameIndex, endFrameIndex)
    const maxIndex = Math.max(startFrameIndex, endFrameIndex)
    
    const updatedFrames = [...frames]
    updatedFrames.splice(maxIndex, 0, ...newFrames)
    
    setFrames(updatedFrames)
    setHasUnsavedChanges(true)
    
    console.log('Generated', newFrames.length, 'tween frames inserted between frames', minIndex + 1, 'and', maxIndex + 1)
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
    setStartFrameIndex(null)
    setEndFrameIndex(null)
  }

  const smoothAnimation = () => {
    if (frames.length < 2) {
      alert('Need at least 2 frames to smooth the animation!')
      return
    }

    console.log('Smoothing animation with', frames.length, 'frames')
    
    const newFrames = []
    
    // Go through each pair of consecutive frames and create an intermediate frame
    for (let i = 0; i < frames.length - 1; i++) {
      const currentFrame = frames[i]
      const nextFrame = frames[i + 1]
      
      // Add the current frame as is
      newFrames.push({
        ...currentFrame,
        id: currentFrame.id,
        frameNumber: currentFrame.frameNumber
      })
      
      // Create intermediate frame between current and next
      const intermediateElements = interpolateElements(currentFrame.elements, nextFrame.elements, 0.5)
      
      const intermediateFrame = {
        id: Date.now() + i + 1000, // Unique ID for intermediate frames
        elements: intermediateElements,
        timestamp: Date.now() + i + 1000,
        frameNumber: `${currentFrame.frameNumber} → ${nextFrame.frameNumber}`
      }
      
      newFrames.push(intermediateFrame)
    }
    
    // Add the last frame
    newFrames.push({
      ...frames[frames.length - 1],
      id: frames[frames.length - 1].id,
      frameNumber: frames[frames.length - 1].frameNumber
    })
    
    setFrames(newFrames)
    setHasUnsavedChanges(true)
    
    console.log('Smoothed animation: added', frames.length - 1, 'intermediate frames. Total frames:', newFrames.length)
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
      setFlipHistory({})
      setHasUnsavedChanges(false)

    }
  }

  const cleanAnimationData = () => {
    if (frames.length === 0) {
      alert('No animation data to clean')
      return
    }
    
    // Clean up all frames to remove any red dots or invalid elements
    const cleanedFrames = frames.map(frame => ({
      ...frame,
      elements: filterValidElements(frame.elements)
    }))
    
    setFrames(cleanedFrames)
    setHasUnsavedChanges(true)
    
    // Show success message
    setFrameSavedMessage('Animation data cleaned - red dots removed!')
    setTimeout(() => setFrameSavedMessage(''), 3000)
    
    console.log('Animation data cleaned, removed invalid elements from', frames.length, 'frames')
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

  const loadAvailableAnimations = async () => {
    try {
      setIsLoading(true)
      
      let query = supabase
        .from('media_attachments')
        .select(`
          id,
          title,
          description,
          file_type,
          frame_count,
          frame_rate,
          is_editable,
          created_at,
          drill_media!inner(drill_id),
          session_media!inner(session_id)
        `)
        .eq('is_editable', true)
        .order('created_at', { ascending: false })

      const { data, error } = await query
      if (error) throw error
      
      // Filter animations based on selected type
      let filteredAnimations = data || []
      
      if (loadType === 'drill' && selectedLoadDrillId) {
        filteredAnimations = filteredAnimations.filter(anim => 
          anim.drill_media && anim.drill_media.drill_id === selectedLoadDrillId
        )
      } else if (loadType === 'session' && selectedLoadSessionId) {
        filteredAnimations = filteredAnimations.filter(anim => 
          anim.session_media && anim.session_media.session_id === selectedLoadSessionId
        )
      }
      
      setAvailableAnimations(filteredAnimations)
    } catch (err) {
      console.error('Error loading animations:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const openLoadDialog = async () => {
    await loadAvailableDrills()
    await loadAvailableSessions()
    setShowLoadDialog(true)
  }

  const loadExistingAnimationForDrill = async () => {
    try {
      console.log('Loading existing animation for drill:', drillId)
      
      // Find animation media attachment for this drill through drill_media relationship
      let query = supabase
        .from('media_attachments')
        .select(`
          *,
          drill_media!inner(drill_id)
        `)
        .eq('drill_media.drill_id', drillId)
        .eq('file_type', 'animation')
        .eq('is_editable', true)
        .order('created_at', { ascending: false })
        .limit(1)

      const { data, error } = await query

      if (error) throw error
      
      console.log('Query result:', data)
      
      if (data && data.length > 0) {
        const animationMedia = data[0]
        console.log('Found existing animation:', animationMedia)
        
        // Load the animation data
        if (animationMedia.animation_data_path) {
          await loadAnimationData(animationMedia.animation_data_path)
          console.log('Successfully loaded existing animation data')
        } else {
          console.log('No animation data path found, starting fresh')
        }
      } else {
        console.log('No existing animation found for this drill, starting fresh')
      }
    } catch (err) {
      console.error('Error loading existing animation for drill:', err)
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
      
      // Create complete animation data for restoration
      const animationData = {
        frames: frames,
        frameRate: frameRate,
        canvasWidth: canvasWidth,
        canvasHeight: canvasHeight,
        audioBlob: audioBlob,
        flipHistory: flipHistory, // Include the complete flip history
        metadata: {
          title: saveTitle,
          description: saveDescription,
          created_at: new Date().toISOString(),
          total_frames: frames.length,
          duration_seconds: Math.round(frames.length / frameRate)
        }
      }
      
      // Create JSON blob for animation data
      const animationJsonBlob = new Blob([JSON.stringify(animationData, null, 2)], {
        type: 'application/json'
      })
      
      const timestamp = Date.now()
      
      // Upload WebM video file to Supabase Storage
      const videoFilePath = `media/${timestamp}_${fileName}`
      console.log('Uploading WebM video to path:', videoFilePath)
      
      const { data: videoUploadData, error: videoUploadError } = await supabase.storage
        .from('media')
        .upload(videoFilePath, mediaBlob, {
          contentType: mediaBlob.type,
          cacheControl: '3600'
        })

      if (videoUploadError) {
        console.error('Video upload error:', videoUploadError)
        throw new Error(`Video upload failed: ${videoUploadError.message}`)
      }

      console.log('WebM video uploaded successfully')

      // Upload animation data JSON
      const animationFilePath = `animations/${timestamp}_animation_data.json`
      console.log('Uploading animation data to path:', animationFilePath)
      
      const { data: animationUploadData, error: animationUploadError } = await supabase.storage
        .from('media')
        .upload(animationFilePath, animationJsonBlob, {
          contentType: 'application/json',
          cacheControl: '3600'
        })

      if (animationUploadError) {
        console.error('Animation data upload error:', animationUploadError)
        throw new Error(`Animation data upload failed: ${animationUploadError.message}`)
      }

      console.log('Animation data uploaded successfully')

      // Create TWO separate media attachment records
      
      // 1. WebM Video Record
      const videoMediaData = {
        title: `${saveTitle} (Video)`,
        description: `${saveDescription} - WebM video file`,
        file_type: 'video',
        file_name: fileName,
        file_size: mediaBlob.size,
        mime_type: mediaBlob.type,
        storage_path: videoFilePath,
        duration_seconds: Math.round(frames.length / frameRate),
        frame_count: frames.length,
        frame_rate: frameRate,
        is_editable: false // Video files are not editable
      }

      console.log('Creating WebM video media record:', videoMediaData)

      const { data: videoMediaRecord, error: videoMediaError } = await supabase
        .from('media_attachments')
        .insert(videoMediaData)
        .select()
        .single()

      if (videoMediaError) {
        console.error('Video media record creation error:', videoMediaError)
        throw new Error(`Video media record creation failed: ${videoMediaError.message}`)
      }

      console.log('WebM video media record created:', videoMediaRecord)

      // 2. Animation Data Record
      const animationMediaData = {
        title: `${saveTitle} (Animation Data)`,
        description: `${saveDescription} - Editable animation data`,
        file_type: 'animation',
        file_name: 'animation_data.json',
        file_size: animationJsonBlob.size,
        mime_type: 'application/json',
        storage_path: animationFilePath,
        animation_data_path: animationFilePath,
        duration_seconds: Math.round(frames.length / frameRate),
        frame_count: frames.length,
        frame_rate: frameRate,
        is_editable: true // Animation data is editable
      }

      console.log('Creating animation data media record:', animationMediaData)

      const { data: animationMediaRecord, error: animationMediaError } = await supabase
        .from('media_attachments')
        .insert(animationMediaData)
        .select()
        .single()

      if (animationMediaError) {
        console.error('Animation media record creation error:', animationMediaError)
        throw new Error(`Animation media record creation failed: ${animationMediaError.message}`)
      }

      console.log('Animation data media record created:', animationMediaRecord)

      // Link BOTH media records to drill or session
      if (saveType === 'drill') {
        console.log('Linking both media records to drill:', selectedDrillId)
        
        // Link video
        const { error: videoLinkError } = await supabase
          .from('drill_media')
          .insert({
            drill_id: selectedDrillId,
            media_id: videoMediaRecord.id
          })

        if (videoLinkError) {
          console.error('Video drill link error:', videoLinkError)
          throw new Error(`Video drill linking failed: ${videoLinkError.message}`)
        }

        // Link animation data
        const { error: animationLinkError } = await supabase
          .from('drill_media')
          .insert({
            drill_id: selectedDrillId,
            media_id: animationMediaRecord.id
          })

        if (animationLinkError) {
          console.error('Animation drill link error:', animationLinkError)
          throw new Error(`Animation drill linking failed: ${animationLinkError.message}`)
        }
      } else {
        console.log('Linking both media records to session:', selectedSessionId)
        
        // Link video
        const { error: videoLinkError } = await supabase
          .from('session_media')
          .insert({
            session_id: selectedSessionId,
            media_id: videoMediaRecord.id
          })

        if (videoLinkError) {
          console.error('Video session link error:', videoLinkError)
          throw new Error(`Video session linking failed: ${videoLinkError.message}`)
        }

        // Link animation data
        const { error: animationLinkError } = await supabase
          .from('session_media')
          .insert({
            session_id: selectedSessionId,
            media_id: animationMediaRecord.id
          })

        if (animationLinkError) {
          console.error('Animation session link error:', animationLinkError)
          throw new Error(`Animation session linking failed: ${animationLinkError.message}`)
        }
      }

      console.log('Save completed successfully - both WebM video and animation data saved!')
      alert(`Animation saved successfully to ${saveType}! Both WebM video and editable animation data have been saved.`)
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
    
    // If we're editing an existing drill's animation, pre-select that drill
    if (drillId) {
      setSaveType('drill')
      setSelectedDrillId(drillId)
    }
    
    setShowSaveDialog(true)
  }

  // Load animation data from saved animation
  const loadAnimationData = async (animationDataPath) => {
    try {
      console.log('Loading animation data from:', animationDataPath)
      
      // Download the animation data JSON file
      const { data, error } = await supabase.storage
        .from('media')
        .download(animationDataPath)

      if (error) {
        console.error('Error downloading animation data:', error)
        throw new Error(`Failed to download animation data: ${error.message}`)
      }

      // Parse the JSON data
      const text = await data.text()
      const animationData = JSON.parse(text)
      
      console.log('Loaded animation data:', animationData)

      // Restore the animation state
      setFrames(animationData.frames || [])
      setFrameRate(animationData.frameRate || 5)
      setIsPlaying(false)
      setHasUnsavedChanges(false)
      
      // Restore audio if it exists
      if (animationData.audioBlob) {
        setAudioBlob(animationData.audioBlob)
      }
      
      // Restore flip history - first check animation level, then fall back to frame level
      if (animationData.flipHistory) {
        // Use flip history stored at animation level (newer format)
        setFlipHistory(animationData.flipHistory)
        console.log('Restored flip history from animation level:', animationData.flipHistory)
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
        console.log('Restored flip history from frame level:', latestFlipHistory)
      }
      
      // Load and focus the first frame if frames exist
      if (animationData.frames && animationData.frames.length > 0) {
        setCurrentFrameIndex(0) // Set current frame to first frame
        loadFrame(0)
      } else {
        setCurrentFrameIndex(-1) // No frames, start with no frame selected
      }

      console.log('Animation loaded successfully')
      
    } catch (error) {
      console.error('Error loading animation:', error)
      alert(`Error loading animation: ${error.message}`)
    }
  }

  // Load animation from media attachment
  const loadAnimationFromMedia = async (mediaId) => {
    try {
      console.log('Loading animation from media ID:', mediaId)
      
      // Get the media attachment record
      const { data: mediaRecord, error: mediaError } = await supabase
        .from('media_attachments')
        .select('*')
        .eq('id', mediaId)
        .single()

      if (mediaError) {
        console.error('Error fetching media record:', mediaError)
        throw new Error(`Failed to fetch media record: ${mediaError.message}`)
      }

      if (!mediaRecord.animation_data_path) {
        throw new Error('This media does not contain editable animation data')
      }

      // Load the animation data
      await loadAnimationData(mediaRecord.animation_data_path)
      
    } catch (error) {
      console.error('Error loading animation from media:', error)
      alert(`Error loading animation: ${error.message}`)
    }
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

  // Handler for AI generation
  const handleAIGenerate = async (description) => {
    try {
      console.log('Generating animation for:', description)
      
      // Generate animation using AI
      const animationData = await generateHockeyAnimation(description)
      console.log('AI generated animation:', animationData)
      
      // Determine mode (default to replace if not specified)
      const mode = animationData.mode || 'replace'
      console.log('Animation mode:', mode)
      
      // Set frame rate
      setFrameRate(animationData.frameRate || 5)
      
      // Convert AI frames to our format
      const newFrames = animationData.frames.map((frame, index) => ({
        id: Date.now() + index,
        frameNumber: index + 1,
        elements: [
          // Add puck
          ...(frame.puck ? [{
            id: `puck-${index}`,
            type: 'puck',
            x: frame.puck.x,
            y: frame.puck.y,
            fill: '#000000',
            radius: 8
          }] : []),
          // Add players
          ...frame.players.map(player => ({
            id: player.id,
            type: player.type,
            x: player.x,
            y: player.y,
            fill: player.color,
            stroke: '#ffffff',
            strokeWidth: 2,
            text: player.text
          }))
        ],
        flipHistory: {},
        timestamp: Date.now() + index
      }))
      
      let updatedFrames = []
      
      if (mode === 'replace') {
        // Clear existing data and replace
        setFrames([])
        setElements([])
        setFlipHistory({})
        setCurrentFrameIndex(-1)
        updatedFrames = newFrames
        console.log('Replacing animation with', newFrames.length, 'frames')
      } else if (mode === 'append') {
        // Append to existing frames
        const existingFrames = frames
        const startFrameNumber = existingFrames.length + 1
        const framesWithUpdatedNumbers = newFrames.map((frame, index) => ({
          ...frame,
          frameNumber: startFrameNumber + index
        }))
        updatedFrames = [...existingFrames, ...framesWithUpdatedNumbers]
        console.log('Appending', newFrames.length, 'frames to existing', existingFrames.length, 'frames')
      } else if (mode === 'insert') {
        // Insert at current frame position
        const existingFrames = frames
        const insertPosition = Math.max(0, currentFrameIndex)
        const beforeInsert = existingFrames.slice(0, insertPosition)
        const afterInsert = existingFrames.slice(insertPosition)
        
        const framesWithUpdatedNumbers = newFrames.map((frame, index) => ({
          ...frame,
          frameNumber: insertPosition + index + 1
        }))
        
        // Update frame numbers for frames after insertion
        const updatedAfterInsert = afterInsert.map((frame, index) => ({
          ...frame,
          frameNumber: insertPosition + newFrames.length + index + 1
        }))
        
        updatedFrames = [...beforeInsert, ...framesWithUpdatedNumbers, ...updatedAfterInsert]
        console.log('Inserting', newFrames.length, 'frames at position', insertPosition)
      }
      
      // Set frames
      setFrames(updatedFrames)
      
      // Load appropriate frame
      if (updatedFrames.length > 0) {
        if (mode === 'append') {
          // Load the first new frame (after existing frames)
          const firstNewFrameIndex = frames.length
          setCurrentFrameIndex(firstNewFrameIndex)
          setElements(updatedFrames[firstNewFrameIndex].elements)
        } else if (mode === 'insert') {
          // Load the first inserted frame
          const insertPosition = Math.max(0, currentFrameIndex)
          setCurrentFrameIndex(insertPosition)
          setElements(updatedFrames[insertPosition].elements)
        } else {
          // Replace mode - load first frame
          setCurrentFrameIndex(0)
          setElements(updatedFrames[0].elements)
        }
      }
      
      setHasUnsavedChanges(true)
      console.log('Animation loaded successfully!')
      
    } catch (error) {
      console.error('Error generating animation:', error)
      alert(`Failed to generate animation: ${error.message}`)
    }
  }

  return (
    <div className="relative min-h-screen">
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
                {drillTitle && (
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-500">→</span>
                    <h2 className="text-base md:text-lg font-semibold text-gray-700">{drillTitle}</h2>
                  </div>
                )}
              </div>
              
              {orgId && (
                <button
                  onClick={() => {
                    if (hasUnsavedChanges) {
                      const confirmed = window.confirm(
                        'You have unsaved changes. Are you sure you want to leave? All work will be lost.'
                      )
                      if (confirmed) {
                        navigate(backNavigation.url)
                      }
                    } else {
                      navigate(backNavigation.url)
                    }
                  }}
                  className="text-indigo-600 hover:text-indigo-800 font-medium flex items-center space-x-1 text-sm md:text-base"
                >
                  <span>←</span>
                  <span>
                    {backNavigation.type === 'drills' && 'Back to Drills'}
                    {backNavigation.type === 'drill-details' && 'Back to Drill'}
                    {backNavigation.type === 'organisation' && 'Back to Organisation'}
                  </span>
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
                      onClick={() => {
                        if (tool.id === 'path') {
                          startPathDrawing()
                        } else {
                          setSelectedTool(tool.id)
                        }
                      }}
                      className={`px-3 md:px-4 py-3 md:py-2 rounded-md border-2 transition-colors text-sm md:text-base ${
                        selectedTool === tool.id || (tool.id === 'path' && isPathDrawingMode)
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
                      startFrameIndex !== null 
                        ? 'bg-green-600 text-white' 
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    {startFrameIndex !== null ? `✓ Start: Frame ${startFrameIndex + 1}` : '🎯 Set Start'}
                  </button>
                  <button
                    onClick={captureEndFrame}
                    className={`px-3 py-1 rounded text-xs font-medium ${
                      endFrameIndex !== null 
                        ? 'bg-green-600 text-white' 
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    {endFrameIndex !== null ? `✓ End: Frame ${endFrameIndex + 1}` : '🎯 Set End'}
                  </button>
                  <button
                    onClick={generateTweenFrames}
                    disabled={startFrameIndex === null || endFrameIndex === null}
                    className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white px-3 py-1 rounded text-xs font-medium"
                  >
                    ✨ Generate Tween
                  </button>
                  <button
                    onClick={clearTweenFrames}
                    disabled={startFrameIndex === null && endFrameIndex === null}
                    className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white px-3 py-1 rounded text-xs font-medium"
                  >
                    🗑️ Clear
                  </button>
                  
                  {/* Separator */}
                  <div className="w-px h-6 bg-blue-300 mx-2"></div>
                  
                  {/* Smooth Animation Button */}
                  <button
                    onClick={smoothAnimation}
                    disabled={frames.length < 2}
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white px-3 py-1 rounded text-xs font-medium"
                    title="Add intermediate frames between all existing frames to smooth the animation"
                  >
                    🌊 Smooth Animation
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
                    disabled={!selectedElement}
                    className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white px-3 py-1 rounded text-xs font-medium"
                    title={selectedElement ? `Flip ${selectedElement.type}` : 'Select a player to flip'}
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
                {(startFrameIndex !== null || endFrameIndex !== null) && (
                  <div className="mt-2 text-xs text-blue-600">
                    {startFrameIndex !== null && (
                      <span className="mr-3">
                        Start Frame {startFrameIndex + 1}: {frames[startFrameIndex]?.elements?.length || 0} elements
                      </span>
                    )}
                    {endFrameIndex !== null && (
                      <span>
                        End Frame {endFrameIndex + 1}: {frames[endFrameIndex]?.elements?.length || 0} elements
                      </span>
                    )}
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
                      💡 Drag to reorder • Click to select • ✏️ edit • 📋 duplicate • × delete
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
                            : startFrameIndex === index
                            ? 'border-green-500 bg-green-100 text-green-700'
                            : endFrameIndex === index
                            ? 'border-purple-500 bg-purple-100 text-purple-700'
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
                          className={`flex-1 text-left ${currentFrameIndex === index ? 'bg-blue-100 text-blue-800 font-medium' : ''}`}
                          title="Load this frame"
                        >
                          {frame.frameNumber}
                          {currentFrameIndex === index && (
                            <span className="ml-1 text-xs">(editing)</span>
                          )}
                          {startFrameIndex === index && (
                            <span className="ml-1 text-xs text-green-600">(start)</span>
                          )}
                          {endFrameIndex === index && (
                            <span className="ml-1 text-xs text-purple-600">(end)</span>
                          )}
                        </button>
                        <div className="flex items-center space-x-1 ml-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              editFrame(index)
                            }}
                            className={`${currentFrameIndex === index ? 'text-blue-600 bg-blue-100 rounded px-1' : 'text-green-500 hover:text-green-700'}`}
                            title={currentFrameIndex === index ? "Currently editing this frame" : "Edit frame"}
                          >
                            ✏️
                          </button>
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
                <div className="flex items-center space-x-2">
                  {currentFrameIndex >= 0 && frames.length > 0 && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                      ✏️ Editing Frame {currentFrameIndex + 1}
                    </span>
                  )}
                  <span className="text-xs text-blue-600">
                    {frames.length > 0 ? `Frame ${currentFrameIndex + 1} of ${frames.length}` : 'No frames yet'}
                  </span>
                </div>
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
                
                {/* Save Frame Changes Button - Only show when a frame is selected */}
                {currentFrameIndex >= 0 && frames.length > 0 && (
                  <button
                    onClick={saveFrameChanges}
                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-md text-sm font-medium"
                    title="Save changes to current frame (Ctrl+S)"
                  >
                    💾 Save Frame
                  </button>
                )}
                
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
              
              {/* Frame Saved Message */}
              {frameSavedMessage && (
                <div className="flex justify-center mt-2">
                  <div className="px-3 py-1 bg-green-100 border border-green-300 rounded-md text-sm font-medium text-green-700">
                    {frameSavedMessage}
                  </div>
                </div>
              )}
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
                              onDragEnd={(e) => {
                                if (selectedTool !== 'path') {
                                  handleDragEnd(e, element.id)
                                }
                              }}
                              draggable={selectedTool !== 'path'}
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
                              onDragEnd={(e) => {
                                if (selectedTool !== 'path') {
                                  handleDragEnd(e, element.id)
                                }
                              }}
                              draggable={selectedTool !== 'path'}
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
                              onDragEnd={(e) => {
                                if (selectedTool !== 'path') {
                                  handleDragEnd(e, element.id)
                                }
                              }}
                              draggable={selectedTool !== 'path'}
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
                              onDragEnd={(e) => {
                                if (selectedTool !== 'path') {
                                  handleDragEnd(e, element.id)
                                }
                              }}
                              draggable={selectedTool !== 'path'}
                            />
                          )
                        default:
                          // Handle dynamic player IDs (they start with 'dynamic-player-')
                          if (element.type.startsWith('dynamic-player-')) {
                            // Find the corresponding player in dynamicPlayerTools
                            const dynamicPlayer = dynamicPlayerTools.find(p => p.id === element.type)
                            const currentPlayerImage = dynamicPlayer?.image
                            const isFlipped = isPlayerFlippedAtFrame(element.id, currentFrameIndex)
                            
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
                                  if (selectedTool !== 'path') {
                                    console.log('Dynamic player drag end:', e.target.position())
                                    handleDragEnd(e, element.id)
                                  }
                                }}
                                draggable={selectedTool !== 'path'}
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

                    {/* Path drawing line */}
                    {selectedTool === 'path' && pathPoints.length > 1 && (
                      <Line
                        points={pathPoints.flatMap(point => [point.x, point.y])}
                        stroke="#00ff00"
                        strokeWidth={4}
                        tension={selectedPathPlayer?.type === 'puck' ? 0 : 0.5}
                        lineCap="round"
                        lineJoin="round"
                        dash={[10, 5]}
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
                  onClick={openLoadDialog}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 md:px-4 py-2 md:py-2 rounded-md text-xs md:text-sm flex-1 md:flex-none"
                >
                  📂 Load Animation
                </button>
                <button
                  onClick={cleanAnimationData}
                  className="bg-orange-600 hover:bg-orange-700 text-white px-3 md:px-4 py-2 md:py-2 rounded-md text-xs md:text-sm flex-1 md:flex-none"
                >
                  🧹 Clean Animation
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
                <li>• <strong>Frame Timeline:</strong> Drag frames to reorder, use ✏️ to edit, �� to duplicate, × to delete</li>
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
                    mediaType = 'animation' // Changed from 'video' to 'animation'
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

      {/* Load Dialog Modal */}
      {showLoadDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Load Animation</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Load from
                </label>
                <select
                  value={loadType}
                  onChange={(e) => {
                    setLoadType(e.target.value)
                    setSelectedLoadDrillId('')
                    setSelectedLoadSessionId('')
                    setAvailableAnimations([])
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="drill">Drill</option>
                  <option value="session">Session</option>
                </select>
              </div>

              {loadType === 'drill' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Drill
                  </label>
                  <select
                    value={selectedLoadDrillId}
                    onChange={(e) => {
                      setSelectedLoadDrillId(e.target.value)
                      if (e.target.value) {
                        loadAvailableAnimations()
                      } else {
                        setAvailableAnimations([])
                      }
                    }}
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

              {loadType === 'session' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Session
                  </label>
                  <select
                    value={selectedLoadSessionId}
                    onChange={(e) => {
                      setSelectedLoadSessionId(e.target.value)
                      if (e.target.value) {
                        loadAvailableAnimations()
                      } else {
                        setAvailableAnimations([])
                      }
                    }}
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

              {/* Available Animations List */}
              {availableAnimations.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Available Animations ({availableAnimations.length})
                  </label>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {availableAnimations.map(animation => (
                      <div
                        key={animation.id}
                        className="p-3 border border-gray-200 rounded-md hover:bg-gray-50 cursor-pointer"
                        onClick={() => loadAnimationFromMedia(animation.id)}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-gray-900">{animation.title}</h4>
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                animation.file_type === 'animation' 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-blue-100 text-blue-800'
                              }`}>
                                {animation.file_type === 'animation' ? '🎨 Editable' : '🎥 Video'}
                              </span>
                            </div>
                            {animation.description && (
                              <p className="text-sm text-gray-600 mt-1">{animation.description}</p>
                            )}
                            <div className="flex space-x-4 mt-2 text-xs text-gray-500">
                              <span>📊 {animation.frame_count} frames</span>
                              <span>🎬 {animation.frame_rate} FPS</span>
                              <span>📅 {new Date(animation.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              loadAnimationFromMedia(animation.id)
                            }}
                            className="ml-2 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                          >
                            Load
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {isLoading && (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-sm text-gray-600 mt-2">Loading animations...</p>
                </div>
              )}

              {!isLoading && availableAnimations.length === 0 && (selectedLoadDrillId || selectedLoadSessionId) && (
                <div className="text-center py-4">
                  <p className="text-gray-500">No editable animations found for this {loadType}.</p>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowLoadDialog(false)
                  setSelectedLoadDrillId('')
                  setSelectedLoadSessionId('')
                  setAvailableAnimations([])
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Path Drawing Button */}
      <button
        className="fixed bottom-6 right-20 z-50 bg-green-600 hover:bg-green-700 text-white rounded-full shadow-lg p-4 text-2xl focus:outline-none focus:ring-2 focus:ring-green-400"
        title="Open Path Drawing Tool"
        onClick={() => {
          console.log('Path button clicked!')
          startPathDrawing()
        }}
        style={{ 
          boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
          position: 'fixed',
          bottom: '24px',
          right: '96px',
          zIndex: 9999
        }}
      >
        🛤️
      </button>

      {/* Path Drawing Panel */}
      {showPathPanel && (
        <div className="fixed top-4 right-4 z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4 border border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Path Drawing Tool</h3>
              <button
                onClick={stopPathDrawing}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="text-sm text-gray-600">
                {!selectedPathPlayer ? (
                  <p>1. Click on a player or puck to select them for path animation</p>
                ) : (
                  <p>✅ Element selected: {selectedPathPlayer.type}</p>
                )}
                {selectedPathPlayer && pathPoints.length === 1 && (
                  <p>2. {selectedPathPlayer.type === 'puck' ? 'Click to add path points' : 'Click and drag to draw the path'}</p>
                )}
                {pathPoints.length > 1 && (
                  <p>✅ Path drawn with {pathPoints.length} points</p>
                )}
                {pathInsertMode === 'insert' && (
                  <p>💡 Path will be inserted at frame {currentFrameIndex + 1}</p>
                )}
                {pathInsertMode === 'replace' && (
                  <p>💡 Path will replace frames starting from frame {currentFrameIndex + 1}</p>
                )}
                {pathInsertMode === 'merge' && (
                  <p>💡 Path will merge with existing frames starting from frame {currentFrameIndex + 1}</p>
                )}
              </div>
              
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">Frames:</label>
                <input
                  type="number"
                  min="2"
                  max="50"
                  value={pathFrames}
                  onChange={(e) => setPathFrames(parseInt(e.target.value) || 10)}
                  className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Insert Mode:</label>
                <div className="space-y-1">
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      value="append"
                      checked={pathInsertMode === 'append'}
                      onChange={(e) => setPathInsertMode(e.target.value)}
                      className="text-blue-600"
                    />
                    <span className="text-sm">Append to end</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      value="insert"
                      checked={pathInsertMode === 'insert'}
                      onChange={(e) => setPathInsertMode(e.target.value)}
                      className="text-blue-600"
                    />
                    <span className="text-sm">Insert at current frame</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      value="replace"
                      checked={pathInsertMode === 'replace'}
                      onChange={(e) => setPathInsertMode(e.target.value)}
                      className="text-blue-600"
                    />
                    <span className="text-sm">Replace from current frame</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      value="merge"
                      checked={pathInsertMode === 'merge'}
                      onChange={(e) => setPathInsertMode(e.target.value)}
                      className="text-blue-600"
                    />
                    <span className="text-sm">Merge with existing frames</span>
                  </label>
                </div>
              </div>
              
              <div className="flex space-x-2">
                <button
                  onClick={clearPath}
                  className="flex-1 px-3 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm"
                >
                  Clear Path
                </button>
                <button
                  onClick={generatePathAnimation}
                  disabled={pathPoints.length < 2 || !selectedPathPlayer}
                  className="flex-1 px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 text-sm"
                >
                  Generate Animation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating AI Button */}
      <button
        className="fixed bottom-6 right-6 z-50 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg p-4 text-2xl focus:outline-none focus:ring-2 focus:ring-blue-400"
        title="Open AI Animation Generator"
        onClick={() => {
          console.log('AI button clicked!')
          setShowAIPanel(true)
        }}
        style={{ 
          boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 9999
        }}
      >
        🤖
      </button>

      {/* AI Generator Floating Panel */}
      <AIGeneratorPanel
        open={showAIPanel}
        onClose={() => setShowAIPanel(false)}
        onGenerate={handleAIGenerate}
      />
    </div>
  )
}

export default DrillDesigner 