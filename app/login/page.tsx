"use client";

import { useState, useEffect } from 'react'
import { supabase } from '../../src/supabase'
import Auth from '../../src/Auth'
import Dashboard from '../../src/Dashboard'

export default function LoginPage() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Fetch user role from profiles table
    const fetchUserWithRole = async (userId) => {
      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', userId)
          .single()
        
        if (error) {
          console.error('Error fetching profile:', error)
          return 'user' // Default to user if profile not found
        }
        
        return profile?.role || 'user'
      } catch (error) {
        console.error('Error fetching user role:', error)
        return 'user'
      }
    }

    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          const role = await fetchUserWithRole(session.user.id)
          setUser({ ...session.user, role })
        } else {
          setUser(null)
        }
      } catch (error) {
        console.log('Auth check error:', error)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const role = await fetchUserWithRole(session.user.id)
        setUser({ ...session.user, role })
      } else {
        setUser(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) return <div className="flex items-center justify-center min-h-screen text-slate-600">Loading...</div>

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

