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
      
      // Try server-side function first
      const { data: serverData, error: serverError } = await supabase.rpc('get_user_roles', {
        user_uuid: userId
      })
      
      if (!serverError && serverData) {
        console.log('Fetched roles from server function:', serverData)
        // Extract role_name from the objects returned by the server function
        const roles = serverData.map(row => row.role_name).filter(Boolean)
        return roles
      }
      
      // Fallback to client-side query if server function doesn't exist
      console.log('Server function not available, using client-side query')
      const { data, error } = await supabase
        .from('user_roles')
        .select(`
          roles (
            name
          )
        `)
        .eq('user_id', userId)
      
      if (error) {
        console.log('Error with client-side query:', error.message)
        return []
      }
      
      const roles = data ? data.map(row => row.roles?.name).filter(Boolean) : []
      console.log('Fetched roles from client query:', roles)
      return roles
    } catch (err) {
      console.error('Error fetching user roles:', err)
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

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('AuthProvider: Auth state change event:', event, 'session:', !!session)
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