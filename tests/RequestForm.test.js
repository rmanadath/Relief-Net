import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import RequestForm from '../src/RequestForm'

// Mock Supabase
const mockSupabase = {
  from: vi.fn(() => ({
    insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
  })),
}

vi.mock('../src/supabase', () => ({
  supabase: mockSupabase,
}))

describe('RequestForm Component', () => {
  const mockUser = {
    id: 'test-user-123',
    email: 'test@example.com',
    role: 'user',
  }

  const mockOnRequestSubmitted = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders all form fields', () => {
    render(<RequestForm user={mockUser} onRequestSubmitted={mockOnRequestSubmitted} />)
    
    expect(screen.getByText('Post Aid Request')).toBeInTheDocument()
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/contact/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/aid type/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/priority/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/location/i)).toBeInTheDocument()
  })

  it('validates required fields', async () => {
    const user = userEvent.setup()
    render(<RequestForm user={mockUser} onRequestSubmitted={mockOnRequestSubmitted} />)
    
    const submitButton = screen.getByRole('button', { name: /submit/i })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/Name is required/i)).toBeInTheDocument()
    })
  })

  it('validates email or phone format', async () => {
    const user = userEvent.setup()
    render(<RequestForm user={mockUser} onRequestSubmitted={mockOnRequestSubmitted} />)
    
    const nameInput = screen.getByLabelText(/name/i)
    const contactInput = screen.getByLabelText(/contact/i)
    const submitButton = screen.getByRole('button', { name: /submit/i })
    
    await user.type(nameInput, 'Test User')
    await user.type(contactInput, 'invalid-contact')
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/Enter a valid email or phone number/i)).toBeInTheDocument()
    })
  })

  it('validates description length', async () => {
    const user = userEvent.setup()
    render(<RequestForm user={mockUser} onRequestSubmitted={mockOnRequestSubmitted} />)
    
    const nameInput = screen.getByLabelText(/name/i)
    const contactInput = screen.getByLabelText(/contact/i)
    const descriptionInput = screen.getByLabelText(/description/i)
    const submitButton = screen.getByRole('button', { name: /submit/i })
    
    await user.type(nameInput, 'Test User')
    await user.type(contactInput, 'test@example.com')
    await user.type(descriptionInput, 'short') // Less than 10 characters
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/Describe the need in at least 10 characters/i)).toBeInTheDocument()
    })
  })

  it('submits form with valid data', async () => {
    const user = userEvent.setup()
    render(<RequestForm user={mockUser} onRequestSubmitted={mockOnRequestSubmitted} />)
    
    await user.type(screen.getByLabelText(/name/i), 'Test User')
    await user.type(screen.getByLabelText(/contact/i), 'test@example.com')
    await user.type(screen.getByLabelText(/description/i), 'This is a test description with enough characters')
    await user.type(screen.getByLabelText(/location/i), 'New York')
    
    const submitButton = screen.getByRole('button', { name: /submit/i })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(mockSupabase.from).toHaveBeenCalledWith('requests')
      expect(mockOnRequestSubmitted).toHaveBeenCalled()
    })
  })
})


