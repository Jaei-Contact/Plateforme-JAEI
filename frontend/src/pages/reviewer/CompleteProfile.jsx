import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';

// ============================================================
// CompleteProfile — fiche obligatoire pour un reviewer invité par
// email (Remarque 4, 27/09). Tant que profile_completed est FALSE,
// ProtectedRoute redirige systématiquement ici (voir ProtectedRoute.jsx).
// Objectif client : constituer une vraie base de données de reviewers
// (titre, institution, pays, domaines) au lieu du simple nom+email
// saisi à l'invitation.
// ============================================================

const TITLES = ['M.', 'Mme', 'Dr.', 'Prof.'];

const CompleteProfile = () => {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title:         '',
    first_name:    user?.firstName || '',
    last_name:     user?.lastName  || '',
    institution:   '',
    country:       '',
    research_area: '',
  });
  const [error, setError]     = useState('');
  const [saving, setSaving]   = useState(false);

  const set = (field, value) => { setError(''); setForm(prev => ({ ...prev, [field]: value })); };

  const domainCount = form.research_area.split(',').map(d => d.trim()).filter(Boolean).length;

  const validate = () => {
    if (!TITLES.includes(form.title))        return 'Please select a title.';
    if (!form.first_name.trim())             return 'First name is required.';
    if (!form.last_name.trim())              return 'Last name is required.';
    if (!form.institution.trim())            return 'Institution is required.';
    if (!form.country.trim())                return 'Country is required.';
    if (domainCount < 3)                     return 'Please provide at least 3 research domains, separated by commas.';
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }
    setSaving(true); setError('');
    try {
      const res = await api.post('/auth/complete-profile', form);
      updateUser(res.data.user);
      navigate('/reviewer/dashboard', { replace: true });
    } catch (err2) {
      setError(err2.response?.data?.message || 'Error saving your profile. Please try again.');
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col page-enter" style={{ background: '#F5F7FA' }}>

      {/* Header */}
      <header style={{ background: '#1B4427', borderBottom: '3px solid #1E88C8' }}>
        <div className="h-12 flex items-center justify-between px-6">
          <span className="flex items-center gap-2.5">
            <img src="/logo-jaei.jpeg" alt="JAEI" className="h-8 w-auto object-contain flex-shrink-0" />
            <span className="text-white font-bold text-sm tracking-wide">JAEI</span>
          </span>
          <button onClick={logout} className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.75)', background: 'none', border: 'none', cursor: 'pointer' }}>
            Log out
          </button>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg">
          <div className="bg-white rounded-sm overflow-hidden"
               style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.06)', border: '1px solid #E5E7EB' }}>

            <div className="px-8 pt-8 pb-6" style={{ borderBottom: '1px solid #F3F4F6' }}>
              <h2 className="font-bold mb-1" style={{ color: '#1a1a1a', fontSize: '1.25rem' }}>
                Complete your reviewer profile
              </h2>
              <p className="text-sm" style={{ color: '#6B7280' }}>
                Before you can access manuscripts, please complete your information below.
                This is required only once.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="px-8 py-7">
              {error && (
                <div className="mb-5 p-3 rounded-sm text-sm" style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C' }}>
                  {error}
                </div>
              )}

              <div className="grid grid-cols-3 gap-3 mb-4">
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: '#374151' }}>Title *</label>
                  <select value={form.title} onChange={e => set('title', e.target.value)}
                    className="w-full px-3 py-2.5 rounded-sm text-sm outline-none"
                    style={{ border: '1px solid #D1D5DB', color: form.title ? '#111' : '#9CA3AF' }}>
                    <option value="">—</option>
                    {TITLES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: '#374151' }}>First name *</label>
                  <input value={form.first_name} onChange={e => set('first_name', e.target.value)}
                    className="w-full px-3 py-2.5 rounded-sm text-sm outline-none" style={{ border: '1px solid #D1D5DB' }} />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: '#374151' }}>Last name *</label>
                  <input value={form.last_name} onChange={e => set('last_name', e.target.value)}
                    className="w-full px-3 py-2.5 rounded-sm text-sm outline-none" style={{ border: '1px solid #D1D5DB' }} />
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-xs font-semibold mb-1.5" style={{ color: '#374151' }}>Email</label>
                <input value={user?.email || ''} disabled
                  className="w-full px-3 py-2.5 rounded-sm text-sm outline-none"
                  style={{ border: '1px solid #E5E7EB', background: '#F9FAFB', color: '#9CA3AF' }} />
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: '#374151' }}>Institution *</label>
                  <input value={form.institution} onChange={e => set('institution', e.target.value)}
                    placeholder="University, laboratory…"
                    className="w-full px-3 py-2.5 rounded-sm text-sm outline-none" style={{ border: '1px solid #D1D5DB' }} />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: '#374151' }}>Country *</label>
                  <input value={form.country} onChange={e => set('country', e.target.value)}
                    placeholder="France, Cameroon…"
                    className="w-full px-3 py-2.5 rounded-sm text-sm outline-none" style={{ border: '1px solid #D1D5DB' }} />
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-xs font-semibold mb-1.5" style={{ color: '#374151' }}>
                  Research domain(s) *
                  <span className="font-normal ml-1.5" style={{ color: '#9CA3AF' }}>at least 3, separated by commas</span>
                </label>
                <input value={form.research_area} onChange={e => set('research_area', e.target.value)}
                  placeholder="e.g. Agroecology, Soil Science, Plant Pathology"
                  className="w-full px-3 py-2.5 rounded-sm text-sm outline-none" style={{ border: '1px solid #D1D5DB' }} />
                <p className="text-xs mt-1.5" style={{ color: domainCount < 3 ? '#DC2626' : '#9CA3AF' }}>
                  {domainCount} domain{domainCount !== 1 ? 's' : ''} (min 3)
                </p>
              </div>

              <button type="submit" disabled={saving}
                className="w-full py-3 rounded-sm text-sm font-semibold text-white"
                style={{ background: '#1B4427', opacity: saving ? 0.6 : 1, cursor: saving ? 'wait' : 'pointer' }}>
                {saving ? 'Saving…' : 'Save and continue'}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CompleteProfile;
