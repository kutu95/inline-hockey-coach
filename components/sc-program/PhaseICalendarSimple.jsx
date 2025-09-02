/*
Simplified PhaseICalendar component for debugging
*/

import React, { useState } from 'react'
import { useAuth } from '../../src/contexts/AuthContext'

export default function PhaseICalendarSimple() {
  const { user } = useAuth()
  const [gamesPerWeek, setGamesPerWeek] = useState(1)

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Please log in to access the strength and conditioning program.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold mb-4">Phase I – 8‑Week Plan (Simplified)</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Games per week</label>
            <input
              type="number"
              min={1}
              max={3}
              value={gamesPerWeek}
              onChange={(e) => setGamesPerWeek(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Save Plan
          </button>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Training Sessions</h3>
        <p className="text-gray-600">Calendar will be implemented here.</p>
      </div>
    </div>
  )
}
