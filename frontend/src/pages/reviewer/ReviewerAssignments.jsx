import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import api from '../../utils/api';

// ── Icônes ──────────────────────────────────────────────────

const IconClipboard = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
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

const IconSearch = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
  </svg>
);

const IconEdit = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
  </svg>
);

// ── Statuts ──────────────────────────────────────────────────

const STATUS_CONFIG = {
  submitted:    { label: 'Soumis',      bg: '#F3F4F6', color: '#374151', border: '#D1D5DB' },
  pending:      { label: 'En attente',  bg: '#FFFBEB', color: '#92400E', border: '#FDE68A' },
  under_review: { label: 'En révision', bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' },
  revised:      { label: 'Révisé',      bg: '#F5F3FF', color: '#6D28D9', border: '#DDD6FE' },
  accepted:     { label: 'Accepté',     bg: '#F0FDF4', color: '#15803D', border: '#BBF7D0' },
  published:    { label: 'Publié',      bg: '#ECFDF5', color: '#065F46', border: '#A7F3D0' },
  rejected:     { label: 'Rejeté',      bg: '#FEF2F2', color: '#B91C1C', border: '#FECACA' },
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
  { key: 'all',          label: 'Toutes' },
  { key: 'under_review', label: 'En cours' },
  { key: 'revised',      label: 'Révisés' },
  { key: 'accepted',     label: 'Acceptés' },
  { key: 'published',    label: 'Publiés' },
  { key: 'rejected',     label: 'Rejetés' },
];

// ── Page ─────────────────────────────────────────────────────

const ReviewerAssignments = () => {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [activeTab, setActiveTab]     = useState('all');
  const [search, setSearch]           = useState('');

  useEffect(() => {
    api.get('/submissions')
      .then(res => setAssignments(res.data.submissions || []))
      .catch(() => setAssignments([]))
      .finally(() => setLoading(false));
  }, []);

  const formatDate = (d) =>
    new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });

  const filtered = assignments
    .filter(a => activeTab === 'all' || a.status === activeTab)
    .filter(a => !search || a.title.toLowerCase().includes(search.toLowerCase()));

  const canEvaluate = (status) => status === 'under_review';

  return (
    <DashboardLayout title="Mes évaluations">

      {/* Header */}
      <div className="mb-6">
        <h2 className="text-lg font-bold" style={{ color: '#111827' }}>Articles à évaluer</h2>
        <p className="text-sm mt-0.5" style={{ color: '#6B7280' }}>
          {assignments.length} article{assignments.length !== 1 ? 's' : ''} vous sont assignés
        </p>
      </div>

      {/* Table card */}
      <div className="bg-white rounded-sm overflow-hidden"
           style={{ border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>

        <div className="px-6 pt-4 pb-0" style={{ borderBottom: '1px solid #E5E7EB' }}>
          {/* Recherche */}
          <div className="relative mb-4 max-w-sm">
            <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#9CA3AF' }}>
              <IconSearch />
            </span>
            <input
              type="text"
              placeholder="Rechercher par titre…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-sm outline-none"
              style={{ border: '1px solid #E5E7EB', color: '#111827' }}
              onFocus={e => { e.target.style.borderColor = '#1E88C8'; }}
              onBlur={e => { e.target.style.borderColor = '#E5E7EB'; }}
            />
          </div>

          {/* Onglets */}
          <div className="flex overflow-x-auto">
            {TABS.map(tab => {
              const isActive = tab.key === activeTab;
              const count = tab.key === 'all'
                ? assignments.length
                : assignments.filter(a => a.status === tab.key).length;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className="px-4 py-2.5 text-sm font-medium whitespace-nowrap flex-shrink-0 flex items-center gap-1.5"
                  style={{
                    color: isActive ? '#1E88C8' : '#6B7280',
                    borderBottom: isActive ? '2px solid #1E88C8' : '2px solid transparent',
                    background: 'transparent',
                    marginBottom: -1,
                  }}
                >
                  {tab.label}
                  <span className="text-xs px-1.5 py-0.5 rounded-full"
                        style={{ background: isActive ? '#EFF6FF' : '#F3F4F6', color: isActive ? '#1E88C8' : '#6B7280' }}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Liste */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 rounded-full border-2 animate-spin"
                 style={{ borderColor: '#1E88C8', borderTopColor: 'transparent' }}></div>
            <span className="ml-3 text-sm" style={{ color: '#6B7280' }}>Chargement…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
                 style={{ background: '#F3F4F6', color: '#9CA3AF' }}>
              <IconClipboard />
            </div>
            <p className="text-sm font-medium" style={{ color: '#374151' }}>Aucun article trouvé</p>
            <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>
              L'éditeur vous assignera des articles à évaluer prochainement.
            </p>
          </div>
        ) : (
          <ul className="divide-y" style={{ borderColor: '#F3F4F6' }}>
            {filtered.map(a => (
              <li key={a.id}
                  className="px-6 py-5 transition-colors"
                  onMouseEnter={e => e.currentTarget.style.background = '#FAFAFA'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      {a.research_area && (
                        <span className="text-xs px-2 py-0.5 rounded-sm"
                              style={{ background: '#F0FDF4', color: '#15803D', border: '1px solid #BBF7D0' }}>
                          {a.research_area}
                        </span>
                      )}
                      <StatusBadge status={a.status} />
                    </div>
                    <h4 className="text-sm font-semibold mb-1" style={{ color: '#111827' }}>
                      {a.title}
                    </h4>
                    <div className="flex flex-wrap gap-3 text-xs" style={{ color: '#9CA3AF' }}>
                      <span>Assigné le {formatDate(a.submitted_at)}</span>
                      {a.author_name && (
                        <span style={{ borderLeft: '1px solid #E5E7EB', paddingLeft: '0.75rem' }}>
                          Auteur : {a.author_name}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {canEvaluate(a.status) && (
                      <Link
                        to={`/reviewer/assignments/${a.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-medium no-underline"
                        style={{ background: '#1B4427', color: '#fff' }}
                        onMouseEnter={e => { e.currentTarget.style.opacity = '0.85'; }}
                        onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
                      >
                        <IconEdit /> Évaluer
                      </Link>
                    )}
                    <Link
                      to={`/reviewer/assignments/${a.id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-medium no-underline"
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

    </DashboardLayout>
  );
};

export default ReviewerAssignments;
