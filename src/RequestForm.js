import { useState } from 'react'
import { supabase } from './supabase'

export default function RequestForm({ user, onRequestSubmitted }) {
  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    aid_type: 'food',
    description: '',
    location: ''
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    const { error } = await supabase
      .from('requests')
      .insert([{ ...formData, user_id: user.id }])
    
    if (error) {
      setMessage('Error: ' + error.message)
    } else {
      setMessage('Request submitted successfully!')
      setFormData({
        name: '',
        contact: '',
        aid_type: 'food',
        description: '',
        location: ''
      })
      onRequestSubmitted()
    }
    setLoading(false)
  }

  return (
    <div className="request-form">
      <h3>Post Aid Request</h3>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Name:</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            required
          />
        </div>
        
        <div className="form-group">
          <label>Contact:</label>
          <input
            type="text"
            value={formData.contact}
            onChange={(e) => setFormData({...formData, contact: e.target.value})}
            required
          />
        </div>
        
        <div className="form-group">
          <label>Aid Type:</label>
          <select
            value={formData.aid_type}
            onChange={(e) => setFormData({...formData, aid_type: e.target.value})}
          >
            <option value="food">Food</option>
            <option value="medicine">Medicine</option>
            <option value="shelter">Shelter</option>
            <option value="clothing">Clothing</option>
            <option value="other">Other</option>
          </select>
        </div>
        
        <div className="form-group">
          <label>Description:</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            required
          />
        </div>
        
        <div className="form-group">
          <label>Location:</label>
          <input
            type="text"
            value={formData.location}
            onChange={(e) => setFormData({...formData, location: e.target.value})}
            required
          />
        </div>
        
        <button type="submit" disabled={loading} className="submit-btn">
          {loading ? 'Submitting...' : 'Submit Request'}
        </button>
      </form>
      
      {message && (
        <div className={`message ${message.includes('Error') ? 'error' : 'success'}`}>
          {message}
        </div>
      )}
    </div>
  )
}