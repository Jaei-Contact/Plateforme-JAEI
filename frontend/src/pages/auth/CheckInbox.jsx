import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../../utils/api';

// ============================================================
// CheckInbox — Page affichée après inscription
// L'utilisateur doit vérifier son email avant de continuer
// Style : ScienceDirect "Check your inbox" modal
// ============================================================

export default function CheckInbox() {
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') || '';

  const [resendStatus, setResendStatus] = useState('idle'); // idle | loading | sent | already | error

  const handleResend = async () => {
    if (!email || resendStatus === 'loading') return;
    setResendStatus('loading');
    try {
      await api.post('/auth/resend-verification', { email });
      setResendStatus('sent');
    } catch (err) {
      const msg = err.response?.data?.message || '';
      if (msg.toLowerCase().includes('already verified')) {
        setResendStatus('already');
      } else {
        setResendStatus('error');
      }
    }
  };

  return (
    <div style={{
      minHeight: '100vh', background: '#f5f5f5',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '24px',
    }}>
      {/* Logo / marque */}
      <div style={{ marginBottom: 32, textAlign: 'center' }}>
        <img src="/logo-jaei.jpeg" alt="JAEI" style={{ height: 48, objectFit: 'contain' }} />
      </div>

      {/* Carte centrale */}
      <div style={{
        background: '#fff', borderRadius: 4, padding: '40px 48px',
        maxWidth: 520, width: '100%',
        boxShadow: '0 2px 16px rgba(0,0,0,0.1)',
        border: '1px solid #e5e5e5',
        textAlign: 'center',
      }}>
        {/* Icône email */}
        <div style={{
          width: 64, height: 64, background: '#EFF6FF', borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 24px',
        }}>
          <svg style={{ width: 30, height: 30, color: '#1B4427' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
          </svg>
        </div>

        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1D1D1D', margin: '0 0 12px' }}>
          Check your inbox
        </h1>

        <p style={{ fontSize: 14, color: '#555', lineHeight: 1.7, margin: '0 0 6px' }}>
          We sent a verification link to
        </p>
        {email && (
          <p style={{ fontSize: 14, fontWeight: 700, color: '#1B4427', margin: '0 0 16px' }}>
            {email}
          </p>
        )}
        <p style={{ fontSize: 14, color: '#555', lineHeight: 1.7, margin: '0 0 24px' }}>
          <strong>Click the link to confirm your identity.</strong>
        </p>

        {/* Expiry notice */}
        <div style={{
          background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 4,
          padding: '12px 16px', marginBottom: 28, textAlign: 'left',
        }}>
          <p style={{ margin: 0, fontSize: 12, color: '#92400E', lineHeight: 1.5 }}>
            ⚠️ For security purposes, <strong>the link will expire after 24 hours.</strong>
          </p>
        </div>

        {/* Resend */}
        <p style={{ fontSize: 13, color: '#777', margin: '0 0 8px' }}>
          If you didn't receive the email, check your spam folder or
        </p>

        {resendStatus === 'sent' ? (
          <p style={{ fontSize: 13, color: '#2E9E68', fontWeight: 600, margin: '0 0 24px' }}>
            ✓ A new verification email has been sent!
          </p>
        ) : resendStatus === 'already' ? (
          <p style={{ fontSize: 13, color: '#2E9E68', fontWeight: 600, margin: '0 0 24px' }}>
            ✓ Your email is already verified.{' '}
            <a href="/login" style={{ color: '#1B4427', textDecoration: 'underline' }}>Log in now</a>
          </p>
        ) : resendStatus === 'error' ? (
          <p style={{ fontSize: 13, color: '#DC2626', margin: '0 0 24px' }}>
            An error occurred. Please try again.
          </p>
        ) : (
          <button
            onClick={handleResend}
            disabled={resendStatus === 'loading'}
            style={{
              background: 'none', border: 'none', cursor: resendStatus === 'loading' ? 'wait' : 'pointer',
              color: '#1B4427', fontSize: 13, fontWeight: 600, textDecoration: 'underline',
              padding: 0, marginBottom: 24,
            }}
          >
            {resendStatus === 'loading' ? 'Sending...' : 'resend the verification email.'}
          </button>
        )}

        {/* Separator */}
        <div style={{ borderTop: '1px solid #eee', marginTop: 8, paddingTop: 20 }}>
          <p style={{ fontSize: 13, color: '#888', margin: '0 0 4px' }}>
            Already confirmed?{' '}
            <Link to="/login" style={{ color: '#1B4427', fontWeight: 600, textDecoration: 'underline' }}>
              Log in now
            </Link>
          </p>
        </div>
      </div>

      {/* Retour accueil */}
      <p style={{ marginTop: 24, fontSize: 13, color: '#999' }}>
        <Link to="/" style={{ color: '#666', textDecoration: 'none' }}>
          ← Back to home
        </Link>
      </p>
    </div>
  );
}
