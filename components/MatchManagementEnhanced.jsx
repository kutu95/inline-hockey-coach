import React from 'react'
import PlayerIcon from './PlayerIcon'

// This is an example showing how to integrate the new PlayerIcon
// into the existing MatchManagement component

const MatchManagementEnhanced = () => {
  // This is just a demo component showing how to use the PlayerIcon
  // You would integrate this into the actual MatchManagement component
  
  const renderPlayerCardWithIcon = (player, teamSide) => {
    const status = 'bench' // This would come from playerStatuses state
    const timeOnRink = 0 // This would come from playerTimers state
    
    return (
      <div
        key={player.id}
        className={`player-card ${status}`}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData('text/plain', JSON.stringify({
            playerId: player.id,
            teamSide: teamSide
          }))
        }}
      >
        {/* Enhanced player card with new icon */}
        <div className="flex items-center space-x-3">
          <PlayerIcon
            jerseyNumber={player.jersey_number}
            teamSide={teamSide}
            size={50}
            playerName={`${player.first_name} ${player.last_name}`}
            className="flex-shrink-0"
          />
          
          <div className="flex-1 min-w-0">
            <div className="player-info">
              <div className="player-name text-sm font-medium text-gray-900">
                {player.first_name} {player.last_name}
              </div>
              <div className="player-jersey text-xs text-gray-500">
                #{player.jersey_number}
              </div>
            </div>
            
            {status === 'rink' && (
              <div className="player-time text-xs text-blue-600 font-medium">
                {formatTime(timeOnRink)}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Sample data for demonstration
  const samplePlayers = [
    { id: 1, first_name: 'John', last_name: 'Smith', jersey_number: 7 },
    { id: 2, first_name: 'Sarah', last_name: 'Johnson', jersey_number: 10 },
    { id: 3, first_name: 'Mike', last_name: 'Brown', jersey_number: 1 },
  ]

  return (
    <div className="p-8 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Enhanced Player Cards with Jersey Icons</h1>
        
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Home Team Players</h2>
          <div className="space-y-3">
            {samplePlayers.map(player => renderPlayerCardWithIcon(player, 'home'))}
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Away Team Players</h2>
          <div className="space-y-3">
            {samplePlayers.map(player => renderPlayerCardWithIcon(player, 'away'))}
          </div>
        </div>
        
        <div className="mt-8 bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            Integration Instructions
          </h3>
          <div className="text-sm text-blue-800 space-y-2">
            <p>To integrate this into your MatchManagement component:</p>
            <ol className="list-decimal list-inside space-y-1 ml-4">
              <li>Import the PlayerIcon component</li>
              <li>Replace the current player card rendering with this enhanced version</li>
              <li>The PlayerIcon automatically handles team colors based on teamSide prop</li>
              <li>Maintains all existing drag-and-drop functionality</li>
              <li>Adds visual appeal with realistic jersey design</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MatchManagementEnhanced
