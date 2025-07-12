import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../src/lib/supabase'
import { useAuth } from '../src/contexts/AuthContext'
import { formatAccreditations, getAccreditationBadges, calculateAge, formatBirthdate } from '../src/utils/formatters'

const PlayerProfile = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [player, setPlayer] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [signedUrl, setSignedUrl] = useState(null)
  const [playerPhotoUrl, setPlayerPhotoUrl] = useState(null)

  useEffect(() => {
    fetchPlayerProfile()
  }, [])

  // Function to get signed URL for club logo
  const getSignedUrl = async (url) => {
    if (!url) return null
    
    try {
      // Extract file path from the URL
      const urlParts = url.split('/')
      const filePath = urlParts.slice(-2).join('/') // Get user_id/filename
      
      const { data: { signedUrl } } = await supabase.storage
        .from('club-logos')
        .createSignedUrl(filePath, 60 * 60 * 24 * 7) // 7 days expiry
      
      return signedUrl
    } catch (err) {
      console.error('Error getting signed URL:', err)
      return url // Fallback to original URL
    }
  }

  // Function to get signed URL for player photo
  const getSignedUrlForPlayerPhoto = async (url) => {
    if (!url) return null
    
    try {
      // Extract file path from the URL
      const urlParts = url.split('/')
      const filePath = urlParts.slice(-2).join('/') // Get user_id/filename
      
      const { data: { signedUrl } } = await supabase.storage
        .from('player-photos')
        .createSignedUrl(filePath, 60 * 60 * 24 * 7) // 7 days expiry
      
      return signedUrl
    } catch (err) {
      console.error('Error getting signed URL for player photo:', err)
      return url // Fallback to original URL
    }
  }

  // Get signed URLs for club logo and player photo when player data changes
  useEffect(() => {
    const getSignedUrlsForPlayer = async () => {
      if (player?.clubs?.logo_url) {
        const signedUrl = await getSignedUrl(player.clubs.logo_url)
        setSignedUrl(signedUrl)
      }
      if (player?.photo_url) {
        const photoUrl = await getSignedUrlForPlayerPhoto(player.photo_url)
        setPlayerPhotoUrl(photoUrl)
      }
    }
    
    if (player) {
      getSignedUrlsForPlayer()
    }
  }, [player])

  const fetchPlayerProfile = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('players')
        .select(`
          *,
          clubs:club_id (
            id,
            name,
            logo_url
          ),
          player_squads (
            squads (
              id,
              name
            )
          )
        `)
        .eq('coach_id', user.id)
        .single()

      if (error) throw error
      setPlayer(data)
    } catch (err) {
      setError('Failed to fetch player profile')
      console.error('Error fetching player profile:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (!player) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="bg-white shadow rounded-lg p-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Profile Not Found</h2>
                <p className="text-gray-600 mb-6">Your player profile could not be found. Please contact your coach.</p>
                <Link
                  to="/dashboard"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-md transition duration-150 ease-in-out"
                >
                  Back to Dashboard
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Link
                    to="/dashboard"
                    className="text-gray-600 hover:text-gray-800 font-medium"
                  >
                    ← Back to Dashboard
                  </Link>
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">
                      My Profile
                    </h1>
                    <p className="text-gray-600 mt-1">
                      {player.first_name} {player.last_name}
                    </p>
                  </div>
                </div>
                <Link
                  to={`/players/${player.id}`}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-md transition duration-150 ease-in-out"
                >
                  View Full Profile
                </Link>
              </div>
            </div>

            <div className="px-6 py-4">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Player Photo */}
                <div className="lg:col-span-1">
                  <div className="bg-gray-50 rounded-lg p-4">
                    {playerPhotoUrl ? (
                      <img
                        src={playerPhotoUrl}
                        alt={`${player.first_name} ${player.last_name}`}
                        className="w-full h-64 object-cover rounded-lg"
                      />
                    ) : (
                      <div className="w-full h-64 bg-gray-200 rounded-lg flex items-center justify-center">
                        <span className="text-gray-500">No photo</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Player Information */}
                <div className="lg:col-span-2">
                  <div className="space-y-6">
                    {/* Basic Information */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Name</label>
                          <p className="mt-1 text-sm text-gray-900">{player.first_name} {player.last_name}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Jersey Number</label>
                          <p className="mt-1 text-sm text-gray-900">{player.jersey_number || 'Not assigned'}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Birthdate</label>
                          <p className="mt-1 text-sm text-gray-900">
                            {player.birthdate ? formatBirthdate(player.birthdate) : 'Not provided'}
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Age</label>
                          <p className="mt-1 text-sm text-gray-900">
                            {player.birthdate ? calculateAge(player.birthdate) : 'Not available'}
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Dominant Hand</label>
                          <p className="mt-1 text-sm text-gray-900">{player.hand || 'Not specified'}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Accreditations</label>
                          <div className="mt-1">
                            {player.accreditations && player.accreditations.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {player.accreditations.map(acc => getAccreditationBadges(acc))}
                              </div>
                            ) : (
                              <span className="text-sm text-gray-500">None assigned</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Club Information */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Club Information</h3>
                      <div className="flex items-center space-x-4">
                        {signedUrl && (
                          <img
                            src={signedUrl}
                            alt={player.clubs?.name || 'Club logo'}
                            className="w-12 h-12 object-contain rounded"
                          />
                        )}
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Club</label>
                          <p className="mt-1 text-sm text-gray-900">{player.clubs?.name || 'No club assigned'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Squad Information */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Squad Information</h3>
                      {player.player_squads && player.player_squads.length > 0 ? (
                        <div className="space-y-2">
                          {player.player_squads.map((ps, index) => (
                            <div key={index} className="flex items-center space-x-2">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                {ps.squads.name}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">Not assigned to any squads</p>
                      )}
                    </div>

                    {/* Contact Information */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Contact Information</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Email</label>
                          <p className="mt-1 text-sm text-gray-900">{player.email || 'Not provided'}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Phone</label>
                          <p className="mt-1 text-sm text-gray-900">{player.phone || 'Not provided'}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Emergency Contact</label>
                          <p className="mt-1 text-sm text-gray-900">{player.emergency_contact || 'Not provided'}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Emergency Phone</label>
                          <p className="mt-1 text-sm text-gray-900">{player.emergency_phone || 'Not provided'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Notes */}
                    {player.notes && (
                      <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Notes</h3>
                        <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md">{player.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PlayerProfile 