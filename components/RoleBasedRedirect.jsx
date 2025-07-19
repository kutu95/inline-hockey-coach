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
          
          // First try to get organization via RPC function
          const { data: orgId, error } = await supabase.rpc('get_user_organization', {
            user_uuid: user.id
          })

          if (error) {
            console.error('Error fetching user organization via RPC:', error)
            // Fallback: try direct query to players table
            const { data: playerData, error: playerError } = await supabase
              .from('players')
              .select('organization_id')
              .eq('user_id', user.id)
              .single()
            
            if (playerError) {
              console.error('Error fetching player data:', playerError)
            } else if (playerData?.organization_id) {
              setUserOrganization(playerData.organization_id)
            }
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
  }, [user]) // Remove userRoles dependency to avoid waiting for roles

  // Show loading while determining user roles or fetching organization
  if (loading || fetchingOrg) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    )
  }
  
  // If we have a user but no organization yet, show loading
  if (user && userOrganization === null && !fetchingOrg) {
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

  // Determine redirect based on user roles and organization
  if (userRoles.includes('superadmin')) {
    return <Navigate to="/dashboard" replace />
  } else if (userOrganization) {
    // If we have an organization, redirect there
    return <Navigate to={`/organisations/${userOrganization}`} replace />
  } else {
    // Fallback to dashboard if no organization found
    return <Navigate to="/dashboard" replace />
  }
}

export default RoleBasedRedirect 