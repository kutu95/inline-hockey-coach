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
              // Validate that the organization actually exists and user has access
              const { data: orgData, error: orgError } = await supabase
                .from('organizations')
                .select('id')
                .eq('id', playerData.organization_id)
                .single()
              
              if (orgError || !orgData) {
                console.error('User has invalid organization ID:', playerData.organization_id)
                // Don't set organization if it doesn't exist
              } else {
                setUserOrganization(playerData.organization_id)
              }
            }
          } else {
            // Validate that the organization actually exists
            if (orgId) {
              const { data: orgData, error: orgError } = await supabase
                .from('organizations')
                .select('id')
                .eq('id', orgId)
                .single()
              
              if (orgError || !orgData) {
                console.error('User has invalid organization ID from RPC:', orgId)
                // Don't set organization if it doesn't exist
              } else {
                setUserOrganization(orgId)
              }
            }
          }
        } catch (err) {
          console.error('Error fetching user organization:', err)
        } finally {
          setFetchingOrg(false)
        }
      }
    }

    fetchUserOrganization()
  }, [user, userRoles]) // Add userRoles back to dependencies

  // Show loading while determining user roles or fetching organization
  if (loading || (fetchingOrg && !userRoles.includes('superadmin'))) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    )
  }
  
  // If we have a user but no organization yet, and they're not superadmin, show loading
  if (user && userOrganization === null && !fetchingOrg && !userRoles.includes('superadmin')) {
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
  console.log('RoleBasedRedirect: userRoles:', userRoles, 'userOrganization:', userOrganization)
  
  if (userRoles.includes('superadmin')) {
    console.log('RoleBasedRedirect: Redirecting superadmin to dashboard')
    // Superadmin goes to dashboard to see all organizations
    return <Navigate to="/dashboard" replace />
  } else if (userOrganization) {
    console.log('RoleBasedRedirect: Redirecting user to organization:', userOrganization)
    // Non-superadmin users go directly to their organization page
    return <Navigate to={`/organisations/${userOrganization}`} replace />
  } else {
    // If no organization found, show access denied with proper navigation
    console.error('User has no organization and is not superadmin')
    return <Navigate to="/access-denied" replace />
  }
}

export default RoleBasedRedirect 