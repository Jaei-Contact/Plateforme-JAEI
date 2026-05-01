import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../../utils/api';

// ============================================================
// VerifyEmail — Page de confirmation du lien email
// Appelée depuis le lien dans le mail : /verify-email?token=xxx
// ============================================================

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState('loading'); // loading | success | expired | invalid | already

  useEffect(() => {
    if (!token) { setStatus('invalid'); return; }

    api.get(`/auth/verify-email?token=${token}`)
      .then(() => setStatus('success'))
      .catch(err => {
        const data = err.response?.data;
        if (data?.expired)         setStatus('expired');
        else if (data?.alreadyVerified) setStatus('already');
        else                       setStatus('invalid');
      });
  }, [token]);

  const config = {
    loading: {
      icon: (
        <svg style={{ width: 32, height: 32, color: '#1B4427' }} className="animate-spin" fill="none" viewBox="0 0 24 24">
          <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path style={{ opacity: 0.75 }} fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
      ),
      title: 'Verifying your email…',
      message: 'Please wait a moment.',
      bg: '#EFF6FF',
    },
    success: {
      icon: (
        <svg style={{ width: 32, height: 32, color: '#2E9E68' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
        </svg>
      ),
      title: 'Email confirmed!',
      message: 'Your account is now active. You can log in to access your dashboard.',
      bg: '#F0FDF4',
      cta: { label: 'Log in', to: '/login' },
    },
    expired: {
      icon: (
        <svg style={{ width: 32, height: 32, color: '#F59E0B' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
      ),
      title: 'Link expired',
      message: 'This verification link has expired (24h limit). Please request a new one.',
      bg: '#FFFBEB',
      cta: { label: 'Request a new link', to: '/register' },
    },
    already: {
      icon: (
        <svg style={{ width: 32, height: 32, color: '#2E9E68' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
      ),
      title: 'Already verified',
      message: 'Your email address has already been confirmed. You can log in.',
      bg: '#F0FDF4',
      cta: { label: 'Log in', to: '/login' },
    },
    invalid: {
      icon: (
        <svg style={{ width: 32, height: 32, color: '#DC2626' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
        </svg>
      ),
      title: 'Invalid link',
      message: 'This verification link is invalid or has already been used.',
      bg: '#FEF2F2',
      cta: { label: 'Back to home', to: '/' },
    },
  };

  const c = config[status];

  return (
    <div style={{
      minHeight: '100vh', background: '#f5f5f5',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '24px',
    }}>
      <div style={{ marginBottom: 32, textAlign: 'center' }}>
        <img src="/logo-jaei.jpeg" alt="JAEI" style={{ height: 48, objectFit: 'contain' }} />
      </div>

      <div style={{
        background: '#fff', borderRadius: 4, padding: '40px 48px',
        maxWidth: 480, width: '100%',
        boxShadow: '0 2px 16px rgba(0,0,0,0.1)',
        border: '1px solid #e5e5e5',
        textAlign: 'center',
      }}>
        {/* Icône */}
        <div style={{
          width: 64, height: 64, background: c.bg, borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 24px',
        }}>
          {c.icon}
        </div>

        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1D1D1D', margin: '0 0 12px' }}>
          {c.title}
        </h1>
        <p style={{ fontSize: 14, color: '#555', lineHeight: 1.7, margin: '0 0 32px' }}>
          {c.message}
        </p>

        {c.cta && (
          <Link to={c.cta.to} style={{
            display: 'inline-block',
            background: '#1B4427', color: '#fff',
            padding: '12px 32px', borderRadius: 4,
            fontSize: 14, fontWeight: 700, textDecoration: 'none',
          }}>
            {c.cta.label}
          </Link>
        )}
      </div>

      <p style={{ marginTop: 24, fontSize: 13, color: '#999' }}>
        <Link to="/" style={{ color: '#666', textDecoration: 'none' }}>
          ← Back to home
        </Link>
      </p>
    </div>
  );
}
