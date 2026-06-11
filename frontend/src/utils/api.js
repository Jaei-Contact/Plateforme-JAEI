import axios from 'axios';

// ============================================================
// Configuration Axios — JAEI Platform
// ============================================================

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  // 60s : le backend Render (plan gratuit) se met en veille et peut mettre
  // ~50s à se réveiller au 1er appel. 15s provoquait des "Unable to load".
  timeout: 60000,
});
// NB : pas de Content-Type global. Axios pose lui-même 'application/json'
// pour les objets, et 'multipart/form-data; boundary=…' pour les FormData
// (uploads avatar + PDF). Forcer du JSON ici cassait tous les uploads de
// fichiers (multer ne recevait pas req.file).

// --- Intercepteur Request : injecte le token JWT -------------
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('jaei_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// --- Intercepteur Response : gère les erreurs globales -------
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const isAuthRoute = error.config?.url?.includes('/auth/login') ||
                          error.config?.url?.includes('/auth/register');
      // Rediriger seulement si c'est un token expiré, pas un échec de login
      if (!isAuthRoute && localStorage.getItem('jaei_token')) {
        localStorage.removeItem('jaei_token');
        localStorage.removeItem('jaei_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ============================================================
// Endpoints Auth
// ============================================================
export const authAPI = {
  login:    (data)  => api.post('/auth/login', data),
  register: (data)  => api.post('/auth/register', data),
  logout:   ()      => api.post('/auth/logout'),
  me:       ()      => api.get('/auth/me'),
};

// ============================================================
// Endpoints Soumissions
// ============================================================
export const submissionsAPI = {
  // GET /submissions — renvoie les siennes (auteur), les assignées (reviewer) ou toutes (admin)
  getAll:       (params) => api.get('/submissions', { params }),
  getById:      (id)     => api.get(`/submissions/${id}`),
  create:       (data)   => api.post('/submissions', data),
  // PATCH (pas PUT) — seuls les champs envoyés sont modifiés
  update:       (id, data) => api.patch(`/submissions/${id}`, data),
  updateStatus: (id, status, editor_comment) =>
    api.patch(`/submissions/${id}/status`, { status, editor_comment }),
  delete:       (id)     => api.delete(`/submissions/${id}`),
};

// ============================================================
// Endpoints Articles publiés
// ============================================================
export const articlesAPI = {
  // q= pour la recherche plein texte, domain= pour filtrer par domaine
  getAll:  (params) => api.get('/articles', { params }),
  getById: (id)     => api.get(`/articles/${id}`),
  rate:    (id, rating) => api.post(`/articles/${id}/rate`, { rating }),
};

// ============================================================
// Endpoints Reviews
// ============================================================
export const reviewsAPI = {
  // Reviewer : soumissions assignées via GET /submissions (role reviewer)
  getMyAssignments: ()          => api.get('/submissions'),
  // Récupérer une review par soumission (reviewer)
  getBySubmission:  (submissionId) =>
    api.get(`/reviews/by-submission/${submissionId}`),
  // Soumettre une évaluation
  submit:    (reviewId, data)   => api.post(`/reviews/${reviewId}/submit`, data),
  // Assigner un reviewer à une soumission (admin)
  assign:    (submission_id, reviewer_id) =>
    api.post('/reviews/assign', { submission_id, reviewer_id }),
  // Toutes les reviews d'une soumission (admin + auteur)
  getForSubmission: (submissionId) =>
    api.get(`/reviews/submission/${submissionId}`),
  // Liste des reviewers disponibles (admin)
  getReviewers: () => api.get('/reviews/reviewers'),
};

// ============================================================
// Endpoints Utilisateurs (Admin)
// ============================================================
export const usersAPI = {
  getAll:  ()           => api.get('/users'),
  getById: (id)         => api.get(`/users/${id}`),
  update:  (id, data)   => api.patch(`/users/${id}`, data),
  delete:  (id)         => api.delete(`/users/${id}`),
};

export default api;
