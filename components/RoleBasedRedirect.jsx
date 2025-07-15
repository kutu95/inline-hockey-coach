import { useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../src/contexts/AuthContext'

const RoleBasedRedirect = () => {
  const { user, userRoles, loading } = useAuth()

  // Show loading while determining user roles
  if (loading) {
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
    // For non-superadmin users, redirect to dashboard
    // They can then navigate to their organization-specific pages
    return <Navigate to="/dashboard" replace />
  } else {
    // Fallback to dashboard if no specific role is found
    return <Navigate to="/dashboard" replace />
  }
}

export default RoleBasedRedirect 