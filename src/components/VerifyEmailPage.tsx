import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { DinoMascot } from './DinoMascot';

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { verifyEmail, resendVerification } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'no-token'>('loading');
  const [error, setError] = useState<string>('');
  const [resendEmail, setResendEmail] = useState('');
  const [resendStatus, setResendStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setStatus('no-token');
      return;
    }

    async function verify() {
      const result = await verifyEmail(token!);
      if (result.success) {
        setStatus('success');
        setTimeout(() => navigate('/'), 2000);
      } else {
        setStatus('error');
        setError(result.error || 'Verification failed');
      }
    }

    verify();
  }, [token, verifyEmail, navigate]);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resendEmail.trim()) return;

    setResendStatus('sending');
    const result = await resendVerification(resendEmail.trim());
    if (result.success) {
      setResendStatus('sent');
    } else {
      setResendStatus('error');
    }
  };

  return (
    <div className="verify-email-page">
      <div className="verify-email-card">
        <DinoMascot size={60} className="verify-email-mascot" />

        {status === 'loading' && (
          <>
            <Loader2 size={48} className="spin verify-email-icon" />
            <h1>Verifying your email...</h1>
            <p>Please wait while we verify your email address.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle size={48} className="verify-email-icon success" />
            <h1>Email Verified!</h1>
            <p>Your email has been verified. Redirecting you to Recipesaurus...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle size={48} className="verify-email-icon error" />
            <h1>Verification Failed</h1>
            <p>{error}</p>
            <div className="verify-email-resend">
              <p>Need a new verification link?</p>
              <form onSubmit={handleResend} className="resend-form">
                <input
                  type="email"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  placeholder="Enter your email"
                  disabled={resendStatus === 'sending' || resendStatus === 'sent'}
                />
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={resendStatus === 'sending' || resendStatus === 'sent' || !resendEmail.trim()}
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
                <p className="resend-success">Check your inbox for the verification link.</p>
              )}
            </div>
          </>
        )}

        {status === 'no-token' && (
          <>
            <Mail size={48} className="verify-email-icon" />
            <h1>Verify Your Email</h1>
            <p>Please check your inbox for the verification link we sent you.</p>
            <div className="verify-email-resend">
              <p>Didn't receive the email?</p>
              <form onSubmit={handleResend} className="resend-form">
                <input
                  type="email"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  placeholder="Enter your email"
                  disabled={resendStatus === 'sending' || resendStatus === 'sent'}
                />
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={resendStatus === 'sending' || resendStatus === 'sent' || !resendEmail.trim()}
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
                <p className="resend-success">Check your inbox for the verification link.</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
