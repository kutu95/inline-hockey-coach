import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../src/lib/supabase'
import { useAuth } from '../src/contexts/AuthContext'
import { formatAccreditations, getAccreditationBadges, calculateAge, formatBirthdate } from '../src/utils/formatters'
import SquadAssignment from './SquadAssignment'
import { sendInvitationEmail } from '../src/lib/email'
import OrganizationHeader from './OrganizationHeader'

const ViewPlayer = () => {
  const { id, orgId } = useParams()
  const navigate = useNavigate()
  const { user, hasRole } = useAuth()
  const [player, setPlayer] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [signedUrl, setSignedUrl] = useState(null)
  const [playerPhotoUrl, setPlayerPhotoUrl] = useState(null)
  const [sendingInvitation, setSendingInvitation] = useState(false)
  const [isSuperadmin, setIsSuperadmin] = useState(false)
  const [playerRoles, setPlayerRoles] = useState([])

  useEffect(() => {
    checkSuperadminStatus()
    fetchPlayer()
  }, [id])

  // Fetch player roles when player data changes
  useEffect(() => {
    if (player?.user_id) {
      fetchPlayerRoles()
    } else {
      setPlayerRoles([])
    }
  }, [player?.user_id])

  const checkSuperadminStatus = async () => {
    try {
      const { data, error } = await supabase.rpc('is_superadmin', { user_uuid: user.id })
      if (!error && data) {
        setIsSuperadmin(true)
      }
    } catch (err) {
      console.error('Error checking superadmin status:', err)
    }
  }

  const fetchPlayerRoles = async () => {
    if (!player?.user_id) return
    
    try {
      const { data, error } = await supabase.rpc('get_user_roles_safe', { 
        user_uuid: player.user_id 
      })
      
      if (!error && data) {
        setPlayerRoles(Array.isArray(data) ? data : [])
      } else {
        console.warn('Error fetching player roles:', error)
        setPlayerRoles([])
      }
    } catch (err) {
      console.error('Error fetching player roles:', err)
      setPlayerRoles([])
    }
  }

  const getInvitationStatus = () => {
    if (!player.user_id) {
      return { status: 'No Account', color: 'text-red-600' }
    }
    
    // Check if player has roles
    if (playerRoles.length > 0) {
      const roleNames = playerRoles.join(', ')
      return { status: `Account exists (${roleNames})`, color: 'text-green-600' }
    }
    
    // Player has account but no roles
    return { status: 'Account exists', color: 'text-blue-600' }
  }

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

  const fetchPlayer = async () => {
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
              name,
              is_active
            )
          )
        `)
        .eq('id', id)
      
      // If we're in an organization context, filter by organization_id
      if (orgId) {
        query = query.eq('organization_id', orgId)
      }
      // RLS policies will handle access control for other cases
      
      const { data, error } = await query.single()

      if (error) throw error
      setPlayer(data)
    } catch (err) {
      setError('Failed to fetch player')
      console.error('Error fetching player:', err)
    } finally {
      setLoading(false)
    }
  }



  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this player?')) return

    try {
      let query = supabase
        .from('players')
        .delete()
        .eq('id', id)

      // If we're in an organization context, ensure the player belongs to the organization
      if (orgId) {
        query = query.eq('organization_id', orgId)
      } else {
        // Otherwise, ensure the player belongs to the coach
        query = query.eq('coach_id', user.id)
      }

      const { error } = await query

      if (error) throw error
      
      navigate(orgId ? `/organisations/${orgId}/players` : '/players')
    } catch (err) {
      setError('Failed to delete player')
      console.error('Error deleting player:', err)
    }
  }

  const handleSendInvitation = async () => {
    if (!player.email) {
      setError('Player must have an email address to send an invitation')
      return
    }

    setSendingInvitation(true)
    setError('')

    try {
      // Generate invitation token
      const { data: tokenData } = await supabase.rpc('generate_invitation_token')
      const token = tokenData || crypto.randomUUID()

      // Create invitation record
      const { error: invitationError } = await supabase
        .from('invitations')
        .insert({
          email: player.email,
          token: token,
          player_id: player.id,
          invited_by: user.id,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
        })

      if (invitationError) throw invitationError

      // Send invitation email
      try {
        const result = await sendInvitationEmail(
          player.email,
          token,
          `${player.first_name} ${player.last_name}`,
          user.email
        )
        setError('') // Clear any previous errors
        
        if (result.manual) {
          // Manual invitation link was shown
          alert('Invitation created! Please copy the link that was shown and send it to the player manually.')
        } else {
          // Email was sent successfully
          alert('Invitation sent successfully! Check the player\'s email for the invitation link.')
        }
      } catch (emailError) {
        console.error('Email sending failed:', emailError)
        // Fallback: Show the invitation link in the browser
        const invitationUrl = `${window.location.origin}/accept-invitation?token=${token}`
        alert(`Invitation created! Email sending failed, but you can share this link with the player:\n\n${invitationUrl}`)
      }
    } catch (err) {
      setError('Failed to send invitation: ' + err.message)
      console.error('Error sending invitation:', err)
    } finally {
      setSendingInvitation(false)
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
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Player Not Found</h2>
                <p className="text-gray-600 mb-6">The player you're looking for doesn't exist or you don't have permission to view it.</p>
                <Link
                  to={orgId ? `/organisations/${orgId}/players` : "/players"}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-md transition duration-150 ease-in-out"
                >
                  Back to Players
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
              {orgId ? (
                <OrganizationHeader title="Player Details" />
              ) : (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                  <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                    <Link
                      to={orgId ? `/organisations/${orgId}/players` : "/players"}
                      className="text-gray-600 hover:text-gray-800 font-medium"
                    >
                      ← Back to Players
                    </Link>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Player Details</h1>
                  </div>
                  <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                    <Link
                      to={`/players/${id}/edit`}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-md transition duration-150 ease-in-out w-full sm:w-auto text-center"
                    >
                      Edit Player
                    </Link>
                    <button
                      onClick={handleDelete}
                      className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-md transition duration-150 ease-in-out w-full sm:w-auto"
                    >
                      Delete Player
                    </button>
                  </div>
                </div>
              )}
              {orgId && (
                <div className="mt-4 flex justify-end space-x-3">
                  <Link
                    to={`/organisations/${orgId}/players/${id}/edit`}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-md transition duration-150 ease-in-out"
                  >
                    Edit Player
                  </Link>
                  <button
                    onClick={handleDelete}
                    className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-md transition duration-150 ease-in-out"
                  >
                    Delete Player
                  </button>
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Basic Information */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
                  {player.photo_url && (
                    <div className="mb-4">
                      <img
                        src={playerPhotoUrl || player.photo_url}
                        alt={`${player.first_name} ${player.last_name}`}
                        className="w-48 h-48 object-cover rounded-lg border border-gray-300"
                      />
                    </div>
                  )}
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Full Name:</span>
                      <span className="font-medium">{player.first_name} {player.last_name}</span>
                    </div>
                    {player.birthdate && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Age:</span>
                          <span className="font-medium">{calculateAge(player.birthdate)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Birthdate:</span>
                          <span className="font-medium">{formatBirthdate(player.birthdate)}</span>
                        </div>
                      </>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600">Accreditations:</span>
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
                    </div>
                    {player.jersey_number && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Jersey Number:</span>
                        <span className="font-medium">#{player.jersey_number}</span>
                      </div>
                    )}
                    {player.hand && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Dominant Hand:</span>
                        <span className="font-medium capitalize">{player.hand}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600">Club:</span>
                      <div className="flex items-center space-x-2">
                        {player.clubs?.logo_url ? (
                          <img
                            src={signedUrl || player.clubs.logo_url}
                            alt={`${player.clubs.name} logo`}
                            className="w-6 h-6 object-contain"
                          />
                        ) : (
                          <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
                            <span className="text-gray-500 text-xs">🏒</span>
                          </div>
                        )}
                        <span className="font-medium">{player.clubs?.name || 'No club assigned'}</span>
                      </div>
                    </div>
                    {player.player_squads && player.player_squads.length > 0 && (
                      <div className="space-y-2">
                        {/* Active Squads */}
                        {player.player_squads.filter(ps => ps.squads.is_active).length > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Active Squads:</span>
                            <div className="flex flex-wrap gap-2">
                              {player.player_squads
                                .filter(ps => ps.squads.is_active)
                                .map((ps, index) => (
                                  <div
                                    key={ps.squads.id}
                                    className="inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"
                                  >
                                    <span className="text-green-600">🏆</span>
                                    <span>{ps.squads.name}</span>
                                  </div>
                                ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Inactive Squads */}
                        {player.player_squads.filter(ps => !ps.squads.is_active).length > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Inactive Squads:</span>
                            <div className="flex flex-wrap gap-2">
                              {player.player_squads
                                .filter(ps => !ps.squads.is_active)
                                .map((ps, index) => (
                                  <div
                                    key={ps.squads.id}
                                    className="inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600"
                                  >
                                    <span className="text-gray-500">⏸️</span>
                                    <span>{ps.squads.name}</span>
                                  </div>
                                ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Contact Information */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
                  <div className="space-y-3">
                    {player.phone && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Phone:</span>
                        <span className="font-medium">{player.phone}</span>
                      </div>
                    )}
                    {player.email && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Email:</span>
                        <span className="font-medium">{player.email}</span>
                      </div>
                    )}
                    {player.email && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Account Status:</span>
                        <span className={`font-medium ${getInvitationStatus().color}`}>
                          {getInvitationStatus().status}
                        </span>
                      </div>
                    )}
                    {player.email && !player.user_id && (
                      <div className="mt-4">
                        <button
                          onClick={handleSendInvitation}
                          disabled={sendingInvitation || !player.email}
                          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-md transition duration-150 ease-in-out"
                        >
                          {sendingInvitation ? 'Sending Invitation...' : 'Send Account Invitation'}
                        </button>
                      </div>
                    )}
                    {player.email && player.user_id && (hasRole('admin') || hasRole('superadmin')) && (
                      <div className="mt-4">
                        <Link
                          to={`/user-role-management/${player.user_id}`}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition duration-150 ease-in-out inline-block text-center"
                        >
                          Manage User Roles
                        </Link>
                      </div>
                    )}
                    {player.skate_australia_number && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Skate Australia Number:</span>
                        <span className="font-medium">{player.skate_australia_number}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Squad Assignments */}
                <div className="md:col-span-2">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <SquadAssignment 
                      playerId={player.id} 
                      onUpdate={fetchPlayer}
                      orgId={orgId}
                    />
                  </div>
                </div>

                {/* Emergency Contact */}
                {(player.emergency_contact || player.emergency_phone) && (
                  <div className="md:col-span-2">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Emergency Contact</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {player.emergency_contact && (
                        <div>
                          <span className="text-gray-600">Contact Name:</span>
                          <span className="font-medium ml-2">{player.emergency_contact}</span>
                        </div>
                      )}
                      {player.emergency_phone && (
                        <div>
                          <span className="text-gray-600">Contact Phone:</span>
                          <span className="font-medium ml-2">{player.emergency_phone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {player.notes && (
                  <div className="md:col-span-2">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Notes</h3>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-gray-700 whitespace-pre-wrap">{player.notes}</p>
                    </div>
                  </div>
                )}

                {/* Additional Information */}
                <div className="md:col-span-2">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Added:</span>
                      <span className="font-medium">
                        {new Date(player.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    {player.updated_at && player.updated_at !== player.created_at && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Last Updated:</span>
                        <span className="font-medium">
                          {new Date(player.updated_at).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-gray-200">
                <div className="flex justify-between">
                  <Link
                    to={orgId ? `/organisations/${orgId}/players` : "/players"}
                    className="text-indigo-600 hover:text-indigo-800 font-medium"
                  >
                    ← Back to Players
                  </Link>
                  <Link
                    to={`/players/${id}/edit`}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-md transition duration-150 ease-in-out"
                  >
                    Edit Player
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ViewPlayer 