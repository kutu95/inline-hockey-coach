import React, { useRef, useEffect, useCallback } from 'react'
import { getSportConfig } from '../../src/lib/sports/config'

/**
 * FieldRenderer - Renders sport-specific fields/courts with markings
 */
const FieldRenderer = ({ 
  sportId = 'hockey',
  width = 800,
  height = 400,
  showMarkings = true,
  className = ''
}) => {
  const canvasRef = useRef(null)
  const sportConfig = getSportConfig(sportId)
  
  // Calculate field scaling to fit canvas
  const fieldAspectRatio = sportConfig.field.width / sportConfig.field.height
  const canvasAspectRatio = width / height
  
  let fieldWidth, fieldHeight, fieldX, fieldY
  
  if (fieldAspectRatio > canvasAspectRatio) {
    // Field is wider than canvas
    fieldWidth = width * 0.9
    fieldHeight = fieldWidth / fieldAspectRatio
  } else {
    // Field is taller than canvas
    fieldHeight = height * 0.9
    fieldWidth = fieldHeight * fieldAspectRatio
  }
  
  fieldX = (width - fieldWidth) / 2
  fieldY = (height - fieldHeight) / 2
  
  // Render field markings
  const renderFieldMarkings = useCallback((ctx) => {
    if (!showMarkings || !sportConfig.markings) return
    
    const scaleX = fieldWidth / sportConfig.field.width
    const scaleY = fieldHeight / sportConfig.field.height
    
    sportConfig.markings.forEach(marking => {
      ctx.save()
      
      switch (marking.type) {
        case 'circle':
          const centerX = fieldX + (marking.x / 100) * fieldWidth
          const centerY = fieldY + (marking.y / 100) * fieldHeight
          const radius = (marking.radius / 100) * Math.min(fieldWidth, fieldHeight)
          
          ctx.beginPath()
          ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI)
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
          const rectX = fieldX + (marking.x / 100) * fieldWidth
          const rectY = fieldY + (marking.y / 100) * fieldHeight
          const rectWidth = (marking.width / 100) * fieldWidth
          const rectHeight = (marking.height / 100) * fieldHeight
          
          ctx.beginPath()
          ctx.rect(rectX, rectY, rectWidth, rectHeight)
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
          const startX = fieldX + (marking.startX / 100) * fieldWidth
          const startY = fieldY + (marking.startY / 100) * fieldHeight
          const endX = fieldX + (marking.endX / 100) * fieldWidth
          const endY = fieldY + (marking.endY / 100) * fieldHeight
          
          ctx.beginPath()
          ctx.moveTo(startX, startY)
          ctx.lineTo(endX, endY)
          if (marking.stroke) {
            ctx.strokeStyle = marking.stroke
            ctx.lineWidth = marking.strokeWidth || 2
            ctx.stroke()
          }
          break
          
        case 'arc':
          const arcX = fieldX + (marking.x / 100) * fieldWidth
          const arcY = fieldY + (marking.y / 100) * fieldHeight
          const arcRadius = (marking.radius / 100) * Math.min(fieldWidth, fieldHeight)
          
          ctx.beginPath()
          ctx.arc(arcX, arcY, arcRadius, marking.startAngle, marking.endAngle)
          if (marking.stroke) {
            ctx.strokeStyle = marking.stroke
            ctx.lineWidth = marking.strokeWidth || 2
            ctx.stroke()
          }
          break
          
        case 'multiple':
          if (marking.elements) {
            marking.elements.forEach(element => {
              // Recursive rendering for nested elements
              renderFieldMarkings(ctx)
            })
          }
          break
      }
      
      ctx.restore()
    })
  }, [sportConfig.markings, fieldX, fieldY, fieldWidth, fieldHeight, showMarkings])
  
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
    } else {
      // Default solid background
      ctx.fillStyle = sportConfig.canvas.backgroundColor
      ctx.fillRect(0, 0, width, height)
    }
  }, [sportConfig.rendering, sportConfig.canvas.backgroundColor, sportId, width, height])
  
  // Draw field boundary
  const renderFieldBoundary = useCallback((ctx) => {
    ctx.strokeStyle = sportConfig.rendering?.lineColor || '#ffffff'
    ctx.lineWidth = sportConfig.rendering?.lineWidth || 2
    ctx.strokeRect(fieldX, fieldY, fieldWidth, fieldHeight)
    
    // Draw center line
    if (sportId === 'hockey' || sportId === 'soccer') {
      ctx.beginPath()
      ctx.moveTo(fieldX + fieldWidth / 2, fieldY)
      ctx.lineTo(fieldX + fieldWidth / 2, fieldY + fieldHeight)
      ctx.stroke()
    }
  }, [sportConfig.rendering, fieldX, fieldY, fieldWidth, fieldHeight, sportId])
  
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
    
    // Render field boundary
    renderFieldBoundary(ctx)
    
    // Render field markings
    renderFieldMarkings(ctx)
  }, [width, height, renderFieldPattern, renderFieldBoundary, renderFieldMarkings])
  
  // Render when sport changes
  useEffect(() => {
    render()
  }, [render, sportId])
  
  return (
    <div className={`field-renderer ${className}`}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="border border-gray-300 rounded-lg shadow-lg"
        style={{ display: 'block' }}
      />
      <div className="mt-2 text-center text-sm text-gray-600">
        {sportConfig.displayName} Field ({sportConfig.field.width}m × {sportConfig.field.height}m)
      </div>
    </div>
  )
}

export default FieldRenderer
