import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../utils/api';

// ============================================================
// AuthContext — JAEI Platform
// Gestion globale de l'authentification
// ============================================================

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null);
  const [token, setToken]     = useState(localStorage.getItem('jaei_token') || null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  // --- Charger l'utilisateur au démarrage ------------------
  useEffect(() => {
    const initAuth = async () => {
      const savedToken = localStorage.getItem('jaei_token');
      const savedUser  = localStorage.getItem('jaei_user');

      if (savedToken && savedUser) {
        try {
          setToken(savedToken);
          setUser(JSON.parse(savedUser));
          // Vérification du token côté serveur
          const res = await authAPI.me();
          setUser(res.data.user);
          localStorage.setItem('jaei_user', JSON.stringify(res.data.user));
        } catch {
          // Token invalide ou expiré
          clearSession();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  // --- Connexion -------------------------------------------
  const login = useCallback(async (email, password) => {
    setError(null);
    try {
      const res = await authAPI.login({ email, password });
      const { token: newToken, user: userData } = res.data;

      localStorage.setItem('jaei_token', newToken);
      localStorage.setItem('jaei_user',  JSON.stringify(userData));

      setToken(newToken);
      setUser(userData);
      return { success: true, user: userData };
    } catch (err) {
      const message = err.response?.data?.message || 'Identifiants incorrects.';
      setError(message);
      return { success: false, message };
    }
  }, []);

  // --- Inscription -----------------------------------------
  const register = useCallback(async (formData) => {
    setError(null);
    try {
      const res = await authAPI.register(formData);
      const { token: newToken, user: userData } = res.data;

      localStorage.setItem('jaei_token', newToken);
      localStorage.setItem('jaei_user',  JSON.stringify(userData));

      setToken(newToken);
      setUser(userData);
      return { success: true, user: userData };
    } catch (err) {
      const message = err.response?.data?.message || 'Erreur lors de l\'inscription.';
      setError(message);
      return { success: false, message };
    }
  }, []);

  // --- Déconnexion -----------------------------------------
  const logout = useCallback(async () => {
    try {
      await authAPI.logout();
    } catch {
      // Pas critique si l'appel échoue
    } finally {
      clearSession();
    }
  }, []);

  // --- Nettoyer la session ---------------------------------
  const clearSession = () => {
    localStorage.removeItem('jaei_token');
    localStorage.removeItem('jaei_user');
    setToken(null);
    setUser(null);
    window.location.href = '/';
  };

  // --- Helpers de rôle -------------------------------------
  const isAdmin    = user?.role === 'admin';
  const isAuthor   = user?.role === 'author';
  const isReviewer = user?.role === 'reviewer';
  const isAuth     = !!token && !!user;

  // --- Redirection post-login selon le rôle ----------------
  const getRedirectPath = (role) => {
    switch (role) {
      case 'admin':    return '/admin/dashboard';
      case 'reviewer': return '/reviewer/dashboard';
      case 'author':
      default:         return '/author/dashboard';
    }
  };

  const value = {
    user,
    token,
    loading,
    error,
    isAuth,
    isAdmin,
    isAuthor,
    isReviewer,
    // camelCase aliases for components that consume firstName / lastName
    firstName: user?.first_name ?? null,
    lastName:  user?.last_name  ?? null,
    login,
    register,
    logout,
    getRedirectPath,
    setError,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook personnalisé
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans un AuthProvider');
  return ctx;
};

export default AuthContext;
