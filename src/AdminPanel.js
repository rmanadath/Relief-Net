'use client'
import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import RouteOptimizer from './RouteOptimizer'

export default function AdminPanel({ user, onUpdate }) {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedRequests, setSelectedRequests] = useState([])
  const [showRouteOptimizer, setShowRouteOptimizer] = useState(false)
  const [volunteers, setVolunteers] = useState([])
  const [analytics, setAnalytics] = useState(null)

  useEffect(() => {
    if (user.role === 'admin') {
      fetchAllRequests()
      fetchAnalytics()
    }
  }, [user])

  const fetchAnalytics = async () => {
    const { data, error } = await supabase
      .from('requests')
      .select('status, priority')
    
    if (!error && data) {
      const stats = {
        total: data.length,
        open: data.filter(r => r.status === 'open' || r.status === 'pending').length,
        inProgress: data.filter(r => r.status === 'in-progress').length,
        fulfilled: data.filter(r => r.status === 'fulfilled' || r.status === 'resolved').length,
        highPriority: data.filter(r => r.priority === 'high').length,
      }
      setAnalytics(stats)
    }
  }

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
      fetchAnalytics()
      onUpdate()
    }
  }

  const toggleRequestSelection = (requestId) => {
    setSelectedRequests(prev => 
      prev.includes(requestId)
        ? prev.filter(id => id !== requestId)
        : [...prev, requestId]
    )
  }

  const assignVolunteer = async (requestId, volunteerName) => {
    if (!volunteerName || !volunteerName.trim()) {
      alert('Please enter a volunteer name')
      return
    }

    const trimmedName = volunteerName.trim()

    // Update: assigned_volunteer is TEXT field for volunteer name
    // assigned_to is UUID field for user ID (don't set it with name)
    // Always update status to 'in-progress' when assigning volunteer
    const updateData = {
      assigned_volunteer: trimmedName,
      status: 'in-progress' // Force status to in-progress
    }
    
    // Don't set assigned_to unless we have a UUID - it's for linking to user accounts

    console.log('Assigning volunteer:', { requestId, volunteerName: trimmedName, updateData })

    const { data, error } = await supabase
      .from('requests')
      .update(updateData)
      .eq('id', requestId)
      .select()
    
    if (error) {
      console.error('Error assigning volunteer:', error)
      console.error('Error details:', JSON.stringify(error, null, 2))
      alert(`Failed to assign volunteer: ${error.message}\n\nCheck console for details.`)
      return
    }

    if (data && data.length > 0) {
      // Update local state with the returned data from database
      const updatedRequest = data[0]
      console.log('✅ Updated request from database:', updatedRequest)
      console.log('✅ Status after update:', updatedRequest.status)
      console.log('✅ Assigned volunteer:', updatedRequest.assigned_volunteer)
      
      // Update local state immediately
      setRequests(requests.map(req => 
        req.id === requestId ? { ...req, ...updatedRequest } : req
      ))
      
      // Refresh analytics and trigger parent update
      await fetchAnalytics()
      onUpdate()
      
      // Force a full refresh to ensure UI is in sync with database
      setTimeout(async () => {
        await fetchAllRequests()
        await fetchAnalytics()
      }, 500)
    } else {
      console.warn('⚠️ Update succeeded but no data returned, refreshing all requests...')
      // Force refresh to get latest data from database
      await fetchAllRequests()
      await fetchAnalytics()
    }
  }

  const handleRouteOptimized = (route) => {
    setShowRouteOptimizer(false)
    fetchAllRequests()
    fetchAnalytics()
  }

  if (user.role !== 'admin') {
    return <div>Access denied. Admin only.</div>
  }

  if (loading) return <div className="loading">Loading...</div>

  return (
    <div className="admin-panel space-y-6">
      {/* Analytics Dashboard */}
      {analytics && (
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-6 text-white">
          <h3 className="text-xl font-semibold mb-4">Analytics Dashboard</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white/20 rounded-lg p-3 backdrop-blur">
              <p className="text-3xl font-bold">{analytics.total}</p>
              <p className="text-sm opacity-90">Total Requests</p>
            </div>
            <div className="bg-white/20 rounded-lg p-3 backdrop-blur">
              <p className="text-3xl font-bold">{analytics.open}</p>
              <p className="text-sm opacity-90">Open</p>
            </div>
            <div className="bg-white/20 rounded-lg p-3 backdrop-blur">
              <p className="text-3xl font-bold">{analytics.inProgress}</p>
              <p className="text-sm opacity-90">In Progress</p>
            </div>
            <div className="bg-white/20 rounded-lg p-3 backdrop-blur">
              <p className="text-3xl font-bold">{analytics.fulfilled}</p>
              <p className="text-sm opacity-90">Fulfilled</p>
            </div>
            <div className="bg-white/20 rounded-lg p-3 backdrop-blur">
              <p className="text-3xl font-bold">{analytics.highPriority}</p>
              <p className="text-sm opacity-90">High Priority</p>
            </div>
          </div>
        </div>
      )}

      {/* Route Optimizer Toggle */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between">
        <div>
          <h4 className="font-semibold text-slate-800">Route Optimization</h4>
          <p className="text-sm text-slate-600">
            {selectedRequests.length} request{selectedRequests.length !== 1 ? 's' : ''} selected
          </p>
        </div>
        <div className="flex gap-2">
          {selectedRequests.length > 0 && (
            <button
              onClick={() => setSelectedRequests([])}
              className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              Clear Selection
            </button>
          )}
          <button
            onClick={() => setShowRouteOptimizer(!showRouteOptimizer)}
            disabled={selectedRequests.length === 0}
            className="px-4 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {showRouteOptimizer ? 'Hide Optimizer' : 'Show Route Optimizer'}
          </button>
        </div>
      </div>

      {/* Route Optimizer */}
      {showRouteOptimizer && (
        <RouteOptimizer
          selectedRequests={requests.filter(r => selectedRequests.includes(r.id))}
          onRouteOptimized={handleRouteOptimized}
        />
      )}

      {/* Requests List */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h3 className="text-xl font-semibold mb-4 text-red-600">Manage All Requests</h3>
        
        {requests.length === 0 ? (
        <div className="no-requests text-slate-600 text-center py-8">No requests found.</div>
      ) : (
        <div className="requests-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {requests.map((request) => (
            <div 
              key={request.id} 
              className={`request-card border rounded-xl p-4 transition-all ${
                selectedRequests.includes(request.id)
                  ? 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-200'
                  : 'bg-white border-slate-200'
              }`}
            >
              <div className="request-header flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedRequests.includes(request.id)}
                    onChange={() => toggleRequestSelection(request.id)}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <h4 className="font-semibold text-lg">{request.name}</h4>
                </div>
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
                <p><strong>Name:</strong> {request.name}</p>
                <p><strong>Type:</strong> {request.aid_type}</p>
                <p><strong>Status:</strong> {request.status}</p>
                <p><strong>Priority:</strong> {(request.priority || 'medium')}</p>
                <p><strong>Location:</strong> {request.location}</p>
                <p><strong>Date:</strong> {new Date(request.created_at).toLocaleDateString()}</p>
                <p><strong>Assigned To:</strong> {request.assigned_to || request.assigned_volunteer || '—'}</p>
                <p><strong>Contact:</strong> {request.contact}</p>
              </div>
              
              <div className="request-description mb-4 text-slate-800">
                <p>{request.description}</p>
              </div>
              
              {(request.assigned_volunteer || request.assigned_to) && (
                <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded text-sm">
                  <p className="text-blue-800">
                    <strong>Volunteer:</strong> {request.assigned_volunteer || request.assigned_to}
                  </p>
                </div>
              )}

              <div className="admin-actions flex flex-col gap-2">
                {!request.assigned_volunteer && !request.assigned_to && (
                  <button
                    onClick={() => {
                      const volunteerName = prompt('Enter volunteer name:')
                      if (volunteerName) assignVolunteer(request.id, volunteerName)
                    }}
                    className="bg-purple-500 text-white px-3 py-1.5 rounded text-xs hover:bg-purple-600"
                  >
                    Assign Volunteer
                  </button>
                )}
                <div className="flex gap-2 flex-wrap">
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
            </div>
          ))}
        </div>
        )}
      </div>
    </div>
  )
}