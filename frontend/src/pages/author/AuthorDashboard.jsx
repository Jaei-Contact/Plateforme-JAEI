import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import api from '../../utils/api';

// ============================================================
// AuthorDashboard — JAEI Platform
// Style inspiré ScienceDirect : cards épurées, badges statut,
// tableau d'articles avec filtres par onglets
// ============================================================

// ── Icônes ──────────────────────────────────────────────────

const IconPlus = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
  </svg>
);

const IconArrow = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
  </svg>
);

const IconDoc = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
  </svg>
);

const IconClock = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
  </svg>
);

const IconCheck = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
  </svg>
);

const IconGlobe = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
      d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
  </svg>
);

const IconInfo = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
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

// ── Configuration des statuts (style ScienceDirect badges) ──

const STATUS_CONFIG = {
  submitted:   { label: 'Soumis',       bg: '#F3F4F6', color: '#374151', border: '#D1D5DB' },
  pending:     { label: 'En attente',   bg: '#FFFBEB', color: '#92400E', border: '#FDE68A' },
  under_review:{ label: 'En révision',  bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' },
  revised:     { label: 'Révisé',       bg: '#F5F3FF', color: '#6D28D9', border: '#DDD6FE' },
  accepted:    { label: 'Accepté',      bg: '#F0FDF4', color: '#15803D', border: '#BBF7D0' },
  published:   { label: 'Publié',       bg: '#ECFDF5', color: '#065F46', border: '#A7F3D0' },
  rejected:    { label: 'Rejeté',       bg: '#FEF2F2', color: '#B91C1C', border: '#FECACA' },
};

const StatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.submitted;
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-sm text-xs font-medium"
          style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
      {cfg.label}
    </span>
  );
};


const TABS = [
  { key: 'all',          label: 'Toutes les soumissions' },
  { key: 'under_review', label: 'En révision' },
  { key: 'accepted',     label: 'Acceptés' },
  { key: 'rejected',     label: 'Rejetés' },
];

// ── Page ─────────────────────────────────────────────────────

const AuthorDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('all');
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  const firstName = user?.first_name || user?.email?.split('@')[0] || 'Auteur';

  useEffect(() => {
    api.get('/submissions')
      .then(res => setSubmissions(res.data.submissions || []))
      .catch(() => setSubmissions([]))
      .finally(() => setLoading(false));
  }, []);

  // Stats calculées depuis les vraies données
  const stats = {
    total:       submissions.length,
    in_progress: submissions.filter(s => ['submitted','pending','under_review','revised'].includes(s.status)).length,
    accepted:    submissions.filter(s => s.status === 'accepted').length,
    published:   submissions.filter(s => s.status === 'published').length,
  };

  // Filtre par onglet
  const filtered = activeTab === 'all'
    ? submissions
    : submissions.filter(s => s.status === activeTab);

  const formatDate = (d) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <DashboardLayout title="Tableau de bord Auteur">

      {/* ── Bandeau de bienvenue ─────────────────────────────── */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold" style={{ color: '#111827' }}>
            Bonjour, {firstName}
          </h2>
          <p className="text-sm mt-0.5" style={{ color: '#6B7280' }}>
            Voici un résumé de vos activités sur JAEI.
          </p>
        </div>

        {/* CTA principal — style ScienceDirect "Submit your article" */}
        <Link
          to="/author/submit"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-sm text-sm font-semibold no-underline transition-all"
          style={{ background: 'linear-gradient(90deg, #1B4427 0%, #1E88C8 100%)', color: '#fff', letterSpacing: '0.01em' }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '0.9'; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
        >
          <IconPlus />
          Soumettre un article
        </Link>
      </div>

      {/* ── Statistiques — style ScienceDirect metrics row ──── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total soumissions', value: stats.total,       icon: IconDoc,   accent: '#1E88C8' },
          { label: 'En cours',          value: stats.in_progress, icon: IconClock, accent: '#D97706' },
          { label: 'Acceptés',          value: stats.accepted,    icon: IconCheck, accent: '#15803D' },
          { label: 'Publiés',           value: stats.published,   icon: IconGlobe, accent: '#065F46' },
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

      {/* ── Section articles ─────────────────────────────────── */}
      <div className="bg-white rounded-sm overflow-hidden"
           style={{ border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>

        {/* En-tête section */}
        <div className="px-6 py-4 flex items-center justify-between"
             style={{ borderBottom: '1px solid #F3F4F6' }}>
          <h3 className="text-base font-bold" style={{ color: '#111827' }}>Mes soumissions</h3>
          <Link to="/author/submissions"
                className="inline-flex items-center gap-1 text-sm no-underline font-medium transition-colors"
                style={{ color: '#1E88C8' }}
                onMouseEnter={e => e.currentTarget.style.color = '#1565A8'}
                onMouseLeave={e => e.currentTarget.style.color = '#1E88C8'}>
            Voir tout <IconArrow />
          </Link>
        </div>

        {/* Onglets — style ScienceDirect article tabs */}
        <div className="flex" style={{ borderBottom: '1px solid #E5E7EB' }}>
          {TABS.map(tab => {
            const isActive = tab.key === activeTab;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className="px-5 py-3 text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0"
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

        {/* Liste d'articles — style ScienceDirect article cards */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#1E88C8', borderTopColor: 'transparent' }}></div>
            <span className="ml-3 text-sm" style={{ color: '#6B7280' }}>Chargement…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
                 style={{ background: '#F3F4F6' }}>
              <IconDoc />
            </div>
            <p className="text-sm font-medium" style={{ color: '#374151' }}>
              Aucune soumission dans cette catégorie
            </p>
            <p className="text-sm mt-1 mb-4" style={{ color: '#9CA3AF' }}>
              Commencez par soumettre votre premier article.
            </p>
            <Link to="/author/submit"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-sm text-sm font-semibold no-underline"
                  style={{ background: '#1B4427', color: '#fff' }}>
              <IconPlus /> Soumettre un article
            </Link>
          </div>
        ) : (
          <ul className="divide-y" style={{ borderColor: '#F3F4F6' }}>
            {filtered.map(article => (
              <li key={article.id}
                  className="px-6 py-5 transition-colors"
                  onMouseEnter={e => e.currentTarget.style.background = '#FAFAFA'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>

                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="flex-1 min-w-0">

                    {/* Domain tag + status — style ScienceDirect "Research article" label */}
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-sm"
                            style={{ background: '#F0FDF4', color: '#15803D', border: '1px solid #BBF7D0' }}>
                        {article.research_area || article.domain || '—'}
                      </span>
                      <StatusBadge status={article.status} />
                    </div>

                    {/* Title — style ScienceDirect article title link */}
                    <h4 className="text-sm font-semibold leading-snug mb-1.5"
                        style={{ color: '#1E88C8' }}>
                      {article.title}
                    </h4>

                    {/* Meta info */}
                    <div className="flex flex-wrap items-center gap-3 text-xs" style={{ color: '#9CA3AF' }}>
                      <span>Soumis le {formatDate(article.submitted_at)}</span>
                      {article.co_authors && (
                        <span style={{ borderLeft: '1px solid #E5E7EB', paddingLeft: '0.75rem' }}>
                          Co-auteurs : {article.co_authors}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Link
                      to={`/author/submissions/${article.id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-medium transition-colors no-underline"
                      style={{ background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE' }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#DBEAFE'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = '#EFF6FF'; }}
                    >
                      <IconEye /> Voir
                    </Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ── Encart informatif — Guide de soumission ──────────── */}
      <div className="mt-6 rounded-sm overflow-hidden"
           style={{ background: 'linear-gradient(135deg, #1B4427 0%, #1a5c35 100%)', border: '1px solid #1B4427' }}>
        <div className="px-6 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="flex-shrink-0 mt-0.5" style={{ color: 'rgba(255,255,255,0.7)' }}>
              <IconInfo />
            </span>
            <div>
              <p className="text-sm font-semibold" style={{ color: '#fff' }}>
                Première soumission ?
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.65)' }}>
                Consultez nos instructions aux auteurs et la politique éditoriale avant de soumettre.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <Link to="/author-instructions"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-sm text-xs font-semibold no-underline transition-all"
                  style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.25)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; }}>
              Instructions aux auteurs <IconArrow />
            </Link>
            <Link to="/guide-submission"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-sm text-xs font-semibold no-underline transition-all"
                  style={{ background: '#1E88C8', color: '#fff' }}
                  onMouseEnter={e => { e.currentTarget.style.opacity = '0.9'; }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}>
              Guide de soumission <IconArrow />
            </Link>
          </div>
        </div>
      </div>

    </DashboardLayout>
  );
};

export default AuthorDashboard;
