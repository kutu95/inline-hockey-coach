import React, { useRef, useEffect, useCallback } from 'react'
import { getSportConfig } from '../../../src/lib/sports/config'

/**
 * CanvasRenderer - Sport-aware canvas rendering component
 * Handles drawing field markings, objects, and animations based on sport configuration
 */
const CanvasRenderer = ({ 
  sportId = 'hockey',
  width = 1200,
  height = 600,
  frame = null,
  showFieldMarkings = true,
  showOnionSkin = false,
  onionSkinFrames = 3,
  onionSkinOpacity = 0.3,
  onCanvasReady,
  className = ''
}) => {
  const canvasRef = useRef(null)
  const sportConfig = getSportConfig(sportId)
  
  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    // Set canvas size
    canvas.width = width
    canvas.height = height
    
    // Set background
    ctx.fillStyle = sportConfig.canvas.backgroundColor
    ctx.fillRect(0, 0, width, height)
    
    onCanvasReady?.(canvas, ctx)
  }, [width, height, sportConfig.canvas.backgroundColor, onCanvasReady])
  
  // Render field markings
  const renderFieldMarkings = useCallback((ctx) => {
    if (!showFieldMarkings) return
    
    const markings = sportConfig.markings || []
    
    markings.forEach(marking => {
      switch (marking.type) {
        case 'circle':
          ctx.beginPath()
          ctx.arc(marking.x, marking.y, marking.radius, 0, 2 * Math.PI)
          if (marking.fill && marking.fill !== 'transparent') {
            ctx.fillStyle = marking.fill
            ctx.fill()
          }
          if (marking.stroke) {
            ctx.strokeStyle = marking.stroke
            ctx.lineWidth = marking.strokeWidth || 2
            ctx.stroke()
          }
          break
          
        case 'rect':
          ctx.beginPath()
          ctx.rect(marking.x, marking.y, marking.width, marking.height)
          if (marking.fill && marking.fill !== 'transparent') {
            ctx.fillStyle = marking.fill
            ctx.fill()
          }
          if (marking.stroke) {
            ctx.strokeStyle = marking.stroke
            ctx.lineWidth = marking.strokeWidth || 2
            ctx.stroke()
          }
          break
          
        case 'line':
          ctx.beginPath()
          ctx.moveTo(marking.startX, marking.startY)
          ctx.lineTo(marking.endX, marking.endY)
          if (marking.stroke) {
            ctx.strokeStyle = marking.stroke
            ctx.lineWidth = marking.strokeWidth || 2
            ctx.stroke()
          }
          break
          
        case 'arc':
          ctx.beginPath()
          ctx.arc(marking.x, marking.y, marking.radius, marking.startAngle, marking.endAngle)
          if (marking.stroke) {
            ctx.strokeStyle = marking.stroke
            ctx.lineWidth = marking.strokeWidth || 2
            ctx.stroke()
          }
          break
          
        case 'multiple':
          if (marking.elements) {
            marking.elements.forEach(element => {
              renderFieldMarkings(ctx) // Recursive call for nested elements
            })
          }
          break
      }
    })
  }, [showFieldMarkings, sportConfig.markings])
  
  // Render sport-specific field patterns
  const renderFieldPattern = useCallback((ctx) => {
    const rendering = sportConfig.rendering || {}
    
    if (rendering.grassPattern && sportId === 'soccer') {
      // Draw grass pattern
      ctx.fillStyle = '#4a7c59'
      ctx.fillRect(0, 0, width, height)
      
      // Add grass texture
      ctx.fillStyle = '#3a6b4a'
      for (let i = 0; i < width; i += 20) {
        for (let j = 0; j < height; j += 20) {
          if ((i + j) % 40 === 0) {
            ctx.fillRect(i, j, 10, 10)
          }
        }
      }
    } else if (rendering.woodPattern && sportId === 'basketball') {
      // Draw wood court pattern
      ctx.fillStyle = '#8B4513'
      ctx.fillRect(0, 0, width, height)
      
      // Add wood grain
      ctx.strokeStyle = '#654321'
      ctx.lineWidth = 1
      for (let i = 0; i < width; i += 50) {
        ctx.beginPath()
        ctx.moveTo(i, 0)
        ctx.lineTo(i + Math.random() * 20 - 10, height)
        ctx.stroke()
      }
    }
  }, [sportConfig.rendering, sportId, width, height])
  
  // Render individual element
  const renderElement = useCallback((ctx, element) => {
    if (!element) return
    
    // Save context state
    ctx.save()
    
    try {
      switch (element.type) {
        case 'puck':
        case 'ball':
          ctx.beginPath()
          ctx.arc(element.x, element.y, element.radius || 10, 0, 2 * Math.PI)
          if (element.fill) {
            ctx.fillStyle = element.fill
            ctx.fill()
          }
          if (element.stroke) {
            ctx.strokeStyle = element.stroke
            ctx.lineWidth = element.strokeWidth || 2
            ctx.stroke()
          }
          
          // Add sport-specific patterns
          if (element.pattern === 'soccer-ball') {
            // Simple soccer ball pattern
            ctx.strokeStyle = '#000000'
            ctx.lineWidth = 1
            ctx.beginPath()
            ctx.moveTo(element.x - 5, element.y)
            ctx.lineTo(element.x + 5, element.y)
            ctx.moveTo(element.x, element.y - 5)
            ctx.lineTo(element.x, element.y + 5)
            ctx.stroke()
          } else if (element.pattern === 'basketball') {
            // Simple basketball pattern
            ctx.strokeStyle = '#000000'
            ctx.lineWidth = 2
            ctx.beginPath()
            ctx.arc(element.x, element.y, element.radius * 0.7, 0, Math.PI)
            ctx.stroke()
          }
          break
          
        case 'dynamic-player':
        case 'player':
          ctx.beginPath()
          ctx.arc(element.x, element.y, element.radius || 15, 0, 2 * Math.PI)
          if (element.fill) {
            ctx.fillStyle = element.fill
            ctx.fill()
          }
          if (element.stroke) {
            ctx.strokeStyle = element.stroke
            ctx.lineWidth = element.strokeWidth || 2
            ctx.stroke()
          }
          
          // Draw player number
          if (element.text) {
            ctx.fillStyle = '#FFFFFF'
            ctx.font = '12px Arial'
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.fillText(element.text, element.x, element.y)
          }
          break
          
        case 'goal':
        case 'basket':
          ctx.beginPath()
          ctx.rect(element.x, element.y, element.width || 60, element.height || 40)
          if (element.fill && element.fill !== 'transparent') {
            ctx.fillStyle = element.fill
            ctx.fill()
          }
          if (element.stroke) {
            ctx.strokeStyle = element.stroke
            ctx.lineWidth = element.strokeWidth || 3
            ctx.stroke()
          }
          break
          
        case 'line':
          ctx.beginPath()
          ctx.moveTo(element.startX || element.x, element.startY || element.y)
          ctx.lineTo(element.endX || element.x + 50, element.endY || element.y)
          if (element.stroke) {
            ctx.strokeStyle = element.stroke
            ctx.lineWidth = element.strokeWidth || 2
            ctx.stroke()
          }
          break
          
        case 'cone':
          // Draw triangle for cone
          ctx.beginPath()
          ctx.moveTo(element.x, element.y - element.height / 2)
          ctx.lineTo(element.x - element.width / 2, element.y + element.height / 2)
          ctx.lineTo(element.x + element.width / 2, element.y + element.height / 2)
          ctx.closePath()
          if (element.fill) {
            ctx.fillStyle = element.fill
            ctx.fill()
          }
          if (element.stroke) {
            ctx.strokeStyle = element.stroke
            ctx.lineWidth = element.strokeWidth || 1
            ctx.stroke()
          }
          break
          
        case 'text':
          ctx.fillStyle = element.fill || '#000000'
          ctx.font = element.font || '14px Arial'
          ctx.textAlign = element.align || 'left'
          ctx.textBaseline = element.baseline || 'top'
          ctx.fillText(element.text, element.x, element.y)
          break
          
        default:
          console.warn(`Unknown element type: ${element.type}`)
      }
    } finally {
      // Restore context state
      ctx.restore()
    }
  }, [])
  
  // Render frame elements
  const renderFrameElements = useCallback((ctx, elements, opacity = 1) => {
    if (!elements || elements.length === 0) return
    
    ctx.globalAlpha = opacity
    
    elements.forEach(element => {
      renderElement(ctx, element)
    })
    
    ctx.globalAlpha = 1
  }, [renderElement])
  
  // Main render function
  const render = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height)
    
    // Render field pattern
    renderFieldPattern(ctx)
    
    // Render field markings
    renderFieldMarkings(ctx)
    
    // Render frame elements
    if (frame && frame.elements) {
      renderFrameElements(ctx, frame.elements)
    }
  }, [width, height, frame, renderFieldPattern, renderFieldMarkings, renderFrameElements])
  
  // Render when frame changes
  useEffect(() => {
    render()
  }, [render])
  
  // Expose render function to parent
  React.useImperativeHandle(canvasRef, () => ({
    render,
    getCanvas: () => canvasRef.current,
    getContext: () => canvasRef.current?.getContext('2d')
  }))
  
  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={className}
      style={{ 
        border: '1px solid #ccc',
        borderRadius: '4px',
        display: 'block'
      }}
    />
  )
}

export default React.forwardRef(CanvasRenderer)
