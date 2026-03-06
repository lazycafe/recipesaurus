import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Send, CheckCircle, Loader2 } from 'lucide-react';

const DISCORD_FEEDBACK_WEBHOOK = 'https://discord.com/api/webhooks/1479281683659231385/v-F4gca2WaDW4avhErnCq_JqSeEvVnXAZ3SVOEmUE7GhaPp2p5CsAQIlZj24yQZkY_yv';
const FEEDBACK_STORAGE_KEY = 'recipesaurus_feedback_timestamps';
const MAX_FEEDBACK_PER_DAY = 3;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function getFeedbackTimestamps(): number[] {
  try {
    const stored = localStorage.getItem(FEEDBACK_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function getRecentFeedbackCount(): number {
  const timestamps = getFeedbackTimestamps();
  const oneDayAgo = Date.now() - ONE_DAY_MS;
  return timestamps.filter(ts => ts > oneDayAgo).length;
}

function recordFeedback(): void {
  const timestamps = getFeedbackTimestamps();
  const oneDayAgo = Date.now() - ONE_DAY_MS;
  const recentTimestamps = timestamps.filter(ts => ts > oneDayAgo);
  recentTimestamps.push(Date.now());
  localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(recentTimestamps));
}

function canSubmitFeedback(): boolean {
  return getRecentFeedbackCount() < MAX_FEEDBACK_PER_DAY;
}

export function FeedbackPage() {
  const [feedbackType, setFeedbackType] = useState<'bug' | 'feature' | 'general'>('general');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rateLimited, setRateLimited] = useState(!canSubmitFeedback());

  const remainingFeedback = MAX_FEEDBACK_PER_DAY - getRecentFeedbackCount();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!canSubmitFeedback()) {
      setRateLimited(true);
      return;
    }

    setIsSubmitting(true);

    const typeEmoji = feedbackType === 'bug' ? '🐛' : feedbackType === 'feature' ? '✨' : '💬';
    const typeLabel = feedbackType === 'bug' ? 'Bug Report' : feedbackType === 'feature' ? 'Feature Request' : 'General Feedback';

    try {
      await fetch(DISCORD_FEEDBACK_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embeds: [{
            title: `${typeEmoji} ${typeLabel}`,
            description: message,
            color: feedbackType === 'bug' ? 0xc45a5a : feedbackType === 'feature' ? 0x7a9e7e : 0xc9a962,
            fields: email ? [{ name: 'Contact Email', value: email }] : [],
            timestamp: new Date().toISOString(),
          }],
        }),
      });
      recordFeedback();
    } catch {
      // Still show success even if Discord fails
      recordFeedback();
    }

    setSubmitted(true);
    setIsSubmitting(false);
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

      {rateLimited ? (
        <div className="feedback-rate-limit">
          <p>You've reached the daily feedback limit (3 per day).</p>
          <p>Please try again tomorrow. We appreciate your enthusiasm!</p>
          <Link to="/" className="btn-primary">
            Return to Recipes
          </Link>
        </div>
      ) : (
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

        <div className="feedback-submit-row">
          <button type="submit" className="btn-primary btn-submit" disabled={!message.trim() || isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 size={18} className="spin" />
                Sending...
              </>
            ) : (
              <>
                <Send size={18} />
                Send Feedback
              </>
            )}
          </button>
          {remainingFeedback <= 2 && (
            <p className="feedback-remaining">{remainingFeedback} submission{remainingFeedback !== 1 ? 's' : ''} remaining today</p>
          )}
        </div>
      </form>
      )}
    </div>
  );
}
