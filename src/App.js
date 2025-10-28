import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import Auth from './Auth'
import Dashboard from './Dashboard'

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(false)

  const fetchUserProfile = async (userId) => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single()
      
      return data?.role || 'user'
    } catch (error) {
      console.log('Profile fetch error:', error)
      return 'user'
    }
  }

  useEffect(() => {
    // Check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const role = await fetchUserProfile(session.user.id)
        setUser({ ...session.user, role })
      } else {
        setUser(null)
      }
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const role = await fetchUserProfile(session.user.id)
        setUser({ ...session.user, role })
      } else {
        setUser(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) return <div className="flex items-center justify-center min-h-screen text-slate-600">Loading...</div>

  return user ? <Dashboard user={user} /> : <Auth />
}