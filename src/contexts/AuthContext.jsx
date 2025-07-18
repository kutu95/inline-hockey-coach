import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

// Move useAuth outside the component to avoid Fast Refresh issues
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [userRoles, setUserRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [roleCache, setRoleCache] = useState(new Map())
  const [fetchingRoles, setFetchingRoles] = useState(false)

  const fetchUserRoles = async (userId) => {
    if (!userId) {
      return []
    }

    console.log('Fetching roles for user:', userId)

    // Check cache first
    if (roleCache.has(userId)) {
      console.log('Using cached roles for user:', userId)
      return roleCache.get(userId)
    }

    // Prevent duplicate fetches
    if (fetchingRoles) {
      console.log('Already fetching roles, waiting...')
      return []
    }

    setFetchingRoles(true)

    try {
      // Add timeout to prevent hanging (reduced to 2 seconds since RPC should be fast)
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Role fetch timeout')), 2000)
      })

      const fetchPromise = async () => {
        try {
          // Use RPC function directly since direct query has RLS issues
          console.log('Fetching roles via RPC function...')
          const { data: roleNames, error } = await supabase.rpc('get_user_roles_safe', {
            user_uuid: userId
          })
          
          if (error) {
            console.error('RPC function failed:', error)
            return []
          }
          
          return Array.isArray(roleNames) ? roleNames : []
        } catch (err) {
          console.error('Exception in fetchPromise:', err)
          return []
        }
      }

      const roles = await Promise.race([fetchPromise(), timeoutPromise])
      
      console.log('Successfully fetched roles for user:', userId, 'Roles:', roles)
      
      // Cache the result
      setRoleCache(prev => new Map(prev).set(userId, roles))
      
      return roles
    } catch (err) {
      console.error('Error fetching user roles:', err)
      // Cache empty array to prevent repeated timeouts
      setRoleCache(prev => new Map(prev).set(userId, []))
      return []
    } finally {
      setFetchingRoles(false)
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
    let mounted = true

    const initializeAuth = async () => {
      try {
        // Get initial session
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (!mounted) return
        
        if (error) {
          console.error('Error getting session:', error)
          setUser(null)
          setUserRoles([])
          setLoading(false)
          return
        }

        const currentUser = session?.user ?? null
        setUser(currentUser)
        
        if (currentUser) {
          try {
            const roles = await fetchUserRoles(currentUser.id)
            if (mounted) {
              setUserRoles(roles)
            }
          } catch (err) {
            console.error('Failed to fetch roles, using empty array:', err)
            if (mounted) {
              setUserRoles([])
            }
          }
        } else {
          if (mounted) {
            setUserRoles([])
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error)
        if (mounted) {
          setUser(null)
          setUserRoles([])
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    initializeAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return
        
        try {
          const currentUser = session?.user ?? null
          setUser(currentUser)
          
          if (!currentUser) {
            setUserRoles([])
            setLoading(false)
          } else {
            try {
              const roles = await fetchUserRoles(currentUser.id)
              if (mounted) {
                setUserRoles(roles)
                setLoading(false)
              }
            } catch (err) {
              console.error('Failed to fetch roles in auth state change, using empty array:', err)
              if (mounted) {
                setUserRoles([])
                setLoading(false)
              }
            }
          }
        } catch (error) {
          console.error('Error in auth state change:', error)
          if (mounted) {
            setUser(null)
            setUserRoles([])
            setLoading(false)
          }
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { data, error }
  }

  const signOut = async () => {
    try {
      setUser(null)
      setUserRoles([])
      
      const { error } = await supabase.auth.signOut()
      return { error }
    } catch (err) {
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

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
} 