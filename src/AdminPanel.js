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
    <div className="admin-panel bg-white border border-slate-200 rounded-xl p-6">
      <h3 className="text-xl font-semibold mb-4 text-red-600">Admin Panel - Manage All Requests</h3>
      
      {requests.length === 0 ? (
        <div className="no-requests text-slate-600 text-center py-8">No requests found.</div>
      ) : (
        <div className="requests-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {requests.map((request) => (
            <div key={request.id} className="request-card bg-white border border-slate-200 rounded-xl p-4">
              <div className="request-header flex items-center justify-between mb-3">
                <h4 className="font-semibold text-lg">{request.name}</h4>
                <div className="flex items-center gap-2">
                  <span className={`status text-xs rounded-full px-2 py-0.5 border capitalize ${
                    request.status === 'fulfilled' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                    request.status === 'in-progress' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                    'bg-blue-50 text-blue-700 border-blue-200'
                  }`}>
                    {request.status}
                  </span>
                  <span className={`text-xs rounded-full px-2 py-0.5 border capitalize ${
                    (request.priority || 'medium') === 'high' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                    (request.priority || 'medium') === 'low' ? 'bg-slate-50 text-slate-700 border-slate-200' :
                    'bg-violet-50 text-violet-700 border-violet-200'
                  }`}>
                    {(request.priority || 'medium')} priority
                  </span>
                </div>
              </div>
              
              <div className="request-details text-sm text-slate-700 space-y-1 mb-3">
                <p><strong>Type:</strong> {request.aid_type}</p>
                <p><strong>Contact:</strong> {request.contact}</p>
                <p><strong>Location:</strong> {request.location}</p>
                <p><strong>Date:</strong> {new Date(request.created_at).toLocaleDateString()}</p>
              </div>
              
              <div className="request-description mb-4 text-slate-800">
                <p>{request.description}</p>
              </div>
              
              <div className="admin-actions flex gap-2 flex-wrap">
                <button 
                  className="bg-yellow-500 text-white px-3 py-1 rounded text-xs hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => updateRequestStatus(request.id, 'in-progress')}
                  disabled={request.status === 'in-progress'}
                >
                  Mark In Progress
                </button>
                <button 
                  className="bg-green-500 text-white px-3 py-1 rounded text-xs hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => updateRequestStatus(request.id, 'fulfilled')}
                  disabled={request.status === 'fulfilled'}
                >
                  Mark Fulfilled
                </button>
                <button 
                  className="bg-gray-500 text-white px-3 py-1 rounded text-xs hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
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