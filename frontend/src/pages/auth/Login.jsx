import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

// ============================================================
// Page Login — JAEI Platform
// Inspired by ScienceDirect / Elsevier design language
// Layout: top header bar + centered split card
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

// SVG icons for feature list (no emojis)
const IconArticle = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
  </svg>
);
const IconReview = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
  </svg>
);
const IconGlobe = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
      d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
  </svg>
);
const IconLeaf = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
      d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/>
  </svg>
);

const Login = () => {
  const { login }   = useAuth();
  const navigate    = useNavigate();
  const location    = useLocation();

  const [form, setForm]           = useState({ email: '', password: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [apiError, setApiError]   = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPwd, setShowPwd]     = useState(false);

  const from = location.state?.from?.pathname || null;

  const handleChange = (e) => {
    const { id, value } = e.target;
    setForm(prev => ({ ...prev, [id]: value }));
    if (fieldErrors[id])  setFieldErrors(prev => ({ ...prev, [id]: '' }));
    if (apiError)         setApiError('');
  };

  const validate = () => {
    const errs = {};
    if (!form.email.trim())                     errs.email    = 'Email address required.';
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email    = 'Invalid email address.';
    if (!form.password)                         errs.password = 'Password required.';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setFieldErrors(errs); return; }
    setIsLoading(true);
    const result = await login(form.email.trim(), form.password);
    setIsLoading(false);
    if (result.success) {
      const path = from || (
        result.user.role === 'admin'    ? '/admin/dashboard'    :
        result.user.role === 'reviewer' ? '/reviewer/dashboard' :
        '/author/dashboard'
      );
      navigate(path, { replace: true });
    } else {
      setApiError(result.message || 'Incorrect email or password. Please try again.');
    }
  };

  const features = [
    { Icon: IconArticle, label: 'Online article submission' },
    { Icon: IconReview,  label: 'Transparent peer review' },
    { Icon: IconLeaf,    label: 'Agriculture & environmental sciences' },
    { Icon: IconGlobe,   label: 'International research community' },
  ];

  return (
    <div className="min-h-screen flex flex-col page-enter" style={{ background: '#F5F5F5' }}>

      {/* ── Top header bar (ScienceDirect style) ────────────────── */}
      <header style={{ background: '#1B4427', borderBottom: '3px solid #1E88C8' }}>
        <div className="max-w-7xl mx-auto px-6 h-12 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 no-underline">
            <img src="/logo-jaei-white.png" alt="JAEI" className="w-7 h-7 object-contain flex-shrink-0" />
            <span className="text-white font-bold text-sm tracking-wide">JAEI</span>
            <span className="hidden sm:block text-xs font-normal"
                  style={{ color: 'rgba(255,255,255,0.55)', borderLeft: '1px solid rgba(255,255,255,0.2)', paddingLeft: '0.625rem', marginLeft: '0.125rem' }}>
              Journal of Agricultural and Environmental Innovation
            </span>
          </Link>
          <nav className="flex items-center gap-5">
            <Link to="/" className="text-xs no-underline transition-colors"
                  style={{ color: 'rgba(255,255,255,0.7)' }}
                  onMouseEnter={e => e.target.style.color='#fff'}
                  onMouseLeave={e => e.target.style.color='rgba(255,255,255,0.7)'}>
              Home
            </Link>
            <Link to="/about" className="text-xs no-underline transition-colors"
                  style={{ color: 'rgba(255,255,255,0.7)' }}
                  onMouseEnter={e => e.target.style.color='#fff'}
                  onMouseLeave={e => e.target.style.color='rgba(255,255,255,0.7)'}>
              About
            </Link>
            <Link to="/register"
                  className="text-xs font-semibold px-3 py-1 rounded no-underline transition-all"
                  style={{ background: '#1E88C8', color: '#fff' }}>
              Sign up
            </Link>
          </nav>
        </div>
      </header>

      {/* ── Main content ─────────────────────────────────────────── */}
      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-4xl">

          {/* Card container */}
          <div className="bg-white rounded-sm overflow-hidden"
               style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.08)' }}>
            <div className="flex flex-col lg:flex-row">

              {/* ── Left panel — Journal info ──────────────────────── */}
              <div className="lg:w-[44%] flex-shrink-0 flex flex-col justify-between p-8 lg:p-10"
                   style={{ background: 'linear-gradient(160deg, #1B4427 0%, #265438 55%, #1a6fa8 100%)' }}>

                {/* Journal identity */}
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm mb-6"
                       style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)' }}>
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#4ade80' }} />
                    <span className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.9)' }}>
                      Open Access
                    </span>
                  </div>

                  <h1 className="font-bold leading-tight mb-2"
                      style={{ color: '#fff', fontSize: '1.25rem' }}>
                    Journal of Agricultural and Environmental Innovation
                  </h1>
                  <p className="text-xs font-medium tracking-widest uppercase mb-6"
                     style={{ color: 'rgba(255,255,255,0.5)' }}>
                    JAEI — International Scientific Journal
                  </p>

                  <div className="w-10 h-px mb-8" style={{ background: '#1E88C8' }} />

                  <ul className="flex flex-col gap-4">
                    {features.map(({ Icon, label }) => (
                      <li key={label} className="flex items-start gap-3">
                        <span className="mt-px flex-shrink-0" style={{ color: 'rgba(255,255,255,0.6)' }}>
                          <Icon />
                        </span>
                        <span className="text-sm leading-snug" style={{ color: 'rgba(255,255,255,0.85)' }}>
                          {label}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Stats strip */}
                <div className="mt-10 pt-6 grid grid-cols-3 gap-4"
                     style={{ borderTop: '1px solid rgba(255,255,255,0.12)' }}>
                  {[
                    { value: 'Peer Review', label: 'Double-blind evaluation' },
                    { value: 'Biannual',    label: 'Semi-annual publication' },
                    { value: 'APA 7',       label: 'Citation standards' },
                  ].map(({ value, label }) => (
                    <div key={label}>
                      <p className="font-bold text-sm" style={{ color: '#fff' }}>{value}</p>
                      <p className="text-xs leading-tight mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>
                        {label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Right panel — Form ─────────────────────────────── */}
              <div className="flex-1 flex flex-col justify-center p-8 lg:p-10 lg:pl-12">

                {/* Heading */}
                <div className="mb-7">
                  <h2 className="font-bold mb-1" style={{ color: '#1a1a1a', fontSize: '1.375rem' }}>
                    Login
                  </h2>
                  <p className="text-sm" style={{ color: '#666' }}>
                    Access your personal JAEI space
                  </p>
                </div>

                {/* API error banner */}
                {apiError && (
                  <div className="flex items-start gap-2.5 mb-5 p-3 rounded-sm text-sm"
                       style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#B91C1C' }}>
                    <svg className="w-4 h-4 flex-shrink-0 mt-px" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    <span className="leading-snug">{apiError}</span>
                    <button onClick={() => setApiError('')} className="ml-auto flex-shrink-0"
                            style={{ color: '#B91C1C', opacity: 0.6 }}>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                      </svg>
                    </button>
                  </div>
                )}

                <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">

                  {/* Email */}
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium mb-1.5"
                           style={{ color: '#333' }}>
                      Email address
                    </label>
                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      placeholder="vous@institution.com"
                      value={form.email}
                      onChange={handleChange}
                      className="w-full text-sm px-3 py-2.5 rounded-sm outline-none transition-all"
                      style={{
                        border: fieldErrors.email ? '1.5px solid #EF4444' : '1.5px solid #D1D5DB',
                        color: '#111',
                        background: '#fff',
                      }}
                      onFocus={e => {
                        e.target.style.border = '1.5px solid #1E88C8';
                        e.target.style.boxShadow = '0 0 0 3px rgba(30,136,200,0.12)';
                      }}
                      onBlur={e => {
                        e.target.style.border = fieldErrors.email ? '1.5px solid #EF4444' : '1.5px solid #D1D5DB';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                    {fieldErrors.email && (
                      <p className="text-xs mt-1" style={{ color: '#EF4444' }}>{fieldErrors.email}</p>
                    )}
                  </div>

                  {/* Password */}
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium mb-1.5"
                           style={{ color: '#333' }}>
                      Password
                    </label>
                    <div className="relative">
                      <input
                        id="password"
                        type={showPwd ? 'text' : 'password'}
                        autoComplete="current-password"
                        placeholder="Your password"
                        value={form.password}
                        onChange={handleChange}
                        className="w-full text-sm px-3 py-2.5 pr-10 rounded-sm outline-none transition-all"
                        style={{
                          border: fieldErrors.password ? '1.5px solid #EF4444' : '1.5px solid #D1D5DB',
                          color: '#111',
                          background: '#fff',
                        }}
                        onFocus={e => {
                          e.target.style.border = '1.5px solid #1E88C8';
                          e.target.style.boxShadow = '0 0 0 3px rgba(30,136,200,0.12)';
                        }}
                        onBlur={e => {
                          e.target.style.border = fieldErrors.password ? '1.5px solid #EF4444' : '1.5px solid #D1D5DB';
                          e.target.style.boxShadow = 'none';
                        }}
                      />
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => setShowPwd(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                        style={{ color: '#9CA3AF' }}
                        onMouseEnter={e => e.currentTarget.style.color = '#4B5563'}
                        onMouseLeave={e => e.currentTarget.style.color = '#9CA3AF'}
                      >
                        {showPwd ? <EyeOff /> : <EyeOpen />}
                      </button>
                    </div>
                    {fieldErrors.password && (
                      <p className="text-xs mt-1" style={{ color: '#EF4444' }}>{fieldErrors.password}</p>
                    )}
                  </div>

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-2.5 px-6 rounded-sm font-semibold text-sm text-white
                               transition-all duration-150 flex items-center justify-center gap-2
                               disabled:opacity-60 disabled:cursor-not-allowed"
                    style={{
                      background: isLoading ? '#2D5F3F' : 'linear-gradient(90deg, #1B4427 0%, #1E88C8 100%)',
                      letterSpacing: '0.01em',
                    }}
                    onMouseEnter={e => { if (!isLoading) e.currentTarget.style.opacity = '0.92'; }}
                    onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
                  >
                    {isLoading ? (
                      <>
                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10"
                                  stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                        </svg>
                        Logging in…
                      </>
                    ) : 'Log in'}
                  </button>

                  {/* Forgot password — centered below button */}
                  <p className="text-center text-xs" style={{ marginTop: '-4px' }}>
                    <Link to="/forgot-password"
                          className="no-underline transition-colors"
                          style={{ color: '#1E88C8' }}
                          onMouseEnter={e => e.target.style.textDecoration = 'underline'}
                          onMouseLeave={e => e.target.style.textDecoration = 'none'}>
                      Forgot your password?
                    </Link>
                  </p>
                </form>

                {/* Divider + register link */}
                <div className="mt-7 pt-6" style={{ borderTop: '1px solid #E5E7EB' }}>
                  <p className="text-sm text-center" style={{ color: '#555' }}>
                    Don't have an account?{' '}
                    <Link to="/register" className="font-semibold no-underline transition-colors"
                          style={{ color: '#1E88C8' }}>
                      Create a free account
                    </Link>
                  </p>
                </div>

                {/* Legal */}
                <p className="text-xs text-center mt-5 leading-relaxed" style={{ color: '#9CA3AF' }}>
                  By logging in, you agree to our{' '}
                  <Link to="/terms" className="no-underline hover:underline" style={{ color: '#9CA3AF' }}>terms of use</Link>
                  {' '}and our{' '}
                  <Link to="/privacy" className="no-underline hover:underline" style={{ color: '#9CA3AF' }}>privacy policy</Link>.
                </p>
              </div>
            </div>
          </div>

          {/* Bottom note */}
          <p className="text-center text-xs mt-4" style={{ color: '#9CA3AF' }}>
            © {new Date().getFullYear()} JAEI — Journal of Agricultural and Environmental Innovation
          </p>
        </div>
      </main>
    </div>
  );
};

export default Login;
