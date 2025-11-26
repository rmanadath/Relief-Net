"use client";

import { useState, useEffect } from 'react'
import { supabase } from '../../src/supabase'
import Auth from '../../src/Auth'
import Dashboard from '../../src/Dashboard'

export default function LoginPage() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true
    
    // Fetch user role from profiles table with timeout
    const fetchUserWithRole = async (userId) => {
      try {
        // Add timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Profile fetch timeout')), 5000)
        )
        
        const profilePromise = supabase
          .from('profiles')
          .select('role')
          .eq('id', userId)
          .single()
        
        const result = await Promise.race([profilePromise, timeoutPromise])
        const { data: profile, error } = result
        
        if (error) {
          // PGRST116 = no rows returned (profile doesn't exist)
          // This is expected for new users, so we don't log it as an error
          if (error.code === 'PGRST116') {
            // Profile doesn't exist - create it automatically
            try {
              const { error: insertError } = await supabase
                .from('profiles')
                .insert([{ id: userId, role: 'user' }])
              
              if (insertError) {
                console.warn('Could not create profile:', insertError)
              }
              return 'user'
            } catch (createError) {
              console.warn('Error creating profile:', createError)
              return 'user'
            }
          } else {
            // Other errors (permissions, etc.) - log but don't fail
            console.warn('Error fetching profile:', error.message || error)
            return 'user'
          }
        }
        
        return profile?.role || 'user'
      } catch (error) {
        // Timeout or other errors - default to user
        if (error.message === 'Profile fetch timeout') {
          console.warn('Profile fetch timed out, defaulting to user role')
        } else {
          console.warn('Error fetching user role:', error)
        }
        return 'user'
      }
    }

    const checkAuth = async () => {
      // Set a safety timeout to ensure loading is always set to false
      const safetyTimeout = setTimeout(() => {
        if (isMounted) {
          console.warn('Auth check taking too long, setting loading to false')
          setLoading(false)
        }
      }, 8000)
      
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        clearTimeout(safetyTimeout)
        
        if (!isMounted) return
        
        if (sessionError) {
          console.warn('Session error:', sessionError)
          setUser(null)
          setLoading(false)
          return
        }
        
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
      } catch (error) {
        clearTimeout(safetyTimeout)
        if (!isMounted) return
        console.warn('Auth check error:', error.message || error)
        setUser(null)
        setLoading(false)
      }
    }

    // Start auth check
    checkAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
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

  // Show login form if loading takes too long (fallback)
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-slate-600">
        <div className="mb-4">Loading...</div>
        <button
          onClick={() => setLoading(false)}
          className="text-sm text-indigo-600 hover:text-indigo-800 underline"
        >
          Continue to login
        </button>
      </div>
    )
  }

  // Add a simple bypass for testing (remove in production)
  const handleTestLogin = () => {
    setUser({ 
      id: 'test-user-123', 
      email: 'test@example.com', 
      role: 'user' 
    })
  }

  return user ? <Dashboard user={user} /> : (
    <div>
      <Auth />
      <div className="mt-4 text-center">
        <button 
          onClick={handleTestLogin}
          className="bg-green-500 text-white px-4 py-2 rounded-md text-sm"
        >
          Skip Login (Test Mode)
        </button>
      </div>
    </div>
  )
}

