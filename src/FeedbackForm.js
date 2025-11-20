"use client";

import { useState } from 'react'
import { supabase } from './supabase'

export default function FeedbackForm({ requestId, onFeedbackSubmitted }) {
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (rating === 0) {
      alert('Please select a rating')
      return
    }

    setSubmitting(true)
    
    try {
      const { error } = await supabase
        .from('feedback')
        .insert([{
          request_id: requestId,
          rating: rating,
          comment: comment,
          created_at: new Date().toISOString()
        }])

      if (error) throw error

      setSubmitted(true)
      setComment('')
      setRating(0)
      if (onFeedbackSubmitted) onFeedbackSubmitted()
    } catch (error) {
      console.error('Feedback submission error:', error)
      alert('Error submitting feedback: ' + error.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
        <p className="text-green-800 font-medium">Thank you for your feedback!</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="feedback-form bg-white border border-slate-200 rounded-lg p-4">
      <h4 className="font-semibold mb-3 text-slate-800">Submit Feedback</h4>
      
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2 text-slate-700">Rating</label>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              className={`w-10 h-10 rounded-lg transition-colors ${
                star <= rating
                  ? 'bg-yellow-400 text-yellow-900'
                  : 'bg-slate-200 text-slate-500 hover:bg-slate-300'
              }`}
            >
              ⭐
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-2 text-slate-700">Comments (optional)</label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="Share your experience..."
        />
      </div>

      <button
        type="submit"
        disabled={submitting || rating === 0}
        className="w-full bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {submitting ? 'Submitting...' : 'Submit Feedback'}
      </button>
    </form>
  )
}

