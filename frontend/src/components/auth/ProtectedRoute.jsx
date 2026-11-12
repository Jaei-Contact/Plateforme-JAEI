import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

// ============================================================
// ProtectedRoute — protège les routes selon auth + rôle
// ============================================================

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { isAuth, user, loading } = useAuth();
  const location = useLocation();

  // Pendant le chargement de l'auth, on affiche un spinner
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-100">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10"
                    stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-sm text-neutral-500">Loading...</p>
        </div>
      </div>
    );
  }

  // Non connecté → redirige vers /login en gardant la destination
  if (!isAuth) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Rôle non autorisé → redirige vers son dashboard (administrateur ou membre)
  if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    return <Navigate to={user?.role === 'admin' ? '/admin/dashboard' : '/author/dashboard'} replace />;
  }

  // Remarque 4 (27/09) : toute personne invitée par e-mail (compte créé automatiquement) doit
  // compléter sa fiche (titre, institution, pays, domaines) avant d'accéder à quoi que ce soit
  // d'autre. Les comptes créés à l'inscription ont déjà une fiche complète.
  if (user?.profile_completed === false && location.pathname !== '/complete-profile') {
    return <Navigate to="/complete-profile" state={{ from: location }} replace />;   // on y revient une fois la fiche remplie
  }

  return children;
};

export default ProtectedRoute;
