import { useState } from 'react';
import { X, Mail, Lock, User, Loader2, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { DinoMascot } from './DinoMascot';
import { ModalOverlay } from './ModalOverlay';

interface AuthModalProps {
  onClose: () => void;
  initialMode?: 'login' | 'register';
  onForgotPassword?: () => void;
}

export function AuthModal({ onClose, initialMode = 'login', onForgotPassword }: AuthModalProps) {
  const { login, register, resendVerification } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [verificationPending, setVerificationPending] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [resendStatus, setResendStatus] = useState<'idle' | 'sending' | 'sent'>('idle');

  const [formData, setFormData] = useState({
    email: '',
    name: '',
    password: '',
    confirmPassword: '',
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (mode === 'register') {
        if (!formData.name.trim()) {
          setError('Please enter your name');
          return;
        }
        if (formData.password !== formData.confirmPassword) {
          setError('Passwords do not match');
          return;
        }
        const result = await register(formData.email, formData.name, formData.password);
        if (result.requiresVerification) {
          setVerificationPending(true);
          setVerificationEmail(result.email || formData.email);
          return;
        }
        if (!result.success) {
          setError(result.error || 'Registration failed');
          return;
        }
      } else {
        const result = await login(formData.email, formData.password);
        if (result.requiresVerification) {
          setVerificationPending(true);
          setVerificationEmail(result.email || formData.email);
          return;
        }
        if (!result.success) {
          setError(result.error || 'Login failed');
          return;
        }
      }
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setResendStatus('sending');
    await resendVerification(verificationEmail);
    setResendStatus('sent');
  };

  const toggleMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    setError(null);
    setFormData({ email: '', name: '', password: '', confirmPassword: '' });
  };

  if (verificationPending) {
    return (
      <ModalOverlay onClose={onClose}>
        <div className="modal-content modal-auth modal-verification">
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <X size={20} strokeWidth={2} />
          </button>

          <div className="verification-content">
            <div className="verification-icon-wrapper">
              <Mail size={32} strokeWidth={1.5} />
            </div>
            <h2>Check Your Email</h2>
            <p className="verification-email">{verificationEmail}</p>
            <p className="verification-message">We sent a verification link to your email. Click the link to activate your account.</p>
            <p className="verification-note">Don't see it? Check your spam folder.</p>
          </div>

          <div className="verification-actions">
            <button
              type="button"
              className="btn-resend"
              onClick={handleResendVerification}
              disabled={resendStatus === 'sending' || resendStatus === 'sent'}
            >
              {resendStatus === 'sending' ? (
                <>
                  <Loader2 size={16} className="spin" />
                  Sending...
                </>
              ) : resendStatus === 'sent' ? (
                <>
                  <CheckCircle size={16} />
                  Email sent!
                </>
              ) : (
                'Resend verification email'
              )}
            </button>
          </div>
        </div>
      </ModalOverlay>
    );
  }

  return (
    <ModalOverlay onClose={onClose}>
      <div className="modal-content modal-auth">
        <button className="modal-close" onClick={onClose} aria-label="Close">
          <X size={20} strokeWidth={2} />
        </button>

        <div className="auth-header">
          <DinoMascot size={64} className="auth-mascot" />
          <h2>{mode === 'login' ? 'Welcome Back' : 'Create Account'}</h2>
          <p>{mode === 'login' ? 'Sign in to access your recipes' : 'Join Recipesaurus today'}</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && (
            <div className="auth-error">
              {error}
            </div>
          )}

          {mode === 'register' && (
            <div className="auth-field">
              <label htmlFor="name">Name</label>
              <div className="auth-input-wrapper">
                <User size={18} strokeWidth={2} />
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={e => handleInputChange('name', e.target.value)}
                  placeholder="Your name"
                  autoComplete="name"
                />
              </div>
            </div>
          )}

          <div className="auth-field">
            <label htmlFor="email">Email</label>
            <div className="auth-input-wrapper">
              <Mail size={18} strokeWidth={2} />
              <input
                type="email"
                id="email"
                value={formData.email}
                onChange={e => handleInputChange('email', e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </div>
          </div>

          <div className="auth-field">
            <label htmlFor="password">Password</label>
            <div className="auth-input-wrapper">
              <Lock size={18} strokeWidth={2} />
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={formData.password}
                onChange={e => handleInputChange('password', e.target.value)}
                placeholder={mode === 'register' ? 'Create a password' : 'Your password'}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                required
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
            {mode === 'register' && (
              <p className="password-requirements">
                8+ characters with uppercase, lowercase, and number
              </p>
            )}
            {mode === 'login' && onForgotPassword && (
              <button
                type="button"
                className="forgot-password-link"
                onClick={onForgotPassword}
              >
                Forgot password?
              </button>
            )}
          </div>

          {mode === 'register' && (
            <div className="auth-field">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <div className="auth-input-wrapper">
                <Lock size={18} strokeWidth={2} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={e => handleInputChange('confirmPassword', e.target.value)}
                  placeholder="Confirm your password"
                  autoComplete="new-password"
                  required
                />
              </div>
            </div>
          )}

          <button type="submit" className="auth-submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 size={18} strokeWidth={2} className="spin" />
                <span>{mode === 'login' ? 'Signing in...' : 'Creating account...'}</span>
              </>
            ) : (
              <span>{mode === 'login' ? 'Sign In' : 'Create Account'}</span>
            )}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
            <button type="button" className="auth-toggle" onClick={toggleMode}>
              {mode === 'login' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>

        {mode === 'register' && (
          <p className="auth-security-note">
            Your password is securely hashed using PBKDF2 with 100,000 iterations.
          </p>
        )}
      </div>
    </ModalOverlay>
  );
}
