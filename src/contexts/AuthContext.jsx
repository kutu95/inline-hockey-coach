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

  // Function to fetch user roles
  const fetchUserRoles = async (userId) => {
    if (!userId) return []
    
    try {
      const { data, error } = await supabase
        .rpc('get_user_roles', { user_uuid: userId })
      
      if (error) {
        console.error('Error fetching user roles:', error)
        return []
      }
      
      return data ? data.map(row => row.role_name) : []
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
      const { data: { session } } = await supabase.auth.getSession()
      const currentUser = session?.user ?? null
      setUser(currentUser)
      
      if (currentUser) {
        const roles = await fetchUserRoles(currentUser.id)
        setUserRoles(roles)
      } else {
        setUserRoles([])
      }
      
      setLoading(false)
    }

    getSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const currentUser = session?.user ?? null
        setUser(currentUser)
        
        if (currentUser) {
          const roles = await fetchUserRoles(currentUser.id)
          setUserRoles(roles)
        } else {
          setUserRoles([])
        }
        
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signUp = async (email, password) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })
    return { data, error }
  }

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { data, error }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    return { error }
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
    signUp,
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