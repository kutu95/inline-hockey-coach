// Sport configuration system for multi-sport drill animator

export const SPORT_TYPES = {
  HOCKEY: 'hockey',
  SOCCER: 'soccer',
  BASKETBALL: 'basketball',
  FOOTBALL: 'football',
  TENNIS: 'tennis'
}

// Base sport configuration interface
export const createSportConfig = (config) => ({
  // Sport identification
  id: config.id,
  name: config.name,
  displayName: config.displayName,
  
  // Field/Court dimensions (in meters, will be converted to pixels)
  field: {
    width: config.field.width,
    height: config.field.height,
    unit: config.field.unit || 'meters',
    aspectRatio: config.field.width / config.field.height
  },
  
  // Canvas rendering settings
  canvas: {
    defaultWidth: config.canvas?.defaultWidth || 1200,
    defaultHeight: config.canvas?.defaultHeight || 600,
    backgroundColor: config.canvas?.backgroundColor || '#4a7c59'
  },
  
  // Available objects/tools for this sport
  objects: config.objects || [],
  
  // Field markings and visual elements
  markings: config.markings || [],
  
  // Sport-specific rendering rules
  rendering: config.rendering || {},
  
  // AI generation settings
  ai: config.ai || {},
  
  // Default animation settings
  animation: {
    defaultFrameRate: config.animation?.defaultFrameRate || 5,
    defaultDuration: config.animation?.defaultDuration || 3,
    maxFrames: config.animation?.maxFrames || 300
  }
})

// Hockey configuration (current system)
export const hockeyConfig = createSportConfig({
  id: SPORT_TYPES.HOCKEY,
  name: 'hockey',
  displayName: 'Ice Hockey',
  
  field: {
    width: 61, // NHL rink width in meters
    height: 26, // NHL rink height in meters
    unit: 'meters'
  },
  
  canvas: {
    defaultWidth: 1200,
    defaultHeight: 600,
    backgroundColor: '#87CEEB' // Sky blue for ice
  },
  
  objects: [
    {
      id: 'puck',
      name: 'Puck',
      type: 'puck',
      icon: '●',
      defaultProps: {
        radius: 8,
        fill: '#000000',
        stroke: '#ffffff',
        strokeWidth: 1
      },
      category: 'equipment'
    },
    {
      id: 'player',
      name: 'Player',
      type: 'dynamic-player',
      icon: '👤',
      defaultProps: {
        radius: 15,
        fill: '#ff0000',
        stroke: '#ffffff',
        strokeWidth: 2,
        text: '1'
      },
      category: 'players',
      subtypes: ['dynamic-player-0', 'dynamic-player-1', 'dynamic-player-2']
    },
    {
      id: 'goal',
      name: 'Goal',
      type: 'goal',
      icon: '🥅',
      defaultProps: {
        width: 60,
        height: 40,
        fill: '#ffffff',
        stroke: '#000000',
        strokeWidth: 3
      },
      category: 'equipment'
    },
    {
      id: 'line',
      name: 'Line',
      type: 'line',
      icon: '─',
      defaultProps: {
        stroke: '#ffffff',
        strokeWidth: 2
      },
      category: 'markings'
    }
  ],
  
  markings: [
    {
      id: 'center-ice',
      type: 'circle',
      x: 600,
      y: 300,
      radius: 75,
      stroke: '#ff0000',
      strokeWidth: 2,
      fill: 'transparent'
    },
    {
      id: 'center-dot',
      type: 'circle',
      x: 600,
      y: 300,
      radius: 5,
      fill: '#ff0000'
    },
    {
      id: 'faceoff-circles',
      type: 'multiple',
      elements: [
        { type: 'circle', x: 300, y: 150, radius: 15, stroke: '#ff0000', strokeWidth: 2, fill: 'transparent' },
        { type: 'circle', x: 900, y: 150, radius: 15, stroke: '#ff0000', strokeWidth: 2, fill: 'transparent' },
        { type: 'circle', x: 300, y: 450, radius: 15, stroke: '#ff0000', strokeWidth: 2, fill: 'transparent' },
        { type: 'circle', x: 900, y: 450, radius: 15, stroke: '#ff0000', strokeWidth: 2, fill: 'transparent' }
      ]
    }
  ],
  
  rendering: {
    drawField: true,
    fieldColor: '#87CEEB',
    lineColor: '#ffffff',
    lineWidth: 2
  },
  
  ai: {
    keywords: ['hockey', 'puck', 'skating', 'passing', 'shooting', 'goalie'],
    scenarios: ['2-on-1', '3-on-2', 'breakout', 'forecheck', 'backcheck', 'powerplay'],
    playerMovement: 'limited', // Players don't move much in hockey animations
    objectMovement: 'puck-primary' // Puck is the main moving object
  }
})

// Soccer configuration
export const soccerConfig = createSportConfig({
  id: SPORT_TYPES.SOCCER,
  name: 'soccer',
  displayName: 'Soccer',
  
  field: {
    width: 105, // FIFA standard length in meters
    height: 68, // FIFA standard width in meters
    unit: 'meters'
  },
  
  canvas: {
    defaultWidth: 1200,
    defaultHeight: 600,
    backgroundColor: '#4a7c59' // Green for grass
  },
  
  objects: [
    {
      id: 'ball',
      name: 'Soccer Ball',
      type: 'ball',
      icon: '⚽',
      defaultProps: {
        radius: 12,
        fill: '#ffffff',
        stroke: '#000000',
        strokeWidth: 2,
        pattern: 'soccer-ball' // Custom rendering for soccer ball pattern
      },
      category: 'equipment'
    },
    {
      id: 'player',
      name: 'Player',
      type: 'dynamic-player',
      icon: '👤',
      defaultProps: {
        radius: 18,
        fill: '#ff0000',
        stroke: '#ffffff',
        strokeWidth: 2,
        text: '1'
      },
      category: 'players',
      subtypes: ['dynamic-player-0', 'dynamic-player-1', 'dynamic-player-2']
    },
    {
      id: 'goal',
      name: 'Goal',
      type: 'goal',
      icon: '🥅',
      defaultProps: {
        width: 80,
        height: 60,
        fill: '#ffffff',
        stroke: '#000000',
        strokeWidth: 3
      },
      category: 'equipment'
    },
    {
      id: 'cone',
      name: 'Cone',
      type: 'cone',
      icon: '🔺',
      defaultProps: {
        width: 20,
        height: 20,
        fill: '#ff8800',
        stroke: '#000000',
        strokeWidth: 1
      },
      category: 'equipment'
    }
  ],
  
  markings: [
    {
      id: 'center-circle',
      type: 'circle',
      x: 600,
      y: 300,
      radius: 100,
      stroke: '#ffffff',
      strokeWidth: 2,
      fill: 'transparent'
    },
    {
      id: 'center-spot',
      type: 'circle',
      x: 600,
      y: 300,
      radius: 5,
      fill: '#ffffff'
    },
    {
      id: 'penalty-areas',
      type: 'multiple',
      elements: [
        { type: 'rect', x: 50, y: 200, width: 80, height: 200, stroke: '#ffffff', strokeWidth: 2, fill: 'transparent' },
        { type: 'rect', x: 1070, y: 200, width: 80, height: 200, stroke: '#ffffff', strokeWidth: 2, fill: 'transparent' }
      ]
    },
    {
      id: 'goals',
      type: 'multiple',
      elements: [
        { type: 'rect', x: 30, y: 250, width: 20, height: 100, stroke: '#ffffff', strokeWidth: 3, fill: 'transparent' },
        { type: 'rect', x: 1150, y: 250, width: 20, height: 100, stroke: '#ffffff', strokeWidth: 3, fill: 'transparent' }
      ]
    }
  ],
  
  rendering: {
    drawField: true,
    fieldColor: '#4a7c59',
    lineColor: '#ffffff',
    lineWidth: 2,
    grassPattern: true
  },
  
  ai: {
    keywords: ['soccer', 'football', 'ball', 'passing', 'shooting', 'dribbling', 'tackling'],
    scenarios: ['passing-drill', 'shooting-drill', 'defensive-drill', 'set-piece', 'counter-attack'],
    playerMovement: 'full', // Players move more in soccer
    objectMovement: 'ball-primary' // Ball is the main moving object
  }
})

// Basketball configuration
export const basketballConfig = createSportConfig({
  id: SPORT_TYPES.BASKETBALL,
  name: 'basketball',
  displayName: 'Basketball',
  
  field: {
    width: 28, // NBA court length in meters
    height: 15, // NBA court width in meters
    unit: 'meters'
  },
  
  canvas: {
    defaultWidth: 1200,
    defaultHeight: 600,
    backgroundColor: '#8B4513' // Brown for wood court
  },
  
  objects: [
    {
      id: 'ball',
      name: 'Basketball',
      type: 'ball',
      icon: '🏀',
      defaultProps: {
        radius: 10,
        fill: '#ff8800',
        stroke: '#000000',
        strokeWidth: 2,
        pattern: 'basketball' // Custom rendering for basketball pattern
      },
      category: 'equipment'
    },
    {
      id: 'player',
      name: 'Player',
      type: 'dynamic-player',
      icon: '👤',
      defaultProps: {
        radius: 16,
        fill: '#ff0000',
        stroke: '#ffffff',
        strokeWidth: 2,
        text: '1'
      },
      category: 'players',
      subtypes: ['dynamic-player-0', 'dynamic-player-1', 'dynamic-player-2']
    },
    {
      id: 'basket',
      name: 'Basket',
      type: 'basket',
      icon: '🏀',
      defaultProps: {
        width: 60,
        height: 40,
        fill: '#ff8800',
        stroke: '#000000',
        strokeWidth: 2
      },
      category: 'equipment'
    }
  ],
  
  markings: [
    {
      id: 'center-circle',
      type: 'circle',
      x: 600,
      y: 300,
      radius: 50,
      stroke: '#ffffff',
      strokeWidth: 2,
      fill: 'transparent'
    },
    {
      id: 'center-spot',
      type: 'circle',
      x: 600,
      y: 300,
      radius: 3,
      fill: '#ffffff'
    },
    {
      id: 'three-point-lines',
      type: 'multiple',
      elements: [
        { type: 'arc', x: 150, y: 300, radius: 120, startAngle: 0, endAngle: Math.PI, stroke: '#ffffff', strokeWidth: 2 },
        { type: 'arc', x: 1050, y: 300, radius: 120, startAngle: 0, endAngle: Math.PI, stroke: '#ffffff', strokeWidth: 2 }
      ]
    }
  ],
  
  rendering: {
    drawField: true,
    fieldColor: '#8B4513',
    lineColor: '#ffffff',
    lineWidth: 2,
    woodPattern: true
  },
  
  ai: {
    keywords: ['basketball', 'ball', 'shooting', 'passing', 'dribbling', 'rebounding'],
    scenarios: ['pick-and-roll', 'fast-break', 'half-court-set', 'shooting-drill', 'defensive-drill'],
    playerMovement: 'full',
    objectMovement: 'ball-primary'
  }
})

// Sport registry - easy access to all configurations
export const sportConfigs = {
  [SPORT_TYPES.HOCKEY]: hockeyConfig,
  [SPORT_TYPES.SOCCER]: soccerConfig,
  [SPORT_TYPES.BASKETBALL]: basketballConfig
}

// Helper functions
export const getSportConfig = (sportId) => {
  return sportConfigs[sportId] || hockeyConfig // Default to hockey
}

export const getAllSports = () => {
  return Object.values(sportConfigs).map(config => ({
    id: config.id,
    name: config.name,
    displayName: config.displayName
  }))
}

export const getSportObjects = (sportId) => {
  const config = getSportConfig(sportId)
  return config.objects || []
}

export const getSportMarkings = (sportId) => {
  const config = getSportConfig(sportId)
  return config.markings || []
}
