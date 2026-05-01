import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';

// Pages Auth
import Login    from './pages/auth/Login';
import Register from './pages/auth/Register';

// Pages Auteur
import AuthorDashboard  from './pages/author/AuthorDashboard';
import SubmitArticle    from './pages/author/SubmitArticle';
import AuthorSubmissions from './pages/author/AuthorSubmissions';
import PaymentPage   from './pages/author/PaymentPage';
import PaymentReturn from './pages/author/PaymentReturn';

// Pages Reviewer
import ReviewerDashboard   from './pages/reviewer/ReviewerDashboard';
import ReviewArticle       from './pages/reviewer/ReviewArticle';
import ReviewerAssignments from './pages/reviewer/ReviewerAssignments';

// Pages Admin
import AdminDashboard       from './pages/admin/AdminDashboard';
import AdminSubmissions     from './pages/admin/AdminSubmissions';
import AdminUsers           from './pages/admin/AdminUsers';
import AdminEditorialBoard  from './pages/admin/AdminEditorialBoard';
import AdminStats           from './pages/admin/AdminStats';

// Page Profil
import ProfilePage from './pages/ProfilePage';

// Page partagée
import SubmissionDetail from './pages/shared/SubmissionDetail';

// Pages publiques
import HomePage           from './pages/public/HomePage';
import ArticlesPage       from './pages/public/ArticlesPage';
import ArticleDetail      from './pages/public/ArticleDetail';
import AboutPage          from './pages/public/AboutPage';
import GuideSubmission    from './pages/public/GuideSubmission';
import AuthorInstructions from './pages/public/AuthorInstructions';
import PrivacyPage        from './pages/public/PrivacyPage';
import TermsPage          from './pages/public/TermsPage';
import CookiesPage        from './pages/public/CookiesPage';

// Auth
import ForgotPassword  from './pages/auth/ForgotPassword';
import ResetPassword   from './pages/auth/ResetPassword';
import CheckInbox      from './pages/auth/CheckInbox';
import VerifyEmail     from './pages/auth/VerifyEmail';

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
          <Route path="/"               element={<HomePage />} />
          <Route path="/articles"       element={<ArticlesPage />} />
          <Route path="/articles/:id"   element={<ArticleDetail />} />
          <Route path="/issues"         element={<ArticlesPage />} />
          <Route path="/about"          element={<AboutPage />} />
          <Route path="/guide-submission"    element={<GuideSubmission />} />
          <Route path="/author-instructions" element={<AuthorInstructions />} />
          <Route path="/editorial-policy"    element={<ComingSoon title="Politique éditoriale" />} />
          <Route path="/review-process"      element={<ComingSoon title="Processus de révision" />} />
          <Route path="/privacy"  element={<PrivacyPage />} />
          <Route path="/terms"    element={<TermsPage />} />
          <Route path="/cookies"  element={<CookiesPage />} />

          {/* ── Auth ────────────────────────────────────────── */}
          <Route path="/login"              element={<Login />} />
          <Route path="/register"           element={<Register />} />
          <Route path="/forgot-password"    element={<ForgotPassword />} />
          <Route path="/reset-password"     element={<ResetPassword />} />
          <Route path="/check-inbox"        element={<CheckInbox />} />
          <Route path="/verify-email"       element={<VerifyEmail />} />

          {/* ── Espace Auteur ────────────────────────────────── */}
          <Route path="/author/dashboard" element={
            <ProtectedRoute allowedRoles={['author']}>
              <AuthorDashboard />
            </ProtectedRoute>
          } />
          <Route path="/author/submit" element={
            <ProtectedRoute allowedRoles={['author']}>
              <SubmitArticle />
            </ProtectedRoute>
          } />
          <Route path="/author/submissions" element={
            <ProtectedRoute allowedRoles={['author']}>
              <AuthorSubmissions />
            </ProtectedRoute>
          } />
          <Route path="/author/submissions/:id" element={
            <ProtectedRoute allowedRoles={['author']}>
              <SubmissionDetail />
            </ProtectedRoute>
          } />
          <Route path="/author/submissions/:id/payment" element={
            <ProtectedRoute allowedRoles={['author']}>
              <PaymentPage />
            </ProtectedRoute>
          } />
          <Route path="/payment/return" element={
            <ProtectedRoute allowedRoles={['author']}>
              <PaymentReturn />
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
              <ReviewerAssignments />
            </ProtectedRoute>
          } />
          <Route path="/reviewer/assignments/:id" element={
            <ProtectedRoute allowedRoles={['reviewer']}>
              <ReviewArticle />
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
              <AdminSubmissions />
            </ProtectedRoute>
          } />
          <Route path="/admin/submissions/:id" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <SubmissionDetail />
            </ProtectedRoute>
          } />
          <Route path="/admin/users" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminUsers />
            </ProtectedRoute>
          } />
          <Route path="/admin/editorial-board" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminEditorialBoard />
            </ProtectedRoute>
          } />
          <Route path="/admin/stats" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminStats />
            </ProtectedRoute>
          } />

          {/* ── Profil ───────────────────────────────────────── */}
          <Route path="/profile" element={
            <ProtectedRoute>
              <ProfilePage />
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
