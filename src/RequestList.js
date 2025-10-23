import { useState, useEffect } from 'react'
import { supabase } from './supabase'

export default function RequestList() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    fetchRequests()
  }, [])

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('requests')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        throw error
      }

      setRequests(data || [])
    } catch (error) {
      console.error('Error fetching requests:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredRequests = requests.filter(request => {
    if (filter === 'all') return true
    return request.aid_type === filter
  })

  const getStatusColor = (status) => {
    switch (status) {
      case 'open': return 'status-open'
      case 'fulfilled': return 'status-fulfilled'
      case 'in_progress': return 'status-in-progress'
      default: return 'status-open'
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return <div className="loading">Loading requests...</div>
  }

  return (
    <div className="request-list">
      <div className="list-header">
        <h3>Available Requests</h3>
        <div className="filter-controls">
          <label htmlFor="filter">Filter by type:</label>
          <select
            id="filter"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">All Types</option>
            <option value="food">Food</option>
            <option value="medicine">Medicine</option>
            <option value="shelter">Shelter</option>
            <option value="clothing">Clothing</option>
            <option value="transportation">Transportation</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      {filteredRequests.length === 0 ? (
        <div className="no-requests">
          <p>No requests found. {filter !== 'all' ? 'Try changing the filter.' : 'Be the first to post a request!'}</p>
        </div>
      ) : (
        <div className="requests-grid">
          {filteredRequests.map((request) => (
            <div key={request.id} className="request-card">
              <div className="request-header">
                <h4>{request.name}</h4>
                <span className={`status ${getStatusColor(request.status)}`}>
                  {request.status.replace('_', ' ').toUpperCase()}
                </span>
              </div>
              
              <div className="request-details">
                <p><strong>Type:</strong> {request.aid_type}</p>
                <p><strong>Location:</strong> {request.location}</p>
                <p><strong>Contact:</strong> {request.contact}</p>
                <p><strong>Posted:</strong> {formatDate(request.created_at)}</p>
              </div>
              
              <div className="request-description">
                <p>{request.description}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
