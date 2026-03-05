import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Send, CheckCircle } from 'lucide-react';

export function FeedbackPage() {
  const [feedbackType, setFeedbackType] = useState<'bug' | 'feature' | 'general'>('general');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, this would send to a backend
    console.log('Feedback submitted:', { feedbackType, message, email });
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="static-page feedback-page">
        <Link to="/" className="back-link">
          <ArrowLeft size={18} />
          Back to Recipes
        </Link>

        <div className="feedback-success">
          <CheckCircle size={48} />
          <h1>Thank You!</h1>
          <p>Your feedback has been received. We appreciate you taking the time to help us improve Recipesaurus.</p>
          <Link to="/" className="btn-primary">
            Return to Recipes
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="static-page feedback-page">
      <Link to="/" className="back-link">
        <ArrowLeft size={18} />
        Back to Recipes
      </Link>

      <h1>Give Feedback</h1>
      <p className="page-intro">
        We'd love to hear from you! Your feedback helps us make Recipesaurus better for everyone.
      </p>

      <form onSubmit={handleSubmit} className="feedback-form">
        <div className="form-group">
          <label>What type of feedback do you have?</label>
          <div className="feedback-type-options">
            <button
              type="button"
              className={`feedback-type-btn ${feedbackType === 'bug' ? 'active' : ''}`}
              onClick={() => setFeedbackType('bug')}
            >
              Report a Bug
            </button>
            <button
              type="button"
              className={`feedback-type-btn ${feedbackType === 'feature' ? 'active' : ''}`}
              onClick={() => setFeedbackType('feature')}
            >
              Request a Feature
            </button>
            <button
              type="button"
              className={`feedback-type-btn ${feedbackType === 'general' ? 'active' : ''}`}
              onClick={() => setFeedbackType('general')}
            >
              General Feedback
            </button>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="feedback-message">Your Message</label>
          <textarea
            id="feedback-message"
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder={
              feedbackType === 'bug'
                ? "Please describe the bug you encountered. What were you trying to do? What happened instead?"
                : feedbackType === 'feature'
                ? "What feature would you like to see? How would it help you?"
                : "Share your thoughts, suggestions, or comments..."
            }
            rows={6}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="feedback-email">Email (optional)</label>
          <input
            type="email"
            id="feedback-email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="your@email.com"
          />
          <p className="form-hint">If you'd like us to follow up with you about your feedback</p>
        </div>

        <button type="submit" className="btn-primary btn-submit" disabled={!message.trim()}>
          <Send size={18} />
          Send Feedback
        </button>
      </form>
    </div>
  );
}
