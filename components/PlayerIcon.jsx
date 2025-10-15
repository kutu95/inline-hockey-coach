import React from 'react'
import './PlayerIcon.css'

const PlayerIcon = ({ 
  jerseyNumber, 
  teamSide, 
  size = 40, 
  className = '',
  onClick = null,
  playerName = null 
}) => {
  const isHome = teamSide === 'home'
  
  // Color scheme based on team side - inspired by the soccer jersey design
  const colors = isHome ? {
    jersey: '#ffdd00', // Golden yellow
    accent: '#006600', // Dark green
    number: '#006600', // Dark green
    pattern: '#ffcc00', // Slightly darker yellow for pattern
    collar: '#006600', // Dark green collar
    sidePanel: '#006600' // Dark green side panels
  } : {
    jersey: '#0066cc', // Blue
    accent: '#ffffff', // White
    number: '#ffffff', // White
    pattern: '#004499', // Darker blue for pattern
    collar: '#ffffff', // White collar
    sidePanel: '#ffffff' // White side panels
  }

  return (
    <div 
      className={`player-icon ${className}`}
      style={{ 
        width: size, 
        height: size, 
        cursor: onClick ? 'pointer' : 'default',
        display: 'inline-block',
        position: 'relative'
      }}
      onClick={onClick}
      title={playerName ? `${playerName} #${jerseyNumber}` : `#${jerseyNumber}`}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Jersey background with marble-like pattern */}
        <defs>
          <pattern id={`jerseyPattern-${teamSide}`} x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
            {/* Marble-like swirl pattern */}
            <path d="M2,2 Q4,1 6,3 Q5,5 3,6 Q1,5 2,2" fill={colors.pattern} opacity="0.15"/>
            <path d="M6,6 Q8,5 6,8 Q4,7 6,6" fill={colors.pattern} opacity="0.1"/>
            <circle cx="4" cy="4" r="1" fill={colors.pattern} opacity="0.1"/>
            <circle cx="6" cy="2" r="0.5" fill={colors.pattern} opacity="0.08"/>
            <circle cx="2" cy="6" r="0.5" fill={colors.pattern} opacity="0.08"/>
          </pattern>
          
          {/* Gradient for depth and realism */}
          <linearGradient id={`jerseyGradient-${teamSide}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colors.jersey} />
            <stop offset="50%" stopColor={colors.jersey} />
            <stop offset="100%" stopColor={colors.pattern} />
          </linearGradient>
          
          {/* Shadow gradient */}
          <linearGradient id={`shadowGradient-${teamSide}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(0,0,0,0)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.1)" />
          </linearGradient>
        </defs>
        
        {/* Jersey shadow for depth */}
        <path
          d="M8 8 L32 8 L32 12 L28 12 L28 16 L32 16 L32 32 L8 32 Z"
          fill={`url(#shadowGradient-${teamSide})`}
        />
        
        {/* Main jersey shape - more realistic soccer jersey silhouette */}
        <path
          d="M8 8 L32 8 L32 12 L28 12 L28 16 L32 16 L32 32 L8 32 Z"
          fill={`url(#jerseyGradient-${teamSide})`}
          stroke={colors.accent}
          strokeWidth="0.3"
        />
        
        {/* Jersey pattern overlay */}
        <path
          d="M8 8 L32 8 L32 12 L28 12 L28 16 L32 16 L32 32 L8 32 Z"
          fill={`url(#jerseyPattern-${teamSide})`}
        />
        
        {/* Side panels - more prominent like the real jersey */}
        <rect x="6" y="12" width="3" height="20" fill={colors.sidePanel} />
        <rect x="31" y="12" width="3" height="20" fill={colors.sidePanel} />
        
        {/* Collar - more detailed */}
        <path
          d="M14 8 L26 8 L26 10 L22 10 L22 12 L18 12 L18 10 L14 10 Z"
          fill={colors.collar}
        />
        
        {/* Small collar detail */}
        <rect x="16" y="10" width="8" height="1" fill={colors.collar} />
        
        {/* Jersey number - larger and more prominent */}
        {jerseyNumber && (
          <text
            x="20"
            y="24"
            textAnchor="middle"
            dominantBaseline="central"
            fill={colors.number}
            fontSize="10"
            fontWeight="900"
            fontFamily="Arial, sans-serif"
            stroke={colors.accent}
            strokeWidth="0.2"
          >
            {jerseyNumber}
          </text>
        )}
        
        {/* Player head/face */}
        <circle
          cx="20"
          cy="4"
          r="3.5"
          fill="#f4a261"
          stroke={colors.accent}
          strokeWidth="0.3"
        />
        
        {/* Simple face features */}
        <circle cx="19" cy="3.5" r="0.3" fill="#000" />
        <circle cx="21" cy="3.5" r="0.3" fill="#000" />
        <path d="M19 4.5 Q20 5 21 4.5" stroke="#000" strokeWidth="0.2" fill="none" />
        
        {/* Small team crest area (simplified) */}
        <circle
          cx="20"
          cy="18"
          r="2.5"
          fill="none"
          stroke={colors.accent}
          strokeWidth="0.3"
          opacity="0.6"
        />
        
        {/* Optional small logo inside crest */}
        <circle
          cx="20"
          cy="18"
          r="1"
          fill={colors.accent}
          opacity="0.3"
        />
      </svg>
    </div>
  )
}

export default PlayerIcon
