import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../src/contexts/AuthContext'
import { supabase } from '../src/lib/supabase'

const RoleBasedRedirect = () => {
  const { user, userRoles, loading } = useAuth()
  const [userOrganization, setUserOrganization] = useState(null)
  const [fetchingOrg, setFetchingOrg] = useState(false)

  // Fetch user's organization if they have any role (admin, coach, player)
  useEffect(() => {
    const fetchUserOrganization = async () => {
      if (user && !fetchingOrg) {
        try {
          setFetchingOrg(true)
          
          // For superadmins, we don't need to fetch organization
          if (userRoles.includes('superadmin')) {
            setFetchingOrg(false)
            return
          }
          
          // Simple approach: just get the organization ID without complex validation
          const { data: playerData, error: playerError } = await supabase
            .from('players')
            .select('organization_id')
            .eq('user_id', user.id)
            .single()
          
          if (playerError) {
            console.error('Error fetching player data:', playerError)
          } else if (playerData?.organization_id) {
            console.log('Setting user organization:', playerData.organization_id)
            setUserOrganization(playerData.organization_id)
          }
        } catch (err) {
          console.error('Error fetching user organization:', err)
        } finally {
          setFetchingOrg(false)
        }
      }
    }

    fetchUserOrganization()
  }, [user, userRoles])

  // Show loading while determining user roles or fetching organization
  if (loading || (fetchingOrg && !userRoles.includes('superadmin'))) {
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

  // Simple redirect logic based on user roles
  console.log('RoleBasedRedirect: userRoles:', userRoles, 'userOrganization:', userOrganization)
  
  if (userRoles.includes('superadmin')) {
    console.log('RoleBasedRedirect: Redirecting superadmin to dashboard')
    return <Navigate to="/dashboard" replace />
  } else if (userOrganization) {
    console.log('RoleBasedRedirect: Redirecting user to organization:', userOrganization)
    return <Navigate to={`/organisations/${userOrganization}`} replace />
  } else {
    // If no organization found, redirect to dashboard (let the dashboard handle access)
    console.log('RoleBasedRedirect: No organization found, redirecting to dashboard')
    return <Navigate to="/dashboard" replace />
  }
}

export default RoleBasedRedirect 