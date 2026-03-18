import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

// ============================================================
// Navbar — style ScienceDirect / Elsevier
// Blanc, logo gauche, nav centre, auth droite
// ============================================================

const Navbar = () => {
  const { user, isAuth, logout } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const [menuOpen, setMenuOpen]         = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const navLinks = [
    { label: 'Accueil',      path: '/' },
    { label: 'Numéros',      path: '/issues' },
    { label: 'Soumettre',    path: isAuth ? '/author/submit' : '/login' },
    { label: 'À propos',     path: '/about' },
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
    <header className="bg-white border-b border-neutral-200 sticky top-0 z-50">
      {/* Bandeau top — style ScienceDirect */}
      <div className="bg-primary-700 text-white text-xs py-1 hidden md:block">
        <div className="page-container flex justify-end items-center gap-4">
          <span className="text-primary-100">
            Journal of Agricultural and Environmental Innovation
          </span>
          <span className="text-primary-300">|</span>
          <span className="text-primary-100">ISSN : à définir</span>
        </div>
      </div>

      {/* Navbar principale */}
      <nav className="page-container">
        <div className="flex items-center justify-between h-14">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 no-underline flex-shrink-0">
            <div className="flex items-center justify-center w-9 h-9 bg-primary rounded-md">
              <span className="text-white font-bold text-sm leading-none">J</span>
            </div>
            <div className="hidden sm:block">
              <div className="text-primary font-bold text-base leading-tight">JAEI</div>
              <div className="text-neutral-500 text-xxs leading-tight">
                Journal of Agricultural and Environmental Innovation
              </div>
            </div>
          </Link>

          {/* Navigation — desktop */}
          <div className="hidden md:flex items-center gap-1">
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

          {/* Auth — desktop */}
          <div className="hidden md:flex items-center gap-2">
            {isAuth ? (
              /* Menu utilisateur connecté */
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded border border-neutral-200
                             text-sm text-neutral-700 hover:border-primary hover:text-primary
                             transition-colors duration-150 bg-white"
                >
                  {/* Avatar initiales */}
                  <span className="w-6 h-6 bg-primary text-white rounded-full text-xs
                                   flex items-center justify-center font-semibold flex-shrink-0">
                    {user?.first_name?.[0]?.toUpperCase() || 'U'}
                  </span>
                  <span className="max-w-[120px] truncate">{user?.first_name} {user?.last_name}</span>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-1 w-52 bg-white border border-neutral-200
                                  rounded shadow-card z-50">
                    <div className="px-4 py-3 border-b border-neutral-100">
                      <p className="text-sm font-medium text-neutral-800 truncate">
                        {user?.first_name} {user?.last_name}
                      </p>
                      <p className="text-xs text-neutral-500 truncate">{user?.email}</p>
                      <span className="inline-block mt-1 text-xxs font-semibold uppercase
                                       text-primary bg-primary-50 border border-primary-200
                                       rounded px-2 py-0.5">
                        {user?.role}
                      </span>
                    </div>
                    <div className="py-1">
                      <Link
                        to={getDashboardPath()}
                        onClick={() => setUserMenuOpen(false)}
                        className="block px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100
                                   no-underline transition-colors"
                      >
                        Mon tableau de bord
                      </Link>
                      <Link
                        to="/profile"
                        onClick={() => setUserMenuOpen(false)}
                        className="block px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100
                                   no-underline transition-colors"
                      >
                        Mon profil
                      </Link>
                      <hr className="border-neutral-100 my-1" />
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-sm text-error
                                   hover:bg-red-50 transition-colors"
                      >
                        Se déconnecter
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Boutons non connecté */
              <>
                <Link
                  to="/login"
                  className="px-4 py-2 text-sm font-medium text-primary border border-primary
                             rounded hover:bg-primary-50 no-underline transition-colors duration-150"
                >
                  Connexion
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 text-sm font-medium text-white bg-primary rounded
                             hover:bg-primary-600 no-underline transition-colors duration-150"
                >
                  S'inscrire
                </Link>
              </>
            )}
          </div>

          {/* Burger — mobile */}
          <button
            className="md:hidden p-2 rounded text-neutral-600 hover:bg-neutral-100"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Menu"
          >
            {menuOpen ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

        {/* Menu mobile */}
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
                    Mon tableau de bord
                  </Link>
                  <button
                    onClick={() => { handleLogout(); setMenuOpen(false); }}
                    className="text-left px-3 py-2 text-sm text-error hover:bg-red-50 rounded"
                  >
                    Se déconnecter
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
                    Connexion
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMenuOpen(false)}
                    className="flex-1 text-center px-3 py-2 text-sm font-medium text-white
                               bg-primary rounded no-underline"
                  >
                    S'inscrire
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>
    </header>
  );
};

export default Navbar;
