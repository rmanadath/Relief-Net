import { useState } from 'react'
import { supabase } from './supabase'

export default function RequestForm({ user, onRequestSubmitted }) {
  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    aidType: '',
    description: '',
    location: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState('')

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setMessage('')

    try {
      const { data, error } = await supabase
        .from('requests')
        .insert([
          {
            user_id: user.id,
            name: formData.name,
            contact: formData.contact,
            aid_type: formData.aidType,
            description: formData.description,
            location: formData.location,
            status: 'open',
            created_at: new Date().toISOString()
          }
        ])
        .select()

      if (error) {
        throw error
      }

      setMessage('Request submitted successfully!')
      setFormData({
        name: '',
        contact: '',
        aidType: '',
        description: '',
        location: ''
      })
      
      // Notify parent component to refresh the request list
      if (onRequestSubmitted) {
        onRequestSubmitted()
      }
    } catch (error) {
      setMessage(`Error: ${error.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="request-form">
      <h3>Post a Request for Aid</h3>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">Name *</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            placeholder="Your full name"
          />
        </div>

        <div className="form-group">
          <label htmlFor="contact">Contact Information *</label>
          <input
            type="text"
            id="contact"
            name="contact"
            value={formData.contact}
            onChange={handleChange}
            required
            placeholder="Phone number or email"
          />
        </div>

        <div className="form-group">
          <label htmlFor="aidType">Type of Aid Needed *</label>
          <select
            id="aidType"
            name="aidType"
            value={formData.aidType}
            onChange={handleChange}
            required
          >
            <option value="">Select aid type</option>
            <option value="food">Food</option>
            <option value="medicine">Medicine</option>
            <option value="shelter">Shelter</option>
            <option value="clothing">Clothing</option>
            <option value="transportation">Transportation</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="description">Description *</label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            required
            rows="4"
            placeholder="Please describe your specific needs and any additional details..."
          />
        </div>

        <div className="form-group">
          <label htmlFor="location">Location *</label>
          <input
            type="text"
            id="location"
            name="location"
            value={formData.location}
            onChange={handleChange}
            required
            placeholder="City, State or specific address"
          />
        </div>

        <button 
          type="submit" 
          disabled={isSubmitting}
          className="submit-btn"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Request'}
        </button>

        {message && (
          <div className={`message ${message.includes('Error') ? 'error' : 'success'}`}>
            {message}
          </div>
        )}
      </form>
    </div>
  )
}
