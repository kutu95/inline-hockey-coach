import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../src/contexts/AuthContext'
import { supabase } from '../src/lib/supabase'

const RoleBasedRedirect = () => {
  const { user, userRoles, loading } = useAuth()
  const [userOrganization, setUserOrganization] = useState(null)
  const [fetchingOrg, setFetchingOrg] = useState(false)
  const [fallbackOrg, setFallbackOrg] = useState(null)

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
            // Try to get fallback organization
            const { data: fallbackData } = await supabase
              .from('organizations')
              .select('id')
              .limit(1)
              .single()
            
            if (fallbackData) {
              setFallbackOrg(fallbackData.id)
            }
          } else {
            setUserOrganization(orgId)
          }
        } catch (err) {
          console.error('Error fetching user organization:', err)
          // Try to get fallback organization
          try {
            const { data: fallbackData } = await supabase
              .from('organizations')
              .select('id')
              .limit(1)
              .single()
            
            if (fallbackData) {
              setFallbackOrg(fallbackData.id)
            }
          } catch (fallbackErr) {
            console.error('Error fetching fallback organization:', fallbackErr)
          }
        } finally {
          setFetchingOrg(false)
        }
      }
    }

    fetchUserOrganization()
  }, [user, userRoles]) // Remove fetchingOrg from dependencies to prevent infinite loops

  // Show loading while determining user roles or fetching organization
  if (loading || ((userRoles.includes('admin') || userRoles.includes('coach') || userRoles.includes('player')) && fetchingOrg)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  // If no user, redirect to login
  if (!user) {
    return <Navigate to="/login" replace />
  }

  // Determine redirect based on user roles
  if (userRoles.includes('superadmin')) {
    return <Navigate to="/organisations" replace />
  } else if (userRoles.includes('admin') || userRoles.includes('coach') || userRoles.includes('player')) {
    if (userOrganization) {
      return <Navigate to={`/organisations/${userOrganization}`} replace />
    } else if (fallbackOrg) {
      return <Navigate to={`/organisations/${fallbackOrg}`} replace />
    } else {
      return <Navigate to="/dashboard" replace />
    }
  } else {
    // Fallback to dashboard if no specific role is found
    return <Navigate to="/dashboard" replace />
  }
}

export default RoleBasedRedirect 