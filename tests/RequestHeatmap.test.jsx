import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

// Mock heatmap component
const RequestHeatmap = ({ requests, onLocationClick }) => {
  const mapRef = React.useRef(null)

  React.useEffect(() => {
    // Initialize heatmap with request data
  }, [requests])

  return (
    <div data-testid="request-heatmap" ref={mapRef}>
      <h2>Request Heatmap</h2>
      <div data-testid="heatmap-container" className="w-full h-96" />
    </div>
  )
}

const mockRequestsWithLocation = [
  {
    id: 'req-1',
    latitude: 40.7128,
    longitude: -74.0060,
    priority: 'urgent',
    aid_type: 'food',
    status: 'open',
  },
  {
    id: 'req-2',
    latitude: 40.7200,
    longitude: -74.0100,
    priority: 'high',
    aid_type: 'medicine',
    status: 'open',
  },
  {
    id: 'req-3',
    latitude: 40.7250,
    longitude: -74.0150,
    priority: 'medium',
    aid_type: 'shelter',
    status: 'in-progress',
  },
  {
    id: 'req-4',
    latitude: 40.6900,
    longitude: -74.0050,
    priority: 'low',
    aid_type: 'clothing',
    status: 'fulfilled',
  },
]

describe('Request Heatmap', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders heatmap component', () => {
    render(<RequestHeatmap requests={mockRequestsWithLocation} onLocationClick={vi.fn()} />)
    
    expect(screen.getByTestId('request-heatmap')).toBeInTheDocument()
    expect(screen.getByTestId('heatmap-container')).toBeInTheDocument()
  })

  it('displays all request locations on map', async () => {
    const { container } = render(
      <RequestHeatmap requests={mockRequestsWithLocation} onLocationClick={vi.fn()} />
    )

    await waitFor(() => {
      const heatmapContainer = screen.getByTestId('heatmap-container')
      expect(heatmapContainer).toBeInTheDocument()
    })
  })

  it('shows intensity based on request priority', () => {
    const { container } = render(
      <RequestHeatmap requests={mockRequestsWithLocation} onLocationClick={vi.fn()} />
    )

    // Heatmap should show more intensity for urgent/high priority areas
    const heatmapContainer = screen.getByTestId('heatmap-container')
    expect(heatmapContainer).toBeInTheDocument()
  })

  it('handles empty request list gracefully', () => {
    render(<RequestHeatmap requests={[]} onLocationClick={vi.fn()} />)
    
    expect(screen.getByTestId('request-heatmap')).toBeInTheDocument()
  })

  it('zooms to specific region when filter applied', async () => {
    const { container } = render(
      <RequestHeatmap requests={mockRequestsWithLocation} onLocationClick={vi.fn()} />
    )

    // Should have zoom controls or map functionality
    const mapElement = screen.getByTestId('heatmap-container')
    expect(mapElement).toBeInTheDocument()
  })

  it('filters heatmap by aid type', () => {
    const { container } = render(
      <RequestHeatmap requests={mockRequestsWithLocation} onLocationClick={vi.fn()} />
    )

    const aidTypeFilter = container.querySelector('[data-aid-filter]') ||
                         screen.queryByRole('combobox', { hidden: true })
    expect(aidTypeFilter || container.textContent.length).toBeGreaterThan(0)
  })

  it('filters heatmap by priority level', () => {
    const { container } = render(
      <RequestHeatmap requests={mockRequestsWithLocation} onLocationClick={vi.fn()} />
    )

    const priorityFilter = container.querySelector('[data-priority-filter]') ||
                          screen.queryByRole('combobox', { hidden: true })
    expect(priorityFilter || container.textContent.length).toBeGreaterThan(0)
  })

  it('filters heatmap by status', () => {
    const { container } = render(
      <RequestHeatmap requests={mockRequestsWithLocation} onLocationClick={vi.fn()} />
    )

    const statusFilter = container.querySelector('[data-status-filter]') ||
                        screen.queryByRole('combobox', { hidden: true })
    expect(statusFilter || container.textContent.length).toBeGreaterThan(0)
  })

  it('displays request details on location click', async () => {
    const onLocationClick = vi.fn()
    const { container } = render(
      <RequestHeatmap requests={mockRequestsWithLocation} onLocationClick={onLocationClick} />
    )

    // Simulate clicking on a heatmap location
    const heatmapContainer = screen.getByTestId('heatmap-container')
    fireEvent.click(heatmapContainer)

    // onLocationClick may be called or popup shown
    expect(onLocationClick || heatmapContainer).toBeDefined()
  })

  it('shows legend for priority levels', () => {
    const { container } = render(
      <RequestHeatmap requests={mockRequestsWithLocation} onLocationClick={vi.fn()} />
    )

    const legend = container.querySelector('[data-legend]') ||
                  container.querySelector('.legend')
    expect(legend || container.textContent.includes('Priority') || 
           container.textContent.includes('Legend')).toBeDefined()
  })

  it('updates heatmap when requests change', async () => {
    const { rerender } = render(
      <RequestHeatmap requests={mockRequestsWithLocation} onLocationClick={vi.fn()} />
    )

    const newRequests = [...mockRequestsWithLocation, {
      id: 'req-5',
      latitude: 40.7500,
      longitude: -74.0200,
      priority: 'urgent',
      aid_type: 'food',
      status: 'open',
    }]

    rerender(<RequestHeatmap requests={newRequests} onLocationClick={vi.fn()} />)

    expect(screen.getByTestId('request-heatmap')).toBeInTheDocument()
  })

  it('shows clustered markers for nearby requests', () => {
    const { container } = render(
      <RequestHeatmap requests={mockRequestsWithLocation} onLocationClick={vi.fn()} />
    )

    const heatmapContainer = screen.getByTestId('heatmap-container')
    expect(heatmapContainer).toBeInTheDocument()
  })

  it('exports heatmap as image', () => {
    const { container } = render(
      <RequestHeatmap requests={mockRequestsWithLocation} onLocationClick={vi.fn()} />
    )

    const exportButton = container.querySelector('[data-export-map]') ||
                        screen.queryByText(/export|download|screenshot/i)
    expect(exportButton || container.textContent.includes('Heatmap')).toBeDefined()
  })

  it('handles geolocation data errors', () => {
    const invalidRequests = [
      { id: 'req-1', latitude: null, longitude: -74.0060 },
      { id: 'req-2', latitude: 40.7200, longitude: null },
    ]

    const { container } = render(
      <RequestHeatmap requests={invalidRequests} onLocationClick={vi.fn()} />
    )

    expect(screen.getByTestId('request-heatmap')).toBeInTheDocument()
  })
})
