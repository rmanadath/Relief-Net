'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from './supabase'

const AuthContext = createContext({})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchUserWithRole = async (userId) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single()
      
      if (error && error.code === 'PGRST116') {
        // Profile doesn't exist - create it
        await supabase.from('profiles').insert([{ id: userId, role: 'user' }])
        return 'user'
      }
      
      return profile?.role || 'user'
    } catch (error) {
      console.warn('Error fetching user role:', error)
      return 'user'
    }
  }

  useEffect(() => {
    let isMounted = true

    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!isMounted) return
        
        if (session?.user) {
          const role = await fetchUserWithRole(session.user.id)
          if (isMounted) {
            setUser({ ...session.user, role })
          }
        } else {
          if (isMounted) {
            setUser(null)
          }
        }
      } catch (error) {
        console.warn('Auth check error:', error)
        if (isMounted) {
          setUser(null)
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    checkAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return
      
      if (session?.user) {
        const role = await fetchUserWithRole(session.user.id)
        if (isMounted) {
          setUser({ ...session.user, role })
          setLoading(false)
        }
      } else {
        if (isMounted) {
          setUser(null)
          setLoading(false)
        }
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}