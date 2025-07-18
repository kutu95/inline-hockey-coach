import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../src/contexts/AuthContext'
import { supabase } from '../src/lib/supabase'

const RoleBasedRedirect = () => {
  const { user, userRoles, loading } = useAuth()
  const [userOrganization, setUserOrganization] = useState(null)
  const [fetchingOrg, setFetchingOrg] = useState(false)
  const [fallbackOrg, setFallbackOrg] = useState(null)

  console.log('RoleBasedRedirect: user:', !!user, 'userRoles:', userRoles, 'loading:', loading, 'userOrganization:', userOrganization, 'fetchingOrg:', fetchingOrg)

  // Fetch user's organization if they have any role (admin, coach, player)
  useEffect(() => {
    const fetchUserOrganization = async () => {
      console.log('RoleBasedRedirect: useEffect triggered - user:', !!user, 'userRoles:', userRoles, 'fetchingOrg:', fetchingOrg)
      
      if (user && (userRoles.includes('admin') || userRoles.includes('coach') || userRoles.includes('player')) && !fetchingOrg) {
        try {
          setFetchingOrg(true)
          console.log('RoleBasedRedirect: Fetching organization for user:', user.id)
          
          const { data: orgId, error } = await supabase.rpc('get_user_organization', {
            user_uuid: user.id
          })

          console.log('RoleBasedRedirect: RPC result - orgId:', orgId, 'error:', error)

          if (error) {
            console.error('Error fetching user organization:', error)
            // Try to get fallback organization
            const { data: fallbackData } = await supabase
              .from('organizations')
              .select('id')
              .limit(1)
              .single()
            
            if (fallbackData) {
              console.log('RoleBasedRedirect: Using fallback organization:', fallbackData.id)
              setFallbackOrg(fallbackData.id)
            }
          } else {
            console.log('RoleBasedRedirect: Found user organization:', orgId)
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
              console.log('RoleBasedRedirect: Using fallback organization after error:', fallbackData.id)
              setFallbackOrg(fallbackData.id)
            }
          } catch (fallbackErr) {
            console.error('Error fetching fallback organization:', fallbackErr)
          }
        } finally {
          setFetchingOrg(false)
        }
      } else {
        console.log('RoleBasedRedirect: Not fetching organization - conditions not met')
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
    } else if (fallbackOrg) {
      console.log('RoleBasedRedirect: User is admin/coach/player, redirecting to fallback organization:', fallbackOrg)
      return <Navigate to={`/organisations/${fallbackOrg}`} replace />
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