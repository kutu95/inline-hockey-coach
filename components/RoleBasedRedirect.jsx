import { useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../src/contexts/AuthContext'

const RoleBasedRedirect = () => {
  const { user, userRoles, loading } = useAuth()

  console.log('RoleBasedRedirect: user:', !!user, 'userRoles:', userRoles, 'loading:', loading)

  // Show loading while determining user roles
  if (loading) {
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
    console.log('RoleBasedRedirect: User is admin/coach/player, redirecting to dashboard')
    // For non-superadmin users, redirect to dashboard
    // They can then navigate to their organization-specific pages
    return <Navigate to="/dashboard" replace />
  } else {
    console.log('RoleBasedRedirect: No specific role found, redirecting to dashboard as fallback')
    // Fallback to dashboard if no specific role is found
    return <Navigate to="/dashboard" replace />
  }
}

export default RoleBasedRedirect 