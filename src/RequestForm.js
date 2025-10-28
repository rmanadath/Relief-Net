import { useState } from 'react'
import { supabase } from './supabase'

export default function RequestForm({ user, onRequestSubmitted }) {
  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    aid_type: 'food',
    priority: 'medium',
    description: '',
    location: ''
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [errors, setErrors] = useState({})

  const validate = () => {
    const nextErrors = {}
    if (!formData.name.trim()) nextErrors.name = 'Name is required'
    const phoneOrEmail = formData.contact.trim()
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s\./0-9]*$/
    if (!phoneOrEmail || (!emailRegex.test(phoneOrEmail) && !phoneRegex.test(phoneOrEmail))) {
      nextErrors.contact = 'Enter a valid email or phone number'
    }
    if (!formData.description.trim() || formData.description.trim().length < 10) {
      nextErrors.description = 'Describe the need in at least 10 characters'
    }
    if (!['low', 'medium', 'high'].includes(formData.priority)) {
      nextErrors.priority = 'Priority must be low, medium, or high'
    }
    if (!formData.location.trim()) nextErrors.location = 'Location is required'
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
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
          {errors.name && <div className="field-error">{errors.name}</div>}
        </div>
        
        <div className="form-group">
          <label>Contact:</label>
          <input
            type="text"
            value={formData.contact}
            onChange={(e) => setFormData({...formData, contact: e.target.value})}
            required
          />
          {errors.contact && <div className="field-error">{errors.contact}</div>}
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
          <label>Priority:</label>
          <select
            value={formData.priority}
            onChange={(e) => setFormData({...formData, priority: e.target.value})}
          >
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          {errors.priority && <div className="field-error">{errors.priority}</div>}
        </div>
        
        <div className="form-group">
          <label>Description:</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            required
          />
          {errors.description && <div className="field-error">{errors.description}</div>}
        </div>
        
        <div className="form-group">
          <label>Location:</label>
          <input
            type="text"
            value={formData.location}
            onChange={(e) => setFormData({...formData, location: e.target.value})}
            required
          />
          {errors.location && <div className="field-error">{errors.location}</div>}
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