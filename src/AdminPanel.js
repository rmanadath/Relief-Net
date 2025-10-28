import { useState, useEffect } from 'react'
import { supabase } from './supabase'

export default function AdminPanel({ user, onUpdate }) {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user.role === 'admin') {
      fetchAllRequests()
    }
  }, [user])

  const fetchAllRequests = async () => {
    const { data, error } = await supabase
      .from('requests')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (!error) {
      setRequests(data || [])
    }
    setLoading(false)
  }

  const updateRequestStatus = async (requestId, newStatus) => {
    const { error } = await supabase
      .from('requests')
      .update({ status: newStatus })
      .eq('id', requestId)
    
    if (!error) {
      setRequests(requests.map(req => 
        req.id === requestId ? { ...req, status: newStatus } : req
      ))
      onUpdate()
    }
  }

  if (user.role !== 'admin') {
    return <div>Access denied. Admin only.</div>
  }

  if (loading) return <div className="loading">Loading...</div>

  return (
    <div className="admin-panel">
      <h3>Admin Panel - Manage All Requests</h3>
      
      {requests.length === 0 ? (
        <div className="no-requests">No requests found.</div>
      ) : (
        <div className="requests-grid">
          {requests.map((request) => (
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
              
              <div className="admin-actions">
                <button 
                  onClick={() => updateRequestStatus(request.id, 'in-progress')}
                  disabled={request.status === 'in-progress'}
                >
                  Mark In Progress
                </button>
                <button 
                  onClick={() => updateRequestStatus(request.id, 'fulfilled')}
                  disabled={request.status === 'fulfilled'}
                >
                  Mark Fulfilled
                </button>
                <button 
                  onClick={() => updateRequestStatus(request.id, 'open')}
                  disabled={request.status === 'open'}
                >
                  Reopen
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}