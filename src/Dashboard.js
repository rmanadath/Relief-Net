'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from './supabase'
import RequestForm from './RequestForm'
import RequestList from './RequestList'
import AdminPanel from './AdminPanel'
import VolunteerDashboard from './components/VolunteerDashboard'

export default function Dashboard({ user }) {
  const isAdmin = user.role === 'admin'
  const isVolunteer = user.role === 'volunteer' || user.role === 'admin' // Admins can also volunteer
  // Normal users should start on 'post' tab, admins can access all tabs
  const [activeTab, setActiveTab] = useState('post')
  const [refreshKey, setRefreshKey] = useState(0)
  const [AssignmentDashboard, setAssignmentDashboard] = useState(null)
  
  // Prevent normal users from accessing admin/volunteer tabs
  useEffect(() => {
    if (!isAdmin && (activeTab === 'admin' || activeTab === 'assign')) {
      setActiveTab('post')
    }
    // Volunteers can access routes tab, but not admin tabs
    if (!isVolunteer && activeTab === 'routes') {
      setActiveTab('post')
    }
  }, [isAdmin, isVolunteer, activeTab])

  // Dynamically load AssignmentDashboard only on client side (Leaflet requires window)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('./AssignmentDashboard').then((mod) => {
        setAssignmentDashboard(() => mod.default)
      })
    }
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  const handleRequestSubmitted = () => {
    setRefreshKey(prev => prev + 1)
  }

  return (
    <div className="dashboard max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <header className="dashboard-header flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl shadow-sm px-6 py-5 mb-6">
        <div className="flex items-center gap-4">
          <Link 
            href="/" 
            className="text-indigo-600 hover:text-indigo-700 transition-colors font-semibold flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Home
          </Link>
          <div className="h-6 w-px bg-slate-300"></div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-1">
              Welcome to ReliefNet
            </h2>
            <p className="text-sm text-slate-600">Disaster relief coordination platform</p>
          </div>
        </div>
        <div className="user-info flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm font-medium text-slate-900">{user.email}</p>
            <p className="text-xs text-slate-500 capitalize">{user.role}</p>
          </div>
          <button 
            onClick={handleLogout} 
            className="logout-btn bg-red-500 hover:bg-red-600 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors shadow-sm"
          >
            Logout
          </button>
        </div>
      </header>

      <nav className="dashboard-nav flex flex-wrap gap-3 mb-6">
        <button 
          className={`rounded-lg px-5 py-2.5 text-sm font-semibold transition-all duration-200 ${
            activeTab === 'post' 
              ? 'bg-indigo-600 text-white shadow-md ring-2 ring-indigo-300' 
              : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 hover:border-slate-400 hover:shadow-sm'
          }`}
          onClick={() => setActiveTab('post')}
        >
          Post Request
        </button>
        <button 
          className={`rounded-lg px-5 py-2.5 text-sm font-semibold transition-all duration-200 ${
            activeTab === 'view' 
              ? 'bg-indigo-600 text-white shadow-md ring-2 ring-indigo-300' 
              : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 hover:border-slate-400 hover:shadow-sm'
          }`}
          onClick={() => setActiveTab('view')}
        >
          View Requests
        </button>
        {/* Volunteer Dashboard - For admins and volunteers */}
        {(isAdmin || user.role === 'volunteer') && (
          <button 
            className={`rounded-lg px-5 py-2.5 text-sm font-semibold transition-all duration-200 ${
              activeTab === 'routes' 
                ? 'bg-indigo-600 text-white shadow-md ring-2 ring-indigo-300' 
                : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 hover:border-slate-400 hover:shadow-sm'
            }`}
            onClick={() => setActiveTab('routes')}
          >
            Volunteer Dashboard
          </button>
        )}
        {isAdmin && (
          <>
            <button 
              className={`rounded-lg px-5 py-2.5 text-sm font-semibold transition-all duration-200 ${
                activeTab === 'admin' 
                  ? 'bg-indigo-600 text-white shadow-md ring-2 ring-indigo-300' 
                  : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 hover:border-slate-400 hover:shadow-sm'
              }`}
              onClick={() => setActiveTab('admin')}
            >
              Admin Panel
            </button>
            <button 
              className={`rounded-lg px-5 py-2.5 text-sm font-semibold transition-all duration-200 ${
                activeTab === 'assign' 
                  ? 'bg-indigo-600 text-white shadow-md ring-2 ring-indigo-300' 
                  : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 hover:border-slate-400 hover:shadow-sm'
              }`}
              onClick={() => setActiveTab('assign')}
            >
              Assignment Dashboard
            </button>
          </>
        )}
      </nav>

      <main className="dashboard-content">
        {activeTab === 'post' && (
          <RequestForm 
            user={user} 
            onRequestSubmitted={handleRequestSubmitted}
          />
        )}
        {activeTab === 'view' && (
          <RequestList key={refreshKey} user={user} />
        )}
        {activeTab === 'routes' && isVolunteer && (
          <VolunteerDashboard user={user} />
        )}
        {activeTab === 'admin' && isAdmin && (
          <AdminPanel user={user} onUpdate={handleRequestSubmitted} />
        )}
        {activeTab === 'assign' && isAdmin && (
          AssignmentDashboard ? <AssignmentDashboard user={user} /> : (
            <div className="flex items-center justify-center p-8 text-slate-600">Loading map...</div>
          )
        )}
      </main>
    </div>
  )
}