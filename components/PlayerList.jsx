import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../src/lib/supabase'
import { useAuth } from '../src/contexts/AuthContext'
import { formatAccreditations, getAccreditationBadges, calculateAge, formatBirthdate } from '../src/utils/formatters'
import OrganizationHeader from './OrganizationHeader'

const PlayerList = () => {
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sortField, setSortField] = useState('created_at')
  const [sortDirection, setSortDirection] = useState('desc')
  // State for signed URLs
  const [signedUrls, setSignedUrls] = useState({})
  const [playerPhotoUrls, setPlayerPhotoUrls] = useState({})
  const { user } = useAuth()
  const params = useParams()
  const orgId = params.orgId // Get organization ID from route params


  useEffect(() => {
    fetchPlayers()
  }, [sortField, sortDirection])

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

  const fetchPlayers = async () => {
    try {
      setLoading(true)
      let query = supabase
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
        .order(sortField, { ascending: sortDirection === 'asc' })

      // If we're in an organization context, filter by organization_id
      if (orgId) {
        query = query.eq('organization_id', orgId)
      } else {
        // Otherwise, filter by coach_id (single tenant)
        query = query.eq('coach_id', user.id)
      }

      const { data, error } = await query

      if (error) throw error
      setPlayers(data || [])
    } catch (err) {
      setError('Failed to fetch players')
      console.error('Error fetching players:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (playerId) => {
    if (!confirm('Are you sure you want to delete this player?')) return

    try {
      let query = supabase
        .from('players')
        .delete()
        .eq('id', playerId)

      // If we're in an organization context, ensure the player belongs to the organization
      if (orgId) {
        query = query.eq('organization_id', orgId)
      } else {
        // Otherwise, ensure the player belongs to the coach
        query = query.eq('coach_id', user.id)
      }

      const { error } = await query

      if (error) throw error
      
      // Refresh the list
      fetchPlayers()
    } catch (err) {
      setError('Failed to delete player')
      console.error('Error deleting player:', err)
    }
  }

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const getSortIcon = (field) => {
    if (sortField !== field) {
      return '↕️'
    }
    return sortDirection === 'asc' ? '↑' : '↓'
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              {orgId ? (
                <OrganizationHeader title="Players" />
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Link
                      to="/dashboard"
                      className="text-gray-600 hover:text-gray-800 font-medium"
                    >
                      ← Back to Dashboard
                    </Link>
                    <h1 className="text-3xl font-bold text-gray-900">Players</h1>
                  </div>
                  <Link
                    to="/players/add"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-md transition duration-150 ease-in-out"
                  >
                    Add Player
                  </Link>
                </div>
              )}
              {orgId && (
                <div className="mt-4 flex justify-end">
                  <Link
                    to={`/organisations/${orgId}/players/add`}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-md transition duration-150 ease-in-out"
                  >
                    Add Player
                  </Link>
                </div>
              )}
            </div>

            {error && (
              <div className="px-6 py-4">
                <div className="rounded-md bg-red-50 p-4">
                  <div className="text-sm text-red-700">{error}</div>
                </div>
              </div>
            )}

            <div className="px-6 py-4">
              {players.length > 0 && (
                <div className="mb-4 flex items-center space-x-4">
                  <span className="text-sm font-medium text-gray-700">Sort by:</span>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleSort('first_name')}
                      className={`px-3 py-1 text-sm rounded-md transition-colors ${
                        sortField === 'first_name'
                          ? 'bg-indigo-100 text-indigo-700'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      First Name {getSortIcon('first_name')}
                    </button>
                    <button
                      onClick={() => handleSort('last_name')}
                      className={`px-3 py-1 text-sm rounded-md transition-colors ${
                        sortField === 'last_name'
                          ? 'bg-indigo-100 text-indigo-700'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Last Name {getSortIcon('last_name')}
                    </button>
                    <button
                      onClick={() => handleSort('birthdate')}
                      className={`px-3 py-1 text-sm rounded-md transition-colors ${
                        sortField === 'birthdate'
                          ? 'bg-indigo-100 text-indigo-700'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Age {getSortIcon('birthdate')}
                    </button>
                  </div>
                </div>
              )}
              {players.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-500 text-lg mb-4">No players found</div>
                  <Link
                    to={orgId ? `/organisations/${orgId}/players/add` : "/players/add"}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-md transition duration-150 ease-in-out"
                  >
                    Add Your First Player
                  </Link>
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
                                {player.player_squads && player.player_squads.length > 0 && (
                                  <div className="flex items-center space-x-2">
                                    <span className="text-xs text-gray-500">Squads:</span>
                                    <div className="flex flex-wrap gap-1">
                                      {player.player_squads.map((ps, index) => {
                                        const is2024Squad = ps.squads.name.includes('2024')
                                        return (
                                          <span
                                            key={ps.squads.id}
                                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                              is2024Squad 
                                                ? 'bg-yellow-100 text-yellow-800' 
                                                : 'bg-blue-100 text-blue-800'
                                            }`}
                                          >
                                            {ps.squads.name}
                                          </span>
                                        )
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                              {/* Contact Information */}
                              {(player.phone || player.email || player.skate_australia_number) && (
                                <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                                  {player.phone && (
                                    <span>📞 {player.phone}</span>
                                  )}
                                  {player.email && (
                                    <span>📧 {player.email}</span>
                                  )}
                                  {player.skate_australia_number && (
                                    <span>🏒 SA: {player.skate_australia_number}</span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <Link
                              to={orgId ? `/organisations/${orgId}/players/${player.id}` : `/players/${player.id}`}
                              className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                            >
                              View
                            </Link>
                            <Link
                              to={orgId ? `/organisations/${orgId}/players/${player.id}/edit` : `/players/${player.id}/edit`}
                              className="text-green-600 hover:text-green-800 text-sm font-medium"
                            >
                              Edit
                            </Link>
                            <button
                              onClick={() => handleDelete(player.id)}
                              className="text-red-600 hover:text-red-800 text-sm font-medium"
                            >
                              Delete
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

export default PlayerList