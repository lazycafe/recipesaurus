import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { DinoMascot } from './DinoMascot';

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { verifyEmail, resendVerification } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState('');
  const [resendEmail, setResendEmail] = useState('');
  const [resendStatus, setResendStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const verificationAttempted = useRef(false);

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setError('Missing verification link. Please check your email or request a new one.');
      return;
    }

    // Prevent double verification attempts (token gets consumed on first call)
    if (verificationAttempted.current) return;
    verificationAttempted.current = true;

    async function verify() {
      const result = await verifyEmail(token!);
      if (result.success) {
        setStatus('success');
        setTimeout(() => navigate('/'), 2000);
      } else {
        setStatus('error');
        setError(result.error || 'This link is invalid or expired.');
      }
    }

    verify();
  }, [token, verifyEmail, navigate]);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resendEmail.trim()) return;

    setResendStatus('sending');
    await resendVerification(resendEmail.trim());
    setResendStatus('sent');
  };

  return (
    <div className="verify-email-page">
      <div className="verify-email-card">
        <DinoMascot size={60} className="verify-email-mascot" />

        {status === 'loading' && (
          <>
            <Loader2 size={48} className="spin verify-email-icon" />
            <h1>Verifying...</h1>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle size={48} className="verify-email-icon success" />
            <h1>You're Verified!</h1>
            <p>Taking you to your recipes...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle size={48} className="verify-email-icon error" />
            <h1>Verification Failed</h1>
            <p>{error}</p>

            <div className="verify-email-resend">
              <form onSubmit={handleResend} className="resend-form">
                <input
                  type="email"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  placeholder="Enter your email"
                  disabled={resendStatus !== 'idle'}
                />
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={resendStatus !== 'idle' || !resendEmail.trim()}
                >
                  {resendStatus === 'sending' ? (
                    <Loader2 size={16} className="spin" />
                  ) : resendStatus === 'sent' ? (
                    'Sent!'
                  ) : (
                    'Resend'
                  )}
                </button>
              </form>
              {resendStatus === 'sent' && (
                <p className="resend-success">Check your inbox (and spam folder).</p>
              )}
            </div>

            <Link to="/" className="back-to-login">Back to Sign In</Link>
          </>
        )}
      </div>
    </div>
  );
}
