'use client'

import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import FeedbackForm from './components/FeedbackForm'

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
    const statusOk = statusFilter === 'all' || (request.status || 'open') === statusFilter
    const searchOk = search.trim() === '' ||
      (request.location && request.location.toLowerCase().includes(search.trim().toLowerCase())) ||
      (request.description && request.description.toLowerCase().includes(search.trim().toLowerCase()))
    return typeOk && priorityOk && statusOk && searchOk
  })

  if (loading) return <div className="loading text-sm text-slate-600">Loading requests...</div>

  return (
    <div className="request-list">
      <div className="list-header flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h3 className="text-2xl font-bold text-slate-900">{isAdmin ? 'All Requests' : 'My Requests'}</h3>
        <div className="filter-controls flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-slate-700">Type:</label>
            <select className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">All</option>
            <option value="food">Food</option>
            <option value="medicine">Medicine</option>
            <option value="shelter">Shelter</option>
            <option value="clothing">Clothing</option>
            <option value="other">Other</option>
          </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-slate-700">Priority:</label>
            <select className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
            <option value="all">All</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          </div>
        </div>
      </div>

      {filteredRequests.length === 0 ? (
        <div className="no-requests text-slate-600">No requests found.</div>
      ) : (
        <div className="requests-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRequests.map((request) => (
            <div key={request.id} className="request-card bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
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
              
              <div className="request-details text-sm text-slate-700 space-y-1.5 mb-3">
                <p><strong className="text-slate-900">Type:</strong> <span className="capitalize">{request.aid_type}</span></p>
                <p><strong className="text-slate-900">Contact:</strong> {request.contact}</p>
                <p><strong className="text-slate-900">Location:</strong> {request.location}</p>
                <p><strong className="text-slate-900">Date:</strong> {new Date(request.created_at).toLocaleDateString()}</p>
              </div>
              
              <div className="request-description mt-3 pt-3 border-t border-slate-100 text-slate-800 mb-3">
                <p className="text-sm leading-relaxed">{request.description}</p>
              </div>

              {request.status === 'fulfilled' && (
                <div className="mt-3 pt-3 border-t border-slate-200">
                  <FeedbackForm 
                    requestId={request.id}
                    onFeedbackSubmitted={fetchRequests}
                  />
                </div>
              )}

              {request.assigned_volunteer && (
                <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                  <p className="text-blue-800">
                    <strong>Volunteer:</strong> {request.assigned_volunteer}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}