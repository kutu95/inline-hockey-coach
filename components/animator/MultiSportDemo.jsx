import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import MultiSportAnimator from './MultiSportAnimator'
import MultiSportAIGeneratorPanel from './MultiSportAIGeneratorPanel'
import { SPORT_TYPES } from '../../src/lib/sports/config'

/**
 * MultiSportDemo - Demo page for testing the multi-sport animation system
 */
const MultiSportDemo = () => {
  const [showAIGenerator, setShowAIGenerator] = useState(false)
  const [currentSport, setCurrentSport] = useState(SPORT_TYPES.HOCKEY)
  
  const handleAnimationChange = (change) => {
    console.log('Animation change:', change)
  }
  
  const handleExport = (format) => {
    console.log('Export requested:', format)
    // Here you would implement actual export functionality
  }
  
  const handleAIGenerate = async (animationData, sportId) => {
    console.log('AI Generated animation:', animationData, 'for sport:', sportId)
    // Here you would integrate the AI-generated animation into the animator
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link 
                to="/" 
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                ← Back to App
              </Link>
              <h1 className="text-xl font-semibold text-gray-900">
                Multi-Sport Drill Animator Demo
              </h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowAIGenerator(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center space-x-2"
              >
                <span>🤖</span>
                <span>AI Generator</span>
              </button>
              
              <div className="text-sm text-gray-500">
                Current Sport: <span className="font-medium">{currentSport}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Info Panel */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h2 className="text-lg font-semibold text-blue-900 mb-2">
            🎯 Multi-Sport Animation System
          </h2>
          <div className="text-blue-800 space-y-2">
            <p>
              This demo showcases the new multi-sport drill animation system. 
              You can switch between different sports and see how the interface 
              adapts to each sport's specific requirements.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div className="bg-white p-3 rounded border">
                <h3 className="font-medium text-gray-900 mb-1">🏒 Hockey</h3>
                <p className="text-sm text-gray-600">
                  Ice rink with puck, players, and hockey-specific markings
                </p>
              </div>
              <div className="bg-white p-3 rounded border">
                <h3 className="font-medium text-gray-900 mb-1">⚽ Soccer</h3>
                <p className="text-sm text-gray-600">
                  Soccer field with ball, players, and field markings
                </p>
              </div>
              <div className="bg-white p-3 rounded border">
                <h3 className="font-medium text-gray-900 mb-1">🏀 Basketball</h3>
                <p className="text-sm text-gray-600">
                  Basketball court with ball, players, and court markings
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Features List */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              ✨ Key Features
            </h3>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start space-x-2">
                <span className="text-green-500 mt-1">✓</span>
                <span>Sport-specific field/court rendering</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-green-500 mt-1">✓</span>
                <span>Adaptive tool palettes per sport</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-green-500 mt-1">✓</span>
                <span>AI generation with sport context</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-green-500 mt-1">✓</span>
                <span>Frame-by-frame animation editor</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-green-500 mt-1">✓</span>
                <span>Export to multiple formats</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-green-500 mt-1">✓</span>
                <span>Backward compatibility with existing animations</span>
              </li>
            </ul>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              🚀 How to Use
            </h3>
            <ol className="space-y-2 text-gray-700">
              <li className="flex items-start space-x-2">
                <span className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium mt-0.5">1</span>
                <span>Select your sport from the dropdown</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium mt-0.5">2</span>
                <span>Choose tools from the sport-specific palette</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium mt-0.5">3</span>
                <span>Click on the canvas to add elements</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium mt-0.5">4</span>
                <span>Use the AI generator for quick animations</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium mt-0.5">5</span>
                <span>Export your animation when complete</span>
              </li>
            </ol>
          </div>
        </div>
        
        {/* Multi-Sport Animator */}
        <div className="bg-white rounded-lg shadow">
          <MultiSportAnimator
            initialSport={currentSport}
            onAnimationChange={handleAnimationChange}
            onExport={handleExport}
            className="min-h-[600px]"
          />
        </div>
      </div>
      
      {/* AI Generator Panel */}
      <MultiSportAIGeneratorPanel
        open={showAIGenerator}
        onClose={() => setShowAIGenerator(false)}
        onGenerate={handleAIGenerate}
        currentSport={currentSport}
      />
    </div>
  )
}

export default MultiSportDemo
