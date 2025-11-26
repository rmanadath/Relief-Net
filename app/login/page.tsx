"use client";

import { useAuth } from '../../src/AuthContext'
import Auth from '../../src/Auth'
import Dashboard from '../../src/Dashboard'

export default function LoginPage() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-slate-600">
        <div className="mb-4">Loading...</div>
      </div>
    )
  }

  return user ? <Dashboard user={user} /> : <Auth />
}

