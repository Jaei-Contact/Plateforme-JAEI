import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';

// Pages Auth
import Login    from './pages/auth/Login';
import Register from './pages/auth/Register';

// Pages Auteur
import AuthorDashboard from './pages/author/AuthorDashboard';

// Pages Reviewer
import ReviewerDashboard from './pages/reviewer/ReviewerDashboard';

// Pages Admin
import AdminDashboard from './pages/admin/AdminDashboard';

// Pages Placeholder (à développer)
import ComingSoon from './pages/ComingSoon';

// ============================================================
// App — Routing principal JAEI Platform
// ============================================================

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>

          {/* ── Routes publiques ────────────────────────────── */}
          <Route path="/"         element={<ComingSoon title="Accueil JAEI" />} />
          <Route path="/issues"   element={<ComingSoon title="Numéros publiés" />} />
          <Route path="/about"    element={<ComingSoon title="À propos" />} />
          <Route path="/guide-submission"    element={<ComingSoon title="Guide de soumission" />} />
          <Route path="/author-instructions" element={<ComingSoon title="Instructions aux auteurs" />} />
          <Route path="/editorial-policy"    element={<ComingSoon title="Politique éditoriale" />} />
          <Route path="/review-process"      element={<ComingSoon title="Processus de révision" />} />
          <Route path="/privacy"  element={<ComingSoon title="Politique de confidentialité" />} />
          <Route path="/terms"    element={<ComingSoon title="Conditions d'utilisation" />} />
          <Route path="/cookies"  element={<ComingSoon title="Politique cookies" />} />

          {/* ── Auth ────────────────────────────────────────── */}
          <Route path="/login"           element={<Login />} />
          <Route path="/register"        element={<Register />} />
          <Route path="/forgot-password" element={<ComingSoon title="Mot de passe oublié" />} />

          {/* ── Espace Auteur ────────────────────────────────── */}
          <Route path="/author/dashboard" element={
            <ProtectedRoute allowedRoles={['author']}>
              <AuthorDashboard />
            </ProtectedRoute>
          } />
          <Route path="/author/submit" element={
            <ProtectedRoute allowedRoles={['author']}>
              <ComingSoon title="Soumettre un article" />
            </ProtectedRoute>
          } />
          <Route path="/author/submissions" element={
            <ProtectedRoute allowedRoles={['author']}>
              <ComingSoon title="Mes soumissions" />
            </ProtectedRoute>
          } />

          {/* ── Espace Reviewer ─────────────────────────────── */}
          <Route path="/reviewer/dashboard" element={
            <ProtectedRoute allowedRoles={['reviewer']}>
              <ReviewerDashboard />
            </ProtectedRoute>
          } />
          <Route path="/reviewer/assignments" element={
            <ProtectedRoute allowedRoles={['reviewer']}>
              <ComingSoon title="Articles à évaluer" />
            </ProtectedRoute>
          } />

          {/* ── Espace Admin ─────────────────────────────────── */}
          <Route path="/admin/dashboard" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          } />
          <Route path="/admin/submissions" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <ComingSoon title="Gestion des soumissions" />
            </ProtectedRoute>
          } />
          <Route path="/admin/users" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <ComingSoon title="Gestion des utilisateurs" />
            </ProtectedRoute>
          } />

          {/* ── Profil ───────────────────────────────────────── */}
          <Route path="/profile" element={
            <ProtectedRoute>
              <ComingSoon title="Mon profil" />
            </ProtectedRoute>
          } />

          {/* ── 404 ─────────────────────────────────────────── */}
          <Route path="*" element={<Navigate to="/" replace />} />

        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
