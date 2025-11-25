'use client'

import { useState } from 'react'
import { supabase } from '../supabase'
import { geocodeAddress } from '../services/routeService'

/**
 * Shared Post Request Form Component
 * Used by both the home page and the dashboard
 * Handles all request submission logic, validation, and geocoding
 */
export default function PostRequestForm({ user = null, onRequestSubmitted = null, variant = 'page' }) {
  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    aid_type: 'food',
    priority: 'medium',
    description: '',
    location: '',
    address: '',
    latitude: '',
    longitude: ''
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
    
    if (!['low', 'medium', 'high', 'urgent'].includes(formData.priority)) {
      nextErrors.priority = 'Priority must be low, medium, high, or urgent'
    }
    
    if (!formData.location.trim()) {
      nextErrors.location = 'Location is required'
    }
    
    if (!formData.aid_type.trim()) {
      nextErrors.aid_type = 'Aid type is required'
    }
    
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    
    setLoading(true)
    setMessage('Submitting request...')
    
    try {
      // Get address
      const address = formData.address || formData.location
      
      // Auto-geocode if coordinates not provided
      let latitude = formData.latitude ? parseFloat(formData.latitude) : null
      let longitude = formData.longitude ? parseFloat(formData.longitude) : null
      
      if ((!latitude || !longitude) && address) {
        try {
          setMessage('Finding coordinates for your address...')
          const geocoded = await geocodeAddress(address)
          if (geocoded.lat && geocoded.lng) {
            latitude = geocoded.lat
            longitude = geocoded.lng
            console.log('Geocoded address to:', latitude, longitude)
          } else {
            console.warn('Could not geocode address:', address)
          }
        } catch (error) {
          console.error('Geocoding error:', error)
          // Continue without coordinates - they can be added later
        }
      }
      
      // Prepare data with coordinates
      const requestData = {
        name: formData.name,
        contact: formData.contact,
        aid_type: formData.aid_type.toLowerCase(),
        priority: formData.priority || 'medium',
        description: formData.description,
        location: formData.location,
        address: address,
        latitude: latitude,
        longitude: longitude,
        status: 'pending',
        user_id: user?.id || null
      }
      
      const { error } = await supabase
        .from('requests')
        .insert([requestData])
      
      if (error) {
        setMessage('Error: ' + error.message)
      } else {
        if (latitude && longitude) {
          setMessage('✅ Request submitted successfully! Location coordinates found automatically.')
        } else {
          setMessage('✅ Request submitted successfully! (Note: Coordinates could not be automatically determined)')
        }
        
        // Reset form
        setFormData({
          name: '',
          contact: '',
          aid_type: 'food',
          priority: 'medium',
          description: '',
          location: '',
          address: '',
          latitude: '',
          longitude: ''
        })
        setErrors({})
        
        // Call parent callback if provided
        if (onRequestSubmitted) {
          onRequestSubmitted()
        }
      }
    } catch (error) {
      console.error('Error submitting request:', error)
      setMessage('Error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  // Styling based on variant (page or dashboard)
  const containerClass = variant === 'page' 
    ? 'max-w-2xl mx-auto'
    : 'request-form bg-white border border-slate-200 rounded-xl shadow-sm p-6'
  
  const formClass = variant === 'page' ? 'space-y-6' : ''
  const labelClass = variant === 'page'
    ? 'block text-sm font-medium mb-2 text-gray-700'
    : 'block text-sm font-semibold text-slate-700 mb-2'
  
  const inputClass = variant === 'page'
    ? 'w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent'
    : 'w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors'
  
  const groupClass = variant === 'page' ? '' : 'form-group mb-5'
  const groupClassLast = variant === 'page' ? '' : 'form-group mb-6'
  
  const messageClass = variant === 'page'
    ? `${message.includes('Error') ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-green-50 border border-green-200 text-green-700'} px-4 py-3 rounded-md`
    : `message ${message.includes('Error') ? 'error' : 'success'}`

  const submitButtonClass = variant === 'page'
    ? `w-full py-3 rounded-md text-white font-semibold transition-colors ${
        loading ? 'bg-indigo-300 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'
      }`
    : 'w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed'

  return (
    <div className={containerClass}>
      <h2 className={variant === 'page' ? 'text-3xl font-bold text-center mb-8 text-gray-900' : 'hidden'}>
        Post a Relief Request
      </h2>
      <h3 className={variant === 'dashboard' ? 'text-2xl font-bold text-slate-900 mb-6' : 'hidden'}>
        Post Aid Request
      </h3>
      
      <form onSubmit={handleSubmit} className={formClass}>
        {/* Two column grid for page variant */}
        {variant === 'page' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={labelClass}>Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className={inputClass}
                placeholder="Your full name"
                suppressHydrationWarning
              />
              {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className={labelClass}>Contact</label>
              <input
                type="text"
                value={formData.contact}
                onChange={(e) => setFormData({...formData, contact: e.target.value})}
                className={inputClass}
                placeholder="Phone or Email"
                suppressHydrationWarning
              />
              {errors.contact && <p className="text-red-500 text-sm mt-1">{errors.contact}</p>}
            </div>
          </div>
        )}

        {/* Single column for dashboard variant */}
        {variant === 'dashboard' && (
          <>
            <div className={groupClass}>
              <label className={labelClass}>Name:</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className={inputClass}
                suppressHydrationWarning
              />
              {errors.name && <div className="field-error">{errors.name}</div>}
            </div>
            
            <div className={groupClass}>
              <label className={labelClass}>Contact:</label>
              <input
                type="text"
                value={formData.contact}
                onChange={(e) => setFormData({...formData, contact: e.target.value})}
                className={inputClass}
                suppressHydrationWarning
              />
              {errors.contact && <div className="field-error">{errors.contact}</div>}
            </div>
          </>
        )}

        {/* Aid type and priority */}
        {variant === 'page' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={labelClass}>Aid Type</label>
              <select
                value={formData.aid_type}
                onChange={(e) => setFormData({...formData, aid_type: e.target.value})}
                className={inputClass}
                suppressHydrationWarning
              >
                <option value="food">Food</option>
                <option value="medicine">Medicine</option>
                <option value="shelter">Shelter</option>
                <option value="clothing">Clothing</option>
                <option value="transportation">Transportation</option>
                <option value="other">Other</option>
              </select>
              {errors.aid_type && <p className="text-red-500 text-sm mt-1">{errors.aid_type}</p>}
            </div>

            <div>
              <label className={labelClass}>Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({...formData, priority: e.target.value})}
                className={inputClass}
                suppressHydrationWarning
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
              {errors.priority && <p className="text-red-500 text-sm mt-1">{errors.priority}</p>}
            </div>
          </div>
        )}

        {variant === 'dashboard' && (
          <>
            <div className={groupClass}>
              <label className={labelClass}>Aid Type:</label>
              <select
                value={formData.aid_type}
                onChange={(e) => setFormData({...formData, aid_type: e.target.value})}
                className={inputClass}
                suppressHydrationWarning
              >
                <option value="food">Food</option>
                <option value="medicine">Medicine</option>
                <option value="shelter">Shelter</option>
                <option value="clothing">Clothing</option>
                <option value="transportation">Transportation</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className={groupClass}>
              <label className={labelClass}>Priority:</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({...formData, priority: e.target.value})}
                className={inputClass}
                suppressHydrationWarning
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
              {errors.priority && <div className="field-error">{errors.priority}</div>}
            </div>
          </>
        )}

        {/* Location */}
        {variant === 'page' && (
          <div>
            <label className={labelClass}>Location</label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({...formData, location: e.target.value})}
              className={inputClass}
              placeholder="City or Address"
              suppressHydrationWarning
            />
            {errors.location && <p className="text-red-500 text-sm mt-1">{errors.location}</p>}
          </div>
        )}

        {variant === 'dashboard' && (
          <div className={groupClass}>
            <label className={labelClass}>Location:</label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({...formData, location: e.target.value})}
              className={inputClass}
              suppressHydrationWarning
            />
            {errors.location && <div className="field-error">{errors.location}</div>}
          </div>
        )}

        {/* Description */}
        {variant === 'page' && (
          <div>
            <label className={labelClass}>Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              rows={4}
              className={inputClass}
              placeholder="Describe the type of aid needed and any urgent details"
              suppressHydrationWarning
            />
            {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
          </div>
        )}

        {variant === 'dashboard' && (
          <div className={groupClassLast}>
            <label className={labelClass}>Description:</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className={`${inputClass} min-h-[100px]`}
              suppressHydrationWarning
            />
            {errors.description && <div className="field-error">{errors.description}</div>}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className={submitButtonClass}
        >
          {loading ? 'Submitting...' : 'Submit Request'}
        </button>

        {message && <div className={messageClass}>{message}</div>}
      </form>
    </div>
  )
}
