import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import api from '../../utils/api';

// ============================================================
// ResetPassword — JAEI Platform
// Page reached via the email link: /reset-password?token=xxx
// ============================================================

const EyeOpen = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
  </svg>
);

const EyeOff = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
  </svg>
);

const IconCheck = () => (
  <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
  </svg>
);

const IconError = () => (
  <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
  </svg>
);

const ResetPassword = () => {
  const [searchParams]          = useSearchParams();
  const navigate                = useNavigate();
  const token                   = searchParams.get('token');

  const [password, setPassword]         = useState('');
  const [confirm, setConfirm]           = useState('');
  const [showPwd, setShowPwd]           = useState(false);
  const [showConfirm, setShowConfirm]   = useState(false);
  const [loading, setLoading]           = useState(false);
  const [success, setSuccess]           = useState(false);
  const [error, setError]               = useState('');
  const [fieldErrors, setFieldErrors]   = useState({});

  // Token missing from URL
  if (!token) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center page-enter"
           style={{ background: '#F5F7FA' }}>
        <div className="bg-white rounded-sm p-10 text-center max-w-sm w-full mx-4"
             style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.10)', border: '1px solid #E5E7EB' }}>
          <span style={{ color: '#DC2626' }}><IconError /></span>
          <h2 className="text-lg font-bold mt-4 mb-2" style={{ color: '#111827' }}>Invalid link</h2>
          <p className="text-sm mb-6" style={{ color: '#6B7280' }}>
            This reset link is invalid or incomplete.
          </p>
          <Link to="/forgot-password"
                className="inline-block px-5 py-2.5 rounded-sm text-sm font-semibold text-white no-underline"
                style={{ background: 'linear-gradient(90deg, #1B4427 0%, #1E88C8 100%)' }}>
            Request a new link
          </Link>
        </div>
      </div>
    );
  }

  const validate = () => {
    const errs = {};
    if (!password)             errs.password = 'Password is required.';
    else if (password.length < 8) errs.password = 'At least 8 characters.';
    if (!confirm)              errs.confirm  = 'Please confirm your password.';
    else if (confirm !== password) errs.confirm = 'Passwords do not match.';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setFieldErrors(errs); return; }
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/reset-password', { token, password });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 4000);
    } catch (err) {
      setError(err.response?.data?.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col page-enter" style={{ background: '#F5F7FA' }}>

      {/* Header */}
      <header style={{ background: '#1B4427', borderBottom: '3px solid #1E88C8' }}>
        <div className="h-12 flex items-center px-6">
          <Link to="/" className="flex items-center gap-2.5 no-underline">
            <img src="/logo-jaei-white.png" alt="JAEI" className="w-7 h-7 object-contain flex-shrink-0" />
            <span className="text-white font-bold text-sm tracking-wide">JAEI</span>
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">

          {/* ── Success screen ─────────────────────────────── */}
          {success ? (
            <div className="bg-white rounded-sm p-10 text-center animate-scale-in"
                 style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.10)', border: '1px solid #E5E7EB' }}>
              <span style={{ color: '#15803D' }}><IconCheck /></span>
              <h2 className="text-lg font-bold mt-4 mb-2" style={{ color: '#111827' }}>
                Password updated!
              </h2>
              <p className="text-sm mb-2" style={{ color: '#6B7280' }}>
                Your password has been successfully changed.
              </p>
              <p className="text-xs mb-6" style={{ color: '#9CA3AF' }}>
                You will be redirected to login in a few seconds…
              </p>
              <Link to="/login"
                    className="inline-block px-5 py-2.5 rounded-sm text-sm font-semibold text-white no-underline"
                    style={{ background: 'linear-gradient(90deg, #1B4427 0%, #1E88C8 100%)' }}>
                Log in now
              </Link>
            </div>
          ) : (

          /* ── Form ──────────────────────────────────────── */
          <div className="bg-white rounded-sm overflow-hidden"
               style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.06)', border: '1px solid #E5E7EB' }}>

            {/* Card header */}
            <div className="px-8 pt-8 pb-6" style={{ borderBottom: '1px solid #F3F4F6' }}>
              <h2 className="font-bold mb-1" style={{ color: '#1a1a1a', fontSize: '1.25rem' }}>
                New password
              </h2>
              <p className="text-sm" style={{ color: '#6B7280' }}>
                Choose a strong password with at least 8 characters.
              </p>
            </div>

            <div className="px-8 py-7">

              {/* API error */}
              {error && (
                <div className="flex items-start gap-2.5 mb-5 p-3 rounded-sm text-sm"
                     style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#B91C1C' }}>
                  <svg className="w-4 h-4 flex-shrink-0 mt-px" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">

                {/* New password */}
                <div>
                  <label htmlFor="password" className="block text-sm font-medium mb-1.5"
                         style={{ color: '#333' }}>
                    New password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPwd ? 'text' : 'password'}
                      placeholder="Minimum 8 characters"
                      value={password}
                      onChange={e => { setPassword(e.target.value); setFieldErrors(p => ({ ...p, password: '' })); }}
                      className="w-full text-sm px-3 py-2.5 pr-10 rounded-sm outline-none transition-all"
                      style={{
                        border: fieldErrors.password ? '1.5px solid #EF4444' : '1.5px solid #D1D5DB',
                        color: '#111', background: '#fff',
                      }}
                      onFocus={e => { e.target.style.border = '1.5px solid #1E88C8'; e.target.style.boxShadow = '0 0 0 3px rgba(30,136,200,0.12)'; }}
                      onBlur={e => { e.target.style.border = fieldErrors.password ? '1.5px solid #EF4444' : '1.5px solid #D1D5DB'; e.target.style.boxShadow = 'none'; }}
                    />
                    <button type="button" tabIndex={-1} onClick={() => setShowPwd(v => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2"
                            style={{ color: '#9CA3AF' }}>
                      {showPwd ? <EyeOff /> : <EyeOpen />}
                    </button>
                  </div>
                  {fieldErrors.password && (
                    <p className="text-xs mt-1" style={{ color: '#EF4444' }}>{fieldErrors.password}</p>
                  )}
                </div>

                {/* Confirm password */}
                <div>
                  <label htmlFor="confirm" className="block text-sm font-medium mb-1.5"
                         style={{ color: '#333' }}>
                    Confirm password
                  </label>
                  <div className="relative">
                    <input
                      id="confirm"
                      type={showConfirm ? 'text' : 'password'}
                      placeholder="Repeat your password"
                      value={confirm}
                      onChange={e => { setConfirm(e.target.value); setFieldErrors(p => ({ ...p, confirm: '' })); }}
                      className="w-full text-sm px-3 py-2.5 pr-10 rounded-sm outline-none transition-all"
                      style={{
                        border: fieldErrors.confirm ? '1.5px solid #EF4444' : '1.5px solid #D1D5DB',
                        color: '#111', background: '#fff',
                      }}
                      onFocus={e => { e.target.style.border = '1.5px solid #1E88C8'; e.target.style.boxShadow = '0 0 0 3px rgba(30,136,200,0.12)'; }}
                      onBlur={e => { e.target.style.border = fieldErrors.confirm ? '1.5px solid #EF4444' : '1.5px solid #D1D5DB'; e.target.style.boxShadow = 'none'; }}
                    />
                    <button type="button" tabIndex={-1} onClick={() => setShowConfirm(v => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2"
                            style={{ color: '#9CA3AF' }}>
                      {showConfirm ? <EyeOff /> : <EyeOpen />}
                    </button>
                  </div>
                  {fieldErrors.confirm && (
                    <p className="text-xs mt-1" style={{ color: '#EF4444' }}>{fieldErrors.confirm}</p>
                  )}
                </div>

                {/* Password strength indicator */}
                {password.length > 0 && (
                  <div>
                    <div className="flex gap-1 mb-1">
                      {[1, 2, 3, 4].map(i => {
                        const strength = password.length >= 12 && /[A-Z]/.test(password) && /[0-9]/.test(password) && /[^a-zA-Z0-9]/.test(password) ? 4
                          : password.length >= 10 && /[A-Z]/.test(password) && /[0-9]/.test(password) ? 3
                          : password.length >= 8 ? 2 : 1;
                        const color = strength === 1 ? '#EF4444' : strength === 2 ? '#F59E0B' : strength === 3 ? '#3B82F6' : '#10B981';
                        return (
                          <div key={i} className="h-1 flex-1 rounded-full transition-all duration-300"
                               style={{ background: i <= strength ? color : '#E5E7EB' }} />
                        );
                      })}
                    </div>
                    <p className="text-xs" style={{ color: '#9CA3AF' }}>
                      {password.length < 8 ? 'Too short' : password.length < 10 ? 'Acceptable' : password.length < 12 ? 'Good' : 'Excellent'}
                    </p>
                  </div>
                )}

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-6 rounded-sm font-semibold text-sm text-white
                             transition-all duration-150 flex items-center justify-center gap-2
                             disabled:opacity-60 disabled:cursor-not-allowed btn-press"
                  style={{ background: loading ? '#2D5F3F' : 'linear-gradient(90deg, #1B4427 0%, #1E88C8 100%)' }}
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                      Saving…
                    </>
                  ) : 'Save new password'}
                </button>
              </form>

              <p className="text-xs text-center mt-5" style={{ color: '#9CA3AF' }}>
                <Link to="/login" className="no-underline hover:underline" style={{ color: '#1E88C8' }}>
                  Back to login
                </Link>
              </p>
            </div>
          </div>
          )}

          <p className="text-center text-xs mt-4" style={{ color: '#9CA3AF' }}>
            © {new Date().getFullYear()} JAEI — Journal of Agricultural and Environmental Innovation
          </p>
        </div>
      </main>
    </div>
  );
};

export default ResetPassword;
