import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import AssignReviewerModal from '../../components/admin/AssignReviewerModal';
import api from '../../utils/api';

// ── Icônes ──────────────────────────────────────────────────

const IconDoc = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
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

const IconUserPlus = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/>
  </svg>
);

// ── Statuts ──────────────────────────────────────────────────

const STATUS_CONFIG = {
  submitted:    { label: 'Submitted',    bg: '#F3F4F6', color: '#374151', border: '#D1D5DB' },
  pending:      { label: 'Pending',      bg: '#FFFBEB', color: '#92400E', border: '#FDE68A' },
  under_review: { label: 'Under review', bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' },
  revised:      { label: 'Revised',      bg: '#F5F3FF', color: '#6D28D9', border: '#DDD6FE' },
  accepted:     { label: 'Accepted',     bg: '#F0FDF4', color: '#15803D', border: '#BBF7D0' },
  published:    { label: 'Published',    bg: '#ECFDF5', color: '#065F46', border: '#A7F3D0' },
  rejected:     { label: 'Rejected',     bg: '#FEF2F2', color: '#B91C1C', border: '#FECACA' },
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
  { key: 'all',          label: 'All' },
  { key: 'submitted',    label: 'New' },
  { key: 'under_review', label: 'Under review' },
  { key: 'revised',      label: 'Revised' },
  { key: 'accepted',     label: 'Accepted' },
  { key: 'published',    label: 'Published' },
  { key: 'rejected',     label: 'Rejected' },
];

// ── Page ─────────────────────────────────────────────────────

const AdminSubmissions = () => {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [activeTab, setActiveTab]     = useState('all');
  const [search, setSearch]           = useState('');
  const [assignModal, setAssignModal] = useState(null); // submission à assigner

  useEffect(() => {
    api.get('/submissions')
      .then(res => setSubmissions(res.data.submissions || []))
      .catch(() => setSubmissions([]))
      .finally(() => setLoading(false));
  }, []);

  const formatDate = (d) =>
    new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });

  const filtered = submissions
    .filter(s => activeTab === 'all' || s.status === activeTab)
    .filter(s => !search ||
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      (s.author_name || '').toLowerCase().includes(search.toLowerCase())
    );

  const handleStatusChange = async (id, newStatus) => {
    try {
      await api.patch(`/submissions/${id}/status`, { status: newStatus });
      setSubmissions(prev => prev.map(s => s.id === id ? { ...s, status: newStatus } : s));
    } catch {
      // silencieux
    }
  };

  const handleAssigned = (submissionId) => {
    setSubmissions(prev => prev.map(s =>
      s.id === submissionId ? { ...s, status: 'under_review' } : s
    ));
    setAssignModal(null);
  };

  return (
    <DashboardLayout title="Submission management">

      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold" style={{ color: '#111827' }}>All submissions</h2>
          <p className="text-sm mt-0.5" style={{ color: '#6B7280' }}>
            {submissions.length} submission{submissions.length !== 1 ? 's' : ''} total
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="px-3 py-1.5 rounded-sm font-medium"
                style={{ background: '#FFFBEB', color: '#92400E', border: '1px solid #FDE68A' }}>
            {submissions.filter(s => s.status === 'submitted').length} new
          </span>
          <span className="px-3 py-1.5 rounded-sm font-medium"
                style={{ background: '#F5F3FF', color: '#6D28D9', border: '1px solid #DDD6FE' }}>
            {submissions.filter(s => s.status === 'revised').length} revised
          </span>
        </div>
      </div>

      {/* Table card */}
      <div className="bg-white rounded-sm overflow-hidden"
           style={{ border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>

        <div className="px-4 sm:px-6 pt-4 pb-0" style={{ borderBottom: '1px solid #E5E7EB' }}>
          {/* Recherche */}
          <div className="relative mb-4 max-w-sm">
            <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#9CA3AF' }}>
              <IconSearch />
            </span>
            <input
              type="text"
              placeholder="Title or author…"
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
                ? submissions.length
                : submissions.filter(s => s.status === tab.key).length;
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
            <span className="ml-3 text-sm" style={{ color: '#6B7280' }}>Loading…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
                 style={{ background: '#F3F4F6', color: '#9CA3AF' }}>
              <IconDoc />
            </div>
            <p className="text-sm font-medium" style={{ color: '#374151' }}>No submissions found</p>
          </div>
        ) : (
          <ul className="divide-y" style={{ borderColor: '#F3F4F6' }}>
            {filtered.map(s => (
              <li key={s.id}
                  className="px-4 sm:px-6 py-5 transition-colors"
                  onMouseEnter={e => e.currentTarget.style.background = '#FAFAFA'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      {s.research_area && (
                        <span className="text-xs px-2 py-0.5 rounded-sm"
                              style={{ background: '#F0FDF4', color: '#15803D', border: '1px solid #BBF7D0' }}>
                          {s.research_area}
                        </span>
                      )}
                      <StatusBadge status={s.status} />
                    </div>
                    <h4 className="text-sm font-semibold mb-1" style={{ color: '#111827' }}>
                      {s.title}
                    </h4>
                    <div className="flex flex-wrap gap-3 text-xs" style={{ color: '#9CA3AF' }}>
                      <span>Submitted on {formatDate(s.submitted_at)}</span>
                      {s.author_name && (
                        <span style={{ borderLeft: '1px solid #E5E7EB', paddingLeft: '0.75rem' }}>
                          Author: {s.author_name}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions admin */}
                  <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
                    {s.status === 'submitted' && (
                      <button
                        onClick={() => setAssignModal(s)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-medium"
                        style={{ background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE' }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#DBEAFE'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = '#EFF6FF'; }}
                      >
                        <IconUserPlus /> Assign
                      </button>
                    )}
                    {s.status === 'revised' && (
                      <>
                        <button
                          onClick={() => handleStatusChange(s.id, 'accepted')}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-medium"
                          style={{ background: '#F0FDF4', color: '#15803D', border: '1px solid #BBF7D0' }}
                          onMouseEnter={e => { e.currentTarget.style.background = '#DCFCE7'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = '#F0FDF4'; }}
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleStatusChange(s.id, 'rejected')}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-medium"
                          style={{ background: '#FEF2F2', color: '#B91C1C', border: '1px solid #FECACA' }}
                          onMouseEnter={e => { e.currentTarget.style.background = '#FEE2E2'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = '#FEF2F2'; }}
                        >
                          Reject
                        </button>
                      </>
                    )}
                    {s.status === 'accepted' && (
                      <button
                        onClick={() => handleStatusChange(s.id, 'published')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-medium"
                        style={{ background: '#1B4427', color: '#fff' }}
                        onMouseEnter={e => { e.currentTarget.style.opacity = '0.85'; }}
                        onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
                      >
                        Publish
                      </button>
                    )}
                    <Link
                      to={`/admin/submissions/${s.id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-medium no-underline"
                      style={{ background: '#F3F4F6', color: '#374151', border: '1px solid #E5E7EB' }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#E5E7EB'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = '#F3F4F6'; }}
                    >
                      <IconEye /> Details
                    </Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Modal assignation */}
      {assignModal && (
        <AssignReviewerModal
          submission={assignModal}
          onClose={() => setAssignModal(null)}
          onAssigned={() => handleAssigned(assignModal.id)}
        />
      )}

    </DashboardLayout>
  );
};

export default AdminSubmissions;
