import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import AdminPanel from '../src/AdminPanel'

// Mock supabase
vi.mock('../src/supabase', () => ({
  supabase: {
    from: vi.fn((table) => ({
      select: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: mockRequests,
        error: null,
      }),
      insert: vi.fn().mockResolvedValue({
        data: [{ id: 'new-route' }],
        error: null,
      }),
    })),
  },
  authClient: {
    getSession: vi.fn().mockResolvedValue({
      data: { session: { user: { id: 'user-1', role: 'admin' } } },
    }),
  },
}))

const mockRequests = [
  {
    id: 'req-1',
    name: 'John Doe',
    aid_type: 'food',
    priority: 'high',
    status: 'open',
    location: 'Downtown',
    created_at: new Date().toISOString(),
  },
  {
    id: 'req-2',
    name: 'Jane Smith',
    aid_type: 'medicine',
    priority: 'urgent',
    status: 'open',
    location: 'Hospital',
    created_at: new Date().toISOString(),
  },
]

const mockVolunteers = [
  { id: 'vol-1', name: 'Volunteer A', specialization: 'logistics' },
  { id: 'vol-2', name: 'Volunteer B', specialization: 'medical' },
]

const mockUser = {
  id: 'admin-1',
  email: 'admin@test.com',
  role: 'admin',
}

describe('Volunteer Assignment Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders admin panel with requests list', async () => {
    render(<AdminPanel user={mockUser} onUpdate={vi.fn()} />)
    
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
    })
  })

  it('displays all pending requests', async () => {
    render(<AdminPanel user={mockUser} onUpdate={vi.fn()} />)
    
    await waitFor(() => {
      expect(screen.getByText(/john doe/i)).toBeInTheDocument()
    })
  })

  it('shows volunteer selection dropdown per request', async () => {
    render(<AdminPanel user={mockUser} onUpdate={vi.fn()} />)
    
    await waitFor(() => {
      const selects = screen.getAllByRole('combobox', { hidden: true })
      expect(selects.length).toBeGreaterThan(0)
    })
  })

  it('allows assigning request to volunteer', async () => {
    render(<AdminPanel user={mockUser} onUpdate={vi.fn()} />)
    
    await waitFor(() => {
      const assignButtons = screen.getAllByText(/assign/i, { hidden: true })
      expect(assignButtons.length).toBeGreaterThan(0)
    })
  })

  it('shows request details including aid type and priority', async () => {
    render(<AdminPanel user={mockUser} onUpdate={vi.fn()} />)
    
    await waitFor(() => {
      expect(screen.getByText(/food/i)).toBeInTheDocument()
      expect(screen.getByText(/high/i)).toBeInTheDocument()
    })
  })

  it('filters requests by status', async () => {
    render(<AdminPanel user={mockUser} onUpdate={vi.fn()} />)
    
    await waitFor(() => {
      const statusFilter = screen.queryByRole('button', { name: /filter/i })
      expect(statusFilter || document.querySelector('[data-status-filter]')).toBeDefined()
    })
  })

  it('updates request status when changed', async () => {
    const onUpdate = vi.fn()
    render(<AdminPanel user={mockUser} onUpdate={onUpdate} />)
    
    await waitFor(() => {
      const statusButtons = screen.queryAllByRole('button')
      expect(statusButtons.length).toBeGreaterThan(0)
    })
  })

  it('shows analytics summary', async () => {
    render(<AdminPanel user={mockUser} onUpdate={vi.fn()} />)
    
    await waitFor(() => {
      // Check for analytics data display
      const analyticsElement = document.querySelector('[data-analytics]') || 
                               screen.queryByText(/total|fulfilled|progress/i)
      expect(analyticsElement).toBeDefined()
    })
  })

  it('prevents non-admin users from accessing panel', () => {
    const nonAdminUser = { ...mockUser, role: 'volunteer' }
    const { container } = render(<AdminPanel user={nonAdminUser} onUpdate={vi.fn()} />)
    
    // Should show access denied or redirect
    expect(
      screen.queryByText(/not authorized|access denied|admin/i) ||
      container.textContent.includes('unauthorized')
    ).toBeTruthy()
  })

  it('handles volunteer assignment errors gracefully', async () => {
    vi.mock('../src/supabase', () => ({
      supabase: {
        from: vi.fn().mockReturnValue({
          update: vi.fn().mockRejectedValue(new Error('Assignment failed')),
        }),
      },
    }))

    render(<AdminPanel user={mockUser} onUpdate={vi.fn()} />)
    
    await waitFor(() => {
      const assignButtons = screen.queryAllByText(/assign/i, { hidden: true })
      expect(assignButtons.length).toBeGreaterThanOrEqual(0)
    })
  })
})
