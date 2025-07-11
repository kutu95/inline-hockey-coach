import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../src/lib/supabase'
import { useAuth } from '../src/contexts/AuthContext'

const UserAdmin = () => {
  const [users, setUsers] = useState([])
  const [roles, setRoles] = useState([])
  const [userRoles, setUserRoles] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const { user } = useAuth()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Fetch all users
      const { data: usersData, error: usersError } = await supabase
        .from('auth.users')
        .select('id, email, created_at')
        .order('created_at', { ascending: false })

      if (usersError) throw usersError

      // Fetch all roles
      const { data: rolesData, error: rolesError } = await supabase
        .from('roles')
        .select('*')
        .order('name')

      if (rolesError) throw rolesError

      // Fetch user roles for each user
      const userRolesData = {}
      for (const user of usersData || []) {
        const { data: userRoleData, error: userRoleError } = await supabase
          .rpc('get_user_roles', { user_uuid: user.id })
        
        if (!userRoleError && userRoleData) {
          userRolesData[user.id] = userRoleData.map(row => row.role_name)
        }
      }

      setUsers(usersData || [])
      setRoles(rolesData || [])
      setUserRoles(userRolesData)
    } catch (err) {
      setError('Failed to fetch data')
      console.error('Error fetching data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleRoleChange = async (userId, roleName, checked) => {
    try {
      setSaving(true)
      setError('')
      setSuccess('')

      const role = roles.find(r => r.name === roleName)
      if (!role) {
        setError('Role not found')
        return
      }

      if (checked) {
        // Add role
        const { error } = await supabase
          .from('user_roles')
          .insert({
            user_id: userId,
            role_id: role.id
          })

        if (error) throw error
      } else {
        // Remove role
        const { error } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', userId)
          .eq('role_id', role.id)

        if (error) throw error
      }

      // Update local state
      setUserRoles(prev => ({
        ...prev,
        [userId]: checked 
          ? [...(prev[userId] || []), roleName]
          : (prev[userId] || []).filter(r => r !== roleName)
      }))

      setSuccess(`Role ${checked ? 'added to' : 'removed from'} user successfully`)
    } catch (err) {
      setError(`Failed to ${checked ? 'add' : 'remove'} role`)
      console.error('Error updating role:', err)
    } finally {
      setSaving(false)
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Link 
            to="/dashboard" 
            className="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-500 mb-4"
          >
            ← Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">User Administration</h1>
          <p className="mt-2 text-gray-600">Manage user roles and access permissions</p>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="text-sm text-red-800">{error}</div>
          </div>
        )}

        {success && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-md p-4">
            <div className="text-sm text-green-800">{success}</div>
          </div>
        )}

        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Users ({users.length})
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Manage roles for each user. Check the roles you want to assign.
            </p>
          </div>
          
          <div className="border-t border-gray-200">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Joined
                    </th>
                    {roles.map(role => (
                      <th key={role.id} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {role.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map(user => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {user.email}
                        </div>
                        <div className="text-sm text-gray-500">
                          ID: {user.id.slice(0, 8)}...
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(user.created_at)}
                      </td>
                      {roles.map(role => (
                        <td key={role.id} className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={(userRoles[user.id] || []).includes(role.name)}
                            onChange={(e) => handleRoleChange(user.id, role.name, e.target.checked)}
                            disabled={saving}
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="mt-8 bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Role Descriptions
            </h3>
            <div className="space-y-3">
              {roles.map(role => (
                <div key={role.id} className="flex items-start">
                  <div className="flex-shrink-0">
                    <div className="w-2 h-2 bg-indigo-600 rounded-full mt-2"></div>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">{role.name}</p>
                    <p className="text-sm text-gray-500">{role.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default UserAdmin 