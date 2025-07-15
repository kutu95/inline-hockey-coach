import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [userRoles, setUserRoles] = useState([])
  const [loading, setLoading] = useState(true)

  // Function to fetch user roles using direct query
  const fetchUserRoles = async (userId) => {
    if (!userId) {
      console.log('No user ID provided, returning empty roles')
      return []
    }
    
    try {
      console.log('Fetching roles for user:', userId)
      
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Role fetching timeout')), 5000)
      })
      
      // Try server-side function first (this should bypass RLS)
      console.log('Trying server function first...')
      const serverPromise = supabase.rpc('get_user_roles', {
        user_uuid: userId
      })
      
      const { data: serverData, error: serverError } = await Promise.race([serverPromise, timeoutPromise])
      
      if (!serverError && serverData) {
        console.log('Fetched roles from server function:', serverData)
        // Server function returns TEXT array directly
        const roles = Array.isArray(serverData) ? serverData : []
        console.log('Processed roles from server function:', roles)
        return roles
      }
      
      console.log('Server function failed or not available, trying client query...')
      
      // Fallback to client-side query
      const queryPromise = supabase
        .from('user_roles')
        .select(`
          roles (
            name
          )
        `)
        .eq('user_id', userId)
      
      const { data, error } = await Promise.race([queryPromise, timeoutPromise])
      
      console.log('Query completed. Data:', data, 'Error:', error)
      
      if (error) {
        console.log('Error with client-side query:', error.message)
        // If there's an RLS error, try a simpler approach
        if (error.message.includes('permission') || error.message.includes('RLS')) {
          console.log('RLS permission error detected, trying alternative approach')
          // For now, return empty array and let the user be redirected to dashboard
          // This will allow the login to complete
          return []
        }
        return []
      }
      
      const roles = data ? data.map(row => row.roles?.name).filter(Boolean) : []
      console.log('Fetched roles from client query:', roles)
      return roles
    } catch (err) {
      console.error('Error fetching user roles:', err)
      // Return empty array to allow login to complete
      return []
    }
  }

  // Function to check if user has a specific role
  const hasRole = (roleName) => {
    return userRoles.includes(roleName)
  }

  // Function to check if user has any of the specified roles
  const hasAnyRole = (roleNames) => {
    return roleNames.some(roleName => userRoles.includes(roleName))
  }

  // Function to check if user has all of the specified roles
  const hasAllRoles = (roleNames) => {
    return roleNames.every(roleName => userRoles.includes(roleName))
  }

  useEffect(() => {
    console.log('AuthProvider: Starting initialization')
    
    // Get initial session
    const getSession = async () => {
      try {
        console.log('AuthProvider: Getting session')
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Error getting session:', error)
          setUser(null)
          setUserRoles([])
          return
        }
        
        const currentUser = session?.user ?? null
        console.log('AuthProvider: Current user:', currentUser?.email)
        setUser(currentUser)
        
        if (currentUser) {
          console.log('AuthProvider: Fetching roles for current user')
          const roles = await fetchUserRoles(currentUser.id)
          setUserRoles(roles)
        } else {
          console.log('AuthProvider: No current user, setting empty roles')
          setUserRoles([])
        }
      } catch (error) {
        console.error('Error getting session:', error)
        setUser(null)
        setUserRoles([])
      } finally {
        console.log('AuthProvider: Setting loading to false')
        setLoading(false)
      }
    }

    // Add timeout to prevent infinite hanging
    const timeoutId = setTimeout(() => {
      console.log('AuthProvider: Timeout reached, forcing loading to false')
      setLoading(false)
    }, 10000) // 10 seconds

    getSession()

    return () => {
      clearTimeout(timeoutId)
    }
  }, [])

  // Separate useEffect for auth state changes
  useEffect(() => {
    console.log('AuthProvider: Setting up auth state change listener')
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('AuthProvider: Auth state change event:', event, 'session:', !!session, 'current user:', user?.email)
        
        try {
          const currentUser = session?.user ?? null
          console.log('AuthProvider: New user:', currentUser?.email)
          
          setUser(currentUser)
          
          if (currentUser) {
            console.log('AuthProvider: Fetching roles for new user')
            const roles = await fetchUserRoles(currentUser.id)
            setUserRoles(roles)
          } else {
            console.log('AuthProvider: No new user, setting empty roles')
            setUserRoles([])
          }
        } catch (error) {
          console.error('Error in auth state change:', error)
          setUser(null)
          setUserRoles([])
        } finally {
          console.log('AuthProvider: Setting loading to false after auth change')
          setLoading(false)
        }
      }
    )

    return () => {
      console.log('AuthProvider: Cleaning up auth state change listener')
      subscription.unsubscribe()
    }
  }, []) // Remove the dependency to prevent circular issues

  // Note: signUp is removed as we now use invitation-based registration

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { data, error }
  }

  const signOut = async () => {
    console.log('AuthContext: signOut called')
    try {
      // First, clear the local state immediately
      setUser(null)
      setUserRoles([])
      
      // Then attempt to sign out from Supabase
      const { error } = await supabase.auth.signOut()
      console.log('AuthContext: signOut result - error:', error)
      
      // Even if there's an error, we've already cleared the local state
      // so the user will be redirected to login
      return { error }
    } catch (err) {
      console.log('AuthContext: signOut caught error:', err)
      // Even if there's an error, clear the local state
      setUser(null)
      setUserRoles([])
      return { error: err }
    }
  }

  const resetPassword = async (email) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    return { data, error }
  }

  // Function to refresh user roles (useful after role changes)
  const refreshUserRoles = async () => {
    if (user) {
      const roles = await fetchUserRoles(user.id)
      setUserRoles(roles)
    }
  }

  const value = {
    user,
    userRoles,
    loading,
    signIn,
    signOut,
    resetPassword,
    hasRole,
    hasAnyRole,
    hasAllRoles,
    refreshUserRoles,
  }

  console.log('AuthProvider: Current state - user:', !!user, 'roles:', userRoles, 'loading:', loading)

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
} 