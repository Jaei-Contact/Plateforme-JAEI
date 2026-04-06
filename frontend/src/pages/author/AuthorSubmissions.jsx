import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
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

const IconPlus = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
  </svg>
);

// ── Statuts ──────────────────────────────────────────────────

const STATUS_CONFIG = {
  pending:          { label: 'Payment required', bg: '#FEF3C7', color: '#92400E', border: '#FDE68A' },
  submitted:        { label: 'Submitted',        bg: '#F3F4F6', color: '#374151', border: '#D1D5DB' },
  under_review:     { label: 'Under review',     bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' },
  revision_needed:  { label: 'Revision needed',  bg: '#FEF3C7', color: '#D97706', border: '#FDE68A' },
  revised:          { label: 'Revised',          bg: '#F5F3FF', color: '#6D28D9', border: '#DDD6FE' },
  accepted:         { label: 'Accepted',         bg: '#F0FDF4', color: '#15803D', border: '#BBF7D0' },
  published:        { label: 'Published',        bg: '#ECFDF5', color: '#065F46', border: '#A7F3D0' },
  rejected:         { label: 'Rejected',         bg: '#FEF2F2', color: '#B91C1C', border: '#FECACA' },
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
  { key: 'all',             label: 'All' },
  { key: 'pending',         label: 'Payment required' },
  { key: 'submitted',       label: 'Submitted' },
  { key: 'under_review',    label: 'Under review' },
  { key: 'revision_needed', label: 'Revisions' },
  { key: 'accepted',        label: 'Accepted' },
  { key: 'published',       label: 'Published' },
  { key: 'rejected',        label: 'Rejected' },
];

// ── Page ─────────────────────────────────────────────────────

const AuthorSubmissions = () => {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [activeTab, setActiveTab]     = useState('all');
  const [search, setSearch]           = useState('');

  useEffect(() => {
    api.get('/submissions')
      .then(res => setSubmissions(res.data.submissions || []))
      .catch(() => setSubmissions([]))
      .finally(() => setLoading(false));
  }, []);

  const formatDate = (d) =>
    new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  const filtered = submissions
    .filter(s => activeTab === 'all' || s.status === activeTab)
    .filter(s => !search || s.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <DashboardLayout title="My submissions">

      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold" style={{ color: '#111827' }}>My submissions</h2>
          <p className="text-sm mt-0.5" style={{ color: '#6B7280' }}>
            {submissions.length} article{submissions.length !== 1 ? 's' : ''} submitted in total
          </p>
        </div>
        <Link
          to="/author/submit"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-sm text-sm font-semibold no-underline"
          style={{ background: 'linear-gradient(90deg, #1B4427 0%, #1E88C8 100%)', color: '#fff' }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '0.9'; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
        >
          <IconPlus /> Submit an article
        </Link>
      </div>

      {/* Table card */}
      <div className="bg-white rounded-sm overflow-hidden"
           style={{ border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>

        {/* Search bar + tabs */}
        <div className="px-6 pt-4 pb-0" style={{ borderBottom: '1px solid #E5E7EB' }}>
          {/* Search */}
          <div className="relative mb-4 max-w-sm">
            <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#9CA3AF' }}>
              <IconSearch />
            </span>
            <input
              type="text"
              placeholder="Search by title…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-sm outline-none"
              style={{ border: '1px solid #E5E7EB', color: '#111827' }}
              onFocus={e => { e.target.style.borderColor = '#1E88C8'; }}
              onBlur={e => { e.target.style.borderColor = '#E5E7EB'; }}
            />
          </div>

          {/* Tabs */}
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

        {/* List */}
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
            {submissions.length === 0 && (
              <Link to="/author/submit"
                    className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-sm text-sm font-semibold no-underline"
                    style={{ background: '#1B4427', color: '#fff' }}>
                <IconPlus /> Submit my first article
              </Link>
            )}
          </div>
        ) : (
          <ul className="divide-y" style={{ borderColor: '#F3F4F6' }}>
            {filtered.map(s => (
              <li key={s.id}
                  className="px-6 py-5 transition-colors"
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
                      {s.updated_at !== s.submitted_at && (
                        <span style={{ borderLeft: '1px solid #E5E7EB', paddingLeft: '0.75rem' }}>
                          Updated on {formatDate(s.updated_at)}
                        </span>
                      )}
                      {s.co_authors && (
                        <span style={{ borderLeft: '1px solid #E5E7EB', paddingLeft: '0.75rem' }}>
                          Co-authors: {s.co_authors}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Pay button — visible only when status is pending (fee not yet paid) */}
                    {s.status === 'pending' && (
                      <Link
                        to={`/author/submissions/${s.id}/payment`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-semibold no-underline"
                        style={{ background: '#92400E', color: '#fff', border: '1px solid #92400E' }}
                        onMouseEnter={e => { e.currentTarget.style.opacity = '0.85'; }}
                        onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
                      >
                        💳 Pay submission fee
                      </Link>
                    )}
                    <Link
                      to={`/author/submissions/${s.id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-medium no-underline"
                      style={{ background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE' }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#DBEAFE'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = '#EFF6FF'; }}
                    >
                      <IconEye /> View details
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

export default AuthorSubmissions;
