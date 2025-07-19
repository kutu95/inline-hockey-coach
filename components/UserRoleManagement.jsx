import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../src/lib/supabase'
import { useAuth } from '../src/contexts/AuthContext'

const UserRoleManagement = () => {
  const { userId } = useParams()
  const navigate = useNavigate()
  const { user, hasRole, userRoles: currentUserRoles } = useAuth()
  const [targetUser, setTargetUser] = useState(null)
  const [userRoles, setUserRoles] = useState([])
  const [availableRoles, setAvailableRoles] = useState([])
  const [filteredRoles, setFilteredRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    if (!hasRole('admin') && !hasRole('superadmin')) {
      navigate('/dashboard')
      return
    }
    
    fetchUserData()
    fetchAvailableRoles()
  }, [userId])

  // Recalculate filtered roles when available roles or user roles change
  useEffect(() => {
    console.log('useEffect triggered - recalculating filtered roles')
    console.log('Dependencies changed:', {
      availableRolesCount: availableRoles.length,
      currentUserRoles: currentUserRoles,
      userId: userId,
      user_id: user?.id
    })
    
    const filtered = getFilteredAvailableRoles()
    setFilteredRoles(filtered)
  }, [availableRoles, currentUserRoles, userId, user?.id])

  const fetchUserData = async () => {
    try {
      setLoading(true)
      
      // Since we can't use auth.admin.getUserById, we'll get user info from the players table
      // and construct a basic user object
      const { data: playerData, error: playerError } = await supabase
        .from('players')
        .select('email, user_id, created_at')
        .eq('user_id', userId)
        .single()
      
      if (playerError) {
        console.error('Error fetching player data:', playerError)
        setError('User not found')
        return
      }
      
      // Create a basic user object with available data
      const userInfo = {
        id: userId,
        email: playerData.email,
        created_at: playerData.created_at,
        last_sign_in_at: null // We don't have this info without admin access
      }
      
      setTargetUser(userInfo)
      
      // Get user roles
      const { data: roles, error: rolesError } = await supabase.rpc('get_user_roles_safe', {
        user_uuid: userId
      })
      
      if (!rolesError && roles) {
        setUserRoles(Array.isArray(roles) ? roles : [])
      } else {
        console.warn('Error fetching user roles:', rolesError)
        setUserRoles([])
      }
    } catch (err) {
      console.error('Error fetching user data:', err)
      setError('Failed to fetch user data')
    } finally {
      setLoading(false)
    }
  }

  const fetchAvailableRoles = async () => {
    try {
      const { data, error } = await supabase
        .from('roles')
        .select('id, name, description')
        .order('name')
      
      if (!error && data) {
        setAvailableRoles(data)
      } else {
        console.warn('Error fetching available roles:', error)
      }
    } catch (err) {
      console.error('Error fetching available roles:', err)
    }
  }

  // Filter available roles based on current user's permissions
  const getFilteredAvailableRoles = () => {
    console.log('=== FILTERING ROLES ===')
    console.log('Available roles:', availableRoles.map(r => r.name))
    console.log('Current user roles:', currentUserRoles)
    console.log('Has superadmin role:', hasRole('superadmin'))
    console.log('Current user ID:', user?.id)
    console.log('Target user ID:', userId)
    console.log('Is self assignment:', userId === user?.id)
    
    if (!availableRoles.length) {
      console.log('No available roles, returning empty array')
      return []
    }
    
    const filtered = availableRoles.filter(role => {
      console.log(`Checking role: ${role.name}`)
      
      // Only superadmins can assign superadmin role
      if (role.name === 'superadmin' && !hasRole('superadmin')) {
        console.log('❌ Filtering out superadmin role - user is not superadmin')
        return false
      }
      
      // Users cannot assign roles to themselves (except superadmins)
      if (userId === user?.id && !hasRole('superadmin')) {
        console.log('❌ Filtering out role - user cannot assign to themselves')
        return false
      }
      
      console.log(`✅ Keeping role: ${role.name}`)
      return true
    })
    
    console.log('Final filtered roles:', filtered.map(r => r.name))
    console.log('=== END FILTERING ===')
    return filtered
  }

  const handleRoleToggle = async (roleName) => {
    if (!hasRole('admin') && !hasRole('superadmin')) {
      setError('Insufficient permissions')
      return
    }

    setUpdating(true)
    setError('')

    try {
      if (userRoles.includes(roleName)) {
        // Remove role
        const { error } = await supabase.rpc('remove_user_role', {
          role_name: roleName,
          user_uuid: userId
        })
        
        if (error) throw error
        
        setUserRoles(prev => prev.filter(role => role !== roleName))
      } else {
        // Add role
        const { error } = await supabase.rpc('assign_user_role', {
          role_name: roleName,
          user_uuid: userId
        })
        
        if (error) throw error
        
        setUserRoles(prev => [...prev, roleName])
      }
    } catch (err) {
      setError(`Failed to ${userRoles.includes(roleName) ? 'remove' : 'add'} role: ${err.message}`)
      console.error('Error updating role:', err)
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (!targetUser) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="bg-white shadow rounded-lg p-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">User Not Found</h2>
                <p className="text-gray-600 mb-6">The user you're looking for doesn't exist.</p>
                <Link
                  to="/admin/users"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-md transition duration-150 ease-in-out"
                >
                  Back to Users
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
                    to="/admin/users"
                    className="text-gray-600 hover:text-gray-800 font-medium"
                  >
                    ← Back to Users
                  </Link>
                  <h1 className="text-3xl font-bold text-gray-900">Manage User Roles</h1>
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
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">User Information</h2>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <span className="text-gray-600">Email:</span>
                      <span className="font-medium ml-2">{targetUser.email}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">User ID:</span>
                      <span className="font-medium ml-2 font-mono text-sm">{targetUser.id}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Created:</span>
                      <span className="font-medium ml-2">
                        {new Date(targetUser.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Last Sign In:</span>
                      <span className="font-medium ml-2">
                        {targetUser.last_sign_in_at 
                          ? new Date(targetUser.last_sign_in_at).toLocaleDateString()
                          : 'Never'
                        }
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Current Roles</h2>
                {userRoles.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {userRoles.map(role => (
                      <span
                        key={role}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800"
                      >
                        {role}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600">No roles assigned</p>
                )}
              </div>

              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Available Roles</h2>
                {filteredRoles.length === 0 ? (
                  <p className="text-gray-600">No roles available to assign</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredRoles.map(role => (
                      <div
                        key={role.id}
                        className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                      >
                        <div>
                          <h3 className="font-medium text-gray-900">{role.name}</h3>
                          {role.description && (
                            <p className="text-sm text-gray-600">{role.description}</p>
                          )}
                        </div>
                        <button
                          onClick={() => handleRoleToggle(role.name)}
                          disabled={updating}
                          className={`px-4 py-2 rounded-md font-medium transition duration-150 ease-in-out ${
                            userRoles.includes(role.name)
                              ? 'bg-red-600 hover:bg-red-700 text-white'
                              : 'bg-green-600 hover:bg-green-700 text-white'
                          } disabled:bg-gray-400`}
                        >
                          {updating ? 'Updating...' : userRoles.includes(role.name) ? 'Remove' : 'Add'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default UserRoleManagement 