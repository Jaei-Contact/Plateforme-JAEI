import { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import DashboardLayout from '../components/layout/DashboardLayout';
import api from '../utils/api';

// ── Icônes ──────────────────────────────────────────────────

const IconCamera = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/>
  </svg>
);

const IconEdit = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
  </svg>
);

const IconSave = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M5 13l4 4L19 7"/>
  </svg>
);

const IconClose = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
  </svg>
);

// ── Config rôles ─────────────────────────────────────────────

const ROLE_LABEL = {
  admin:    'Administrator',
  reviewer: 'Reviewer',
  author:   'Author',
};

const ROLE_BADGE = {
  admin:    { bg: '#FEF3C7', color: '#92400E', border: '#FDE68A' },
  reviewer: { bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' },
  author:   { bg: '#F0FDF4', color: '#15803D', border: '#BBF7D0' },
};

// ── Page ─────────────────────────────────────────────────────

const ProfilePage = () => {
  const { user } = useAuth();

  const [editing, setEditing]     = useState(false);
  const [saving, setSaving]       = useState(false);
  const [success, setSuccess]     = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar_url || null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarInputRef = useRef(null);

  const [form, setForm] = useState({
    firstName:    user?.firstName    || '',
    lastName:     user?.lastName     || '',
    institution:  user?.institution  || '',
    country:      user?.country      || '',
  });

  const initials = [user?.firstName, user?.lastName]
    .filter(Boolean)
    .map(s => s[0].toUpperCase())
    .join('') || (user?.email?.[0]?.toUpperCase() || 'U');

  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || '';
  const role     = user?.role || 'author';
  const badge    = ROLE_BADGE[role] || ROLE_BADGE.author;

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Immediate preview
    const objectUrl = URL.createObjectURL(file);
    setAvatarPreview(objectUrl);
    // Upload
    setAvatarUploading(true);
    try {
      const fd = new FormData();
      fd.append('avatar', file);
      await api.post('/auth/me/avatar', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      // silent
    } finally {
      setAvatarUploading(false);
    }
  };

  const formatDate = (d) => d
    ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
    : '—';

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.patch('/auth/me', {
        first_name:  form.firstName,
        last_name:   form.lastName,
        institution: form.institution,
        country:     form.country,
      });
      setSuccess(true);
      setEditing(false);
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      // silencieux
    } finally {
      setSaving(false);
    }
  };

  const Field = ({ label, value }) => (
    <div>
      <p className="text-xs font-medium mb-1" style={{ color: '#6B7280' }}>{label}</p>
      <p className="text-sm" style={{ color: value ? '#111827' : '#9CA3AF' }}>{value || '—'}</p>
    </div>
  );

  const Input = ({ label, field, placeholder }) => (
    <div>
      <label className="block text-xs font-medium mb-1" style={{ color: '#374151' }}>{label}</label>
      <input
        type="text"
        value={form[field]}
        onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-sm rounded-sm outline-none"
        style={{ border: '1px solid #E5E7EB', color: '#111827' }}
        onFocus={e => { e.target.style.borderColor = '#1E88C8'; }}
        onBlur={e => { e.target.style.borderColor = '#E5E7EB'; }}
      />
    </div>
  );

  return (
    <DashboardLayout title="My profile">

      {/* Success notification */}
      {success && (
        <div className="mb-4 px-4 py-3 rounded-sm text-sm font-medium flex items-center gap-2"
             style={{ background: '#F0FDF4', color: '#15803D', border: '1px solid #BBF7D0' }}>
          <IconSave /> Profile updated successfully.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Carte profil gauche */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-sm overflow-hidden"
               style={{ border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>

            {/* Bandeau vert */}
            <div className="h-20" style={{ background: 'linear-gradient(135deg, #1B4427 0%, #1a5c35 100%)' }} />

            {/* Avatar */}
            <div className="px-6 pb-6">
              <div className="-mt-8 mb-4">
                <div className="relative inline-block">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Avatar"
                         className="w-16 h-16 rounded-full object-cover border-4 border-white" />
                  ) : (
                    <div className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold border-4 border-white"
                         style={{ background: '#1B4427', color: '#fff' }}>
                      {initials}
                    </div>
                  )}
                  <button
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={avatarUploading}
                    className="absolute bottom-0 right-0 w-6 h-6 rounded-full flex items-center justify-center"
                    style={{ background: '#1E88C8', color: '#fff', border: '2px solid #fff' }}
                    title="Change photo"
                  >
                    {avatarUploading
                      ? <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                      : <IconCamera />
                    }
                  </button>
                  <input ref={avatarInputRef} type="file" accept="image/*"
                         className="hidden" onChange={handleAvatarChange} />
                </div>
              </div>

              <h3 className="text-base font-bold mb-0.5" style={{ color: '#111827' }}>
                {fullName || '—'}
              </h3>
              <p className="text-xs mb-3" style={{ color: '#6B7280' }}>{user?.email}</p>

              <span className="inline-block px-2.5 py-0.5 rounded-sm text-xs font-medium"
                    style={{ background: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}>
                {ROLE_LABEL[role]}
              </span>

              <div className="mt-4 pt-4" style={{ borderTop: '1px solid #F3F4F6' }}>
                <p className="text-xs" style={{ color: '#9CA3AF' }}>
                  Member since {formatDate(user?.createdAt)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Formulaire droite */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-sm overflow-hidden"
               style={{ border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>

            {/* En-tête */}
            <div className="px-6 py-4 flex items-center justify-between"
                 style={{ borderBottom: '1px solid #F3F4F6' }}>
              <h3 className="text-base font-bold" style={{ color: '#111827' }}>
                Personal information
              </h3>
              {!editing ? (
                <button
                  onClick={() => setEditing(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-medium"
                  style={{ background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#DBEAFE'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#EFF6FF'; }}
                >
                  <IconEdit /> Edit
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditing(false)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-medium"
                    style={{ background: '#F3F4F6', color: '#374151', border: '1px solid #E5E7EB' }}
                  >
                    <IconClose /> Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-medium"
                    style={{
                      background: saving ? '#6B7280' : '#1B4427',
                      color: '#fff',
                      opacity: saving ? 0.7 : 1,
                    }}
                  >
                    <IconSave /> {saving ? 'Saving…' : 'Save'}
                  </button>
                </div>
              )}
            </div>

            {/* Contenu */}
            <div className="px-6 py-6">
              {!editing ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <Field label="First name"  value={user?.firstName} />
                  <Field label="Last name"   value={user?.lastName} />
                  <Field label="Email"       value={user?.email} />
                  <Field label="Institution" value={user?.institution} />
                  <Field label="Country"     value={user?.country} />
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <Input label="First name"  field="firstName"   placeholder="Your first name" />
                  <Input label="Last name"   field="lastName"    placeholder="Your last name" />
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium mb-1" style={{ color: '#374151' }}>Email</label>
                    <input
                      type="email"
                      value={user?.email || ''}
                      disabled
                      className="w-full px-3 py-2 text-sm rounded-sm"
                      style={{ border: '1px solid #E5E7EB', color: '#9CA3AF', background: '#F9FAFB' }}
                    />
                    <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>
                      The email address cannot be changed.
                    </p>
                  </div>
                  <Input label="Institution" field="institution" placeholder="University, laboratory…" />
                  <Input label="Country"     field="country"     placeholder="France, Cameroon…" />
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

    </DashboardLayout>
  );
};

export default ProfilePage;
