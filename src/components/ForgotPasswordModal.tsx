import { useState } from 'react';
import { X, Mail, Loader2, CheckCircle } from 'lucide-react';
import { useClient } from '../client/ClientContext';
import { DinoMascot } from './DinoMascot';
import { ModalOverlay } from './ModalOverlay';

interface ForgotPasswordModalProps {
  onClose: () => void;
  onBackToLogin: () => void;
}

export function ForgotPasswordModal({ onClose, onBackToLogin }: ForgotPasswordModalProps) {
  const client = useClient();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const result = await client.auth.forgotPassword(email);
      if (result.error) {
        setError(result.error);
      } else {
        setIsSuccess(true);
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className="modal-content modal-auth">
        <button className="modal-close" onClick={onClose} aria-label="Close">
          <X size={20} strokeWidth={2} />
        </button>

        <div className="auth-header">
          <DinoMascot size={64} className="auth-mascot" />
          <h2>{isSuccess ? 'Check Your Email' : 'Reset Password'}</h2>
          <p>
            {isSuccess
              ? 'We sent you a password reset link'
              : 'Enter your email to receive a reset link'}
          </p>
        </div>

        {isSuccess ? (
          <div className="forgot-password-success">
            <CheckCircle size={48} className="success-icon" />
            <p>
              If an account exists for <strong>{email}</strong>, you will receive a password
              reset email shortly.
            </p>
            <p className="forgot-password-note">
              The link will expire in 1 hour. Check your spam folder if you don't see it.
            </p>
            <button
              type="button"
              className="auth-submit"
              onClick={onBackToLogin}
            >
              Back to Sign In
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="auth-form">
            {error && (
              <div className="auth-error">
                {error}
              </div>
            )}

            <div className="auth-field">
              <label htmlFor="reset-email">Email</label>
              <div className="auth-input-wrapper">
                <Mail size={18} strokeWidth={2} />
                <input
                  type="email"
                  id="reset-email"
                  value={email}
                  onChange={e => {
                    setEmail(e.target.value);
                    setError(null);
                  }}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                  autoFocus
                />
              </div>
            </div>

            <button type="submit" className="auth-submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 size={18} strokeWidth={2} className="spin" />
                  <span>Sending...</span>
                </>
              ) : (
                <span>Send Reset Link</span>
              )}
            </button>
          </form>
        )}

        <div className="auth-footer">
          <p>
            Remember your password?
            <button type="button" className="auth-toggle" onClick={onBackToLogin}>
              Sign in
            </button>
          </p>
        </div>
      </div>
    </ModalOverlay>
  );
}
