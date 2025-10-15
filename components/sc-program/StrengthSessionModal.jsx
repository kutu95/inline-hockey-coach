import React, { useState, useEffect } from 'react'
import { supabase } from '../../src/lib/supabase'
import { calculateSuggestedWorkout, saveStrengthSession } from '../../src/utils/progressiveOverload'

const StrengthSessionModal = ({ 
  isOpen, 
  onClose, 
  sessionData, 
  userId, 
  hasGymAccess 
}) => {
  const [exercises, setExercises] = useState([])
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [notes, setNotes] = useState('')

  // Load suggestions when modal opens
  useEffect(() => {
    if (isOpen && sessionData) {
      loadSuggestions()
    }
  }, [isOpen, sessionData])

  const loadSuggestions = async () => {
    setLoading(true)
    try {
      const sessionType = sessionData.title.includes('Strength Day A') ? 'STRENGTH_A' : 'STRENGTH_B'
      const suggestedWorkout = await calculateSuggestedWorkout(
        userId, 
        sessionType, 
        'PHASE_I', 
        hasGymAccess
      )
      
      setSuggestions(suggestedWorkout)
      
      // Initialize exercises with suggestions
      const initialExercises = suggestedWorkout.map(exercise => ({
        name: exercise.name,
        sets: Array(exercise.suggested_sets).fill().map((_, index) => ({
          reps: exercise.suggested_reps,
          weight: exercise.suggested_weight,
          rpe: 5,
          notes: ''
        })),
        progression_note: exercise.progression_note
      }))
      
      setExercises(initialExercises)
    } catch (error) {
      console.error('Error loading suggestions:', error)
      alert('Error loading workout suggestions')
    } finally {
      setLoading(false)
    }
  }

  const updateSet = (exerciseIndex, setIndex, field, value) => {
    const newExercises = [...exercises]
    newExercises[exerciseIndex].sets[setIndex][field] = value
    setExercises(newExercises)
  }

  const addSet = (exerciseIndex) => {
    const newExercises = [...exercises]
    const lastSet = newExercises[exerciseIndex].sets[newExercises[exerciseIndex].sets.length - 1]
    newExercises[exerciseIndex].sets.push({
      reps: lastSet.reps,
      weight: lastSet.weight,
      rpe: 5,
      notes: ''
    })
    setExercises(newExercises)
  }

  const removeSet = (exerciseIndex, setIndex) => {
    const newExercises = [...exercises]
    if (newExercises[exerciseIndex].sets.length > 1) {
      newExercises[exerciseIndex].sets.splice(setIndex, 1)
      setExercises(newExercises)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await saveStrengthSession(userId, {
        session_id: sessionData.id,
        date: sessionData.date,
        session_type: sessionData.title.includes('Strength Day A') ? 'STRENGTH_A' : 'STRENGTH_B',
        phase: 'PHASE_I',
        notes,
        exercises
      })
      
      alert('Strength session saved successfully!')
      onClose()
    } catch (error) {
      console.error('Error saving strength session:', error)
      alert('Error saving strength session')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {sessionData?.title || 'Strength Session'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading workout suggestions...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Session Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Session Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="How did the session feel? Any form notes or observations..."
                />
              </div>

              {/* Exercises */}
              {exercises.map((exercise, exerciseIndex) => (
                <div key={exerciseIndex} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {exercise.name}
                    </h3>
                    <button
                      onClick={() => addSet(exerciseIndex)}
                      className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                    >
                      + Add Set
                    </button>
                  </div>

                  {exercise.progression_note && (
                    <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
                      💡 {exercise.progression_note}
                    </div>
                  )}

                  <div className="space-y-2">
                    {exercise.sets.map((set, setIndex) => (
                      <div key={setIndex} className="flex items-center gap-4 p-3 bg-gray-50 rounded">
                        <span className="text-sm font-medium text-gray-600 w-8">
                          Set {setIndex + 1}
                        </span>
                        
                        <div className="flex-1 grid grid-cols-4 gap-4">
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Reps</label>
                            <input
                              type="number"
                              value={set.reps}
                              onChange={(e) => updateSet(exerciseIndex, setIndex, 'reps', parseInt(e.target.value) || 0)}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                              min="0"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Weight (kg)</label>
                            <input
                              type="number"
                              value={set.weight}
                              onChange={(e) => updateSet(exerciseIndex, setIndex, 'weight', parseFloat(e.target.value) || 0)}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                              min="0"
                              step="0.5"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">RPE (1-10)</label>
                            <select
                              value={set.rpe}
                              onChange={(e) => updateSet(exerciseIndex, setIndex, 'rpe', parseInt(e.target.value))}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                              {Array.from({ length: 10 }, (_, i) => i + 1).map(rpe => (
                                <option key={rpe} value={rpe}>{rpe}</option>
                              ))}
                            </select>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={set.notes}
                              onChange={(e) => updateSet(exerciseIndex, setIndex, 'notes', e.target.value)}
                              placeholder="Notes..."
                              className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                            {exercise.sets.length > 1 && (
                              <button
                                onClick={() => removeSet(exerciseIndex, setIndex)}
                                className="text-red-600 hover:text-red-800"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Save Button */}
              <div className="flex justify-end gap-3 pt-6 border-t">
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {saving ? 'Saving...' : 'Save Session'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default StrengthSessionModal
