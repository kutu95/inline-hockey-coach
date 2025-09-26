import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { getAllSports, getSportConfig } from '../../src/lib/sports/config'
import KeyframeSoccerAnimator from './KeyframeSoccerAnimator'

/**
 * SimpleMultiSportDemo - Simplified demo page for testing basic functionality
 */
const SimpleMultiSportDemo = () => {
  const [selectedSport, setSelectedSport] = useState('soccer')
  const availableSports = getAllSports()
  const sportConfig = getSportConfig(selectedSport)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link 
                to="/dashboard" 
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                ← Back to Dashboard
              </Link>
              <h1 className="text-xl font-semibold text-gray-900">
                ⚽ Soccer Animation Editor Demo
              </h1>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Info Panel */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <h2 className="text-lg font-semibold text-green-900 mb-2">
            ⚽ Soccer Animation System
          </h2>
          <div className="text-green-800 space-y-2">
            <p>
              This demo showcases the soccer-focused animation editor with customizable field dimensions 
              and background colors. Create soccer drills, passing sequences, and training exercises 
              with an intuitive interface.
            </p>
          </div>
        </div>


        {/* Soccer Field Info Panel */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">⚽ Soccer Field Information</h3>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Field Dimensions</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Standard Size:</span>
                  <span className="font-medium">105m × 68m</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Aspect Ratio:</span>
                  <span className="font-medium">1.54</span>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Penalty Areas</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Penalty Area:</span>
                  <span className="font-medium">40.3m × 16.5m</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Goal Area:</span>
                  <span className="font-medium">18.3m × 5.5m</span>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Field Markings</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Center Circle:</span>
                  <span className="font-medium">9.15m radius</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Goal Size:</span>
                  <span className="font-medium">7.32m × 2.44m</span>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Available Tools</h4>
              <div className="space-y-1 text-sm">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">⚽</span>
                  <span>Soccer Ball</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-lg">👤</span>
                  <span>Player</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-lg">🔺</span>
                  <span>Cone</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-lg">🥅</span>
                  <span>Goal</span>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-blue-900 mb-2">💡 Keyframe Tips</h4>
              <ul className="text-xs text-blue-800 space-y-1">
                <li>• Place objects at different times</li>
                <li>• Objects auto-interpolate</li>
                <li>• Use timeline to scrub</li>
                <li>• Add keyframes at key moments</li>
                <li>• Adjust duration & frame rate</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Soccer Animation Editor */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            ⚽ Soccer Animation Editor
          </h3>
          <p className="text-gray-600 mb-4">
            Create professional soccer animations using keyframes! Place objects at different times on the timeline, and watch them smoothly interpolate between positions. Customize field dimensions, background colors, and animation settings.
          </p>
          
          <KeyframeSoccerAnimator />
        </div>

        {/* Sports Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {availableSports.map(sport => {
            const config = getSportConfig(sport.id)
            const isAvailable = sport.id === 'soccer'
            return (
              <div key={sport.id} className={`rounded-lg shadow p-6 ${
                isAvailable ? 'bg-white' : 'bg-gray-50 opacity-75'
              }`}>
                <div className="flex items-center space-x-3 mb-4">
                  <div className="text-2xl">
                    {sport.id === 'hockey' ? '🏒' : 
                     sport.id === 'soccer' ? '⚽' : 
                     sport.id === 'basketball' ? '🏀' : '🏃'}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {sport.displayName}
                  </h3>
                </div>
                
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center justify-between">
                    <span><strong>Status:</strong></span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      isAvailable 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {isAvailable ? 'Available' : 'Coming Soon'}
                    </span>
                  </div>
                  <div><strong>Field:</strong> {config.field.width}m × {config.field.height}m</div>
                  <div><strong>Objects:</strong> {config.objects.length} types</div>
                  <div><strong>Markings:</strong> {config.markings.length} elements</div>
                  <div><strong>Frame Rate:</strong> {config.animation.defaultFrameRate} FPS</div>
                </div>
                
                <div className="mt-4">
                  <button
                    onClick={() => sport.id === 'soccer' && setSelectedSport(sport.id)}
                    disabled={sport.id !== 'soccer'}
                    className={`w-full py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                      selectedSport === sport.id
                        ? 'bg-blue-600 text-white'
                        : sport.id === 'soccer'
                        ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        : 'bg-gray-50 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {selectedSport === sport.id ? 'Selected' : 
                     sport.id === 'soccer' ? 'Select' : 'Coming Soon'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Status */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-blue-800 font-medium">
              ⚽ Soccer Animation System Active
            </span>
          </div>
          <p className="text-blue-700 text-sm mt-1">
            Currently focused on soccer animations. Other sports (hockey, basketball) are coming soon!
            The soccer animator includes full frame editing, element manipulation, and animation controls.
          </p>
        </div>
      </div>
    </div>
  )
}

export default SimpleMultiSportDemo
