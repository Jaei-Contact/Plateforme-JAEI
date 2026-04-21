import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

// ============================================================
// Navbar — ScienceDirect / Elsevier style
// White, logo left, nav center, auth right
// ============================================================

const Navbar = () => {
  const { user, isAuth, logout } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const [menuOpen, setMenuOpen]         = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [scrolled, setScrolled]         = useState(false);
  const [menuAnim, setMenuAnim]         = useState(null); // 'opening' | 'closing'

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const toggleMenu = () => {
    const opening = !menuOpen;
    setMenuAnim(opening ? 'opening' : 'closing');
    setMenuOpen(opening);
    setTimeout(() => setMenuAnim(null), 500);
  };

  const navLinks = [
    { label: 'Home',       path: '/' },
    { label: 'Articles',   path: '/articles' },
    { label: 'Submit',     path: isAuth ? '/author/submit' : '/login' },
    { label: 'About',      path: '/about' },
  ];

  const isActive = (path) => location.pathname === path;

  const handleLogout = async () => {
    await logout();
    setUserMenuOpen(false);
    navigate('/');
  };

  const getDashboardPath = () => {
    if (!user) return '/login';
    switch (user.role) {
      case 'admin':    return '/admin/dashboard';
      case 'reviewer': return '/reviewer/dashboard';
      default:         return '/author/dashboard';
    }
  };

  return (
    <>
    <style>{`
      @keyframes nav-spin-opening { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      @keyframes nav-spin-closing  { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }
      .navbar-logo-wrap {
        transition: opacity 0.45s ease, max-width 0.45s ease, transform 0.45s ease;
        opacity: 1; max-width: 120px; overflow: hidden;
      }
      @media (max-width: 768px) {
        .navbar-logo-wrap { opacity: 0; max-width: 0; transform: scale(0.5); pointer-events: none; }
      }
    `}</style>
    <header className={`bg-white border-b border-neutral-200 sticky top-0 z-50 transition-shadow duration-300 ${scrolled ? 'navbar-scrolled' : ''}`}>
      {/* Top banner — ScienceDirect style */}
      <div className="bg-primary-700 text-white text-xs py-1 hidden md:block">
        <div className="page-container flex justify-end items-center gap-4">
          <span className="text-primary-100">
            Journal of Agricultural and Environmental Innovation
          </span>
          <span className="text-primary-300">|</span>
          <span className="text-primary-100">ISSN: to be defined</span>
        </div>
      </div>

      {/* Main navbar */}
      <nav className="page-container">
        <div className="flex items-center h-14 relative">

          {/* Logo — far left */}
          <div className="flex items-center flex-shrink-0">
            <div className="navbar-logo-wrap">
              <Link to="/" className="flex items-center gap-3 no-underline">
                <img src="/logo-jaei.png" alt="JAEI" className="h-10 w-auto object-contain" style={{ maxHeight: 40 }} />
              </Link>
            </div>
          </div>

          {/* Navigation — absolutely centered */}
          <div className="hidden md:flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`px-3 py-2 text-sm font-medium rounded no-underline transition-colors duration-150
                  ${isActive(link.path)
                    ? 'text-primary bg-primary-50'
                    : 'text-neutral-700 hover:text-primary hover:bg-neutral-100'
                  }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Auth — far right */}
          <div className="hidden md:flex items-center gap-2 ml-auto">
            {isAuth ? (
              /* Logged-in user menu */
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-sm transition-colors duration-150"
                  style={{ background: 'transparent' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#F3F4F6'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  {/* Avatar — same initials as the Dashboard */}
                  <span className="w-7 h-7 rounded-full text-xs flex items-center justify-center font-bold flex-shrink-0"
                        style={{ background: '#1B4427', color: '#fff' }}>
                    {((user?.firstName?.[0] || '') + (user?.lastName?.[0] || '')).toUpperCase() || 'U'}
                  </span>
                  <span className="hidden lg:block max-w-[110px] truncate text-sm font-medium text-neutral-700">
                    {user?.firstName} {user?.lastName}
                  </span>
                  <svg className="w-3 h-3 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-1 w-52 bg-white rounded-sm z-50"
                       style={{ border: '1px solid #E5E7EB', boxShadow: '0 4px 16px rgba(0,0,0,0.10)' }}>
                    {/* User info */}
                    <div className="px-4 py-3" style={{ borderBottom: '1px solid #F3F4F6' }}>
                      <p className="text-sm font-semibold truncate" style={{ color: '#111' }}>
                        {user?.firstName} {user?.lastName}
                      </p>
                      <p className="text-xs truncate mt-0.5" style={{ color: '#6B7280' }}>{user?.email}</p>
                      <span className="inline-block mt-1.5 text-xs font-medium px-2 py-0.5 rounded-sm"
                            style={{
                              background: user?.role === 'admin' ? '#FEF3C7' : user?.role === 'reviewer' ? '#EFF6FF' : '#F0FDF4',
                              color:      user?.role === 'admin' ? '#92400E' : user?.role === 'reviewer' ? '#1D4ED8' : '#15803D',
                              border:     `1px solid ${user?.role === 'admin' ? '#FDE68A' : user?.role === 'reviewer' ? '#BFDBFE' : '#BBF7D0'}`,
                            }}>
                        {user?.role === 'admin' ? 'Administrator' : user?.role === 'reviewer' ? 'Reviewer' : 'Author'}
                      </span>
                    </div>
                    {/* Actions */}
                    <div className="py-1">
                      <Link to={getDashboardPath()} onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2.5 text-sm no-underline transition-colors"
                            style={{ color: '#374151' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        My dashboard
                      </Link>
                      {/* My profile — hidden for admins */}
                      {user?.role !== 'admin' && (
                        <Link to="/profile" onClick={() => setUserMenuOpen(false)}
                              className="flex items-center gap-2.5 px-4 py-2.5 text-sm no-underline transition-colors"
                              style={{ color: '#374151' }}
                              onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'}
                              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          My profile
                        </Link>
                      )}
                      <button onClick={handleLogout}
                              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors"
                              style={{ color: '#DC2626', borderTop: '1px solid #F3F4F6' }}
                              onMouseEnter={e => e.currentTarget.style.background = '#FEF2F2'}
                              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        Log out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Logged-out buttons */
              <>
                <Link
                  to="/login"
                  className="px-4 py-2 text-sm font-medium text-primary border border-primary
                             rounded hover:bg-primary-50 no-underline transition-colors duration-150"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 text-sm font-medium text-white bg-primary rounded
                             hover:bg-primary-600 no-underline transition-colors duration-150"
                >
                  Register
                </Link>
              </>
            )}
          </div>

          {/* Burger — mobile (same spin as dashboard sidebar) */}
          <button
            className="md:hidden p-2 rounded transition-colors"
            onClick={toggleMenu}
            aria-label="Menu"
            style={{ color: menuOpen ? '#4ade80' : '#4B5563', background: menuOpen ? 'rgba(74,222,128,0.08)' : 'transparent' }}
          >
            <span style={{
              display: 'inline-block',
              animation: menuAnim ? `nav-spin-${menuAnim} 0.5s ease forwards` : 'none',
            }}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </span>
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden pb-4 border-t border-neutral-100 mt-1">
            <div className="flex flex-col gap-1 mt-3">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setMenuOpen(false)}
                  className={`px-3 py-2 text-sm font-medium rounded no-underline transition-colors
                    ${isActive(link.path)
                      ? 'text-primary bg-primary-50'
                      : 'text-neutral-700 hover:text-primary hover:bg-neutral-100'
                    }`}
                >
                  {link.label}
                </Link>
              ))}
              <hr className="border-neutral-100 my-2" />
              {isAuth ? (
                <>
                  <Link
                    to={getDashboardPath()}
                    onClick={() => setMenuOpen(false)}
                    className="px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-100 rounded no-underline"
                  >
                    My dashboard
                  </Link>
                  <button
                    onClick={() => { handleLogout(); setMenuOpen(false); }}
                    className="text-left px-3 py-2 text-sm text-error hover:bg-red-50 rounded"
                  >
                    Log out
                  </button>
                </>
              ) : (
                <div className="flex gap-2 px-3">
                  <Link
                    to="/login"
                    onClick={() => setMenuOpen(false)}
                    className="flex-1 text-center px-3 py-2 text-sm font-medium text-primary
                               border border-primary rounded no-underline"
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMenuOpen(false)}
                    className="flex-1 text-center px-3 py-2 text-sm font-medium text-white
                               bg-primary rounded no-underline"
                  >
                    Register
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>
    </header>
    </>
  );
};

export default Navbar;
