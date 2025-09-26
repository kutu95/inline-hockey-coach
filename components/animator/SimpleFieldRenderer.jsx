import React, { useRef, useEffect } from 'react'
import { getSportConfig } from '../../src/lib/sports/config'

/**
 * SimpleFieldRenderer - Basic field rendering without complex calculations
 */
const SimpleFieldRenderer = ({ 
  sportId = 'hockey',
  width = 600,
  height = 400,
  className = ''
}) => {
  const canvasRef = useRef(null)
  
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    const sportConfig = getSportConfig(sportId)
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height)
    
    // Set background color
    ctx.fillStyle = sportConfig.canvas.backgroundColor
    ctx.fillRect(0, 0, width, height)
    
    // Draw field boundary
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 3
    ctx.strokeRect(10, 10, width - 20, height - 20)
    
    // Draw center line
    ctx.beginPath()
    ctx.moveTo(width / 2, 10)
    ctx.lineTo(width / 2, height - 10)
    ctx.stroke()
    
    // Draw center circle
    ctx.beginPath()
    ctx.arc(width / 2, height / 2, Math.min(width, height) * 0.15, 0, 2 * Math.PI)
    ctx.stroke()
    
    // Add sport-specific elements
    if (sportId === 'hockey') {
      // Draw goal lines
      ctx.strokeStyle = '#ff0000'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(50, 10)
      ctx.lineTo(50, height - 10)
      ctx.moveTo(width - 50, 10)
      ctx.lineTo(width - 50, height - 10)
      ctx.stroke()
      
      // Draw faceoff circles
      ctx.strokeStyle = '#ff0000'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(150, 100, 20, 0, 2 * Math.PI)
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(width - 150, 100, 20, 0, 2 * Math.PI)
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(150, height - 100, 20, 0, 2 * Math.PI)
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(width - 150, height - 100, 20, 0, 2 * Math.PI)
      ctx.stroke()
      
    } else if (sportId === 'soccer') {
      // Draw penalty areas
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 2
      ctx.strokeRect(50, height * 0.3, 80, height * 0.4)
      ctx.strokeRect(width - 130, height * 0.3, 80, height * 0.4)
      
      // Draw goals
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 3
      ctx.strokeRect(30, height * 0.4, 20, height * 0.2)
      ctx.strokeRect(width - 50, height * 0.4, 20, height * 0.2)
      
    } else if (sportId === 'basketball') {
      // Draw three-point lines (simplified)
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(150, height / 2, 120, 0, Math.PI)
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(width - 150, height / 2, 120, 0, Math.PI)
      ctx.stroke()
    }
    
  }, [sportId, width, height])
  
  return (
    <div className={`simple-field-renderer ${className}`}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="border border-gray-300 rounded-lg shadow-lg"
        style={{ display: 'block' }}
      />
    </div>
  )
}

export default SimpleFieldRenderer
