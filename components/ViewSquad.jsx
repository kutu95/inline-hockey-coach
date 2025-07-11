import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../src/lib/supabase'
import { useAuth } from '../src/contexts/AuthContext'
import { formatAccreditations, getAccreditationBadges, calculateAge } from '../src/utils/formatters'

const ViewSquad = () => {
  const { id } = useParams()
  const { user } = useAuth()
  const [squad, setSquad] = useState(null)
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [signedUrls, setSignedUrls] = useState({})
  const [playerPhotoUrls, setPlayerPhotoUrls] = useState({})

  useEffect(() => {
    fetchSquadAndPlayers()
  }, [id])

  // Function to get signed URL for club logos
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

  // Function to get signed URL for player photos
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

  // Get signed URLs for all club logos and player photos
  useEffect(() => {
    const getSignedUrls = async () => {
      const clubUrls = {}
      const photoUrls = {}
      
      for (const player of players) {
        if (player.clubs?.logo_url) {
          clubUrls[player.clubs.id] = await getSignedUrl(player.clubs.logo_url)
        }
        if (player.photo_url) {
          photoUrls[player.id] = await getSignedUrlForPlayerPhoto(player.photo_url)
        }
      }
      
      setSignedUrls(clubUrls)
      setPlayerPhotoUrls(photoUrls)
    }
    
    if (players.length > 0) {
      getSignedUrls()
    }
  }, [players])

  const fetchSquadAndPlayers = async () => {
    try {
      setLoading(true)
      
      // Fetch squad details
      const { data: squadData, error: squadError } = await supabase
        .from('squads')
        .select('*')
        .eq('id', id)
        .eq('coach_id', user.id)
        .single()

      if (squadError) throw squadError
      setSquad(squadData)

      // Fetch players in this squad
      const { data: playersData, error: playersError } = await supabase
        .from('player_squads')
        .select(`
          players!inner (
            id,
            first_name,
            last_name,
            birthdate,
            jersey_number,
            accreditations,
            photo_url,
            clubs:club_id (
              id,
              name,
              logo_url
            )
          )
        `)
        .eq('squad_id', id)

      if (playersError) throw playersError
      
      // Extract players from the nested structure
      const squadPlayers = playersData.map(ps => ps.players)
      setPlayers(squadPlayers)
    } catch (err) {
      setError('Failed to fetch squad information')
      console.error('Error fetching squad:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleRemovePlayer = async (playerId) => {
    if (!confirm('Are you sure you want to remove this player from the squad?')) return

    try {
      const { error } = await supabase
        .from('player_squads')
        .delete()
        .eq('squad_id', id)
        .eq('player_id', playerId)

      if (error) throw error
      
      // Refresh the list
      fetchSquadAndPlayers()
    } catch (err) {
      setError('Failed to remove player from squad')
      console.error('Error removing player from squad:', err)
    }
  }

  // Calculate average age of squad members
  const calculateAverageAge = () => {
    const playersWithAge = players.filter(player => player.birthdate)
    
    if (playersWithAge.length === 0) {
      return null
    }
    
    const totalAge = playersWithAge.reduce((sum, player) => {
      return sum + calculateAge(player.birthdate)
    }, 0)
    
    return Math.round(totalAge / playersWithAge.length)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (!squad) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="bg-white shadow rounded-lg p-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Squad Not Found</h2>
                <p className="text-gray-600 mb-6">The squad you're looking for doesn't exist or you don't have permission to view it.</p>
                <Link
                  to="/squads"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-md transition duration-150 ease-in-out"
                >
                  Back to Squads
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
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Link
                    to="/squads"
                    className="text-gray-600 hover:text-gray-800 font-medium"
                  >
                    ← Back to Squads
                  </Link>
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">
                      {squad.name}
                    </h1>
                    <div className="flex items-center space-x-4 mt-1">
                      <p className="text-gray-600">
                        {players.length} player{players.length !== 1 ? 's' : ''} in squad
                      </p>
                      {calculateAverageAge() && (
                        <p className="text-gray-600">
                          Average age: {calculateAverageAge()} years old
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <div className="px-6 py-4">
                <div className="rounded-md bg-red-50 p-4">
                  <div className="text-sm text-red-700">{error}</div>
                </div>
              </div>
            )}

            <div className="px-6 py-4">
              {players.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-500 text-lg mb-4">No players in this squad</div>
                  <p className="text-gray-400">Assign players to this squad from their individual player pages</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {players.map((player) => (
                    <div key={player.id} className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200">
                      <div className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            {player.photo_url ? (
                              <img
                                src={playerPhotoUrls[player.id] || player.photo_url}
                                alt={`${player.first_name} ${player.last_name}`}
                                className="w-12 h-12 object-cover rounded-full border border-gray-300"
                              />
                            ) : (
                              <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                                <span className="text-gray-500 text-sm font-medium">
                                  {player.first_name.charAt(0)}{player.last_name.charAt(0)}
                                </span>
                              </div>
                            )}
                            <div className="flex-1">
                              <div className="flex items-center space-x-3">
                                <h3 className="text-lg font-semibold text-gray-900">
                                  {player.first_name} {player.last_name}
                                </h3>
                                {player.jersey_number && (
                                  <span className="text-sm text-gray-500">#{player.jersey_number}</span>
                                )}
                                {player.hand && (
                                  <span className="text-sm text-gray-500 capitalize">{player.hand}</span>
                                )}
                                {player.birthdate && (
                                  <span className="text-sm text-gray-500">
                                    {calculateAge(player.birthdate)} years old
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center space-x-4 mt-1">
                                <div className="flex flex-wrap gap-1">
                                  {getAccreditationBadges(player.accreditations).map((badge, index) => (
                                    <span
                                      key={index}
                                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}
                                    >
                                      {badge.text}
                                    </span>
                                  ))}
                                </div>
                                <div className="flex items-center space-x-2">
                                  {player.clubs?.logo_url ? (
                                    <img
                                      src={signedUrls[player.clubs.id] || player.clubs.logo_url}
                                      alt={`${player.clubs.name} logo`}
                                      className="w-5 h-5 object-contain"
                                    />
                                  ) : null}
                                  <span className="text-sm text-gray-600">
                                    {player.clubs?.name || 'No club assigned'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <Link
                              to={`/players/${player.id}`}
                              className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                            >
                              View
                            </Link>
                            <button
                              onClick={() => handleRemovePlayer(player.id)}
                              className="text-red-600 hover:text-red-800 text-sm font-medium"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ViewSquad 