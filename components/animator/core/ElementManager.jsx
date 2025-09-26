import React, { useState, useCallback } from 'react'
import { getSportConfig, getSportObjects } from '../../../src/lib/sports/config'

/**
 * ElementManager - Manages creation, manipulation, and lifecycle of animation elements
 * Sport-aware element creation and management
 */
const ElementManager = ({ 
  sportId = 'hockey',
  onElementCreate,
  onElementUpdate,
  onElementDelete,
  children 
}) => {
  const sportConfig = getSportConfig(sportId)
  const availableObjects = getSportObjects(sportId)
  
  // Element creation state
  const [selectedTool, setSelectedTool] = useState(null)
  const [selectedElement, setSelectedElement] = useState(null)
  const [isCreating, setIsCreating] = useState(false)
  const [creationData, setCreationData] = useState({})
  
  // Create element from sport configuration
  const createElement = useCallback((objectType, properties = {}) => {
    const objectConfig = availableObjects.find(obj => obj.id === objectType || obj.type === objectType)
    
    if (!objectConfig) {
      console.warn(`Unknown object type: ${objectType}`)
      return null
    }
    
    // Merge default properties with provided properties
    const element = {
      id: `element_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: objectConfig.type,
      objectType: objectConfig.id,
      ...objectConfig.defaultProps,
      ...properties,
      timestamp: Date.now()
    }
    
    // Apply sport-specific modifications
    const modifiedElement = applySportSpecificProperties(element, sportId)
    
    onElementCreate?.(modifiedElement)
    return modifiedElement
  }, [availableObjects, sportId, onElementCreate])
  
  // Apply sport-specific properties to elements
  const applySportSpecificProperties = useCallback((element, sportId) => {
    switch (sportId) {
      case 'hockey':
        if (element.type === 'puck') {
          element.radius = element.radius || 8
          element.fill = element.fill || '#000000'
        } else if (element.type === 'dynamic-player') {
          element.radius = element.radius || 15
          element.fill = element.fill || '#ff0000'
        }
        break
        
      case 'soccer':
        if (element.type === 'ball') {
          element.radius = element.radius || 12
          element.fill = element.fill || '#ffffff'
          element.pattern = 'soccer-ball'
        } else if (element.type === 'dynamic-player') {
          element.radius = element.radius || 18
          element.fill = element.fill || '#ff0000'
        }
        break
        
      case 'basketball':
        if (element.type === 'ball') {
          element.radius = element.radius || 10
          element.fill = element.fill || '#ff8800'
          element.pattern = 'basketball'
        } else if (element.type === 'dynamic-player') {
          element.radius = element.radius || 16
          element.fill = element.fill || '#ff0000'
        }
        break
    }
    
    return element
  }, [])
  
  // Update element properties
  const updateElement = useCallback((elementId, updates) => {
    const updatedElement = {
      ...selectedElement,
      ...updates,
      lastModified: Date.now()
    }
    
    setSelectedElement(updatedElement)
    onElementUpdate?.(elementId, updatedElement)
  }, [selectedElement, onElementUpdate])
  
  // Delete element
  const deleteElement = useCallback((elementId) => {
    setSelectedElement(null)
    onElementDelete?.(elementId)
  }, [onElementDelete])
  
  // Start element creation
  const startElementCreation = useCallback((objectType, initialData = {}) => {
    setSelectedTool(objectType)
    setIsCreating(true)
    setCreationData(initialData)
  }, [])
  
  // Complete element creation
  const completeElementCreation = useCallback((position, additionalProperties = {}) => {
    if (!selectedTool) return null
    
    const element = createElement(selectedTool, {
      x: position.x,
      y: position.y,
      ...creationData,
      ...additionalProperties
    })
    
    setIsCreating(false)
    setSelectedTool(null)
    setCreationData({})
    
    return element
  }, [selectedTool, creationData, createElement])
  
  // Cancel element creation
  const cancelElementCreation = useCallback(() => {
    setIsCreating(false)
    setSelectedTool(null)
    setCreationData({})
  }, [])
  
  // Duplicate element
  const duplicateElement = useCallback((element, offset = { x: 20, y: 20 }) => {
    const duplicatedElement = {
      ...element,
      id: `element_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      x: element.x + offset.x,
      y: element.y + offset.y,
      timestamp: Date.now()
    }
    
    onElementCreate?.(duplicatedElement)
    return duplicatedElement
  }, [onElementCreate])
  
  // Group elements
  const groupElements = useCallback((elementIds) => {
    const groupId = `group_${Date.now()}`
    const groupedElement = {
      id: groupId,
      type: 'group',
      elementIds,
      timestamp: Date.now()
    }
    
    onElementCreate?.(groupedElement)
    return groupedElement
  }, [onElementCreate])
  
  // Ungroup elements
  const ungroupElements = useCallback((groupId) => {
    onElementDelete?.(groupId)
  }, [onElementDelete])
  
  // Get available tools for current sport
  const getAvailableTools = useCallback(() => {
    return availableObjects.map(obj => ({
      id: obj.id,
      name: obj.name,
      type: obj.type,
      icon: obj.icon,
      category: obj.category,
      defaultProps: obj.defaultProps
    }))
  }, [availableObjects])
  
  // Get tools by category
  const getToolsByCategory = useCallback(() => {
    const tools = getAvailableTools()
    const categories = {}
    
    tools.forEach(tool => {
      if (!categories[tool.category]) {
        categories[tool.category] = []
      }
      categories[tool.category].push(tool)
    })
    
    return categories
  }, [getAvailableTools])
  
  // Validate element properties
  const validateElement = useCallback((element) => {
    const errors = []
    
    // Check required properties
    if (!element.type) {
      errors.push('Element must have a type')
    }
    
    if (element.x === undefined || element.y === undefined) {
      errors.push('Element must have x and y coordinates')
    }
    
    // Sport-specific validation
    switch (sportId) {
      case 'hockey':
        if (element.type === 'puck' && (!element.radius || element.radius <= 0)) {
          errors.push('Puck must have a positive radius')
        }
        break
        
      case 'soccer':
        if (element.type === 'ball' && (!element.radius || element.radius <= 0)) {
          errors.push('Soccer ball must have a positive radius')
        }
        break
        
      case 'basketball':
        if (element.type === 'ball' && (!element.radius || element.radius <= 0)) {
          errors.push('Basketball must have a positive radius')
        }
        break
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  }, [sportId])
  
  // Element manager context value
  const elementContext = {
    // State
    selectedTool,
    selectedElement,
    isCreating,
    creationData,
    availableObjects,
    
    // Element operations
    createElement,
    updateElement,
    deleteElement,
    duplicateElement,
    groupElements,
    ungroupElements,
    
    // Creation workflow
    startElementCreation,
    completeElementCreation,
    cancelElementCreation,
    
    // Tool management
    getAvailableTools,
    getToolsByCategory,
    
    // Selection
    setSelectedElement,
    setSelectedTool,
    
    // Validation
    validateElement,
    
    // Sport configuration
    sportConfig
  }
  
  return (
    <ElementContext.Provider value={elementContext}>
      {children}
    </ElementContext.Provider>
  )
}

// Context for sharing element management state
const ElementContext = React.createContext(null)

// Hook to use element context
export const useElementManager = () => {
  const context = React.useContext(ElementContext)
  if (!context) {
    throw new Error('useElementManager must be used within an ElementManager')
  }
  return context
}

export default ElementManager
