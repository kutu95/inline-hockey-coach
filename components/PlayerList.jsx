import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../src/lib/supabase'
import { useAuth } from '../src/contexts/AuthContext'
import { formatAccreditations, getAccreditationBadges, calculateAge, formatBirthdate } from '../src/utils/formatters'
import OrganizationHeader from './OrganizationHeader'

const PlayerList = () => {
  const [players, setPlayers] = useState([])
  const [filteredPlayers, setFilteredPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sortField, setSortField] = useState('created_at')
  const [sortDirection, setSortDirection] = useState('desc')
  // State for signed URLs
  const [signedUrls, setSignedUrls] = useState({})
  const [playerPhotoUrls, setPlayerPhotoUrls] = useState({})
  // Filter states
  const [filters, setFilters] = useState({
    minAge: '',
    maxAge: '',
    accreditations: [],
    division: '',
    hand: ''
  })
  const [showFilters, setShowFilters] = useState(false)
  // Search state
  const [searchTerm, setSearchTerm] = useState('')
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

  // Apply filters to players
  useEffect(() => {
    let filtered = [...players]

    // Filter by search term (first name and last name)
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim()
      filtered = filtered.filter(player => {
        const firstName = (player.first_name || '').toLowerCase()
        const lastName = (player.last_name || '').toLowerCase()
        const fullName = `${firstName} ${lastName}`.trim()
        
        return firstName.includes(searchLower) || 
               lastName.includes(searchLower) || 
               fullName.includes(searchLower)
      })
    }

    // Filter by age
    if (filters.minAge) {
      const minAge = parseInt(filters.minAge)
      filtered = filtered.filter(player => {
        if (!player.birthdate) return false
        const age = calculateAge(player.birthdate)
        return age >= minAge
      })
    }

    if (filters.maxAge) {
      const maxAge = parseInt(filters.maxAge)
      filtered = filtered.filter(player => {
        if (!player.birthdate) return false
        const age = calculateAge(player.birthdate)
        return age <= maxAge
      })
    }

    // Filter by accreditations
    if (filters.accreditations.length > 0) {
      filtered = filtered.filter(player => {
        if (!player.accreditations || player.accreditations.length === 0) return false
        return filters.accreditations.some(acc => player.accreditations.includes(acc))
      })
    }

    // Filter by hand
    if (filters.hand) {
      filtered = filtered.filter(player => player.hand === filters.hand)
    }

    // Filter by division
    if (filters.division) {
      const currentYear = new Date().getFullYear()
      filtered = filtered.filter(player => {
        if (!player.birthdate) return false
        const age = calculateAge(player.birthdate)
        
        switch (filters.division) {
          case 'Seniors':
            return age >= 17
          case 'Masters':
            return age >= 35
          case 'Veterans':
            return age >= 45
          case 'Supavets':
            return age >= 50
          default:
            return true
        }
      })
    }

    setFilteredPlayers(filtered)
  }, [players, filters, searchTerm])

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

  // Filter handlers
  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }))
  }

  const handleAccreditationToggle = (accreditation) => {
    setFilters(prev => ({
      ...prev,
      accreditations: prev.accreditations.includes(accreditation)
        ? prev.accreditations.filter(acc => acc !== accreditation)
        : [...prev.accreditations, accreditation]
    }))
  }

  const clearFilters = () => {
    setFilters({
      minAge: '',
      maxAge: '',
      accreditations: [],
      division: '',
      hand: ''
    })
    setSearchTerm('')
  }

  const availableAccreditations = ['skater', 'goalie', 'coach', 'referee']

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
                      to={orgId ? `/organisations/${orgId}/players` : "/players"}
                      className="text-gray-600 hover:text-gray-800 font-medium"
                    >
                      ← Back to Players
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

            {/* Search Bar */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="max-w-md">
                <label htmlFor="player-search" className="block text-sm font-medium text-gray-700 mb-2">
                  Search Players
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="player-search"
                    placeholder="Search by first name or surname..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-3 py-2 pl-10 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Filter Panel */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center space-x-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z" />
                  </svg>
                  <span>Filters {showFilters ? '▼' : '▶'}</span>
                </button>
                {(searchTerm || filters.minAge || filters.maxAge || filters.accreditations.length > 0 || filters.division || filters.hand) && (
                  <button
                    onClick={clearFilters}
                    className="text-sm text-red-600 hover:text-red-800"
                  >
                    Clear All Filters
                  </button>
                )}
              </div>

              {showFilters && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Age Filters */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Age Range</label>
                    <div className="flex space-x-2">
                      <input
                        type="number"
                        placeholder="Min"
                        value={filters.minAge}
                        onChange={(e) => handleFilterChange('minAge', e.target.value)}
                        className="w-20 px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                      <span className="text-gray-500 self-center">to</span>
                      <input
                        type="number"
                        placeholder="Max"
                        value={filters.maxAge}
                        onChange={(e) => handleFilterChange('maxAge', e.target.value)}
                        className="w-20 px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Division Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Division</label>
                    <select
                      value={filters.division}
                      onChange={(e) => handleFilterChange('division', e.target.value)}
                      className="w-full px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="">All Divisions</option>
                      <option value="Seniors">Seniors (17+)</option>
                      <option value="Masters">Masters (35+)</option>
                      <option value="Veterans">Veterans (45+)</option>
                      <option value="Supavets">Supavets (50+)</option>
                    </select>
                  </div>

                  {/* Hand Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Dominant Hand</label>
                    <select
                      value={filters.hand}
                      onChange={(e) => handleFilterChange('hand', e.target.value)}
                      className="w-full px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="">All Hands</option>
                      <option value="left">Left</option>
                      <option value="right">Right</option>
                    </select>
                  </div>

                  {/* Accreditations Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Accreditations</label>
                    <div className="space-y-1">
                      {availableAccreditations.map(accreditation => (
                        <label key={accreditation} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={filters.accreditations.includes(accreditation)}
                            onChange={() => handleAccreditationToggle(accreditation)}
                            className="mr-2 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="text-sm text-gray-700 capitalize">{accreditation}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4">
              {filteredPlayers.length > 0 && (
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
              {filteredPlayers.length === 0 ? (
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
                  {filteredPlayers.map((player) => (
                    <div key={player.id} className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200">
                      <div className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            {/* Image as link */}
                            <Link
                              to={orgId ? `/organisations/${orgId}/players/${player.id}` : `/players/${player.id}`}
                              className="hover:opacity-80 transition-opacity"
                            >
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
                            </Link>
                            <div className="flex-1">
                              <div className="flex items-center space-x-3">
                                {/* Name as link */}
                                <Link
                                  to={orgId ? `/organisations/${orgId}/players/${player.id}` : `/players/${player.id}`}
                                  className="hover:text-indigo-600 transition-colors"
                                >
                                  <h3 className="text-lg font-semibold text-gray-900">
                                    {player.first_name} {player.last_name}
                                  </h3>
                                </Link>
                                {player.jersey_number && (
                                  <span className="text-sm text-gray-500">#{player.jersey_number}</span>
                                )}
                                {player.hand && (
                                  <span className="text-sm text-gray-500 capitalize">{player.hand}</span>
                                )}
                                {/* Age as link */}
                                {player.birthdate && (
                                  <Link
                                    to={orgId ? `/organisations/${orgId}/players/${player.id}` : `/players/${player.id}`}
                                    className="hover:text-indigo-600 transition-colors"
                                  >
                                    <span className="text-sm text-gray-500">
                                      {calculateAge(player.birthdate)} years old
                                    </span>
                                  </Link>
                                )}
                              </div>
                              <div className="flex items-center space-x-4 mt-1">
                                {/* Accreditations as link */}
                                <Link
                                  to={orgId ? `/organisations/${orgId}/players/${player.id}` : `/players/${player.id}`}
                                  className="hover:opacity-80 transition-opacity"
                                >
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
                                </Link>
                                {/* Club as link */}
                                <Link
                                  to={orgId ? `/organisations/${orgId}/players/${player.id}` : `/players/${player.id}`}
                                  className="hover:opacity-80 transition-opacity"
                                >
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
                                </Link>
                                {/* Squads remain unchanged */}
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
                              {/* Contact Information remains unchanged */}
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