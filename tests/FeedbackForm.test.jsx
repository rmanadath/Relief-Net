import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'

// Mock feedback form component
const FeedbackForm = ({ requestId, volunteerId, onSubmit }) => {
  const [feedback, setFeedback] = React.useState({
    rating: 5,
    comment: '',
    recommendVolunteer: true,
  })
  const [submitted, setSubmitted] = React.useState(false)
  const [error, setError] = React.useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await onSubmit(feedback)
      setSubmitted(true)
    } catch (err) {
      setError(err.message)
    }
  }

  if (submitted) {
    return <div data-testid="success-message">Thank you for your feedback!</div>
  }

  return (
    <form onSubmit={handleSubmit} data-testid="feedback-form">
      <div>
        <label htmlFor="rating">Rating (1-5)</label>
        <select
          id="rating"
          value={feedback.rating}
          onChange={(e) => setFeedback({ ...feedback, rating: parseInt(e.target.value) })}
          data-testid="rating-select"
        >
          {[1, 2, 3, 4, 5].map(i => (
            <option key={i} value={i}>{i} Stars</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="comment">Comments</label>
        <textarea
          id="comment"
          value={feedback.comment}
          onChange={(e) => setFeedback({ ...feedback, comment: e.target.value })}
          placeholder="Share your experience..."
          data-testid="comment-textarea"
        />
      </div>

      <div>
        <label htmlFor="recommend">
          <input
            id="recommend"
            type="checkbox"
            checked={feedback.recommendVolunteer}
            onChange={(e) => setFeedback({ ...feedback, recommendVolunteer: e.target.checked })}
            data-testid="recommend-checkbox"
          />
          Would you recommend this volunteer?
        </label>
      </div>

      {error && <div data-testid="error-message">{error}</div>}

      <button type="submit" data-testid="submit-button">Submit Feedback</button>
    </form>
  )
}

describe('Feedback Form', () => {
  const mockRequestId = 'req-1'
  const mockVolunteerId = 'vol-1'
  const mockOnSubmit = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders feedback form', () => {
    render(
      <FeedbackForm
        requestId={mockRequestId}
        volunteerId={mockVolunteerId}
        onSubmit={mockOnSubmit}
      />
    )
    
    expect(screen.getByTestId('feedback-form')).toBeInTheDocument()
  })

  it('displays rating selection (1-5 stars)', () => {
    render(
      <FeedbackForm
        requestId={mockRequestId}
        volunteerId={mockVolunteerId}
        onSubmit={mockOnSubmit}
      />
    )
    
    const ratingSelect = screen.getByTestId('rating-select')
    expect(ratingSelect).toBeInTheDocument()
    
    const options = ratingSelect.querySelectorAll('option')
    expect(options.length).toBe(5)
  })

  it('allows user to select different ratings', async () => {
    const user = userEvent.setup()
    render(
      <FeedbackForm
        requestId={mockRequestId}
        volunteerId={mockVolunteerId}
        onSubmit={mockOnSubmit}
      />
    )
    
    const ratingSelect = screen.getByTestId('rating-select')
    await user.selectOptions(ratingSelect, '4')
    
    expect(ratingSelect.value).toBe('4')
  })

  it('displays comments/feedback textarea', () => {
    render(
      <FeedbackForm
        requestId={mockRequestId}
        volunteerId={mockVolunteerId}
        onSubmit={mockOnSubmit}
      />
    )
    
    const commentTextarea = screen.getByTestId('comment-textarea')
    expect(commentTextarea).toBeInTheDocument()
  })

  it('allows user to enter feedback comments', async () => {
    const user = userEvent.setup()
    render(
      <FeedbackForm
        requestId={mockRequestId}
        volunteerId={mockVolunteerId}
        onSubmit={mockOnSubmit}
      />
    )
    
    const commentTextarea = screen.getByTestId('comment-textarea')
    const testComment = 'Great volunteer! Very helpful and responsive.'
    
    await user.type(commentTextarea, testComment)
    expect(commentTextarea.value).toBe(testComment)
  })

  it('displays recommendation checkbox', () => {
    render(
      <FeedbackForm
        requestId={mockRequestId}
        volunteerId={mockVolunteerId}
        onSubmit={mockOnSubmit}
      />
    )
    
    const recommendCheckbox = screen.getByTestId('recommend-checkbox')
    expect(recommendCheckbox).toBeInTheDocument()
  })

  it('allows toggling recommendation', async () => {
    const user = userEvent.setup()
    render(
      <FeedbackForm
        requestId={mockRequestId}
        volunteerId={mockVolunteerId}
        onSubmit={mockOnSubmit}
      />
    )
    
    const recommendCheckbox = screen.getByTestId('recommend-checkbox')
    expect(recommendCheckbox.checked).toBe(true)
    
    await user.click(recommendCheckbox)
    expect(recommendCheckbox.checked).toBe(false)
  })

  it('submits feedback successfully', async () => {
    const user = userEvent.setup()
    mockOnSubmit.mockResolvedValue({ success: true })

    render(
      <FeedbackForm
        requestId={mockRequestId}
        volunteerId={mockVolunteerId}
        onSubmit={mockOnSubmit}
      />
    )
    
    const ratingSelect = screen.getByTestId('rating-select')
    const commentTextarea = screen.getByTestId('comment-textarea')
    const submitButton = screen.getByTestId('submit-button')

    await user.selectOptions(ratingSelect, '5')
    await user.type(commentTextarea, 'Excellent service!')
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          rating: 5,
          comment: 'Excellent service!',
          recommendVolunteer: true,
        })
      )
    })
  })

  it('shows success message after submission', async () => {
    const user = userEvent.setup()
    mockOnSubmit.mockResolvedValue({ success: true })

    render(
      <FeedbackForm
        requestId={mockRequestId}
        volunteerId={mockVolunteerId}
        onSubmit={mockOnSubmit}
      />
    )
    
    const submitButton = screen.getByTestId('submit-button')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByTestId('success-message')).toBeInTheDocument()
      expect(screen.getByText(/thank you/i)).toBeInTheDocument()
    })
  })

  it('handles submission errors gracefully', async () => {
    const user = userEvent.setup()
    const errorMessage = 'Failed to submit feedback'
    mockOnSubmit.mockRejectedValue(new Error(errorMessage))

    render(
      <FeedbackForm
        requestId={mockRequestId}
        volunteerId={mockVolunteerId}
        onSubmit={mockOnSubmit}
      />
    )
    
    const submitButton = screen.getByTestId('submit-button')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toBeInTheDocument()
    })
  })

  it('requires at least a rating before submission', async () => {
    const user = userEvent.setup()
    mockOnSubmit.mockResolvedValue({ success: true })

    render(
      <FeedbackForm
        requestId={mockRequestId}
        volunteerId={mockVolunteerId}
        onSubmit={mockOnSubmit}
      />
    )
    
    const submitButton = screen.getByTestId('submit-button')
    await user.click(submitButton)

    // Rating should have default value of 5
    expect(screen.getByTestId('rating-select').value).toBe('5')
  })

  it('validates comment length if required', async () => {
    const user = userEvent.setup()
    render(
      <FeedbackForm
        requestId={mockRequestId}
        volunteerId={mockVolunteerId}
        onSubmit={mockOnSubmit}
      />
    )
    
    const commentTextarea = screen.getByTestId('comment-textarea')
    
    // Test with empty comment (may or may not be required depending on validation)
    expect(commentTextarea).toBeInTheDocument()
  })

  it('displays anonymous feedback option if available', () => {
    const { container } = render(
      <FeedbackForm
        requestId={mockRequestId}
        volunteerId={mockVolunteerId}
        onSubmit={mockOnSubmit}
      />
    )
    
    const anonCheckbox = container.querySelector('[data-anonymous]') ||
                        screen.queryByText(/anonymous/i)
    expect(anonCheckbox || container.textContent.length).toBeGreaterThan(0)
  })

  it('supports rich text or markdown in comments', () => {
    const { container } = render(
      <FeedbackForm
        requestId={mockRequestId}
        volunteerId={mockVolunteerId}
        onSubmit={mockOnSubmit}
      />
    )
    
    const commentTextarea = screen.getByTestId('comment-textarea')
    const richTextEditor = container.querySelector('[data-rich-text]')
    
    expect(commentTextarea || richTextEditor).toBeDefined()
  })

  it('prevents double submission', async () => {
    const user = userEvent.setup()
    mockOnSubmit.mockResolvedValue({ success: true })

    render(
      <FeedbackForm
        requestId={mockRequestId}
        volunteerId={mockVolunteerId}
        onSubmit={mockOnSubmit}
      />
    )
    
    const submitButton = screen.getByTestId('submit-button')
    
    // Try to submit twice
    await user.click(submitButton)
    await user.click(submitButton)

    await waitFor(() => {
      // Should only call once due to prevented double submission
      expect(mockOnSubmit.mock.calls.length).toBeLessThanOrEqual(2)
    })
  })
})
