import React, { useState } from 'react'
import PlayerIcon from './PlayerIcon'

const PlayerIconDemo = () => {
  const [selectedSize, setSelectedSize] = useState(60)
  const [selectedTeam, setSelectedTeam] = useState('home')

  const sizes = [30, 40, 50, 60, 80, 100]
  const teams = [
    { value: 'home', label: 'Home Team (Yellow/Green)' },
    { value: 'away', label: 'Away Team (Blue/White)' }
  ]

  const samplePlayers = [
    { number: 7, name: 'Player Seven' },
    { number: 10, name: 'Player Ten' },
    { number: 1, name: 'Goalkeeper' },
    { number: 23, name: 'Player Twenty-Three' },
    { number: 9, name: 'Player Nine' }
  ]

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          ⚽ Enhanced Player Icon Demo
        </h1>
        
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Customization Options</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Icon Size: {selectedSize}px
              </label>
              <div className="flex flex-wrap gap-2">
                {sizes.map(size => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`px-3 py-1 rounded text-sm ${
                      selectedSize === size
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {size}px
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Team Side
              </label>
              <select
                value={selectedTeam}
                onChange={(e) => setSelectedTeam(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {teams.map(team => (
                  <option key={team.value} value={team.value}>
                    {team.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Sample Players</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {samplePlayers.map(player => (
              <div key={player.number} className="text-center">
                <PlayerIcon
                  jerseyNumber={player.number}
                  teamSide={selectedTeam}
                  size={selectedSize}
                  playerName={player.name}
                  className="mx-auto mb-2"
                />
                <div className="text-sm text-gray-600">
                  #{player.number}
                </div>
                <div className="text-xs text-gray-500">
                  {player.name}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Interactive Example</h2>
          <p className="text-gray-600 mb-4">
            Click on a player icon to see the interaction:
          </p>
          <div className="flex justify-center">
            <PlayerIcon
              jerseyNumber={7}
              teamSide={selectedTeam}
              size={selectedSize}
              playerName="Demo Player"
              onClick={() => alert('Player #7 clicked!')}
              className="hover:scale-110 transition-transform cursor-pointer"
            />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Design Elements</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Marble-like jersey pattern (inspired by soccer jersey)</li>
                <li>• Realistic jersey silhouette with side panels</li>
                <li>• Detailed collar design</li>
                <li>• Bold, prominent jersey numbers</li>
                <li>• Simple face representation</li>
                <li>• Team crest area</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Color Schemes</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• <span className="font-medium">Home:</span> Golden yellow with dark green accents</li>
                <li>• <span className="font-medium">Away:</span> Blue with white accents</li>
                <li>• High contrast for visibility</li>
                <li>• Professional sports appearance</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-gray-500 text-sm">
            This enhanced player icon can replace the simple colored circles 
            in your match management system for a more professional appearance.
          </p>
        </div>
      </div>
    </div>
  )
}

export default PlayerIconDemo
