import { createContext, useContext, useEffect, useState, useRef } from 'react'
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
  const previousUserRef = useRef(null)

  const fetchUserRoles = async (userId) => {
    // Check cache first
    const cachedRoles = roleCache.get(userId)
    if (cachedRoles) {
      return cachedRoles
    }

    setFetchingRoles(true)
    
    try {
      console.log('Fetching roles for user:', userId)
      
      const fetchPromise = async () => {
        console.log('Starting user_roles query...')
        const startTime = Date.now()
        
        try {
          // Use a simpler query to avoid RLS recursion issues
          const { data: userRolesData, error: userRolesError } = await supabase
            .from('user_roles')
            .select('role_id')
            .eq('user_id', userId)
          
          const endTime = Date.now()
          console.log(`user_roles query took ${endTime - startTime}ms`)
          console.log('user_roles query completed:', { data: userRolesData, error: userRolesError })
          
          if (userRolesError) {
            console.error('User roles query failed:', userRolesError)
            // Return empty array instead of throwing
            return []
          }
          
          if (!userRolesData || userRolesData.length === 0) {
            console.log('No roles found for user')
            return []
          }
          
          console.log('Starting roles query...')
          const startTime2 = Date.now()
          // Get role names for the role IDs
          const roleIds = userRolesData.map(ur => ur.role_id)
          const { data: rolesData, error: rolesError } = await supabase
            .from('roles')
            .select('name')
            .in('id', roleIds)
          
          const endTime2 = Date.now()
          console.log(`roles query took ${endTime2 - startTime2}ms`)
          console.log('roles query completed:', { data: rolesData, error: rolesError })
          
          if (rolesError) {
            console.error('Roles query failed:', rolesError)
            // Return empty array instead of throwing
            return []
          }
          
          const roles = rolesData?.map(r => r.name).filter(Boolean) || []
          console.log('Roles fetched successfully:', roles)
          return roles
        } catch (error) {
          console.error('Unexpected error in fetchUserRoles:', error)
          return []
        }
      }

      // Run without timeout to prevent hanging
      const roles = await fetchPromise()
      
      // Cache the result
      setRoleCache(prev => new Map(prev).set(userId, roles))
      return roles
      
    } catch (err) {
      console.error('Error fetching user roles:', err)
      // Return empty array if no roles found or error occurred
      const emptyRoles = []
      setRoleCache(prev => new Map(prev).set(userId, emptyRoles))
      return emptyRoles
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
        previousUserRef.current = currentUser
        
        if (currentUser) {
          // Set loading to false immediately to allow UI to render
          setLoading(false)
          // Start role fetching in background without waiting
          fetchUserRoles(currentUser.id).then(roles => {
            if (mounted) {
              setUserRoles(roles)
            }
          }).catch(err => {
            if (mounted) {
              console.log('Role fetch failed, keeping empty roles')
            }
          })
        } else {
          if (mounted) {
            setUserRoles([])
            setLoading(false)
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error)
        if (mounted) {
          setUser(null)
          setUserRoles([])
          setLoading(false)
        }
      }
    }

    initializeAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return
        
        const currentUser = session?.user ?? null
        const previousUser = previousUserRef.current
        
        // Only fetch roles if the user actually changed
        if (currentUser?.id !== previousUser?.id) {
          setUser(currentUser)
          previousUserRef.current = currentUser
          
          if (!currentUser) {
            setUserRoles([])
            setLoading(false)
          } else {
            // Set loading to false immediately to allow UI to render
            setLoading(false)
            // Start role fetching in background without waiting
            fetchUserRoles(currentUser.id).then(roles => {
              if (mounted) {
                setUserRoles(roles)
              }
            }).catch(err => {
              if (mounted) {
                console.log('Role fetch failed, keeping empty roles')
              }
            })
          }
        }
        // For token refresh events (TOKEN_REFRESHED), just update the user object without refetching roles
        else if (event === 'TOKEN_REFRESHED' && currentUser) {
          setUser(currentUser)
          previousUserRef.current = currentUser
        }
      }
    )

    // Handle page visibility changes to prevent unnecessary auth re-initialization
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && previousUserRef.current) {
        // Page became visible, but don't re-fetch roles unless necessary
        // Just ensure the user object is up to date
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (mounted && session?.user && session.user.id === previousUserRef.current?.id) {
            setUser(session.user)
            previousUserRef.current = session.user
          }
        })
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      mounted = false
      subscription.unsubscribe()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, []) // Add user to dependencies to track changes

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