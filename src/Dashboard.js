import { useState } from 'react'
import { supabase } from './supabase'
import RequestForm from './RequestForm'
import RequestList from './RequestList'
import AdminPanel from './AdminPanel'
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
    <div className="dashboard max-w-6xl mx-auto p-4">
      <header className="dashboard-header flex items-center justify-between bg-white border border-slate-200 rounded-xl shadow-sm px-5 py-4">
        <h2 className="text-xl font-semibold">Welcome to ReliefNet</h2>
        <div className="user-info flex items-center gap-3">
          <p className="text-sm text-slate-700">Email: {user.email} ({user.role})</p>
          <button onClick={handleLogout} className="logout-btn bg-red-500 text-white rounded-md px-3 py-2 text-sm">Logout</button>
        </div>
      </header>

      <nav className="dashboard-nav flex gap-2 my-4 flex-wrap">
        <button 
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 ${
            activeTab === 'post' 
              ? 'bg-blue-600 text-white shadow-lg ring-2 ring-blue-300' 
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 hover:border-gray-400'
          }`}
          onClick={() => setActiveTab('post')}
        >
          Post Request
        </button>
        <button 
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 ${
            activeTab === 'view' 
              ? 'bg-blue-600 text-white shadow-lg ring-2 ring-blue-300' 
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 hover:border-gray-400'
          }`}
          onClick={() => setActiveTab('view')}
        >
          View Requests
        </button>
        {isAdmin && (
          <>
            <button 
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 ${
                activeTab === 'admin' 
                  ? 'bg-blue-600 text-white shadow-lg ring-2 ring-blue-300' 
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 hover:border-gray-400'
              }`}
              onClick={() => setActiveTab('admin')}
            >
              Admin Panel
            </button>
            <button 
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 ${
                activeTab === 'assign' 
                  ? 'bg-green-600 text-white shadow-lg ring-2 ring-green-300' 
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 hover:border-gray-400'
              }`}
              onClick={() => setActiveTab('assign')}
            >
              Assign Routes
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