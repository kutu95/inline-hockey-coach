import React from 'react'

const JerseySelector = ({ selectedJersey, onJerseyChange, className = '' }) => {
  const jerseyOptions = [
    {
      id: 'blue',
      name: 'Blue Jersey',
      description: 'Blue jersey with yellow accents and black stripe'
    },
    {
      id: 'golden',
      name: 'Golden Jersey', 
      description: 'Golden yellow jersey with dark green accents'
    },
    {
      id: 'red',
      name: 'Red Jersey',
      description: 'Red jersey with white number and dark accents'
    }
  ]

  const getJerseyImagePath = (jerseyType) => {
    return `/jerseys/${jerseyType}-jersey.png`
  }

  const renderJerseyImage = (jerseyType, size = 60) => {
    return (
      <img
        src={getJerseyImagePath(jerseyType)}
        alt={`${jerseyType} jersey`}
        width={size}
        height={size}
        style={{
          objectFit: 'contain',
          backgroundColor: 'transparent'
        }}
        onError={(e) => {
          // Fallback to a placeholder if image doesn't exist
          e.target.style.display = 'none'
          e.target.nextSibling.style.display = 'block'
        }}
      />
    )
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <span className="text-sm font-medium text-gray-600">Player Jersey:</span>
      <select
        value={selectedJersey}
        onChange={(e) => onJerseyChange(e.target.value)}
        className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
      >
        {jerseyOptions.map(option => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
      
      {/* Preview of selected jersey */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500">Preview:</span>
        <div className="p-1" style={{ backgroundColor: 'transparent' }}>
          {renderJerseyImage(selectedJersey, 40)}
        </div>
      </div>
    </div>
  )
}

export default JerseySelector
