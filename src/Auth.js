import { useState } from 'react'
import { supabase } from './supabase'

export default function Auth() {
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
        }
        // Success - user will be set automatically by onAuthStateChange
      } else {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) {
          alert(`Signup error: ${error.message}`)
        } else {
          alert('Check your email for confirmation')
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
    <form onSubmit={handleSubmit} className="auth-form">
      <h2>{isLogin ? 'Login' : 'Sign Up'}</h2>
      <div className="form-group">
        <label>Email</label>
        <input
          type="email"
          placeholder="name@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        {errors.email && <div className="field-error">{errors.email}</div>}
      </div>

      <div className="form-group">
        <label>Password</label>
        <input
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {errors.password && <div className="field-error">{errors.password}</div>}
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button type="submit" className="auth-btn" disabled={submitting}>
          {submitting ? 'Please wait…' : isLogin ? 'Login' : 'Sign Up'}
        </button>
        <button type="button" className="auth-toggle-btn" onClick={() => setIsLogin(!isLogin)}>
          {isLogin ? 'Need an account?' : 'Have an account?'}
        </button>
        <button 
          type="button" 
          className="bg-blue-500 text-white px-3 py-2 rounded-md text-sm"
          onClick={() => {
            // Quick test login
            setEmail('test@example.com')
            setPassword('password123')
          }}
        >
          Fill Test Data
        </button>
      </div>
    </form>
  )
}