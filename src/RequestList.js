import { useState, useEffect } from 'react'
import { supabase } from './supabase'

export default function RequestList({ user }) {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')
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

  const filteredRequests = requests.filter(request => {
    const typeOk = filter === 'all' || request.aid_type === filter
    const priorityOk = priorityFilter === 'all' || (request.priority || 'medium') === priorityFilter
    const statusOk = statusFilter === 'all' || (request.status || 'pending') === statusFilter
    const searchOk = search.trim() === '' ||
      (request.location && request.location.toLowerCase().includes(search.trim().toLowerCase())) ||
      (request.description && request.description.toLowerCase().includes(search.trim().toLowerCase()))
    return typeOk && priorityOk && statusOk && searchOk
  })

  if (loading) return <div className="loading text-sm text-slate-600">Loading requests...</div>

  return (
    <div className="request-list">
      <div className="list-header flex items-center justify-between mb-2">
        <h3 className="text-lg font-medium">{isAdmin ? 'All Requests' : 'My Requests'}</h3>
        <div className="filter-controls flex items-center gap-2 flex-wrap">
          <label className="text-sm text-slate-700">Type:</label>
          <select className="border rounded-md px-2 py-1 text-sm" value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">All</option>
            <option value="food">Food</option>
            <option value="medicine">Medicine</option>
            <option value="shelter">Shelter</option>
            <option value="clothing">Clothing</option>
            <option value="other">Other</option>
          </select>
          <label className="text-sm text-slate-700 ml-3">Priority:</label>
          <select className="border rounded-md px-2 py-1 text-sm" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
            <option value="all">All</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <label className="text-sm text-slate-700 ml-3">Status:</label>
          <select className="border rounded-md px-2 py-1 text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="in-progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="fulfilled">Fulfilled</option>
          </select>
          <input 
            className="border rounded-md px-2 py-1 text-sm ml-3" 
            type="text" 
            placeholder="Search location or keywords" 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            style={{ minWidth: '180px' }}
          />
        </div>
      </div>

      {filteredRequests.length === 0 ? (
        <div className="no-requests text-slate-600">No requests found.</div>
      ) : (
        <div className="requests-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredRequests.map((request) => (
            <div key={request.id} className="request-card bg-white border border-slate-200 rounded-xl p-4">
              <div className="request-header flex items-center justify-between mb-2">
                <h4 className="font-semibold">{request.name}</h4>
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
              <div className="request-details text-sm text-slate-700 space-y-1">
                <p><strong>Type:</strong> {request.aid_type}</p>
                <p><strong>Status:</strong> {request.status}</p>
                <p><strong>Priority:</strong> {(request.priority || 'medium')}</p>
                <p><strong>Location:</strong> {request.location}</p>
                <p><strong>Date:</strong> {new Date(request.created_at).toLocaleDateString()}</p>
                <p><strong>Assigned To:</strong> {request.assigned_to || '—'}</p>
                <p><strong>Contact:</strong> {request.contact}</p>
              </div>
              <div className="request-description mt-2 text-slate-800">
                <p>{request.description}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}