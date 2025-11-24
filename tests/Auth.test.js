import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Auth from '../src/Auth'

// Mock Supabase
vi.mock('../src/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
    },
  },
}))

describe('Auth Component', () => {
  it('renders login form by default', () => {
    render(<Auth />)
    expect(screen.getByText('Login')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('name@example.com')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument()
  })

  it('switches between login and signup', async () => {
    const user = userEvent.setup()
    render(<Auth />)
    
    const toggleButton = screen.getByText('Need an account?')
    await user.click(toggleButton)
    
    expect(screen.getByText('Sign Up')).toBeInTheDocument()
  })

  it('validates email format', async () => {
    const user = userEvent.setup()
    render(<Auth />)
    
    const emailInput = screen.getByPlaceholderText('name@example.com')
    const passwordInput = screen.getByPlaceholderText('••••••••')
    const submitButton = screen.getByRole('button', { name: /login/i })
    
    await user.type(emailInput, 'invalid-email')
    await user.type(passwordInput, 'password123')
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/Enter a valid email address/i)).toBeInTheDocument()
    })
  })

  it('validates password length', async () => {
    const user = userEvent.setup()
    render(<Auth />)
    
    const emailInput = screen.getByPlaceholderText('name@example.com')
    const passwordInput = screen.getByPlaceholderText('••••••••')
    const submitButton = screen.getByRole('button', { name: /login/i })
    
    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, '12345') // Less than 6 characters
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/Password must be at least 6 characters/i)).toBeInTheDocument()
    })
  })
})


