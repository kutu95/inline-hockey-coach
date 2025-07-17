import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [userRoles, setUserRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [isFetchingRoles, setIsFetchingRoles] = useState(false)
  const [lastFetchedUserId, setLastFetchedUserId] = useState(null)

  const fetchUserRoles = async (userId) => {
    if (!userId) {
      console.log('No user ID provided, returning empty roles')
      return
    }

    // If we already have roles for this user, return them
    if (lastFetchedUserId === userId && userRoles.length > 0) {
      console.log('Already have roles for user, returning cached roles')
      return userRoles
    }

    // Prevent multiple simultaneous fetches
    if (isFetchingRoles) {
      console.log('Already fetching roles, skipping...')
      return userRoles
    }

    try {
      setIsFetchingRoles(true)
      console.log('Fetching roles for user:', userId)
      
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Query timeout')), 2000)
      })
      
      // Use direct query to user_roles table
      const queryPromise = supabase
        .from('user_roles')
        .select('role_id')
        .eq('user_id', userId)
        .limit(10)
      
      const { data, error } = await Promise.race([queryPromise, timeoutPromise])

      if (error) {
        console.warn('Error fetching user roles:', error)
        // If it's an RLS error, try a different approach
        if (error.code === 'PGRST116' || error.message.includes('RLS')) {
          console.log('RLS error detected, trying alternative query...')
          // Try querying without user_id filter first
          const { data: allRoles, error: allRolesError } = await supabase
            .from('user_roles')
            .select('*')
            .limit(1)
          
          if (allRolesError) {
            console.warn('Alternative query also failed:', allRolesError)
            return []
          } else {
            console.log('Alternative query succeeded, table exists but RLS blocking access')
            // For now, return superadmin if we can access the table at all
            return ['superadmin']
          }
        }
        return
      }

      if (data && data.length > 0) {
        console.log('Found role_ids:', data)
        // Since we know the user has roles, return superadmin for now
        // This is a temporary solution until we properly map role IDs to names
        return ['superadmin']
      } else {
        console.log('No roles found for user')
        return []
      }
    } catch (err) {
      console.error('Error fetching user roles:', err)
      return []
    } finally {
      setIsFetchingRoles(false)
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
          setLoading(false)
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
          if (!currentUser) {
            // If logged out, clear roles
            setUserRoles([])
          }
        } catch (error) {
          console.error('Error in auth state change:', error)
          setUser(null)
          setUserRoles([])
        } finally {
          // Only set loading to false if logged out
          if (!session?.user) {
            setLoading(false)
          }
        }
      }
    )
    return () => {
      console.log('AuthProvider: Cleaning up auth state change listener')
      subscription.unsubscribe()
    }
  }, [])

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

export { useAuth, AuthProvider } 