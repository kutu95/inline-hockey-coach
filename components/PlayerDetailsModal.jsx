import React, { useState, useEffect } from 'react'
import { supabase } from '../src/lib/supabase'

const PlayerDetailsModal = ({ isOpen, onClose, playerId, orgId }) => {
  const [player, setPlayer] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [playerPhotoUrl, setPlayerPhotoUrl] = useState(null)

  useEffect(() => {
    if (isOpen && playerId) {
      loadPlayerDetails()
    }
  }, [isOpen, playerId])

  const loadPlayerDetails = async () => {
    if (!playerId) return
    
    setLoading(true)
    setError(null)
    
    try {
      // Load detailed player information
      const { data: playerData, error: playerError } = await supabase
        .from('players')
        .select(`
          *,
          player_squads (
            squad_id,
            squads (
              id,
              name
            )
          )
        `)
        .eq('id', playerId)
        .single()

      if (playerError) throw playerError

      console.log('Player data loaded:', playerData)
      setPlayer(playerData)

      // Set photo URL directly (it's already a signed URL)
      if (playerData.photo_url) {
        console.log('Player has photo_url:', playerData.photo_url)
        setPlayerPhotoUrl(playerData.photo_url)
      } else {
        console.log('Player has no photo_url')
      }
    } catch (err) {
      console.error('Error loading player details:', err)
      setError('Failed to load player details')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const calculateAge = (birthdate) => {
    if (!birthdate) return 'N/A'
    const today = new Date()
    const birth = new Date(birthdate)
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    
    return age
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Player Details</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="space-y-6">
          {loading && (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              <span className="ml-2 text-gray-600">Loading player details...</span>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="ml-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}

          {player && !loading && (
            <>
              {/* Player Photo and Basic Info */}
              <div className="flex items-start space-x-6">
                <div className="flex-shrink-0">
                  {playerPhotoUrl ? (
                    <img
                      src={playerPhotoUrl}
                      alt={`${player.first_name} ${player.last_name}`}
                      className="w-24 h-24 rounded-lg object-cover border-2 border-gray-200"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-lg bg-gray-200 border-2 border-gray-300 flex items-center justify-center">
                      <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  )}
                </div>
                
                <div className="flex-1">
                  <h4 className="text-2xl font-bold text-gray-900">
                    {player.first_name} {player.last_name}
                  </h4>
                  <div className="mt-2 space-y-1">
                    {player.jersey_number && (
                      <p className="text-lg text-gray-600">
                        <span className="font-medium">Jersey:</span> #{player.jersey_number}
                      </p>
                    )}
                    {player.birthdate && (
                      <p className="text-lg text-gray-600">
                        <span className="font-medium">Age:</span> {calculateAge(player.birthdate)} years old
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Detailed Information Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Personal Information */}
                <div className="space-y-4">
                  <h5 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                    Personal Information
                  </h5>
                  
                  <div className="space-y-3">
                    <div>
                      <span className="font-medium text-gray-700">Full Name:</span>
                      <p className="text-gray-900">{player.first_name} {player.last_name}</p>
                    </div>
                    
                    {player.birthdate && (
                      <div>
                        <span className="font-medium text-gray-700">Birth Date:</span>
                        <p className="text-gray-900">{formatDate(player.birthdate)}</p>
                      </div>
                    )}
                    
                    {player.email && (
                      <div>
                        <span className="font-medium text-gray-700">Email:</span>
                        <p className="text-gray-900">{player.email}</p>
                      </div>
                    )}
                    
                    {player.phone && (
                      <div>
                        <span className="font-medium text-gray-700">Phone:</span>
                        <p className="text-gray-900">{player.phone}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Hockey Information */}
                <div className="space-y-4">
                  <h5 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                    Hockey Information
                  </h5>
                  
                  <div className="space-y-3">
                    {player.jersey_number && (
                      <div>
                        <span className="font-medium text-gray-700">Jersey Number:</span>
                        <p className="text-gray-900">#{player.jersey_number}</p>
                      </div>
                    )}
                    
                    {player.accreditations && player.accreditations.length > 0 && (
                      <div>
                        <span className="font-medium text-gray-700">Accreditations:</span>
                        <p className="text-gray-900">{player.accreditations.join(', ')}</p>
                      </div>
                    )}
                    
                    {player.hand && (
                      <div>
                        <span className="font-medium text-gray-700">Handedness:</span>
                        <p className="text-gray-900">{player.hand}</p>
                      </div>
                    )}
                    
                    {player.skate_australia_number && (
                      <div>
                        <span className="font-medium text-gray-700">Skate Australia Number:</span>
                        <p className="text-gray-900">{player.skate_australia_number}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Squads */}
              {player.player_squads && player.player_squads.length > 0 && (
                <div className="space-y-4">
                  <h5 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                    Squads
                  </h5>
                  <div className="flex flex-wrap gap-2">
                    {player.player_squads.map((ps, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                      >
                        {ps.squads?.name || `Squad ${ps.squad_id}`}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Additional Information */}
              {(player.emergency_contact || player.emergency_phone || player.notes) && (
                <div className="space-y-4">
                  <h5 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                    Additional Information
                  </h5>
                  
                  <div className="space-y-3">
                    {player.emergency_contact && (
                      <div>
                        <span className="font-medium text-gray-700">Emergency Contact:</span>
                        <p className="text-gray-900">{player.emergency_contact}</p>
                      </div>
                    )}
                    
                    {player.emergency_phone && (
                      <div>
                        <span className="font-medium text-gray-700">Emergency Phone:</span>
                        <p className="text-gray-900">{player.emergency_phone}</p>
                      </div>
                    )}
                    
                    {player.notes && (
                      <div>
                        <span className="font-medium text-gray-700">Notes:</span>
                        <p className="text-gray-900">{player.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors duration-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export default PlayerDetailsModal
