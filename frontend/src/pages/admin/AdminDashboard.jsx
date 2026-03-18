import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';

// ============================================================
// AdminDashboard — JAEI Platform
// Style inspiré ScienceDirect / Elsevier Editorial Manager
// Vue d'ensemble : soumissions, utilisateurs, activité récente
// ============================================================

// ── Icônes ──────────────────────────────────────────────────

const IconDoc = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
  </svg>
);

const IconUsers = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/>
  </svg>
);

const IconGlobe = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
      d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
  </svg>
);

const IconClock = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
  </svg>
);

const IconArrow = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
  </svg>
);

const IconCheck = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
  </svg>
);

const IconX = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
  </svg>
);

const IconAssign = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
  </svg>
);

const IconEye = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
  </svg>
);

const IconChart = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
  </svg>
);

const IconAlert = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
  </svg>
);

const IconActivity = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M13 10V3L4 14h7v7l9-11h-7z"/>
  </svg>
);

// ── Statuts articles ─────────────────────────────────────────

const ARTICLE_STATUS = {
  submitted:    { label: 'Soumis',       bg: '#F3F4F6', color: '#374151', border: '#D1D5DB' },
  pending:      { label: 'En attente',   bg: '#FFFBEB', color: '#92400E', border: '#FDE68A' },
  under_review: { label: 'En révision',  bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' },
  revised:      { label: 'Révisé',       bg: '#F5F3FF', color: '#6D28D9', border: '#DDD6FE' },
  accepted:     { label: 'Accepté',      bg: '#F0FDF4', color: '#15803D', border: '#BBF7D0' },
  published:    { label: 'Publié',       bg: '#ECFDF5', color: '#065F46', border: '#A7F3D0' },
  rejected:     { label: 'Rejeté',       bg: '#FEF2F2', color: '#B91C1C', border: '#FECACA' },
};

const StatusBadge = ({ status }) => {
  const cfg = ARTICLE_STATUS[status] || ARTICLE_STATUS.submitted;
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-sm text-xs font-medium"
          style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
      {cfg.label}
    </span>
  );
};

// ── Données de démonstration ─────────────────────────────────

const DEMO_SUBMISSIONS = [
  {
    id: 1,
    title: 'Impact des pratiques agroforestières sur la biodiversité des sols en zone tropicale humide',
    domain: 'Agroforesterie',
    author: 'Kamga P.',
    submitted_at: '2026-03-10',
    status: 'submitted',
    reviewer: null,
  },
  {
    id: 2,
    title: 'Optimisation de la production aquacole en milieu lacustre : étude comparative au Lac Tchad',
    domain: 'Aquaculture',
    author: 'Ndongo B.',
    submitted_at: '2026-03-08',
    status: 'pending',
    reviewer: null,
  },
  {
    id: 3,
    title: 'Effets des changements climatiques sur la production cacaoyère au Cameroun : analyse sur 20 ans',
    domain: 'Agronomie',
    author: 'Biya N.',
    submitted_at: '2026-03-05',
    status: 'under_review',
    reviewer: 'Dr. Manga F.',
  },
  {
    id: 4,
    title: 'Analyse des effets des engrais organiques sur le rendement du maïs au Cameroun',
    domain: 'Agronomie',
    author: 'Mvondo B.',
    submitted_at: '2026-02-28',
    status: 'accepted',
    reviewer: 'Dr. Owona S.',
  },
  {
    id: 5,
    title: 'Modélisation de la dégradation des terres agricoles en zone semi-aride par télédétection',
    domain: 'Environnement',
    author: 'Manga F.',
    submitted_at: '2026-02-20',
    status: 'published',
    reviewer: 'Dr. Nkemdirim P.',
  },
];

const DEMO_USERS = [
  { id: 1, name: 'Paul Kamga',      email: 'p.kamga@univ-yde.cm',    role: 'author',   joined: '2026-03-10', country: 'Cameroun' },
  { id: 2, name: 'Bernard Ndongo',  email: 'b.ndongo@irad.cm',        role: 'author',   joined: '2026-03-08', country: 'Cameroun' },
  { id: 3, name: 'Dr. François Manga', email: 'f.manga@univ-ngaoundere.cm', role: 'reviewer', joined: '2026-03-01', country: 'Cameroun' },
  { id: 4, name: 'Dr. Sylvie Owona',  email: 's.owona@univ-dschang.cm',  role: 'reviewer', joined: '2026-02-15', country: 'Cameroun' },
  { id: 5, name: 'Martin Mvondo',   email: 'm.mvondo@cifor.org',      role: 'author',   joined: '2026-02-28', country: 'RDC' },
];

const DEMO_ACTIVITY = [
  { id: 1, type: 'published',   text: 'Article #5 publié — "Modélisation de la dégradation des terres..."', time: '09:14' },
  { id: 2, type: 'review',      text: 'Dr. Manga F. a soumis son évaluation pour l\'article #3', time: '08:52' },
  { id: 3, type: 'submission',  text: 'Nouvelle soumission reçue de Paul Kamga (Agroforesterie)', time: '08:30' },
  { id: 4, type: 'register',    text: 'Nouvel utilisateur inscrit : Martin Mvondo (Auteur)', time: 'Hier' },
  { id: 5, type: 'accepted',    text: 'Article #4 accepté pour publication', time: 'Hier' },
];

const ACTIVITY_ICONS = {
  published:  { icon: IconGlobe,    color: '#065F46', bg: '#ECFDF5' },
  review:     { icon: IconCheck,    color: '#1D4ED8', bg: '#EFF6FF' },
  submission: { icon: IconDoc,      color: '#92400E', bg: '#FFFBEB' },
  register:   { icon: IconUsers,    color: '#6D28D9', bg: '#F5F3FF' },
  accepted:   { icon: IconCheck,    color: '#15803D', bg: '#F0FDF4' },
};

const ROLE_BADGE = {
  author:   { label: 'Auteur',       bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' },
  reviewer: { label: 'Évaluateur',   bg: '#F0FDF4', color: '#15803D', border: '#BBF7D0' },
  admin:    { label: 'Admin',        bg: '#FFF7ED', color: '#C2410C', border: '#FED7AA' },
};

const TABS_SUB = [
  { key: 'all',          label: 'Tous' },
  { key: 'submitted',    label: 'Soumis' },
  { key: 'pending',      label: 'En attente' },
  { key: 'under_review', label: 'En révision' },
  { key: 'accepted',     label: 'Acceptés' },
  { key: 'published',    label: 'Publiés' },
];

// ── Page ─────────────────────────────────────────────────────

const AdminDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('all');

  const firstName = user?.first_name || user?.email?.split('@')[0] || 'Administrateur';

  const stats = {
    total_articles: DEMO_SUBMISSIONS.length,
    pending_action: DEMO_SUBMISSIONS.filter(s => ['submitted', 'pending'].includes(s.status)).length,
    published:      DEMO_SUBMISSIONS.filter(s => s.status === 'published').length,
    total_users:    DEMO_USERS.length,
  };

  const filtered = activeTab === 'all'
    ? DEMO_SUBMISSIONS
    : DEMO_SUBMISSIONS.filter(s => s.status === activeTab);

  const formatDate = (d) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <DashboardLayout title="Tableau de bord Administrateur">

      {/* ── Bandeau de bienvenue ─────────────────────────────── */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold" style={{ color: '#111827' }}>
            Bonjour, {firstName}
          </h2>
          <p className="text-sm mt-0.5" style={{ color: '#6B7280' }}>
            Vue d'ensemble de la plateforme JAEI — {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/admin/submissions"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-sm text-sm font-semibold no-underline transition-all"
            style={{ background: '#F3F4F6', color: '#374151', border: '1px solid #E5E7EB' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#E5E7EB'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#F3F4F6'; }}
          >
            <IconDoc />
            Soumissions
          </Link>
          <Link
            to="/admin/users"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-sm text-sm font-semibold no-underline transition-all"
            style={{ background: 'linear-gradient(90deg, #1B4427 0%, #1E88C8 100%)', color: '#fff' }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '0.9'; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
          >
            <IconUsers />
            Utilisateurs
          </Link>
        </div>
      </div>

      {/* ── Alerte si soumissions en attente d'action ─────────── */}
      {stats.pending_action > 0 && (
        <div className="mb-6 flex items-start gap-3 px-4 py-3 rounded-sm"
             style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
          <span className="flex-shrink-0 mt-0.5" style={{ color: '#D97706' }}><IconAlert /></span>
          <div>
            <p className="text-sm font-semibold" style={{ color: '#92400E' }}>
              {stats.pending_action} soumission{stats.pending_action > 1 ? 's' : ''} en attente d'action
            </p>
            <p className="text-xs mt-0.5" style={{ color: '#B45309' }}>
              Ces articles nécessitent l'assignation d'un évaluateur ou une décision éditoriale.
            </p>
          </div>
        </div>
      )}

      {/* ── KPI Cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total articles',       value: stats.total_articles, icon: IconDoc,    accent: '#1E88C8' },
          { label: 'En attente d\'action', value: stats.pending_action, icon: IconClock,  accent: '#D97706' },
          { label: 'Articles publiés',     value: stats.published,      icon: IconGlobe,  accent: '#065F46' },
          { label: 'Utilisateurs inscrits',value: stats.total_users,    icon: IconUsers,  accent: '#6D28D9' },
        ].map(({ label, value, icon: Icon, accent }) => (
          <div key={label}
               className="bg-white rounded-sm px-5 py-4 flex items-center gap-4"
               style={{ border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                 style={{ background: `${accent}18` }}>
              <span style={{ color: accent }}><Icon /></span>
            </div>
            <div>
              <p className="text-2xl font-bold leading-none" style={{ color: '#111827' }}>{value}</p>
              <p className="text-xs mt-1 leading-tight" style={{ color: '#6B7280' }}>{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Grille principale : soumissions + activité ────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">

        {/* ── Gestion des soumissions (2/3) ────────────────────── */}
        <div className="xl:col-span-2 bg-white rounded-sm overflow-hidden"
             style={{ border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>

          <div className="px-6 py-4 flex items-center justify-between"
               style={{ borderBottom: '1px solid #F3F4F6' }}>
            <h3 className="text-base font-bold" style={{ color: '#111827' }}>Gestion des soumissions</h3>
            <Link to="/admin/submissions"
                  className="inline-flex items-center gap-1 text-sm no-underline font-medium"
                  style={{ color: '#1E88C8' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#1565A8'}
                  onMouseLeave={e => e.currentTarget.style.color = '#1E88C8'}>
              Voir tout <IconArrow />
            </Link>
          </div>

          {/* Onglets */}
          <div className="flex overflow-x-auto" style={{ borderBottom: '1px solid #E5E7EB' }}>
            {TABS_SUB.map(tab => {
              const isActive = tab.key === activeTab;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className="px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0"
                  style={{
                    color: isActive ? '#1E88C8' : '#6B7280',
                    borderBottom: isActive ? '2px solid #1E88C8' : '2px solid transparent',
                    background: 'transparent',
                    marginBottom: -1,
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = '#374151'; }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = '#6B7280'; }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Liste */}
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-sm" style={{ color: '#9CA3AF' }}>Aucun article dans cette catégorie</p>
            </div>
          ) : (
            <ul className="divide-y" style={{ borderColor: '#F3F4F6' }}>
              {filtered.map(article => (
                <li key={article.id}
                    className="px-5 py-4 transition-colors"
                    onMouseEnter={e => e.currentTarget.style.background = '#FAFAFA'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>

                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="flex-1 min-w-0">

                      {/* Domain + statut */}
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <span className="text-xs font-medium px-2 py-0.5 rounded-sm"
                              style={{ background: '#F0FDF4', color: '#15803D', border: '1px solid #BBF7D0' }}>
                          {article.domain}
                        </span>
                        <StatusBadge status={article.status} />
                      </div>

                      {/* Titre */}
                      <h4 className="text-sm font-semibold leading-snug mb-1"
                          style={{ color: '#1E88C8' }}>
                        {article.title}
                      </h4>

                      {/* Meta */}
                      <div className="flex flex-wrap items-center gap-3 text-xs" style={{ color: '#9CA3AF' }}>
                        <span>Auteur : {article.author}</span>
                        <span style={{ borderLeft: '1px solid #E5E7EB', paddingLeft: '0.75rem' }}>
                          {formatDate(article.submitted_at)}
                        </span>
                        {article.reviewer && (
                          <span style={{ borderLeft: '1px solid #E5E7EB', paddingLeft: '0.75rem', color: '#6B7280' }}>
                            Éval. : {article.reviewer}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm text-xs font-medium transition-colors"
                        style={{ background: '#F3F4F6', color: '#374151', border: '1px solid #E5E7EB' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#E5E7EB'}
                        onMouseLeave={e => e.currentTarget.style.background = '#F3F4F6'}
                      >
                        <IconEye /> Voir
                      </button>

                      {['submitted', 'pending'].includes(article.status) && (
                        <button
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm text-xs font-semibold transition-colors"
                          style={{ background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#DBEAFE'}
                          onMouseLeave={e => e.currentTarget.style.background = '#EFF6FF'}
                        >
                          <IconAssign /> Assigner
                        </button>
                      )}

                      {article.status === 'under_review' && (
                        <>
                          <button
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-sm text-xs font-semibold transition-colors"
                            style={{ background: '#F0FDF4', color: '#15803D', border: '1px solid #BBF7D0' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#DCFCE7'}
                            onMouseLeave={e => e.currentTarget.style.background = '#F0FDF4'}
                          >
                            <IconCheck /> Accepter
                          </button>
                          <button
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-sm text-xs font-semibold transition-colors"
                            style={{ background: '#FEF2F2', color: '#B91C1C', border: '1px solid #FECACA' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#FEE2E2'}
                            onMouseLeave={e => e.currentTarget.style.background = '#FEF2F2'}
                          >
                            <IconX /> Rejeter
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ── Activité récente (1/3) ───────────────────────────── */}
        <div className="bg-white rounded-sm overflow-hidden"
             style={{ border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>

          <div className="px-5 py-4" style={{ borderBottom: '1px solid #F3F4F6' }}>
            <h3 className="text-base font-bold" style={{ color: '#111827' }}>Activité récente</h3>
          </div>

          <ul className="divide-y" style={{ borderColor: '#F3F4F6' }}>
            {DEMO_ACTIVITY.map(item => {
              const cfg = ACTIVITY_ICONS[item.type] || ACTIVITY_ICONS.submission;
              const Icon = cfg.icon;
              return (
                <li key={item.id} className="px-5 py-3.5 flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                       style={{ background: cfg.bg }}>
                    <span style={{ color: cfg.color }}><Icon /></span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs leading-snug" style={{ color: '#374151' }}>{item.text}</p>
                    <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>{item.time}</p>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="px-5 py-3" style={{ borderTop: '1px solid #F3F4F6' }}>
            <Link to="/admin/stats"
                  className="inline-flex items-center gap-1 text-xs font-medium no-underline"
                  style={{ color: '#1E88C8' }}>
              Voir les statistiques complètes <IconArrow />
            </Link>
          </div>
        </div>
      </div>

      {/* ── Utilisateurs récents ───────────────────────────────── */}
      <div className="bg-white rounded-sm overflow-hidden"
           style={{ border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>

        <div className="px-6 py-4 flex items-center justify-between"
             style={{ borderBottom: '1px solid #F3F4F6' }}>
          <h3 className="text-base font-bold" style={{ color: '#111827' }}>Utilisateurs récents</h3>
          <Link to="/admin/users"
                className="inline-flex items-center gap-1 text-sm no-underline font-medium"
                style={{ color: '#1E88C8' }}
                onMouseEnter={e => e.currentTarget.style.color = '#1565A8'}
                onMouseLeave={e => e.currentTarget.style.color = '#1E88C8'}>
            Gérer les utilisateurs <IconArrow />
          </Link>
        </div>

        {/* Tableau */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid #F3F4F6', background: '#FAFAFA' }}>
                {['Nom', 'Email', 'Rôle', 'Pays', 'Inscrit le', 'Actions'].map(col => (
                  <th key={col}
                      className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                      style={{ color: '#6B7280' }}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DEMO_USERS.map(u => {
                const rb = ROLE_BADGE[u.role] || ROLE_BADGE.author;
                return (
                  <tr key={u.id}
                      className="transition-colors"
                      style={{ borderBottom: '1px solid #F9FAFB' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#FAFAFA'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td className="px-5 py-3 font-medium" style={{ color: '#111827', whiteSpace: 'nowrap' }}>
                      {u.name}
                    </td>
                    <td className="px-5 py-3" style={{ color: '#6B7280' }}>{u.email}</td>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-medium"
                            style={{ background: rb.bg, color: rb.color, border: `1px solid ${rb.border}` }}>
                        {rb.label}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs" style={{ color: '#6B7280' }}>{u.country}</td>
                    <td className="px-5 py-3 text-xs" style={{ color: '#9CA3AF', whiteSpace: 'nowrap' }}>
                      {formatDate(u.joined)}
                    </td>
                    <td className="px-5 py-3">
                      <button
                        className="text-xs font-medium transition-colors"
                        style={{ color: '#1E88C8' }}
                        onMouseEnter={e => e.currentTarget.style.color = '#1565A8'}
                        onMouseLeave={e => e.currentTarget.style.color = '#1E88C8'}
                      >
                        Voir profil
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Accès rapides ─────────────────────────────────────── */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            to: '/admin/submissions',
            icon: IconDoc,
            title: 'Gérer les soumissions',
            desc: 'Assigner, accepter ou rejeter les articles soumis',
            accent: '#1E88C8',
          },
          {
            to: '/admin/users',
            icon: IconUsers,
            title: 'Gérer les utilisateurs',
            desc: 'Consulter, modifier ou désactiver les comptes',
            accent: '#6D28D9',
          },
          {
            to: '/admin/stats',
            icon: IconChart,
            title: 'Statistiques',
            desc: 'Taux d\'acceptation, soumissions par domaine, activité',
            accent: '#065F46',
          },
        ].map(({ to, icon: Icon, title, desc, accent }) => (
          <Link
            key={to}
            to={to}
            className="flex items-start gap-4 px-5 py-4 bg-white rounded-sm no-underline transition-all"
            style={{ border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = accent; e.currentTarget.style.boxShadow = `0 2px 8px ${accent}22`; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)'; }}
          >
            <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                 style={{ background: `${accent}15` }}>
              <span style={{ color: accent }}><Icon /></span>
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: '#111827' }}>{title}</p>
              <p className="text-xs mt-0.5 leading-snug" style={{ color: '#6B7280' }}>{desc}</p>
            </div>
          </Link>
        ))}
      </div>

    </DashboardLayout>
  );
};

export default AdminDashboard;
