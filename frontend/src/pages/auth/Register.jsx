import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

// ============================================================
// Page Register — JAEI Platform
// Inspired by ScienceDirect / Elsevier design language
// 2-step form — same header + centered card as Login
// ============================================================

const EyeOpen = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
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

const ROLES = [
  {
    value: 'author',
    label: 'Author',
    desc: 'Submit and track scientific articles',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
      </svg>
    ),
  },
  {
    value: 'reviewer',
    label: 'Reviewer',
    desc: 'Evaluate submissions as a reviewer',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
      </svg>
    ),
  },
];

// Official JAEI domains — synced with ArticlesPage and schema.sql
const SPECIALTY_GROUPS = [
  {
    label: 'Agroecology and Sustainable Land Use',
    options: [
      'Agronomy', 'Agroforestry', 'Plant genetics',
      'Crop production', 'Soil science', 'Plant pathology',
      'Rural engineering & Hydraulics', 'Rural development',
    ],
  },
  {
    label: 'Animal and Aquatic Sciences',
    options: [
      'Aquaculture & Fisheries', 'Animal nutrition', 'Animal production',
      'Veterinary parasitology', 'Animal husbandry',
    ],
  },
  {
    label: 'Environmental Sciences and Pollution',
    options: [
      'Ecology', 'Environment & Pollution',
      'Climate change & Agriculture', 'Forestry',
      'Natural resource management', 'Water sciences',
    ],
  },
  {
    label: 'Biotechnology and Agricultural Innovation',
    options: [
      'Agricultural biotechnology', 'Soil microbiology', 'Agricultural economics',
    ],
  },
];

const COUNTRIES = [
  'Cameroun', "Côte d'Ivoire", 'Sénégal', 'Mali', 'Burkina Faso', 'Niger', 'Guinée',
  'Togo', 'Bénin', 'Madagascar', 'RD Congo', 'Congo', 'Gabon', 'Tchad', 'Centrafrique',
  'France', 'Belgique', 'Suisse', 'Canada', 'Autre',
];

// ── Shared field styles ────────────────────────────────────
const INPUT_BASE = {
  border: '1.5px solid #D1D5DB',
  color: '#111',
  background: '#fff',
};
const INPUT_FOCUS = {
  border: '1.5px solid #1E88C8',
  boxShadow: '0 0 0 3px rgba(30,136,200,0.12)',
};
const INPUT_ERROR = { border: '1.5px solid #EF4444', boxShadow: 'none' };

// Reusable labelled field wrapper
const Field = ({ label, required, optional, error, hint, children }) => (
  <div>
    <label className="block text-sm font-medium mb-1.5" style={{ color: '#333' }}>
      {label}
      {required && <span style={{ color: '#EF4444' }}> *</span>}
      {optional && <span className="font-normal text-xs ml-1" style={{ color: '#9CA3AF' }}>(optional)</span>}
    </label>
    {children}
    {error && <p className="text-xs mt-1" style={{ color: '#EF4444' }}>{error}</p>}
    {hint && !error && <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>{hint}</p>}
  </div>
);

// Reusable text/email/password input
const StyledInput = ({ id, type = 'text', placeholder, value, onChange, error, autoComplete, rightEl }) => {
  const [focused, setFocused] = useState(false);
  return (
    <div className="relative">
      <input
        id={id} type={type} placeholder={placeholder} value={value}
        onChange={onChange} autoComplete={autoComplete}
        className="w-full text-sm px-3 py-2.5 rounded-sm outline-none transition-all"
        style={{
          ...INPUT_BASE,
          ...(focused ? INPUT_FOCUS : {}),
          ...(error && !focused ? INPUT_ERROR : {}),
          paddingRight: rightEl ? '2.5rem' : undefined,
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      {rightEl && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">{rightEl}</div>
      )}
    </div>
  );
};

// Reusable select
const StyledSelect = ({ id, value, onChange, error, children }) => {
  const [focused, setFocused] = useState(false);
  return (
    <select
      id={id} value={value} onChange={onChange}
      className="w-full text-sm px-3 py-2.5 rounded-sm outline-none transition-all appearance-none"
      style={{
        ...INPUT_BASE,
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239CA3AF'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 0.75rem center',
        backgroundSize: '1rem',
        paddingRight: '2.5rem',
        ...(focused ? INPUT_FOCUS : {}),
        ...(error && !focused ? INPUT_ERROR : {}),
      }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    >
      {children}
    </select>
  );
};

// ── Main component ─────────────────────────────────────────
const Register = () => {
  const { register } = useAuth();
  const navigate     = useNavigate();

  const [step, setStep]   = useState(1);
  const [form, setForm]   = useState({
    first_name: '', last_name: '', email: '',
    password: '', confirm_password: '',
    role: 'author', institution: '', country: 'Cameroun', specialty: '',
  });
  const [errors, setErrors]       = useState({});
  const [apiError, setApiError]   = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPwd, setShowPwd]     = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleChange = (e) => {
    const { id, value } = e.target;
    setForm(prev => ({ ...prev, [id]: value }));
    if (errors[id]) setErrors(prev => ({ ...prev, [id]: '' }));
    if (apiError)   setApiError('');
  };

  const validateStep1 = () => {
    const errs = {};
    if (!form.first_name.trim())  errs.first_name = 'First name is required.';
    if (!form.last_name.trim())   errs.last_name  = 'Last name is required.';
    if (!form.email.trim())       errs.email      = 'Email is required.';
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Invalid email.';
    if (!form.password)           errs.password   = 'Password is required.';
    else if (form.password.length < 8) errs.password = 'Minimum 8 characters.';
    if (!form.confirm_password)   errs.confirm_password = 'Please confirm your password.';
    else if (form.password !== form.confirm_password)
      errs.confirm_password = 'Passwords do not match.';
    return errs;
  };

  const validateStep2 = () => {
    const errs = {};
    if (!form.institution.trim()) errs.institution = 'Institution is required.';
    if (!form.country)            errs.country     = 'Country is required.';
    return errs;
  };

  const handleNext = (e) => {
    e.preventDefault();
    const errs = validateStep1();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validateStep2();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setIsLoading(true);
    const result = await register({
      first_name:  form.first_name.trim(),
      last_name:   form.last_name.trim(),
      email:       form.email.trim().toLowerCase(),
      password:    form.password,
      role:        form.role,
      institution: form.institution.trim(),
      country:     form.country,
      specialty:   form.specialty.trim(),
    });
    setIsLoading(false);
    if (result.success) {
      navigate(
        result.user.role === 'reviewer' ? '/reviewer/dashboard' : '/author/dashboard',
        { replace: true }
      );
    } else {
      setApiError(result.message || 'Registration error. Please try again.');
    }
  };

  const eyeBtn = (visible, toggle) => (
    <button type="button" tabIndex={-1} onClick={toggle}
            style={{ color: '#9CA3AF' }}
            onMouseEnter={e => e.currentTarget.style.color = '#4B5563'}
            onMouseLeave={e => e.currentTarget.style.color = '#9CA3AF'}>
      {visible ? <EyeOff /> : <EyeOpen />}
    </button>
  );

  // Journey steps shown in left panel
  const journey = [
    { n: '1', title: 'Create your profile', desc: 'Name, email and secure password' },
    { n: '2', title: 'Define your role', desc: 'Author or reviewer, institution and specialty' },
    { n: '3', title: 'Access the platform', desc: 'Submit or review from your first login' },
  ];

  return (
    <div className="min-h-screen flex flex-col page-enter" style={{ background: '#F5F5F5' }}>

      {/* ── Top header bar ───────────────────────────────────── */}
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
            <Link to="/" className="text-xs no-underline"
                  style={{ color: 'rgba(255,255,255,0.7)' }}
                  onMouseEnter={e => e.target.style.color='#fff'}
                  onMouseLeave={e => e.target.style.color='rgba(255,255,255,0.7)'}>
              Home
            </Link>
            <Link to="/about" className="text-xs no-underline"
                  style={{ color: 'rgba(255,255,255,0.7)' }}
                  onMouseEnter={e => e.target.style.color='#fff'}
                  onMouseLeave={e => e.target.style.color='rgba(255,255,255,0.7)'}>
              About
            </Link>
            <Link to="/login"
                  className="text-xs font-semibold px-3 py-1 rounded no-underline"
                  style={{ background: '#1E88C8', color: '#fff' }}>
              Log in
            </Link>
          </nav>
        </div>
      </header>

      {/* ── Main content ─────────────────────────────────────── */}
      <main className="flex-1 flex items-start justify-center px-4 py-10">
        <div className="w-full max-w-5xl">

          {/* Card */}
          <div className="bg-white rounded-sm overflow-hidden"
               style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.08)' }}>
            <div className="flex flex-col lg:flex-row">

              {/* ── Left panel ──────────────────────────────── */}
              <div className="lg:w-[38%] flex-shrink-0 flex flex-col justify-between p-8 lg:p-10"
                   style={{ background: 'linear-gradient(160deg, #1B4427 0%, #265438 55%, #1a6fa8 100%)' }}>

                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm mb-6"
                       style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)' }}>
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#4ade80' }} />
                    <span className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.9)' }}>
                      Free registration
                    </span>
                  </div>

                  <h1 className="font-bold leading-tight mb-2"
                      style={{ color: '#fff', fontSize: '1.2rem' }}>
                    Join the JAEI community
                  </h1>
                  <p className="text-xs leading-relaxed mb-8"
                     style={{ color: 'rgba(255,255,255,0.6)' }}>
                    Contributors from agriculture, ecology and environmental
                    sciences, welcome.
                  </p>

                  <div className="w-10 h-px mb-8" style={{ background: '#1E88C8' }} />

                  {/* Journey steps */}
                  <div className="flex flex-col gap-6">
                    {journey.map(({ n, title, desc }, i) => (
                      <div key={n} className="flex gap-4">
                        {/* Step number + connector */}
                        <div className="flex flex-col items-center flex-shrink-0">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                               style={{
                                 background: parseInt(n) <= step
                                   ? '#1E88C8'
                                   : 'rgba(255,255,255,0.12)',
                                 color: '#fff',
                                 border: parseInt(n) <= step ? 'none' : '1px solid rgba(255,255,255,0.2)',
                               }}>
                            {parseInt(n) < step
                              ? <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/>
                                </svg>
                              : n
                            }
                          </div>
                          {i < journey.length - 1 && (
                            <div className="w-px flex-1 mt-1.5"
                                 style={{ background: parseInt(n) < step ? '#1E88C8' : 'rgba(255,255,255,0.12)', minHeight: '1.5rem' }} />
                          )}
                        </div>
                        {/* Step text */}
                        <div className="pb-2">
                          <p className="text-sm font-semibold" style={{ color: '#fff' }}>{title}</p>
                          <p className="text-xs leading-snug mt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>{desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-10 pt-5" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    © {new Date().getFullYear()} JAEI — All rights reserved
                  </p>
                </div>
              </div>

              {/* ── Right panel — Form ─────────────────────── */}
              <div className="flex-1 flex flex-col p-8 lg:p-10 lg:pl-12 overflow-y-auto">

                {/* Heading + step indicator */}
                <div className="mb-7">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h2 className="font-bold" style={{ color: '#1a1a1a', fontSize: '1.375rem' }}>
                        Create an account
                      </h2>
                      <p className="text-sm mt-0.5" style={{ color: '#666' }}>
                        {step === 1
                          ? 'Enter your personal information'
                          : 'Complete your academic profile'}
                      </p>
                    </div>
                    <span className="text-xs font-medium px-2.5 py-1 rounded-sm"
                          style={{ background: '#EFF6FF', color: '#1E88C8', border: '1px solid #BFDBFE' }}>
                      Step {step} / 2
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="h-1 rounded-full overflow-hidden" style={{ background: '#E5E7EB' }}>
                    <div className="h-full rounded-full transition-all duration-500"
                         style={{ width: step === 1 ? '50%' : '100%', background: 'linear-gradient(90deg, #1B4427, #1E88C8)' }} />
                  </div>
                </div>

                {/* API error */}
                {apiError && (
                  <div className="flex items-start gap-2.5 mb-5 p-3 rounded-sm text-sm"
                       style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#B91C1C' }}>
                    <svg className="w-4 h-4 flex-shrink-0 mt-px" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    <span className="leading-snug flex-1">{apiError}</span>
                    <button onClick={() => setApiError('')} style={{ color: '#B91C1C', opacity: 0.6 }}>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                      </svg>
                    </button>
                  </div>
                )}

                {/* ── STEP 1 ─────────────────────────────── */}
                {step === 1 && (
                  <form onSubmit={handleNext} noValidate className="flex flex-col gap-4">

                    <div className="grid grid-cols-2 gap-3">
                      <Field label="First name" required error={errors.first_name}>
                        <StyledInput id="first_name" placeholder="John"
                          value={form.first_name} onChange={handleChange}
                          error={errors.first_name} autoComplete="given-name" />
                      </Field>
                      <Field label="Last name" required error={errors.last_name}>
                        <StyledInput id="last_name" placeholder="Doe"
                          value={form.last_name} onChange={handleChange}
                          error={errors.last_name} autoComplete="family-name" />
                      </Field>
                    </div>

                    <Field label="Email address" required error={errors.email}>
                      <StyledInput id="email" type="email" placeholder="vous@institution.com"
                        value={form.email} onChange={handleChange}
                        error={errors.email} autoComplete="email" />
                    </Field>

                    <Field label="Password" required error={errors.password} hint="At least 8 characters">
                      <StyledInput id="password" type={showPwd ? 'text' : 'password'}
                        placeholder="Minimum 8 characters"
                        value={form.password} onChange={handleChange}
                        error={errors.password} autoComplete="new-password"
                        rightEl={eyeBtn(showPwd, () => setShowPwd(v => !v))} />
                    </Field>

                    <Field label="Confirm password" required error={errors.confirm_password}>
                      <StyledInput id="confirm_password" type={showConfirm ? 'text' : 'password'}
                        placeholder="Repeat your password"
                        value={form.confirm_password} onChange={handleChange}
                        error={errors.confirm_password} autoComplete="new-password"
                        rightEl={eyeBtn(showConfirm, () => setShowConfirm(v => !v))} />
                    </Field>

                    <button type="submit"
                            className="w-full mt-2 py-2.5 px-6 rounded-sm font-semibold text-sm text-white
                                       transition-all duration-150 flex items-center justify-center gap-2"
                            style={{ background: 'linear-gradient(90deg, #1B4427 0%, #1E88C8 100%)', letterSpacing: '0.01em' }}
                            onMouseEnter={e => e.currentTarget.style.opacity = '0.92'}
                            onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                      Continue
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
                      </svg>
                    </button>
                  </form>
                )}

                {/* ── STEP 2 ─────────────────────────────── */}
                {step === 2 && (
                  <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">

                    {/* Role selector */}
                    <div>
                      <p className="text-sm font-medium mb-2" style={{ color: '#333' }}>
                        I am registering as <span style={{ color: '#EF4444' }}>*</span>
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        {ROLES.map((role) => {
                          const active = form.role === role.value;
                          return (
                            <button
                              key={role.value}
                              type="button"
                              onClick={() => setForm(prev => ({ ...prev, role: role.value }))}
                              className="flex flex-col items-start gap-2 p-4 rounded-sm text-left transition-all duration-150"
                              style={{
                                border: active ? '1.5px solid #1E88C8' : '1.5px solid #D1D5DB',
                                background: active ? '#EFF6FF' : '#fff',
                              }}
                            >
                              <span style={{ color: active ? '#1E88C8' : '#9CA3AF' }}>{role.icon}</span>
                              <div>
                                <p className="text-sm font-semibold" style={{ color: active ? '#1a1a1a' : '#374151' }}>
                                  {role.label}
                                </p>
                                <p className="text-xs mt-0.5 leading-snug" style={{ color: '#6B7280' }}>
                                  {role.desc}
                                </p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <Field label="Institution / University" required error={errors.institution}>
                      <StyledInput id="institution" placeholder="e.g. University of Yaoundé I"
                        value={form.institution} onChange={handleChange}
                        error={errors.institution} />
                    </Field>

                    <Field label="Country" required error={errors.country}>
                      <StyledSelect id="country" value={form.country}
                        onChange={handleChange} error={errors.country}>
                        {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </StyledSelect>
                    </Field>

                    <Field label="Specialty area" optional>
                      <StyledSelect id="specialty" value={form.specialty} onChange={handleChange}>
                        <option value="">— Select a field —</option>
                        {SPECIALTY_GROUPS.map(group => (
                          <optgroup key={group.label} label={group.label}>
                            {group.options.map(opt => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </optgroup>
                        ))}
                      </StyledSelect>
                      <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>Your main research area</p>
                    </Field>

                    {/* Navigation buttons */}
                    <div className="flex gap-3 mt-1">
                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-sm
                                   text-sm font-medium transition-all duration-150"
                        style={{ flex: '0 0 auto', border: '1.5px solid #D1D5DB', color: '#4B5563', background: '#fff' }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#F9FAFB'; e.currentTarget.style.borderColor = '#9CA3AF'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#D1D5DB'; }}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
                        </svg>
                        Back
                      </button>

                      <button
                        type="submit"
                        disabled={isLoading}
                        className="flex-1 py-2.5 px-6 rounded-sm font-semibold text-sm text-white
                                   transition-all duration-150 flex items-center justify-center gap-2
                                   disabled:opacity-60 disabled:cursor-not-allowed"
                        style={{ background: 'linear-gradient(90deg, #1B4427 0%, #1E88C8 100%)', letterSpacing: '0.01em' }}
                        onMouseEnter={e => { if (!isLoading) e.currentTarget.style.opacity = '0.92'; }}
                        onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
                      >
                        {isLoading ? (
                          <>
                            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                            </svg>
                            Creating account…
                          </>
                        ) : 'Create my account'}
                      </button>
                    </div>
                  </form>
                )}

                {/* Divider + login link */}
                <div className="mt-7 pt-6" style={{ borderTop: '1px solid #E5E7EB' }}>
                  <p className="text-sm text-center" style={{ color: '#555' }}>
                    Already have an account?{' '}
                    <Link to="/login" className="font-semibold no-underline" style={{ color: '#1E88C8' }}>
                      Log in
                    </Link>
                  </p>
                </div>

                <p className="text-xs text-center mt-4 leading-relaxed" style={{ color: '#9CA3AF' }}>
                  By creating an account, you agree to our{' '}
                  <Link to="/terms" className="no-underline hover:underline" style={{ color: '#9CA3AF' }}>terms of use</Link>
                  {' '}and our{' '}
                  <Link to="/privacy" className="no-underline hover:underline" style={{ color: '#9CA3AF' }}>privacy policy</Link>.
                </p>
              </div>
            </div>
          </div>

          <p className="text-center text-xs mt-4" style={{ color: '#9CA3AF' }}>
            © {new Date().getFullYear()} JAEI — Journal of Agricultural and Environmental Innovation
          </p>
        </div>
      </main>
    </div>
  );
};

export default Register;
