import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../src/contexts/AuthContext'
import { supabase } from '../src/lib/supabase'

const RoleBasedRedirect = () => {
  const { user, userRoles, loading } = useAuth()
  const [userOrganization, setUserOrganization] = useState(null)
  const [fetchingOrg, setFetchingOrg] = useState(false)

  console.log('RoleBasedRedirect: user:', !!user, 'userRoles:', userRoles, 'loading:', loading)

  // Fetch user's organization if they have any role (admin, coach, player)
  useEffect(() => {
    const fetchUserOrganization = async () => {
      if (user && (userRoles.includes('admin') || userRoles.includes('coach') || userRoles.includes('player')) && !fetchingOrg) {
        try {
          setFetchingOrg(true)
          const { data: orgId, error } = await supabase.rpc('get_user_organization', {
            user_uuid: user.id
          })

          if (error) {
            console.error('Error fetching user organization:', error)
          } else {
            setUserOrganization(orgId)
          }
        } catch (err) {
          console.error('Error fetching user organization:', err)
        } finally {
          setFetchingOrg(false)
        }
      }
    }

    fetchUserOrganization()
  }, [user, userRoles, fetchingOrg])

  // Show loading while determining user roles or fetching organization
  if (loading || ((userRoles.includes('admin') || userRoles.includes('coach') || userRoles.includes('player')) && fetchingOrg)) {
    console.log('RoleBasedRedirect: Still loading, showing spinner')
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  // If no user, redirect to login
  if (!user) {
    console.log('RoleBasedRedirect: No user, redirecting to login')
    return <Navigate to="/login" replace />
  }

  // Determine redirect based on user roles
  if (userRoles.includes('superadmin')) {
    console.log('RoleBasedRedirect: User is superadmin, redirecting to organisations')
    return <Navigate to="/organisations" replace />
  } else if (userRoles.includes('admin') || userRoles.includes('coach') || userRoles.includes('player')) {
    if (userOrganization) {
      console.log('RoleBasedRedirect: User is admin/coach/player, redirecting to their organization:', userOrganization)
      return <Navigate to={`/organisations/${userOrganization}`} replace />
    } else {
      console.log('RoleBasedRedirect: User is admin/coach/player but no organization found, redirecting to dashboard')
      return <Navigate to="/dashboard" replace />
    }
  } else {
    console.log('RoleBasedRedirect: No specific role found, redirecting to dashboard as fallback')
    // Fallback to dashboard if no specific role is found
    return <Navigate to="/dashboard" replace />
  }
}

export default RoleBasedRedirect 