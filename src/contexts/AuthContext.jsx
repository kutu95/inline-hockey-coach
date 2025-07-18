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
    console.log('🔥🔥🔥 NEW CODE IS RUNNING - fetchUserRoles called 🔥🔥🔥')
    
    if (!userId) {
      console.log('No user ID provided, returning empty roles')
      return []
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
      setLastFetchedUserId(userId)
      console.log('=== FETCHING USER ROLES ===')
      console.log('Fetching roles for user:', userId)
      
      // Ultra-fast, simple query - just get role names directly
      console.log('Using ultra-fast direct query...')
      
      const startTime = Date.now()
      
      // Add a very short timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Query timeout')), 1000) // 1 second max
      })
      
      const queryPromise = supabase
        .from('user_roles')
        .select('roles(name)')
        .eq('user_id', userId)
      
      const { data: roleData, error: roleError } = await Promise.race([queryPromise, timeoutPromise])
      
      const endTime = Date.now()
      console.log(`Query took ${endTime - startTime}ms`)
      console.log('Query result:', { roleData, roleError })
      
      if (roleError) {
        console.error('Query failed:', roleError)
        return []
      }
      
      if (roleData && roleData.length > 0) {
        const roleNames = roleData.map(item => item.roles?.name).filter(Boolean)
        console.log('Roles found:', roleNames)
        return roleNames
      } else {
        console.log('No roles found for user')
        return []
      }
    } catch (err) {
      console.error('Error fetching user roles:', err)
      return []
    } finally {
      setIsFetchingRoles(false)
      console.log('=== END FETCHING USER ROLES ===')
    }
  }

  // Function to check if user has a specific role
  const hasRole = (roleName) => {
    console.log('hasRole called with:', roleName, 'userRoles:', userRoles, 'result:', userRoles.includes(roleName))
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
          console.log('AuthProvider: Roles fetched:', roles)
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
    }, 3000) // 3 seconds max
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
        
        // Skip if this is just a token refresh and we already have the user
        if (event === 'TOKEN_REFRESHED' && user && session?.user?.id === user.id) {
          console.log('AuthProvider: Token refreshed, skipping re-fetch')
          return
        }
        
        try {
          const currentUser = session?.user ?? null
          console.log('AuthProvider: New user:', currentUser?.email)
          setUser(currentUser)
          if (!currentUser) {
            // If logged out, clear roles
            setUserRoles([])
          } else {
            // Only fetch roles if we don't already have them for this user
            if (lastFetchedUserId !== currentUser.id || userRoles.length === 0) {
              console.log('AuthProvider: Fetching roles for new user')
              const roles = await fetchUserRoles(currentUser.id)
              setUserRoles(roles)
            } else {
              console.log('AuthProvider: Already have roles for this user, skipping fetch')
            }
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
  }, [user, userRoles, lastFetchedUserId])

  // Handle page visibility changes (tab focus/blur)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('AuthProvider: Page became visible, checking if we need to refresh auth')
        // Only refresh if we don't have a user or roles
        if (!user || userRoles.length === 0) {
          console.log('AuthProvider: No user or roles, refreshing session')
          supabase.auth.getSession()
        } else {
          console.log('AuthProvider: User and roles already loaded, skipping refresh')
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [user, userRoles])

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

  console.log('AuthProvider: Current state - user:', !!user, 'roles:', userRoles, 'loading:', loading, 'isFetchingRoles:', isFetchingRoles)

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export { useAuth, AuthProvider } 