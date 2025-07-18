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

  const fetchUserRoles = async (userId) => {
    if (!userId) {
      return []
    }

    try {
      // Try RPC function first
      const { data: roleNames, error } = await supabase.rpc('get_user_roles_safe', {
        user_uuid: userId
      })
      
      if (!error && Array.isArray(roleNames)) {
        return roleNames
      }
      
      // Fallback: direct query if RPC fails
      const { data, error: directError } = await supabase
        .from('user_roles')
        .select(`
          roles (
            name
          )
        `)
        .eq('user_id', userId)
      
      if (directError) {
        console.error('Direct query error:', directError)
        return []
      }
      
      const roles = data?.map(item => item.roles?.name).filter(Boolean) || []
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
    // Get initial session
    const getSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
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
          const roles = await fetchUserRoles(currentUser.id)
          setUserRoles(roles)
        } else {
          setUserRoles([])
        }
        setLoading(false)
      } catch (error) {
        console.error('Error getting session:', error)
        setUser(null)
        setUserRoles([])
        setLoading(false)
      }
    }
    
    getSession()
  }, [])

  // Separate useEffect for auth state changes
  useEffect(() => {
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        try {
          const currentUser = session?.user ?? null
          setUser(currentUser)
          
          if (!currentUser) {
            // If logged out, clear roles
            setUserRoles([])
            setLoading(false)
          } else {
            // Always fetch roles for new sign-ins
            const roles = await fetchUserRoles(currentUser.id)
            setUserRoles(roles)
            setLoading(false)
          }
        } catch (error) {
          console.error('Error in auth state change:', error)
          setUser(null)
          setUserRoles([])
          setLoading(false)
        }
      }
    )
    
    return () => {
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
      // First, clear the local state immediately
      setUser(null)
      setUserRoles([])
      
      // Then attempt to sign out from Supabase
      const { error } = await supabase.auth.signOut()
      
      // Even if there's an error, we've already cleared the local state
      // so the user will be redirected to login
      return { error }
    } catch (err) {
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

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
} 