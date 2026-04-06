import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

// ============================================================
// DashboardLayout — JAEI Platform
// Shared layout for all dashboards (Author, Reviewer, Admin)
// Style inspired by ScienceDirect / academic portals
// ============================================================

// ── SVG Icons ───────────────────────────────────────────────

const IconHome = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
      d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
  </svg>
);

const IconList = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
  </svg>
);

const IconPlus = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
      d="M12 4v16m8-8H4"/>
  </svg>
);

const IconUser = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
  </svg>
);

const IconLogout = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
  </svg>
);

const IconMenu = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 6h16M4 12h16M4 18h16"/>
  </svg>
);

const IconClose = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M6 18L18 6M6 6l12 12"/>
  </svg>
);

const IconChevronDown = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
  </svg>
);

const IconBell = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
  </svg>
);

// Icons specific to admin / reviewer
const IconUsers = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/>
  </svg>
);

const IconChart = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
  </svg>
);

const IconEditorial = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
  </svg>
);

const IconReview = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
  </svg>
);

// ── Navigation by role ───────────────────────────────────────

const NAV_AUTHOR = [
  { label: 'Dashboard',          icon: IconHome,   to: '/author/dashboard' },
  { label: 'My submissions',     icon: IconList,   to: '/author/submissions' },
  { label: 'Submit an article',  icon: IconPlus,   to: '/author/submit' },
  { label: 'My profile',         icon: IconUser,   to: '/profile' },
];

const NAV_REVIEWER = [
  { label: 'Dashboard',          icon: IconHome,   to: '/reviewer/dashboard' },
  { label: 'Articles to review', icon: IconReview, to: '/reviewer/assignments' },
  { label: 'My profile',         icon: IconUser,   to: '/profile' },
];

const NAV_ADMIN = [
  { label: 'Dashboard',          icon: IconHome,      to: '/admin/dashboard' },
  { label: 'Submissions',        icon: IconList,      to: '/admin/submissions' },
  { label: 'Users',              icon: IconUsers,     to: '/admin/users' },
  { label: 'Editorial board',    icon: IconEditorial, to: '/admin/editorial-board' },
  { label: 'Statistics',         icon: IconChart,     to: '/admin/stats' },
];

const navByRole = { author: NAV_AUTHOR, reviewer: NAV_REVIEWER, admin: NAV_ADMIN };

const roleLabelFR = { author: 'Author', reviewer: 'Reviewer', admin: 'Administrator' };
const roleBadgeColor = {
  author:   { bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' },
  reviewer: { bg: '#F0FDF4', color: '#15803D', border: '#BBF7D0' },
  admin:    { bg: '#FFF7ED', color: '#C2410C', border: '#FED7AA' },
};

// ── Main component ───────────────────────────────────────────

const DashboardLayout = ({ children, title = '' }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate  = useNavigate();

  const [sidebarOpen, setSidebarOpen]   = useState(true);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [btnAnim, setBtnAnim]           = useState(null); // 'opening' | 'closing'

  const toggleSidebar = () => {
    const opening = !sidebarOpen;
    setBtnAnim(opening ? 'opening' : 'closing');
    setSidebarOpen(opening);
    setTimeout(() => setBtnAnim(null), 500);
  };

  const role    = user?.role || 'author';
  const navItems = navByRole[role] || NAV_AUTHOR;
  const badge   = roleBadgeColor[role] || roleBadgeColor.author;

  const initials = [user?.firstName, user?.lastName]
    .filter(Boolean)
    .map(s => s[0].toUpperCase())
    .join('') || 'U';

  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || 'User';

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#F5F7FA' }}>
      <style>{`
        @keyframes btn-spin-opening {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes btn-spin-closing {
          from { transform: rotate(0deg); }
          to   { transform: rotate(-360deg); }
        }
      `}</style>

      {/* ── Top navigation bar ────────────────────────────────── */}
      <header style={{ background: '#1B4427', borderBottom: '3px solid #1E88C8', zIndex: 50 }}
              className="sticky top-0">
        <div className="h-14 flex items-center justify-between px-4 lg:px-6">

          {/* Left: hamburger (always visible) + logo */}
          <div className="flex items-center gap-3">
            <button
              onClick={toggleSidebar}
              className="p-1.5 rounded-sm transition-colors"
              style={{
                color: sidebarOpen ? '#4ade80' : 'rgba(255,255,255,0.8)',
                background: sidebarOpen ? 'rgba(255,255,255,0.08)' : 'transparent',
                transition: 'color 0.3s, background 0.3s',
              }}
            >
              <span style={{
                display: 'inline-block',
                animation: btnAnim ? `btn-spin-${btnAnim} 0.5s ease forwards` : 'none',
              }}>
                <IconMenu />
              </span>
            </button>

            <Link to="/" className="flex items-center gap-2.5 no-underline">
              <img src="/logo-jaei-white.png" alt="JAEI" className="w-7 h-7 object-contain flex-shrink-0" />
              <span className="text-white font-bold text-sm tracking-wide">JAEI</span>
              <span className="hidden md:block text-xs font-normal"
                    style={{ color: 'rgba(255,255,255,0.5)', borderLeft: '1px solid rgba(255,255,255,0.2)', paddingLeft: '0.625rem' }}>
                Journal of Agricultural and Environmental Innovation
              </span>
            </Link>
          </div>

          {/* Right: bell + user menu */}
          <div className="flex items-center gap-2">

            {/* Notifications (placeholder) */}
            <button className="relative p-2 rounded-full transition-colors"
                    style={{ color: 'rgba(255,255,255,0.7)' }}
                    onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                    onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}>
              <IconBell />
            </button>

            {/* User menu */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(v => !v)}
                className="flex items-center gap-2 px-2 py-1.5 rounded transition-colors"
                style={{ color: '#fff' }}
              >
                {/* Avatar */}
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                     style={{ background: '#1E88C8', color: '#fff' }}>
                  {initials}
                </div>
                <span className="hidden sm:block text-sm font-medium max-w-[130px] truncate"
                      style={{ color: 'rgba(255,255,255,0.9)' }}>
                  {fullName}
                </span>
                <span style={{ color: 'rgba(255,255,255,0.6)' }}><IconChevronDown /></span>
              </button>

              {/* Dropdown */}
              {userMenuOpen && (
                <div
                  className="absolute right-0 top-full mt-1 w-52 rounded-sm overflow-hidden"
                  style={{ background: '#fff', boxShadow: '0 4px 16px rgba(0,0,0,0.14)', border: '1px solid #E5E7EB', zIndex: 100 }}
                >
                  {/* User info */}
                  <div className="px-4 py-3" style={{ borderBottom: '1px solid #F3F4F6' }}>
                    <p className="text-sm font-semibold truncate" style={{ color: '#111' }}>{fullName}</p>
                    <p className="text-xs truncate mt-0.5" style={{ color: '#6B7280' }}>{user?.email}</p>
                    <span className="inline-block mt-1.5 text-xs font-medium px-2 py-0.5 rounded-sm"
                          style={{ background: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}>
                      {roleLabelFR[role]}
                    </span>
                  </div>

                  {/* Links — My profile hidden for admins */}
                  {role !== 'admin' && (
                    <Link to="/profile"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-sm no-underline transition-colors"
                          style={{ color: '#374151' }}
                          onMouseEnter={e => { e.currentTarget.style.background = '#F9FAFB'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                      <IconUser />
                      My profile
                    </Link>
                  )}

                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors"
                    style={{ color: '#DC2626', borderTop: '1px solid #F3F4F6' }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#FEF2F2'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <IconLogout />
                    Log out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">

        {/* ── Sidebar ───────────────────────────────────────────── */}
        <aside
          className="sticky top-14 h-[calc(100vh-3.5rem)] flex-shrink-0 overflow-hidden"
          style={{
            width: sidebarOpen ? 240 : 0,
            transition: 'width 0.3s ease',
            background: '#fff',
            borderRight: sidebarOpen ? '1px solid #E5E7EB' : 'none',
            zIndex: 41,
          }}
        >
          <div style={{ width: 240, height: '100%', overflowY: 'auto', position: 'relative' }}>
          {/* User greeting */}
          <div className="px-5 py-5" style={{ borderBottom: '1px solid #E5E7EB' }}>
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold flex-shrink-0"
                   style={{ background: '#1B4427', color: '#fff' }}>
                {initials}
              </div>
              {/* Info */}
              <div className="min-w-0">
                <p className="text-xs" style={{ color: '#6B7280' }}>Hello</p>
                <p className="text-sm font-bold leading-tight truncate" style={{ color: '#111827' }}>
                  {fullName}
                </p>
                <p className="text-xs mt-1 truncate" style={{ color: '#6B7280' }}>
                  {user?.email || ''}
                </p>
              </div>
            </div>
          </div>

          {/* Nav items */}
          <nav className="py-3">
            {navItems.map(({ label, icon: Icon, to }) => {
              const isActive = location.pathname === to;
              return (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setSidebarOpen(false)}
                  className="flex items-center gap-3 px-5 py-2.5 text-sm no-underline transition-all"
                  style={{
                    color: isActive ? '#1E88C8' : '#374151',
                    background: isActive ? '#EFF6FF' : 'transparent',
                    fontWeight: isActive ? 600 : 400,
                    borderLeft: isActive ? '3px solid #1E88C8' : '3px solid transparent',
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#F9FAFB'; }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                >
                  <span style={{ color: isActive ? '#1E88C8' : '#9CA3AF' }}><Icon /></span>
                  {label}
                </Link>
              );
            })}
          </nav>

          {/* Logout (sidebar) */}
          <div className="absolute bottom-0 left-0 right-0 p-4" style={{ borderTop: '1px solid #F3F4F6' }}>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm transition-colors"
              style={{ color: '#6B7280' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#FEF2F2'; e.currentTarget.style.color = '#DC2626'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#6B7280'; }}
            >
              <IconLogout />
              Log out
            </button>
          </div>
          </div>{/* end inner div */}
        </aside>

        {/* ── Main content ──────────────────────────────────────── */}
        <main className="flex-1 overflow-auto">

          {/* Page title bar — ScienceDirect hero banner style */}
          {title && (
            <div style={{ background: 'linear-gradient(135deg, #1B4427 0%, #1a5c35 60%, #1565a8 100%)', borderBottom: '1px solid #1E88C8' }}>
              <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5">
                <h1 className="text-xl font-bold" style={{ color: '#fff' }}>{title}</h1>
                <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.55)' }}>
                  Journal of Agricultural and Environmental Innovation
                </p>
              </div>
            </div>
          )}

          {/* Page body */}
          <div className="max-w-6xl mx-auto px-4 lg:px-6 py-6 page-enter">
            {children}
          </div>
        </main>
      </div>

      {/* Close user menu on outside click — z-index 49: below header (50) */}
      {userMenuOpen && (
        <div className="fixed inset-0" style={{ zIndex: 49 }} onClick={() => setUserMenuOpen(false)} />
      )}
    </div>
  );
};

export default DashboardLayout;
