'use client'

import { useAuth } from './AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function ProtectedRoute({ children, requireAuth = true }) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && requireAuth && !user) {
      router.push('/login')
    }
  }, [user, loading, requireAuth, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-slate-600">
        <div>Loading...</div>
      </div>
    )
  }

  if (requireAuth && !user) {
    return null // Will redirect to login
  }

  return children
}