import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../src/lib/supabase'
import { useAuth } from '../src/contexts/AuthContext'
import { formatAccreditations, getAccreditationBadges, calculateAge, formatBirthdate } from '../src/utils/formatters'

const PlayerList = () => {
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sortField, setSortField] = useState('created_at')
  const [sortDirection, setSortDirection] = useState('desc')
  const { user } = useAuth()



  useEffect(() => {
    fetchPlayers()
  }, [sortField, sortDirection])

  const fetchPlayers = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('players')
        .select(`
          *,
          clubs:club_id (
            id,
            name
          ),
          player_squads (
            squads (
              id,
              name
            )
          )
        `)
        .eq('coach_id', user.id)
        .order(sortField, { ascending: sortDirection === 'asc' })

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
      const { error } = await supabase
        .from('players')
        .delete()
        .eq('id', playerId)
        .eq('coach_id', user.id)

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
                    to="/players/add"
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
                                src={player.photo_url}
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
                                      src={player.clubs.logo_url}
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
                                      {player.player_squads.map((ps, index) => (
                                        <span
                                          key={ps.squads.id}
                                          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                                        >
                                          {ps.squads.name}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
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
                            <Link
                              to={`/players/${player.id}/edit`}
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