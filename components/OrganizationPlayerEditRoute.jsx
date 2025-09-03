import React from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { useAuth } from '../src/contexts/AuthContext'
import { useState, useEffect } from 'react'
import { supabase } from '../src/lib/supabase'
import EditPlayer from './EditPlayer'

const OrganizationPlayerEditRoute = ({ children, requiredRoles = [] }) => {
  const { user, loading, userRoles, hasRole, hasAnyRole } = useAuth()
  const { id, orgId } = useParams()
  const [playerProfile, setPlayerProfile] = useState(null)
  const [profileLoading, setProfileLoading] = useState(true)
  
  // Always call useEffect to maintain hook order
  useEffect(() => {
    const fetchPlayerProfile = async () => {
      // Only fetch if user is a player and we have the required parameters
      if (hasRole('player') && id && orgId) {
        try {
          const { data, error } = await supabase
            .from('players')
            .select('user_id')
            .eq('id', id)
            .eq('organization_id', orgId)
            .single()
          
          if (!error && data) {
            setPlayerProfile(data)
          }
        } catch (err) {
          console.error('Error fetching player profile:', err)
        }
      }
      setProfileLoading(false)
    }
    
    fetchPlayerProfile()
  }, [id, orgId, hasRole])
  
  // Wait for both authentication and roles to be loaded
  if (loading || (user && userRoles.length === 0 && requiredRoles.length > 0)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    )
  }
  
  if (!user) {
    return <Navigate to="/login" replace />
  }
  
  // Check if user has any of the required roles
  const hasRequiredRole = hasAnyRole(requiredRoles)
  
  // If user has required role, allow access
  if (hasRequiredRole) {
    return React.cloneElement(children, { id, orgId })
  }
  
  // If user doesn't have required role, check if they're a player trying to edit their own profile
  if (hasRole('player') && id && orgId) {
    if (profileLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
        </div>
      )
    }
    
    // If the player profile belongs to the current user, allow access
    if (playerProfile && playerProfile.user_id === user.id) {
      return React.cloneElement(children, { id, orgId })
    }
  }
  
  // Access denied
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="mt-4 text-lg font-medium text-gray-900">Access Denied</h3>
          <p className="mt-2 text-sm text-gray-500">
            You don't have the required permissions to access this page.
          </p>
          <div className="mt-6">
            <a
              href="/dashboard"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Go to Dashboard
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

export default OrganizationPlayerEditRoute 