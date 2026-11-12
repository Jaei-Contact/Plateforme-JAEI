import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../utils/api';

// ============================================================
// AuthContext — JAEI Platform
// Gestion globale de l'authentification
// ============================================================

const AuthContext = createContext(null);

// Un seul type de compte « membre » (valeur 'author') + 'admin' (équipe éditoriale).
// Un compte enregistré avec l'ancien rôle 'reviewer' est un membre comme les autres.
const normalizeUser = (u) => (u ? { ...u, role: u.role === 'admin' ? 'admin' : 'author' } : u);

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
          setUser(normalizeUser(JSON.parse(savedUser)));
          // Vérification du token côté serveur
          const res = await authAPI.me();
          const me = normalizeUser(res.data.user);
          setUser(me);
          localStorage.setItem('jaei_user', JSON.stringify(me));
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
      const { token: newToken, user: rawUser } = res.data;
      const userData = normalizeUser(rawUser);

      localStorage.setItem('jaei_token', newToken);
      localStorage.setItem('jaei_user',  JSON.stringify(userData));

      setToken(newToken);
      setUser(userData);
      return { success: true, user: userData };
    } catch (err) {
      const data = err.response?.data || {};
      // Serveur endormi ou en train de se réveiller (hébergement gratuit : réveil à froid du backend
      // et de la base) : aucune réponse (délai dépassé, réseau coupé) ou erreur de passerelle / serveur
      // (502, 503, 504, 500…). Ce n'est PAS un refus d'identifiants → simple invitation à réessayer.
      // (Avant : « Invalid credentials. », qui ressemblait à un mot de passe faux.)
      const serverNotReady = !err.response || err.response.status >= 500;
      const message = serverNotReady ? 'Try again!' : (data.message || 'Invalid credentials.');
      setError(message);
      // Cas spécial : email non vérifié → renvoie emailNotVerified + email
      if (data.emailNotVerified) {
        return { success: false, emailNotVerified: true, email: data.email, message };
      }
      return { success: false, message };
    }
  }, []);

  // --- Inscription -----------------------------------------
  // Le register ne connecte plus l'utilisateur automatiquement.
  // Il renvoie { success, email } pour rediriger vers la page check-inbox.
  const register = useCallback(async (formData) => {
    setError(null);
    try {
      const res = await authAPI.register(formData);
      // La réponse contient maintenant { message, email } (pas de token)
      return { success: true, email: res.data.email };
    } catch (err) {
      // Vrai message du backend (email déjà utilisé, trop de tentatives…) si dispo,
      // sinon distingue une panne réseau / réveil du serveur d'une vraie erreur.
      let message;
      if (err.response?.data?.message) {
        message = err.response.data.message;
      } else if (err.code === 'ECONNABORTED' || err.message === 'Network Error' || !err.response) {
        message = 'The server is waking up (free hosting). Please wait ~30 seconds and try again.';
      } else {
        message = 'Registration error. Please try again.';
      }
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
  // Deux profils seulement : administrateur (équipe éditoriale) ou membre.
  // « Reviewer » n'est plus un type de compte : un membre relit quand l'éditeur l'y invite.
  const isAdmin         = user?.role === 'admin';
  const isMember        = !!user && user.role !== 'admin';
  const isAuth          = !!token && !!user;
  const isEmailVerified = user?.email_verified === true;

  // --- Redirection post-login selon le rôle ----------------
  const getRedirectPath = (role) => (role === 'admin' ? '/admin/dashboard' : '/author/dashboard');

  // --- Mise à jour locale du profil (après PATCH /me) --------
  const updateUser = (updatedUser) => {
    const merged = { ...user, ...updatedUser };
    setUser(merged);
    localStorage.setItem('jaei_user', JSON.stringify(merged));
  };

  const value = {
    user,
    token,
    loading,
    error,
    isAuth,
    isAdmin,
    isMember,
    isEmailVerified,
    // camelCase aliases for components that consume firstName / lastName
    firstName: user?.first_name ?? null,
    lastName:  user?.last_name  ?? null,
    login,
    register,
    logout,
    getRedirectPath,
    setError,
    updateUser,
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
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};

export default AuthContext;
