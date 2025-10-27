import { useState, useEffect } from 'react'
import { supabase } from './supabase'

export default function RequestList({ user }) {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const isAdmin = user.role === 'admin'

  useEffect(() => {
    fetchRequests()
  }, [user])

  const fetchRequests = async () => {
    let query = supabase.from('requests').select('*')
    
    // Regular users can only see their own requests
    if (!isAdmin) {
      query = query.eq('user_id', user.id)
    }
    
    const { data, error } = await query.order('created_at', { ascending: false })
    
    if (!error) {
      setRequests(data || [])
    }
    setLoading(false)
  }

  const filteredRequests = requests.filter(request => 
    filter === 'all' || request.aid_type === filter
  )

  if (loading) return <div className="loading">Loading requests...</div>

  return (
    <div className="request-list">
      <div className="list-header">
        <h3>{isAdmin ? 'All Requests' : 'My Requests'}</h3>
        <div className="filter-controls">
          <label>Filter by type:</label>
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">All</option>
            <option value="food">Food</option>
            <option value="medicine">Medicine</option>
            <option value="shelter">Shelter</option>
            <option value="clothing">Clothing</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      {filteredRequests.length === 0 ? (
        <div className="no-requests">No requests found.</div>
      ) : (
        <div className="requests-grid">
          {filteredRequests.map((request) => (
            <div key={request.id} className="request-card">
              <div className="request-header">
                <h4>{request.name}</h4>
                <span className={`status status-${request.status}`}>
                  {request.status}
                </span>
              </div>
              
              <div className="request-details">
                <p><strong>Type:</strong> {request.aid_type}</p>
                <p><strong>Contact:</strong> {request.contact}</p>
                <p><strong>Location:</strong> {request.location}</p>
                <p><strong>Date:</strong> {new Date(request.created_at).toLocaleDateString()}</p>
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