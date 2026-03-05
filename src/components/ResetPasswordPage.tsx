import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Lock, Loader2, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useClient } from '../client/ClientContext';
import { DinoMascot } from './DinoMascot';

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const client = useClient();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Invalid reset link. Please request a new password reset.');
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (!/[A-Z]/.test(password)) {
      setError('Password must contain at least one uppercase letter');
      return;
    }

    if (!/[a-z]/.test(password)) {
      setError('Password must contain at least one lowercase letter');
      return;
    }

    if (!/[0-9]/.test(password)) {
      setError('Password must contain at least one number');
      return;
    }

    setIsLoading(true);

    try {
      const result = await client.auth.resetPassword(token!, password);
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

  const goToLogin = () => {
    window.location.href = '/';
  };

  return (
    <div className="reset-password-page">
      <div className="reset-password-container">
        <div className="auth-header">
          <DinoMascot size={80} className="auth-mascot" />
          <h1>{isSuccess ? 'Password Reset!' : 'Create New Password'}</h1>
          <p>
            {isSuccess
              ? 'Your password has been updated successfully'
              : 'Enter your new password below'}
          </p>
        </div>

        {isSuccess ? (
          <div className="reset-password-success">
            <CheckCircle size={64} className="success-icon" />
            <p>You can now sign in with your new password.</p>
            <button
              type="button"
              className="auth-submit"
              onClick={goToLogin}
            >
              Go to Sign In
            </button>
          </div>
        ) : !token ? (
          <div className="reset-password-error">
            <AlertCircle size={64} className="error-icon" />
            <p>{error}</p>
            <button
              type="button"
              className="auth-submit"
              onClick={goToLogin}
            >
              Request New Reset Link
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
              <label htmlFor="new-password">New Password</label>
              <div className="auth-input-wrapper">
                <Lock size={18} strokeWidth={2} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="new-password"
                  value={password}
                  onChange={e => {
                    setPassword(e.target.value);
                    setError(null);
                  }}
                  placeholder="Create a new password"
                  autoComplete="new-password"
                  required
                  autoFocus
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} strokeWidth={2} /> : <Eye size={18} strokeWidth={2} />}
                </button>
              </div>
              <p className="password-requirements">
                8+ characters with uppercase, lowercase, and number
              </p>
            </div>

            <div className="auth-field">
              <label htmlFor="confirm-new-password">Confirm Password</label>
              <div className="auth-input-wrapper">
                <Lock size={18} strokeWidth={2} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="confirm-new-password"
                  value={confirmPassword}
                  onChange={e => {
                    setConfirmPassword(e.target.value);
                    setError(null);
                  }}
                  placeholder="Confirm your new password"
                  autoComplete="new-password"
                  required
                />
              </div>
            </div>

            <button type="submit" className="auth-submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 size={18} strokeWidth={2} className="spin" />
                  <span>Resetting...</span>
                </>
              ) : (
                <span>Reset Password</span>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
