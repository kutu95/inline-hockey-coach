import React, { useState, useRef, useEffect } from 'react'
import { Stage, Layer, Rect, Circle, Line, Text, Arrow, Shape, Image, Group } from 'react-konva'
import JSZip from 'jszip'
import { supabase } from '../src/lib/supabase'
import { Link, useParams } from 'react-router-dom'

const DrillDesigner = () => {
  const { orgId } = useParams()
  const [selectedTool, setSelectedTool] = useState('puck')
  const [selectedColor, setSelectedColor] = useState('#FF0000')
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
  
  const stageRef = useRef()
  const animationRef = useRef()
  const audioChunksRef = useRef([])
  
  // Player image states
  const [playerImage, setPlayerImage] = useState(null)
  const [playerImage2, setPlayerImage2] = useState(null)
  const [playerImage3, setPlayerImage3] = useState(null)
  const [playerImage4, setPlayerImage4] = useState(null)
  const [goalieImage, setGoalieImage] = useState(null)
  const [goalieImage2, setGoalieImage2] = useState(null)

  // Load player images
  useEffect(() => {
    const image1 = new window.Image()
    image1.onload = () => {
      setPlayerImage(image1)
    }
    image1.src = '/images/player-silhouette.png'

    const image2 = new window.Image()
    image2.onload = () => {
      setPlayerImage2(image2)
    }
    image2.src = '/images/player-silhouette2.png'

    const image3 = new window.Image()
    image3.onload = () => {
      setPlayerImage3(image3)
    }
    image3.src = '/images/player-silhouette3.png'

    const image4 = new window.Image()
    image4.onload = () => {
      setPlayerImage4(image4)
    }
    image4.src = '/images/player-silhouette4.png'

    const goalie1 = new window.Image()
    goalie1.onload = () => {
      setGoalieImage(goalie1)
    }
    goalie1.src = '/images/goalie-silhouette.png'

    const goalie2 = new window.Image()
    goalie2.onload = () => {
      setGoalieImage2(goalie2)
    }
    goalie2.src = '/images/goalie-silhouette2.png'
  }, [])

  // Mobile responsiveness detection
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      setCanvasScale(mobile ? 0.6 : 1)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Load available drills and sessions
  useEffect(() => {
    loadAvailableDrills()
    loadAvailableSessions()
  }, [orgId])

  // Player Image Component
  const PlayerImage = ({ x, y, fill, stroke, strokeWidth, isSelected, onClick, onDragEnd, draggable }) => {
    console.log('PlayerImage render:', { x, y, isSelected, draggable, hasImage: !!playerImage })
    
    // Temporary: Use circle for testing drag
    return (
      <Circle
        x={x}
        y={y}
        radius={25}
        fill={isSelected ? '#00ff00' : '#ff0000'}
        stroke={isSelected ? '#00ff00' : stroke}
        strokeWidth={isSelected ? 4 : strokeWidth}
        onClick={onClick}
        onDragStart={(e) => {
          console.log('PlayerImage drag start:', e.target.position())
        }}
        onDragMove={(e) => {
          console.log('PlayerImage drag move:', e.target.position())
        }}
        onDragEnd={(e) => {
          console.log('PlayerImage drag end:', e.target.position())
          if (onDragEnd) {
            onDragEnd(e)
          }
        }}
        draggable={draggable}
      />
    )
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

  // Tool options
  const tools = [
    { id: 'puck', label: 'Puck', icon: '●' },
    { id: 'arrow', label: 'Arrow', icon: '→' },
    { id: 'text', label: 'Text', icon: 'T' },
    { id: 'player', label: 'Player 1', icon: '🏒', image: playerImage },
    { id: 'player2', label: 'Player 2', icon: '🏒', image: playerImage2 },
    { id: 'player3', label: 'Player 3', icon: '🏒', image: playerImage3 },
    { id: 'player4', label: 'Player 4', icon: '🏒', image: playerImage4 },
    { id: 'goalie', label: 'Goalie 1', icon: '🏒', image: goalieImage },
    { id: 'goalie2', label: 'Goalie 2', icon: '🏒', image: goalieImage2 },
    { id: 'draw', label: 'Draw', icon: '✏️' }
  ]

  // Color options
  const colors = [
    '#ff0000', '#00ff00', '#000000', '#ffffff', '#000080'
  ]

  const addElement = (type, x, y) => {
    const newElement = {
      id: Date.now(),
      type,
      x,
      y,
      ...getDefaultProperties(type)
    }
    setElements([...elements, newElement])
  }

  const getDefaultProperties = (type) => {
    switch (type) {
      case 'puck':
        return { radius: 8, fill: '#000000' }
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
      case 'player':
      case 'player2':
      case 'player3':
      case 'player4':
      case 'goalie':
      case 'goalie2':
        return { 
          fill: selectedColor,
          stroke: '#ffffff',
          strokeWidth: 2
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
        return {}
    }
  }

  const handleStageClick = (e) => {
    // Only add element if clicking on the stage itself, not on elements
    if (e.target === e.target.getStage()) {
      const pos = e.target.getStage().getPointerPosition()
      console.log('Adding element:', selectedTool, 'at position:', pos)
      addElement(selectedTool, pos.x, pos.y)
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
  }

  const deleteSelectedElement = () => {
    if (selectedElement) {
      setElements(elements.filter(el => el.id !== selectedElement.id))
      setSelectedElement(null)
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

  const playAnimation = () => {
    console.log('Play animation called, frames.length:', frames.length)
    if (frames.length === 0) {
      console.log('No frames to play')
      return
    }
    
    console.log('Starting animation with frameRate:', frameRate)
    setIsPlaying(true)
    let frameIndex = 0
    
    const playNextFrame = () => {
      console.log('playNextFrame called, frameIndex:', frameIndex, 'isPlayingRef.current:', isPlayingRef.current)
      if (!isPlayingRef.current) {
        console.log('Animation stopped')
        return
      }
      
      console.log('Loading frame:', frameIndex)
      loadFrame(frameIndex)
      frameIndex = (frameIndex + 1) % frames.length
      
      setTimeout(playNextFrame, 1000 / frameRate)
    }
    
    playNextFrame()
  }

  const stopAnimation = () => {
    setIsPlaying(false)
    isPlayingRef.current = false
  }

  const exportAnimation = async () => {
    if (frames.length === 0) return

    if (exportFormat === 'image') {
      // Export current frame as image
      const canvas = document.createElement('canvas')
      canvas.width = rinkWidth
      canvas.height = rinkHeight
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
          canvas.width = rinkWidth
          canvas.height = rinkHeight
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
      canvas.width = rinkWidth
      canvas.height = rinkHeight
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
          ctx.arc(mToPx(14), mToPxY(5), mToPx(2.25), 0, 2 * Math.PI)
          ctx.stroke()
          
          ctx.beginPath()
          ctx.arc(canvas.width - mToPx(14), mToPxY(5), mToPx(2.25), 0, 2 * Math.PI)
          ctx.stroke()
          
          ctx.beginPath()
          ctx.arc(mToPx(14), canvas.height - mToPxY(5), mToPx(2.25), 0, 2 * Math.PI)
          ctx.stroke()
          
          ctx.beginPath()
          ctx.arc(canvas.width - mToPx(14), canvas.height - mToPxY(5), mToPx(2.25), 0, 2 * Math.PI)
          ctx.stroke()
          
          // Hash Marks at Face-off Circles
          ctx.fillStyle = lineColor
          
          // Top Left Face-off Circle
          ctx.fillRect(mToPx(14) - mToPx(0.3), mToPxY(5) - mToPxY(0.3), mToPx(0.6), mToPxY(0.6))
          
          // Top Right Face-off Circle
          ctx.fillRect(canvas.width - mToPx(14) - mToPx(0.3), mToPxY(5) - mToPxY(0.3), mToPx(0.6), mToPxY(0.6))
          
          // Bottom Left Face-off Circle
          ctx.fillRect(mToPx(14) - mToPx(0.3), canvas.height - mToPxY(5) - mToPxY(0.3), mToPx(0.6), mToPxY(0.6))
          
          // Bottom Right Face-off Circle
          ctx.fillRect(canvas.width - mToPx(14) - mToPx(0.3), canvas.height - mToPxY(5) - mToPxY(0.3), mToPx(0.6), mToPxY(0.6))
          
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
          ctx.arc(mToPx(14), mToPxY(5), mToPx(2.25), 0, 2 * Math.PI)
          ctx.stroke()
          
          ctx.beginPath()
          ctx.arc(canvas.width - mToPx(14), mToPxY(5), mToPx(2.25), 0, 2 * Math.PI)
          ctx.stroke()
          
          ctx.beginPath()
          ctx.arc(mToPx(14), canvas.height - mToPxY(5), mToPx(2.25), 0, 2 * Math.PI)
          ctx.stroke()
          
          ctx.beginPath()
          ctx.arc(canvas.width - mToPx(14), canvas.height - mToPxY(5), mToPx(2.25), 0, 2 * Math.PI)
          ctx.stroke()
          
          // Hash Marks at Face-off Circles
          ctx.fillStyle = lineColor
          
          // Top Left Face-off Circle
          ctx.fillRect(mToPx(14) - mToPx(0.3), mToPxY(5) - mToPxY(0.3), mToPx(0.6), mToPxY(0.6))
          
          // Top Right Face-off Circle
          ctx.fillRect(canvas.width - mToPx(14) - mToPx(0.3), mToPxY(5) - mToPxY(0.3), mToPx(0.6), mToPxY(0.6))
          
          // Bottom Left Face-off Circle
          ctx.fillRect(mToPx(14) - mToPx(0.3), canvas.height - mToPxY(5) - mToPxY(0.3), mToPx(0.6), mToPxY(0.6))
          
          // Bottom Right Face-off Circle
          ctx.fillRect(canvas.width - mToPx(14) - mToPx(0.3), canvas.height - mToPxY(5) - mToPxY(0.3), mToPx(0.6), mToPxY(0.6))
          
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
        
      case 'player':
      case 'player2':
      case 'player3':
      case 'player4':
      case 'goalie':
      case 'goalie2':
        // Get the appropriate player image
        const playerImageMap = {
          'player': playerImage,
          'player2': playerImage2,
          'player3': playerImage3,
          'player4': playerImage4,
          'goalie': goalieImage,
          'goalie2': goalieImage2
        }
        const currentPlayerImage = playerImageMap[element.type]
        
        if (currentPlayerImage) {
          // Draw the player image
          const imageWidth = currentPlayerImage.width
          const imageHeight = currentPlayerImage.height
          ctx.drawImage(
            currentPlayerImage,
            element.x - imageWidth / 2,
            element.y - imageHeight / 2,
            imageWidth,
            imageHeight
          )
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
    canvas.width = rinkWidth
    canvas.height = rinkHeight
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
        ctx.arc(mToPx(14), mToPxY(5), mToPx(2.25), 0, 2 * Math.PI)
        ctx.stroke()
        
        ctx.beginPath()
        ctx.arc(canvas.width - mToPx(14), mToPxY(5), mToPx(2.25), 0, 2 * Math.PI)
        ctx.stroke()
        
        ctx.beginPath()
        ctx.arc(mToPx(14), canvas.height - mToPxY(5), mToPx(2.25), 0, 2 * Math.PI)
        ctx.stroke()
        
        ctx.beginPath()
        ctx.arc(canvas.width - mToPx(14), canvas.height - mToPxY(5), mToPx(2.25), 0, 2 * Math.PI)
        ctx.stroke()
        
        // Hash Marks at Face-off Circles
        ctx.fillStyle = lineColor
        
        // Top Left Face-off Circle
        ctx.fillRect(mToPx(14) - mToPx(0.3), mToPxY(5) - mToPxY(0.3), mToPx(0.6), mToPxY(0.6))
        
        // Top Right Face-off Circle
        ctx.fillRect(canvas.width - mToPx(14) - mToPx(0.3), mToPxY(5) - mToPxY(0.3), mToPx(0.6), mToPxY(0.6))
        
        // Bottom Left Face-off Circle
        ctx.fillRect(mToPx(14) - mToPx(0.3), canvas.height - mToPxY(5) - mToPxY(0.3), mToPx(0.6), mToPxY(0.6))
        
        // Bottom Right Face-off Circle
        ctx.fillRect(canvas.width - mToPx(14) - mToPx(0.3), canvas.height - mToPxY(5) - mToPxY(0.3), mToPx(0.6), mToPxY(0.6))
        
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
      canvas.width = rinkWidth
      canvas.height = rinkHeight
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
      ctx.arc(mToPx(14), mToPxY(5), mToPx(2.25), 0, 2 * Math.PI)
      ctx.stroke()
      
      ctx.beginPath()
      ctx.arc(canvas.width - mToPx(14), mToPxY(5), mToPx(2.25), 0, 2 * Math.PI)
      ctx.stroke()
      
      ctx.beginPath()
      ctx.arc(mToPx(14), canvas.height - mToPxY(5), mToPx(2.25), 0, 2 * Math.PI)
      ctx.stroke()
      
      ctx.beginPath()
      ctx.arc(canvas.width - mToPx(14), canvas.height - mToPxY(5), mToPx(2.25), 0, 2 * Math.PI)
      ctx.stroke()
      
      // Hash Marks at Face-off Circles
      ctx.fillStyle = lineColor
      
      // Top Left Face-off Circle
      ctx.fillRect(mToPx(14) - mToPx(0.3), mToPxY(5) - mToPxY(0.3), mToPx(0.6), mToPxY(0.6))
      
      // Top Right Face-off Circle
      ctx.fillRect(canvas.width - mToPx(14) - mToPx(0.3), mToPxY(5) - mToPxY(0.3), mToPx(0.6), mToPxY(0.6))
      
      // Bottom Left Face-off Circle
      ctx.fillRect(mToPx(14) - mToPx(0.3), canvas.height - mToPxY(5) - mToPxY(0.3), mToPx(0.6), mToPxY(0.6))
      
      // Bottom Right Face-off Circle
      ctx.fillRect(canvas.width - mToPx(14) - mToPx(0.3), canvas.height - mToPxY(5) - mToPxY(0.3), mToPx(0.6), mToPxY(0.6))
      
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
    canvas.width = rinkWidth
    canvas.height = rinkHeight
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
      ctx.arc(mToPx(14), mToPxY(5), mToPx(2.25), 0, 2 * Math.PI)
      ctx.stroke()
      
      ctx.beginPath()
      ctx.arc(canvas.width - mToPx(14), mToPxY(5), mToPx(2.25), 0, 2 * Math.PI)
      ctx.stroke()
      
      ctx.beginPath()
      ctx.arc(mToPx(14), canvas.height - mToPxY(5), mToPx(2.25), 0, 2 * Math.PI)
      ctx.stroke()
      
      ctx.beginPath()
      ctx.arc(canvas.width - mToPx(14), canvas.height - mToPxY(5), mToPx(2.25), 0, 2 * Math.PI)
      ctx.stroke()
      
      // Hash Marks at Face-off Circles
      ctx.fillStyle = lineColor
      
      // Top Left Face-off Circle
      ctx.fillRect(mToPx(14) - mToPx(0.3), mToPxY(5) - mToPxY(0.3), mToPx(0.6), mToPxY(0.6))
      
      // Top Right Face-off Circle
      ctx.fillRect(canvas.width - mToPx(14) - mToPx(0.3), mToPxY(5) - mToPxY(0.3), mToPx(0.6), mToPxY(0.6))
      
      // Bottom Left Face-off Circle
      ctx.fillRect(mToPx(14) - mToPx(0.3), canvas.height - mToPxY(5) - mToPxY(0.3), mToPx(0.6), mToPxY(0.6))
      
      // Bottom Right Face-off Circle
      ctx.fillRect(canvas.width - mToPx(14) - mToPx(0.3), canvas.height - mToPxY(5) - mToPxY(0.3), mToPx(0.6), mToPxY(0.6))
      
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
              <h1 className="text-lg md:text-2xl font-bold text-gray-900">Drill Designer</h1>
            </div>
            
            {orgId && (
              <Link
                to={`/organisations/${orgId}`}
                className="text-indigo-600 hover:text-indigo-800 font-medium flex items-center space-x-1 text-sm md:text-base"
              >
                <span>←</span>
                <span>Back to Organisation</span>
              </Link>
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

          {/* Toolbar - Responsive */}
          <div className={`${isMobile && !showMobileMenu ? 'hidden' : ''} mb-4 p-3 md:p-4 bg-gray-50 rounded-lg`}>
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
            </div>
          </div>

          {/* Color Picker - Responsive */}
          <div className={`${isMobile && !showMobileMenu ? 'hidden' : ''} flex flex-col md:flex-row md:items-center space-y-2 md:space-y-0 md:space-x-4 mb-4 p-3 md:p-4 bg-gray-50 rounded-lg`}>
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

          {/* Animation Controls - Mobile Responsive */}
          <div className={`${isMobile && !showMobileMenu ? 'hidden' : ''} mb-4 p-3 md:p-4 bg-blue-50 rounded-lg`}>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-3 space-y-2 md:space-y-0">
              <h3 className="font-semibold text-blue-900 text-sm md:text-base">Animation Controls</h3>
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
                onClick={captureFrame}
                className="bg-purple-600 hover:bg-purple-700 text-white px-3 md:px-4 py-2 md:py-2 rounded-md text-xs md:text-sm flex-1 md:flex-none"
              >
                📸 Capture Frame ({frames.length + 1})
              </button>
              <button
                onClick={playAnimation}
                disabled={frames.length === 0 || isPlaying}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-3 md:px-4 py-2 md:py-2 rounded-md text-xs md:text-sm flex-1 md:flex-none"
              >
                ▶️ Play
              </button>
              <button
                onClick={stopAnimation}
                disabled={!isPlaying}
                className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-3 md:px-4 py-2 md:py-2 rounded-md text-xs md:text-sm flex-1 md:flex-none"
              >
                ⏹️ Stop
              </button>
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
            </div>

            {/* Audio Recording Controls */}
            <div className="border-t border-blue-200 pt-3 mb-3">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-blue-800">Audio Commentary</h4>
                {audioBlob && (
                  <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                    ✓ Audio recorded
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={isRecordingAudio ? stopAudioRecording : startAudioRecording}
                  className={`px-4 py-2 rounded-md text-sm font-medium ${
                    isRecordingAudio
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
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
                    <span className="text-xs text-blue-600">
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
                </div>
                <div className="flex flex-wrap gap-2 overflow-y-auto max-h-32 pb-2">
                  {frames.map((frame, index) => (
                    <button
                      key={frame.id}
                      onClick={() => loadFrame(index)}
                      className={`flex-shrink-0 px-3 py-2 rounded border-2 text-xs font-medium transition-colors ${
                        currentFrameIndex === index
                          ? 'border-blue-500 bg-blue-100 text-blue-700'
                          : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      {frame.frameNumber}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteFrame(index)
                        }}
                        className="ml-2 text-red-500 hover:text-red-700"
                        title="Delete frame"
                      >
                        ×
                      </button>
                    </button>
                  ))}
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
                    y={mToPxY(5)}
                    radius={mToPx(2.25)}
                    stroke={lineColor}
                    strokeWidth={3}
                    listening={false}
                  />
                  <Circle
                    x={canvasWidth - mToPx(14)}
                    y={mToPxY(5)}
                    radius={mToPx(2.25)}
                    stroke={lineColor}
                    strokeWidth={3}
                    listening={false}
                  />
                  <Circle
                    x={mToPx(14)}
                    y={canvasHeight - mToPxY(5)}
                    radius={mToPx(2.25)}
                    stroke={lineColor}
                    strokeWidth={3}
                    listening={false}
                  />
                  <Circle
                    x={canvasWidth - mToPx(14)}
                    y={canvasHeight - mToPxY(5)}
                    radius={mToPx(2.25)}
                    stroke={lineColor}
                    strokeWidth={3}
                    listening={false}
                  />

                  {/* Hash Marks at Face-off Circles */}
                  {/* Top Left Face-off Circle */}
                  <Rect
                    x={mToPx(14) - mToPx(0.3)}
                    y={mToPxY(5) - mToPxY(0.3)}
                    width={mToPx(0.6)}
                    height={mToPxY(0.6)}
                    fill={lineColor}
                    listening={false}
                  />

                  {/* Top Right Face-off Circle */}
                  <Rect
                    x={canvasWidth - mToPx(14) - mToPx(0.3)}
                    y={mToPxY(5) - mToPxY(0.3)}
                    width={mToPx(0.6)}
                    height={mToPxY(0.6)}
                    fill={lineColor}
                    listening={false}
                  />

                  {/* Bottom Left Face-off Circle */}
                  <Rect
                    x={mToPx(14) - mToPx(0.3)}
                    y={canvasHeight - mToPxY(5) - mToPxY(0.3)}
                    width={mToPx(0.6)}
                    height={mToPxY(0.6)}
                    fill={lineColor}
                    listening={false}
                  />

                  {/* Bottom Right Face-off Circle */}
                  <Rect
                    x={canvasWidth - mToPx(14) - mToPx(0.3)}
                    y={canvasHeight - mToPxY(5) - mToPxY(0.3)}
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
                      case 'player':
                      case 'player2':
                      case 'player3':
                      case 'player4':
                      case 'goalie':
                      case 'goalie2':
                        const playerImageMap = {
                          'player': playerImage,
                          'player2': playerImage2,
                          'player3': playerImage3,
                          'player4': playerImage4,
                          'goalie': goalieImage,
                          'goalie2': goalieImage2
                        }
                        const currentPlayerImage = playerImageMap[element.type]
                        
                        return (
                          <Group
                            key={element.id}
                            x={element.x}
                            y={element.y}
                            onClick={() => handleElementClick(element)}
                            onDragStart={(e) => {
                              console.log('Player drag start:', e.target.position())
                            }}
                            onDragMove={(e) => {
                              console.log('Player drag move:', e.target.position())
                            }}
                            onDragEnd={(e) => {
                              console.log('Player drag end:', e.target.position())
                              handleDragEnd(e, element.id)
                            }}
                            draggable={true}
                          >
                            {currentPlayerImage && (
                              <Image
                                image={currentPlayerImage}
                                x={-currentPlayerImage.width / 2}
                                y={-currentPlayerImage.height / 2}
                                width={currentPlayerImage.width}
                                height={currentPlayerImage.height}
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
              <li>• Choose a color from the color picker</li>
              <li>• Click on empty space on the rink to add elements (except for Draw tool)</li>
              <li>• <strong>For freehand drawing:</strong> Select the Draw tool, then click and drag to draw</li>
              <li>• Click and drag elements to reposition them</li>
              <li>• Click on elements to select them (green outline)</li>
              <li>• <strong>Double-click on text elements to edit them</strong></li>
              <li>• <strong>Use the Duplicate button to copy selected elements</strong></li>
              <li>• Use the Delete Selected button to remove elements</li>
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