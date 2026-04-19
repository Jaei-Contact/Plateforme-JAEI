import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import api from '../../utils/api';

// ── Icônes ──────────────────────────────────────────────────

const IconSearch = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
  </svg>
);

const IconUsers = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/>
  </svg>
);

const IconTrash = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
  </svg>
);

// ── Config rôles ─────────────────────────────────────────────

const ROLE_CONFIG = {
  admin:    { label: 'Administrator', bg: '#FEF3C7', color: '#92400E', border: '#FDE68A' },
  reviewer: { label: 'Reviewer',      bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' },
  author:   { label: 'Author',        bg: '#F0FDF4', color: '#15803D', border: '#BBF7D0' },
};

const RoleBadge = ({ role }) => {
  const cfg = ROLE_CONFIG[role] || ROLE_CONFIG.author;
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-sm text-xs font-medium"
          style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
      {cfg.label}
    </span>
  );
};

const TABS = [
  { key: 'all',      label: 'All' },
  { key: 'author',   label: 'Authors' },
  { key: 'reviewer', label: 'Reviewers' },
  { key: 'admin',    label: 'Admins' },
];

// Domaines de spécialité (même liste que Register + ArticlesPage)
const SPECIALTIES = [
  'Agronomy', 'Agroforestry', 'Plant genetics', 'Crop production', 'Soil science',
  'Plant pathology', 'Rural engineering & Hydraulics', 'Rural development',
  'Aquaculture & Fisheries', 'Animal nutrition', 'Animal production',
  'Veterinary parasitology', 'Animal husbandry',
  'Ecology', 'Environment & Pollution', 'Climate change & Agriculture', 'Forestry',
  'Natural resource management', 'Water sciences',
  'Agricultural biotechnology', 'Soil microbiology', 'Agricultural economics',
];

// ── Modale de confirmation ────────────────────────────────────

const ConfirmModal = ({ user, onConfirm, onCancel, deleting, error }) => (
  <div className="fixed inset-0 flex items-center justify-center z-50 px-4"
       style={{ background: 'rgba(0,0,0,0.4)' }}>
    <div className="bg-white rounded-sm w-full max-w-sm overflow-hidden"
         style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.18)', border: '1px solid #E5E7EB' }}>
      <div className="px-6 py-5" style={{ borderBottom: '1px solid #F3F4F6' }}>
        <h3 className="text-base font-bold" style={{ color: '#111827' }}>Delete this user?</h3>
        <p className="text-sm mt-1" style={{ color: '#6B7280' }}>
          <strong style={{ color: '#111827' }}>
            {[user.first_name, user.last_name].filter(Boolean).join(' ') || user.email}
          </strong>{' '}
          ({user.email}) will be permanently removed. This action cannot be undone.
        </p>
      </div>
      {error && (
        <div className="px-6 py-2 text-sm" style={{ color: '#DC2626', background: '#FEF2F2', borderTop: '1px solid #FECACA' }}>
          {error}
        </div>
      )}
      <div className="px-6 py-4 flex justify-end gap-3">
        <button
          onClick={onCancel}
          disabled={deleting}
          className="px-4 py-2 text-sm font-medium rounded-sm"
          style={{ background: '#F3F4F6', color: '#374151', border: '1px solid #E5E7EB' }}
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={deleting}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-sm text-white"
          style={{ background: deleting ? '#6B7280' : '#DC2626', opacity: deleting ? 0.7 : 1 }}
        >
          {deleting
            ? <><div className="w-3.5 h-3.5 rounded-full border border-white border-t-transparent animate-spin" /> Deleting…</>
            : <><IconTrash /> Delete</>
          }
        </button>
      </div>
    </div>
  </div>
);

// ── Page ─────────────────────────────────────────────────────

const AdminUsers = () => {
  const [users, setUsers]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [activeTab, setActiveTab]   = useState('all');
  const [search, setSearch]         = useState('');
  const [specialty, setSpecialty]   = useState('');
  const [changing, setChanging]     = useState(null);
  const [toDelete, setToDelete]     = useState(null); // user object à supprimer
  const [deleting, setDeleting]     = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    api.get('/users')
      .then(res => setUsers(res.data.users || []))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  }, []);

  const formatDate = (d) =>
    new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  const filtered = users
    .filter(u => activeTab === 'all' ? u.role !== 'admin' : u.role === activeTab)
    .filter(u => !search ||
      `${u.first_name} ${u.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
    )
    .filter(u => !specialty || u.research_area === specialty);

  const handleRoleChange = async (userId, newRole) => {
    setChanging(userId);
    try {
      await api.patch(`/users/${userId}/role`, { role: newRole });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
    } catch {
      // silencieux
    } finally {
      setChanging(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!toDelete) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await api.delete(`/users/${toDelete.id}`);
      setUsers(prev => prev.filter(u => u.id !== toDelete.id));
      setToDelete(null);
    } catch (err) {
      setDeleteError(err.response?.data?.message || 'Deletion failed. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const getInitials = (u) =>
    [u.first_name, u.last_name].filter(Boolean).map(s => s[0].toUpperCase()).join('') || u.email[0].toUpperCase();

  const stats = {
    total:     users.length,
    authors:   users.filter(u => u.role === 'author').length,
    reviewers: users.filter(u => u.role === 'reviewer').length,
    admins:    users.filter(u => u.role === 'admin').length,
  };

  return (
    <DashboardLayout title="User management">

      {/* Modal confirmation suppression */}
      {toDelete && (
        <ConfirmModal
          user={toDelete}
          onConfirm={handleDeleteConfirm}
          onCancel={() => { setToDelete(null); setDeleteError(''); }}
          deleting={deleting}
          error={deleteError}
        />
      )}

      {/* Header + stats */}
      <div className="mb-6">
        <h2 className="text-lg font-bold mb-4" style={{ color: '#111827' }}>Users</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total',      value: stats.total,     accent: '#1E88C8' },
            { label: 'Authors',    value: stats.authors,   accent: '#15803D' },
            { label: 'Reviewers',  value: stats.reviewers, accent: '#1D4ED8' },
            { label: 'Admins',     value: stats.admins,    accent: '#92400E' },
          ].map(({ label, value, accent }) => (
            <div key={label}
                 className="bg-white rounded-sm px-5 py-4"
                 style={{ border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <p className="text-2xl font-bold leading-none" style={{ color: accent }}>{value}</p>
              <p className="text-xs mt-1" style={{ color: '#6B7280' }}>{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Table card */}
      <div className="bg-white rounded-sm overflow-hidden"
           style={{ border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>

        <div className="px-6 pt-4 pb-0" style={{ borderBottom: '1px solid #E5E7EB' }}>

          {/* Barre de recherche + filtre spécialité */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            {/* Recherche */}
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#9CA3AF' }}>
                <IconSearch />
              </span>
              <input
                type="text"
                placeholder="Name or email…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm rounded-sm outline-none"
                style={{ border: '1px solid #E5E7EB', color: '#111827' }}
                onFocus={e => { e.target.style.borderColor = '#1E88C8'; }}
                onBlur={e => { e.target.style.borderColor = '#E5E7EB'; }}
              />
            </div>

            {/* Filtre spécialité */}
            <select
              value={specialty}
              onChange={e => setSpecialty(e.target.value)}
              className="text-sm py-2 pl-3 pr-8 rounded-sm outline-none appearance-none"
              style={{
                border: specialty ? '1px solid #1E88C8' : '1px solid #E5E7EB',
                color: specialty ? '#1E88C8' : '#6B7280',
                background: specialty ? '#EFF6FF' : '#fff',
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239CA3AF'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 0.5rem center',
                backgroundSize: '0.875rem',
              }}
            >
              <option value="">All specialties</option>
              {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>

            {/* Reset filters */}
            {(search || specialty) && (
              <button
                onClick={() => { setSearch(''); setSpecialty(''); }}
                className="text-xs px-3 py-2 rounded-sm"
                style={{ color: '#DC2626', border: '1px solid #FCA5A5', background: '#FEF2F2' }}
              >
                Clear
              </button>
            )}
          </div>

          {/* Onglets */}
          <div className="flex overflow-x-auto">
            {TABS.map(tab => {
              const isActive = tab.key === activeTab;
              const count = tab.key === 'all'
                ? users.filter(u => u.role !== 'admin').length
                : users.filter(u => u.role === tab.key).length;
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
              <IconUsers />
            </div>
            <p className="text-sm font-medium" style={{ color: '#374151' }}>No users found</p>
          </div>
        ) : (
          <ul className="divide-y" style={{ borderColor: '#F3F4F6' }}>
            {filtered.map(u => (
              <li key={u.id}
                  className="px-4 sm:px-6 py-4 transition-colors"
                  onMouseEnter={e => e.currentTarget.style.background = '#FAFAFA'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">

                  {/* Info utilisateur */}
                  <div className="flex items-center gap-3">
                    {u.avatar_url ? (
                      <img src={u.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                           style={{ background: '#1B4427', color: '#fff' }}>
                        {getInitials(u)}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-semibold" style={{ color: '#111827' }}>
                        {[u.first_name, u.last_name].filter(Boolean).join(' ') || '—'}
                      </p>
                      <p className="text-xs" style={{ color: '#6B7280' }}>{u.email}</p>
                      {u.institution && (
                        <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>{u.institution}</p>
                      )}
                      {u.research_area && (
                        <span className="inline-block mt-0.5 text-xxs px-1.5 py-0.5 rounded"
                              style={{ background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE' }}>
                          {u.research_area}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Date + actions */}
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-xs" style={{ color: '#9CA3AF' }}>
                      {formatDate(u.created_at)}
                    </span>

                    {/* Sélecteur de rôle */}
                    <div className="relative">
                      <select
                        value={u.role}
                        onChange={e => handleRoleChange(u.id, e.target.value)}
                        disabled={changing === u.id}
                        className="text-xs py-1.5 pl-2 pr-6 rounded-sm outline-none appearance-none cursor-pointer"
                        style={{
                          border: '1px solid #E5E7EB',
                          color: '#374151',
                          background: '#fff',
                          opacity: changing === u.id ? 0.6 : 1,
                        }}
                      >
                        <option value="author">Author</option>
                        <option value="reviewer">Reviewer</option>
                        <option value="admin">Admin</option>
                      </select>
                      {changing === u.id && (
                        <span className="absolute right-1.5 top-1/2 -translate-y-1/2">
                          <div className="w-3 h-3 rounded-full border animate-spin"
                               style={{ borderColor: '#1E88C8', borderTopColor: 'transparent' }}></div>
                        </span>
                      )}
                    </div>

                    {/* Bouton supprimer */}
                    <button
                      onClick={() => setToDelete(u)}
                      className="p-1.5 rounded-sm transition-colors"
                      style={{ color: '#9CA3AF', border: '1px solid #E5E7EB' }}
                      onMouseEnter={e => {
                        e.currentTarget.style.color = '#DC2626';
                        e.currentTarget.style.borderColor = '#FCA5A5';
                        e.currentTarget.style.background = '#FEF2F2';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.color = '#9CA3AF';
                        e.currentTarget.style.borderColor = '#E5E7EB';
                        e.currentTarget.style.background = 'transparent';
                      }}
                      title="Delete user"
                    >
                      <IconTrash />
                    </button>
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

export default AdminUsers;
