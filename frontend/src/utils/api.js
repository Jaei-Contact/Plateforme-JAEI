import axios from 'axios';

// ============================================================
// Configuration Axios — JAEI Platform
// ============================================================

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

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
  getAll:     (params) => api.get('/submissions', { params }),
  getById:    (id)     => api.get(`/submissions/${id}`),
  create:     (data)   => api.post('/submissions', data),
  update:     (id, data) => api.put(`/submissions/${id}`, data),
  updateStatus: (id, status) => api.patch(`/submissions/${id}/status`, { status }),
  delete:     (id)     => api.delete(`/submissions/${id}`),
  getMine:    ()       => api.get('/submissions/my'),
};

// ============================================================
// Endpoints Articles publiés
// ============================================================
export const articlesAPI = {
  getAll:   (params) => api.get('/articles', { params }),
  getById:  (id)     => api.get(`/articles/${id}`),
  search:   (query)  => api.get('/articles/search', { params: { q: query } }),
};

// ============================================================
// Endpoints Reviews
// ============================================================
export const reviewsAPI = {
  getMyAssignments: () => api.get('/reviews/assigned'),
  getById:          (id) => api.get(`/reviews/${id}`),
  submit:           (id, data) => api.post(`/reviews/${id}`, data),
  assign:           (submissionId, reviewerId) =>
    api.post(`/reviews/assign`, { submissionId, reviewerId }),
};

// ============================================================
// Endpoints Utilisateurs (Admin)
// ============================================================
export const usersAPI = {
  getAll:   ()       => api.get('/users'),
  getById:  (id)     => api.get(`/users/${id}`),
  update:   (id, data) => api.put(`/users/${id}`, data),
  delete:   (id)     => api.delete(`/users/${id}`),
};

export default api;
