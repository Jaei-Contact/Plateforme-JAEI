import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import api from '../../utils/api';

// ============================================================
// AdminStats — JAEI Platform
// Statistiques générales de la plateforme (admin)
// ============================================================

const StatCard = ({ label, value, sub, accent = '#1E88C8', icon }) => (
  <div className="bg-white rounded-sm px-5 py-5 flex items-start gap-4"
       style={{ border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
    <div className="w-10 h-10 rounded-sm flex items-center justify-center flex-shrink-0"
         style={{ background: `${accent}15` }}>
      <span style={{ color: accent }}>{icon}</span>
    </div>
    <div>
      <p className="text-2xl font-bold leading-none" style={{ color: accent }}>{value ?? '—'}</p>
      <p className="text-sm font-medium mt-1" style={{ color: '#374151' }}>{label}</p>
      {sub && <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>{sub}</p>}
    </div>
  </div>
);

const IconUsers = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/>
  </svg>
);
const IconDoc = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
  </svg>
);
const IconCheck = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
  </svg>
);
const IconClock = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
  </svg>
);
const IconStar = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
      d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
  </svg>
);
const IconReviewer = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
  </svg>
);

const STATUS_CONFIG = {
  pending:          { label: 'En attente',          color: '#92400E', bg: '#FFFBEB' },
  submitted:        { label: 'Soumis',              color: '#6B7280', bg: '#F3F4F6' },
  under_review:     { label: 'En évaluation',       color: '#1D4ED8', bg: '#EFF6FF' },
  revised:          { label: 'Révisé',              color: '#6D28D9', bg: '#F5F3FF' },
  revision_needed:  { label: 'Révisions requises',  color: '#D97706', bg: '#FEF3C7' },
  accepted:         { label: 'Accepté',             color: '#15803D', bg: '#F0FDF4' },
  rejected:         { label: 'Rejeté',              color: '#B91C1C', bg: '#FEF2F2' },
  published:        { label: 'Publié',              color: '#1E88C8', bg: '#EFF6FF' },
};

export default function AdminStats() {
  const [users, setUsers]           = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    Promise.allSettled([
      api.get('/users').then(r => r.data.users || []),
      api.get('/submissions').then(r => r.data.submissions || []),
    ]).then(([usersResult, subsResult]) => {
      if (usersResult.status === 'fulfilled') setUsers(usersResult.value);
      if (subsResult.status  === 'fulfilled') setSubmissions(subsResult.value);
    }).finally(() => setLoading(false));
  }, []);

  const authors   = users.filter(u => u.role === 'author').length;
  const reviewers = users.filter(u => u.role === 'reviewer').length;
  const published = submissions.filter(s => s.status === 'published').length;
  const pending   = submissions.filter(s => ['pending', 'submitted', 'under_review', 'revised', 'revision_needed'].includes(s.status)).length;

  // Répartition par statut
  const byStatus = Object.entries(STATUS_CONFIG).map(([key, cfg]) => ({
    key,
    ...cfg,
    count: submissions.filter(s => s.status === key).length,
  }));

  // Soumissions récentes (5 dernières)
  const recent = [...submissions]
    .sort((a, b) => new Date(b.submitted_at || b.created_at) - new Date(a.submitted_at || a.created_at))
    .slice(0, 5);

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  if (loading) return (
    <DashboardLayout>
      <div className="flex items-center justify-center py-24">
        <div className="w-6 h-6 rounded-full border-2 animate-spin"
             style={{ borderColor: '#1E88C8', borderTopColor: 'transparent' }}/>
        <span className="ml-3 text-sm text-neutral-500">Chargement des statistiques…</span>
      </div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout>
      <div className="space-y-7">

        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-neutral-800">Statistiques</h1>
          <p className="text-sm text-neutral-500 mt-0.5">Vue d'ensemble de la plateforme JAEI</p>
        </div>

        {/* ── Chiffres clés ───────────────────────────────────── */}
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-3">Chiffres clés</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard label="Utilisateurs inscrits"  value={users.filter(u => u.role !== 'admin').length}  sub={`${authors} auteurs · ${reviewers} évaluateurs`} accent="#1B4427" icon={<IconUsers />} />
            <StatCard label="Soumissions totales"     value={submissions.length} sub={`${pending} en attente de décision`}  accent="#1E88C8" icon={<IconDoc />} />
            <StatCard label="Articles publiés"        value={published}          sub="Accessibles au public"                 accent="#15803D" icon={<IconCheck />} />
          </div>
        </div>

        {/* ── Répartition des soumissions ─────────────────────── */}
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-3">Répartition par statut</h2>
          <div className="bg-white rounded-sm overflow-hidden"
               style={{ border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            {byStatus.map(({ key, label, color, bg, count }) => {
              const pct = submissions.length > 0 ? Math.round((count / submissions.length) * 100) : 0;
              return (
                <div key={key} className="flex items-center gap-4 px-5 py-3.5"
                     style={{ borderBottom: '1px solid #F3F4F6' }}>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-sm text-xs font-medium w-40 flex-shrink-0"
                        style={{ background: bg, color }}>
                    {label}
                  </span>
                  <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: '#F3F4F6' }}>
                    <div className="h-full rounded-full transition-all duration-500"
                         style={{ width: `${pct}%`, background: color }}/>
                  </div>
                  <span className="text-sm font-bold w-8 text-right" style={{ color }}>{count}</span>
                  <span className="text-xs w-8 text-right" style={{ color: '#9CA3AF' }}>{pct}%</span>
                </div>
              );
            })}
            {submissions.length === 0 && (
              <div className="px-5 py-10 text-center text-sm text-neutral-400">
                Aucune soumission enregistrée pour le moment.
              </div>
            )}
          </div>
        </div>

        {/* ── Soumissions récentes ────────────────────────────── */}
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-3">Soumissions récentes</h2>
          <div className="bg-white rounded-sm overflow-hidden"
               style={{ border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            {recent.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-neutral-400">Aucune soumission.</div>
            ) : (
              <ul className="divide-y divide-neutral-50">
                {recent.map(s => {
                  const cfg = STATUS_CONFIG[s.status] || STATUS_CONFIG.submitted;
                  return (
                    <li key={s.id} className="px-5 py-3.5 flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-neutral-800 truncate">
                          {s.title || `Soumission #${s.id}`}
                        </p>
                        <p className="text-xs text-neutral-400 mt-0.5">
                          {s.author_name || '—'} · {fmtDate(s.submitted_at || s.created_at)}
                        </p>
                      </div>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-sm text-xs font-medium flex-shrink-0"
                            style={{ background: cfg.bg, color: cfg.color }}>
                        {cfg.label}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
