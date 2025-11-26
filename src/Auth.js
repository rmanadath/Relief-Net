'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from './supabase'

export default function Auth({ redirectUrl, message }) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLogin, setIsLogin] = useState(true)
  const [errors, setErrors] = useState({ email: '', password: '' })
  const [submitting, setSubmitting] = useState(false)

  const validate = () => {
    const nextErrors = { email: '', password: '' }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      nextErrors.email = 'Enter a valid email address'
    }
    if (password.length < 6) {
      nextErrors.password = 'Password must be at least 6 characters'
    }
    setErrors(nextErrors)
    return !nextErrors.email && !nextErrors.password
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return

    setSubmitting(true)
    
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) {
          alert(`Login error: ${error.message}`)
        } else {
          // Success - user will be set automatically by onAuthStateChange
          // The login page will handle redirect when user is authenticated
        }
      } else {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) {
          alert(`Signup error: ${error.message}`)
        } else {
          alert('Check your email for confirmation')
          // After signup, redirect to login mode
          setIsLogin(true)
        }
      }
    } catch (error) {
      console.error('Auth error:', error)
      alert(`Error: ${error.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50 p-4">
      <div className="w-full max-w-md">
        {/* Home Button */}
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-medium mb-4 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Home
        </Link>
        
        <form onSubmit={handleSubmit} className="auth-form bg-white border border-slate-200 rounded-xl shadow-lg p-8 w-full">
          {message && (
            <div className="mb-6 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-indigo-600 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-indigo-800">{message}</p>
              </div>
            </div>
          )}
          <h2 className="text-2xl font-bold text-slate-900 mb-6 text-center">{isLogin ? 'Sign In' : 'Create Account'}</h2>
        <div className="form-group mb-5">
          <label className="block text-sm font-semibold text-slate-700 mb-2">Email</label>
        <input
          type="email"
          placeholder="name@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
          required
        />
        {errors.email && <div className="field-error">{errors.email}</div>}
      </div>

      <div className="form-group mb-6">
        <label className="block text-sm font-semibold text-slate-700 mb-2">Password</label>
        <input
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
          required
        />
        {errors.password && <div className="field-error">{errors.password}</div>}
      </div>

      <div className="flex flex-col gap-3">
        <button 
          type="submit" 
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed" 
          disabled={submitting}
        >
          {submitting ? 'Please wait…' : isLogin ? 'Sign In' : 'Create Account'}
        </button>
        <button 
          type="button" 
          className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2.5 px-6 rounded-lg transition-colors" 
          onClick={() => setIsLogin(!isLogin)}
        >
          {isLogin ? 'Need an account? Sign Up' : 'Have an account? Login'}
        </button>
        <button 
          type="button" 
          className="w-full bg-red-50 hover:bg-red-100 text-red-700 font-medium py-2 px-4 rounded-lg text-sm transition-colors"
          onClick={() => {
            setEmail('testadmin@relief.net')
            setPassword('AdminPass')
          }}
        >
          Fill Test Admin
        </button>
        <button 
          type="button" 
          className="w-full bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium py-2 px-4 rounded-lg text-sm transition-colors"
          onClick={() => {
            setEmail('testuser@relief.net')
            setPassword('UserPass')
          }}
        >
          Fill Test User
        </button>
      </div>
    </form>
      </div>
    </div>
  )
}