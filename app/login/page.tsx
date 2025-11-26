"use client";

import { useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAuth } from '../../src/AuthContext'
import Auth from '../../src/Auth'
import Dashboard from '../../src/Dashboard'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const auth = useAuth() as { user: any; loading: boolean }
  const user = auth?.user || null
  const loading = auth?.loading || false
  const redirectUrl = searchParams?.get('redirect')
  const message = searchParams?.get('message')

  // Handle redirect after user logs in
  useEffect(() => {
    if (user && redirectUrl) {
      router.push(redirectUrl)
    }
  }, [user, redirectUrl, router])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-slate-600">
        <div className="mb-4">Loading...</div>
      </div>
    )
  }

  // If user is logged in and no redirect, show dashboard
  // If redirect exists, wait for redirect to happen
  if (user && !redirectUrl) {
    return <Dashboard user={user} />
  }

  return <Auth redirectUrl={redirectUrl || undefined} message={message || undefined} />
}

