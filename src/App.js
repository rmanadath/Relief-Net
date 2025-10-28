import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import Auth from './Auth'
import Dashboard from './Dashboard'

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simplified auth check - no profile fetching
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          setUser({ ...session.user, role: 'user' }) // Default role
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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({ ...session.user, role: 'user' }) // Default role
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