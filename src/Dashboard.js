import { useState } from 'react'
import { supabase } from './supabase'
import RequestForm from './RequestForm'
import RequestList from './RequestList'

export default function Dashboard({ user }) {
  const [activeTab, setActiveTab] = useState('post')
  const [refreshKey, setRefreshKey] = useState(0)

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  const handleRequestSubmitted = () => {
    // Trigger refresh of the request list
    setRefreshKey(prev => prev + 1)
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h2>Welcome to ReliefNet</h2>
        <div className="user-info">
          <p>Email: {user.email}</p>
          <button onClick={handleLogout} className="logout-btn">Logout</button>
        </div>
      </header>

      <nav className="dashboard-nav">
        <button 
          className={activeTab === 'post' ? 'active' : ''}
          onClick={() => setActiveTab('post')}
        >
          Post Request
        </button>
        <button 
          className={activeTab === 'view' ? 'active' : ''}
          onClick={() => setActiveTab('view')}
        >
          View Requests
        </button>
      </nav>

      <main className="dashboard-content">
        {activeTab === 'post' && (
          <RequestForm 
            user={user} 
            onRequestSubmitted={handleRequestSubmitted}
          />
        )}
        {activeTab === 'view' && (
          <RequestList key={refreshKey} />
        )}
      </main>
    </div>
  )
}