import { useState } from 'react'
import { supabase } from './supabase'
import RequestForm from './RequestForm'
import RequestList from './RequestList'
import AdminPanel from './AdminPanel'
import RouteOptimizer from './components/RouteOptimizer'
import AssignmentDashboard from './AssignmentDashboard'

export default function Dashboard({ user }) {
  const [activeTab, setActiveTab] = useState('post')
  const [refreshKey, setRefreshKey] = useState(0)
  const isAdmin = user.role === 'admin'

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  const handleRequestSubmitted = () => {
    setRefreshKey(prev => prev + 1)
  }

  return (
    <div className="dashboard max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <header className="dashboard-header flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl shadow-sm px-6 py-5 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-1">
            <a 
              href="/" 
              className="hover:text-indigo-600 transition-colors cursor-pointer"
            >
              Welcome to ReliefNet
            </a>
          </h2>
          <p className="text-sm text-slate-600">Disaster relief coordination platform</p>
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
        <button 
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 ${
            activeTab === 'routes' 
              ? 'bg-blue-600 text-white shadow-lg ring-2 ring-blue-300' 
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 hover:border-gray-400'
          }`}
          onClick={() => setActiveTab('routes')}
        >
          Route Optimizer
        </button>
        {isAdmin && (
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
        {activeTab === 'routes' && (
          <RouteOptimizer user={user} />
        )}
        {activeTab === 'admin' && isAdmin && (
          <AdminPanel user={user} onUpdate={handleRequestSubmitted} />
        )}
        {activeTab === 'assign' && isAdmin && (
          <AssignmentDashboard user={user} />
        )}
      </main>
    </div>
  )
}