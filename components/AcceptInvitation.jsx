import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../src/lib/supabase'
import { useAuth } from '../src/contexts/AuthContext'

const AcceptInvitation = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { signIn, user, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [invitation, setInvitation] = useState(null)
  const [player, setPlayer] = useState(null)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [settingPassword, setSettingPassword] = useState(false)

  // Robust token extraction
  let token = searchParams.get('token')
  if (token) {
    // Remove common trailing punctuation or whitespace (e.g., from mobile clients)
    token = token.replace(/[\s\.,;:!?]+$/, '')
  }

  useEffect(() => {
    // If user is already authenticated, redirect to home (let RoleBasedRedirect handle it)
    if (!authLoading && user) {
      console.log('AcceptInvitation: User already authenticated, redirecting to home')
      navigate('/')
      return
    }

    // Debugging for mobile issues
    console.log('AcceptInvitation: Token from URL params:', token)
    console.log('AcceptInvitation: Full URL:', window.location.href)
    console.log('AcceptInvitation: Search params:', window.location.search)

    if (token) {
      validateInvitation()
    } else {
      setError('Invalid invitation link - no token found')
      setLoading(false)
    }
  }, [token, user, authLoading, navigate])

  const validateInvitation = async () => {
    try {
      // Get invitation details
      const { data: invitationData, error: invitationError } = await supabase
        .from('invitations')
        .select(`
          *,
          players (
            id,
            first_name,
            last_name,
            email,
            accreditations
          )
        `)
        .eq('token', token)
        .single()

      if (invitationError) {
        throw new Error('Invalid or expired invitation')
      }

      if (!invitationData) {
        throw new Error('Invitation not found')
      }

      // Check if invitation is expired
      if (new Date(invitationData.expires_at) < new Date()) {
        throw new Error('Invitation has expired')
      }

      // Check if invitation is already accepted
      if (invitationData.accepted_at) {
        throw new Error('Invitation has already been accepted')
      }

      setInvitation(invitationData)
      setPlayer(invitationData.players)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const sendAdminNotifications = async (player, invitationId) => {
    try {
      // Get the organization ID for the new player
      const { data: playerOrgData } = await supabase
        .from('players')
        .select('organization_id')
        .eq('id', player.id)
        .single()

      if (playerOrgData?.organization_id) {
        // Get all users in the organization with admin roles
        // First get all players in the organization
        const { data: orgPlayers, error: playersError } = await supabase
          .from('players')
          .select('user_id, first_name, last_name')
          .eq('organization_id', playerOrgData.organization_id)
          .not('user_id', 'is', null)

        if (playersError) {
          console.error('Error fetching organization players:', playersError)
          return
        }

        if (!orgPlayers || orgPlayers.length === 0) {
          console.log('No players found in organization')
          return
        }

        // Get user roles for all players
        const userIds = orgPlayers.map(p => p.user_id).filter(Boolean)
        const { data: userRolesData, error: userRolesError } = await supabase
          .from('user_roles')
          .select(`
            user_id,
            roles(name)
          `)
          .in('user_id', userIds)

        if (userRolesError) {
          console.error('Error fetching user roles:', userRolesError)
          return
        }

        // Filter to only include users with admin roles
        const adminsToNotify = orgPlayers.filter(player => {
          const userRoles = userRolesData?.filter(ur => ur.user_id === player.user_id) || []
          return userRoles.some(ur => 
            ur.roles && ['admin', 'superadmin', 'coach'].includes(ur.roles.name)
          )
        })

        // Send notification to each admin
        for (const admin of adminsToNotify) {
          if (admin.user_id) {
            try {
              const { error: notificationError } = await supabase.functions.invoke('send-push-notification', {
                body: {
                  targetUserId: admin.user_id,
                  title: 'New Player Joined!',
                  body: `${player.first_name} ${player.last_name} has joined your organization.`,
                  data: {
                    type: 'invitation_accepted',
                    playerId: player.id,
                    playerName: `${player.first_name} ${player.last_name}`,
                    organizationId: playerOrgData.organization_id
                  }
                }
              })

              if (notificationError) {
                console.error(`Error sending push notification to admin ${admin.user_id}:`, notificationError)
                // Continue with other admins even if one fails
              } else {
                console.log(`Notification sent to admin: ${admin.first_name} ${admin.last_name}`)
              }
            } catch (error) {
              console.error(`Error sending push notification to admin ${admin.user_id}:`, error)
              // Continue with other admins even if one fails
            }
          }
        }

        console.log(`Sent notifications to ${adminsToNotify.length} admins in organization`)
      } else {
        console.log('Player has no organization, skipping admin notifications')
      }
    } catch (error) {
      console.error('Error sending admin notifications:', error)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSettingPassword(true)
    setError('')
    setSuccess('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setSettingPassword(false)
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long')
      setSettingPassword(false)
      return
    }

    try {
      // Create user account without email confirmation requirement
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: player.email,
        password: password,
        options: {
          emailConfirm: false
        }
      })

      if (authError) {
        throw authError
      }

      if (!authData.user) {
        throw new Error('Failed to create user account')
      }

      // If we have a session, the user is already signed in
      if (authData.session) {
        console.log('User signed up and signed in successfully')
      } else {
        console.log('User signed up but needs email confirmation')
      }

      // Update player record with user_id
      const { error: playerError } = await supabase
        .from('players')
        .update({ user_id: authData.user.id })
        .eq('id', player.id)

      if (playerError) {
        throw playerError
      }

      // Assign player role
      const { data: roleData, error: roleError } = await supabase
        .from('roles')
        .select('id')
        .eq('name', 'player')
        .single()

      if (roleError) {
        console.error('Error fetching player role:', roleError)
        throw new Error('Failed to assign player role')
      }

      if (roleData) {
        const { error: userRoleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: authData.user.id,
            role_id: roleData.id
          })

        if (userRoleError) {
          console.error('Error assigning player role:', userRoleError)
          throw new Error('Failed to assign player role')
        }

        console.log('Player role assigned successfully')
      } else {
        console.error('Player role not found in database')
        throw new Error('Player role not found')
      }

      // Verify role assignment was successful with retries
      let roleVerified = false
      let retryCount = 0
      const maxRetries = 5
      
      while (!roleVerified && retryCount < maxRetries) {
        console.log(`Verifying role assignment (attempt ${retryCount + 1}/${maxRetries})`)
        
        const { data: verifyRoleData, error: verifyRoleError } = await supabase
          .from('user_roles')
          .select('id')
          .eq('user_id', authData.user.id)
          .eq('role_id', roleData.id)
          .single()
        
        if (verifyRoleError || !verifyRoleData) {
          console.log(`Role verification failed (attempt ${retryCount + 1}), retrying...`)
          retryCount++
          await new Promise(resolve => setTimeout(resolve, 1000)) // Wait 1 second between retries
        } else {
          console.log('Role assignment verified successfully')
          roleVerified = true
        }
      }
      
      if (!roleVerified) {
        throw new Error('Role assignment verification failed after multiple attempts')
      }

      // Mark invitation as accepted
      const { error: invitationError } = await supabase
        .from('invitations')
        .update({ accepted_at: new Date().toISOString() })
        .eq('id', invitation.id)

      if (invitationError) {
        console.error('Error updating invitation:', invitationError)
      }

            // Send push notification to ALL admins in the organization (non-blocking)
      // Don't await this - let it run in the background
      sendAdminNotifications(player, invitation.id).catch(error => {
        console.error('Background notification error:', error)
        // Log the error but don't fail the invitation process
        // Push notifications are optional and can fail without breaking the flow
      })

      // If we don't have a session, try to sign in
      if (!authData.session) {
        const { error: signInError } = await signIn(player.email, password)
        if (signInError) {
          console.error('Sign in error:', signInError)
          // If sign in fails, show a helpful message
          if (signInError.message.includes('Email not confirmed')) {
            setSuccess('Account created successfully! Please try signing in again.')
          } else {
            throw signInError
          }
          setSettingPassword(false)
          return
        }
      }

      // Redirect to home page (which will handle role-based redirects)
      navigate('/')
      
      // Fallback redirect in case the main redirect doesn't work
      setTimeout(() => {
        if (window.location.pathname === '/accept-invitation') {
          console.log('Fallback redirect to home')
          navigate('/')
        }
      }, 2000)
    } catch (err) {
      setError(err.message || 'Failed to set up account')
      setSettingPassword(false)
    }
  }

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (error && !success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Invalid Invitation
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              {error}
            </p>
            <div className="mt-4">
              <button
                onClick={() => navigate('/login')}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Go to Login
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <img src="/Backcheck_large.png" alt="Backcheck Logo" className="mx-auto h-20 w-auto mb-4" />
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Welcome to Backcheck
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Set up your account to get started
          </p>
        </div>

        <div className="bg-white py-8 px-6 shadow rounded-lg">
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Player Information
            </h3>
            <div className="text-sm text-gray-600">
              <p><strong>Name:</strong> {player.first_name} {player.last_name}</p>
              <p><strong>Email:</strong> {player.email}</p>
              {player.accreditations && player.accreditations.length > 0 && (
                <p><strong>Accreditations:</strong> {player.accreditations.join(', ')}</p>
              )}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Set Your Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Enter your password"
                autoComplete="new-password"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Confirm your password"
                autoComplete="new-password"
              />
            </div>

            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="text-sm text-red-700">{error}</div>
              </div>
            )}
            
            {success && (
              <div className="rounded-md bg-green-50 p-4">
                <div className="text-sm text-green-700">{success}</div>
                <div className="mt-2">
                  <button
                    onClick={() => navigate('/login')}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Go to Login
                  </button>
                </div>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={settingPassword || success}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {settingPassword ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Setting up account...
                  </>
                ) : (
                  'Set Up Account'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default AcceptInvitation 