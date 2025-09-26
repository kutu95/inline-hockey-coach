import React, { useState, useRef, useCallback } from 'react'
import { getSportConfig } from '../../../src/lib/sports/config'

/**
 * Core Animation Engine - Sport-agnostic animation management
 * Handles frame management, playback, and basic animation logic
 */
const AnimationEngine = ({ 
  sportId = 'hockey',
  onFrameChange,
  onPlaybackStateChange,
  children 
}) => {
  const sportConfig = getSportConfig(sportId)
  
  // Core animation state
  const [frames, setFrames] = useState([])
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [frameRate, setFrameRate] = useState(sportConfig.animation.defaultFrameRate)
  const [totalFrames, setTotalFrames] = useState(sportConfig.animation.maxFrames)
  
  // Refs for animation control
  const isPlayingRef = useRef(false)
  const animationIntervalRef = useRef(null)
  
  // Frame management
  const addFrame = useCallback((frameData) => {
    const newFrame = {
      id: Date.now() + Math.random(),
      frameNumber: frames.length + 1,
      elements: frameData.elements || [],
      timestamp: Date.now(),
      ...frameData
    }
    
    setFrames(prev => [...prev, newFrame])
    return newFrame
  }, [frames.length])
  
  const updateFrame = useCallback((frameIndex, frameData) => {
    setFrames(prev => prev.map((frame, index) => 
      index === frameIndex ? { ...frame, ...frameData } : frame
    ))
  }, [])
  
  const removeFrame = useCallback((frameIndex) => {
    setFrames(prev => prev.filter((_, index) => index !== frameIndex))
    if (currentFrameIndex >= frameIndex && currentFrameIndex > 0) {
      setCurrentFrameIndex(prev => prev - 1)
    }
  }, [currentFrameIndex])
  
  const duplicateFrame = useCallback((frameIndex) => {
    const frameToDuplicate = frames[frameIndex]
    if (frameToDuplicate) {
      const newFrame = {
        ...frameToDuplicate,
        id: Date.now() + Math.random(),
        frameNumber: frames.length + 1,
        timestamp: Date.now()
      }
      setFrames(prev => [
        ...prev.slice(0, frameIndex + 1),
        newFrame,
        ...prev.slice(frameIndex + 1)
      ])
    }
  }, [frames])
  
  // Animation playback
  const playAnimation = useCallback(() => {
    if (frames.length === 0) return
    
    setIsPlaying(true)
    isPlayingRef.current = true
    
    const playNextFrame = () => {
      if (!isPlayingRef.current) return
      
      setCurrentFrameIndex(prev => {
        const nextIndex = (prev + 1) % frames.length
        onFrameChange?.(frames[nextIndex], nextIndex)
        return nextIndex
      })
      
      animationIntervalRef.current = setTimeout(playNextFrame, 1000 / frameRate)
    }
    
    playNextFrame()
  }, [frames, frameRate, onFrameChange])
  
  const stopAnimation = useCallback(() => {
    setIsPlaying(false)
    isPlayingRef.current = false
    if (animationIntervalRef.current) {
      clearTimeout(animationIntervalRef.current)
      animationIntervalRef.current = null
    }
  }, [])
  
  const pauseAnimation = useCallback(() => {
    stopAnimation()
  }, [stopAnimation])
  
  // Frame navigation
  const goToFrame = useCallback((frameIndex) => {
    if (frameIndex >= 0 && frameIndex < frames.length) {
      setCurrentFrameIndex(frameIndex)
      onFrameChange?.(frames[frameIndex], frameIndex)
    }
  }, [frames, onFrameChange])
  
  const goToFirstFrame = useCallback(() => {
    goToFrame(0)
  }, [goToFrame])
  
  const goToLastFrame = useCallback(() => {
    goToFrame(frames.length - 1)
  }, [goToFrame, frames.length])
  
  const goToPreviousFrame = useCallback(() => {
    const newIndex = currentFrameIndex > 0 ? currentFrameIndex - 1 : frames.length - 1
    goToFrame(newIndex)
  }, [currentFrameIndex, frames.length, goToFrame])
  
  const goToNextFrame = useCallback(() => {
    const newIndex = currentFrameIndex < frames.length - 1 ? currentFrameIndex + 1 : 0
    goToFrame(newIndex)
  }, [currentFrameIndex, frames.length, goToFrame])
  
  // Timeline operations
  const insertFrameAt = useCallback((index, frameData) => {
    const newFrame = {
      id: Date.now() + Math.random(),
      frameNumber: index + 1,
      elements: frameData.elements || [],
      timestamp: Date.now(),
      ...frameData
    }
    
    setFrames(prev => [
      ...prev.slice(0, index),
      newFrame,
      ...prev.slice(index)
    ])
    
    // Update frame numbers
    setFrames(prev => prev.map((frame, idx) => ({
      ...frame,
      frameNumber: idx + 1
    })))
  }, [])
  
  const removeFrameAt = useCallback((index) => {
    setFrames(prev => prev.filter((_, idx) => idx !== index))
    
    // Update frame numbers
    setFrames(prev => prev.map((frame, idx) => ({
      ...frame,
      frameNumber: idx + 1
    })))
    
    if (currentFrameIndex >= index && currentFrameIndex > 0) {
      setCurrentFrameIndex(prev => prev - 1)
    }
  }, [currentFrameIndex])
  
  // Export functionality
  const exportAnimation = useCallback((format = 'json') => {
    const animationData = {
      sportId,
      sportConfig: {
        id: sportConfig.id,
        name: sportConfig.name,
        displayName: sportConfig.displayName
      },
      frameRate,
      totalFrames: frames.length,
      frames: frames.map(frame => ({
        frameNumber: frame.frameNumber,
        elements: frame.elements,
        timestamp: frame.timestamp
      })),
      exportedAt: new Date().toISOString()
    }
    
    if (format === 'json') {
      return JSON.stringify(animationData, null, 2)
    }
    
    return animationData
  }, [sportId, sportConfig, frameRate, frames])
  
  // Import functionality
  const importAnimation = useCallback((animationData) => {
    try {
      const data = typeof animationData === 'string' ? JSON.parse(animationData) : animationData
      
      if (data.sportId && data.sportId !== sportId) {
        console.warn(`Importing animation for ${data.sportId} into ${sportId} editor`)
      }
      
      setFrames(data.frames || [])
      setFrameRate(data.frameRate || sportConfig.animation.defaultFrameRate)
      setCurrentFrameIndex(0)
      
      return true
    } catch (error) {
      console.error('Failed to import animation:', error)
      return false
    }
  }, [sportId, sportConfig])
  
  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      stopAnimation()
    }
  }, [stopAnimation])
  
  // Notify parent of playback state changes
  React.useEffect(() => {
    onPlaybackStateChange?.(isPlaying)
  }, [isPlaying, onPlaybackStateChange])
  
  // Current frame data
  const currentFrame = frames[currentFrameIndex] || null
  
  // Animation engine context value
  const animationContext = {
    // State
    frames,
    currentFrame,
    currentFrameIndex,
    isPlaying,
    frameRate,
    totalFrames,
    sportConfig,
    
    // Frame management
    addFrame,
    updateFrame,
    removeFrame,
    duplicateFrame,
    insertFrameAt,
    removeFrameAt,
    
    // Playback control
    playAnimation,
    stopAnimation,
    pauseAnimation,
    
    // Navigation
    goToFrame,
    goToFirstFrame,
    goToLastFrame,
    goToPreviousFrame,
    goToNextFrame,
    
    // Settings
    setFrameRate,
    setTotalFrames,
    
    // Import/Export
    exportAnimation,
    importAnimation
  }
  
  return (
    <AnimationContext.Provider value={animationContext}>
      {children}
    </AnimationContext.Provider>
  )
}

// Context for sharing animation state
const AnimationContext = React.createContext(null)

// Hook to use animation context
export const useAnimation = () => {
  const context = React.useContext(AnimationContext)
  if (!context) {
    throw new Error('useAnimation must be used within an AnimationEngine')
  }
  return context
}

export default AnimationEngine
