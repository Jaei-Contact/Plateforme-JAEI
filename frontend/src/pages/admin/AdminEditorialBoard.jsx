import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import api from '../../utils/api';

// ============================================================
// AdminEditorialBoard — JAEI Platform
// Gestion du comité éditorial (admin)
// ============================================================

const ROLES = ['Rédacteur en chef', 'Rédacteurs associés', 'Comité scientifique'];

const EMPTY_FORM = { role: ROLES[0], name: '', affiliation: '', sort_order: 0 };

const IconPlus = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
  </svg>
);
const IconEdit = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 2.828L11.828 15.828a2 2 0 01-1.414.586H9v-2a2 2 0 01.586-1.414z"/>
  </svg>
);
const IconTrash = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M8 7V5a1 1 0 011-1h6a1 1 0 011 1v2"/>
  </svg>
);
const IconClose = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
  </svg>
);

// ── Initiales pour l'avatar ───────────────────────────────────
const initials = (name) => name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

export default function AdminEditorialBoard() {
  const [groups, setGroups]       = useState([]);   // [{ role, members }]
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [editId, setEditId]       = useState(null);
  const [saving, setSaving]       = useState(false);
  const [deleting, setDeleting]   = useState(null);
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState('');

  const fetchBoard = async () => {
    try {
      const { data } = await api.get('/editorial-board');
      setGroups(data.data);
    } catch {
      setError('Impossible de charger le comité éditorial.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBoard(); }, []);

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setEditId(null);
    setShowForm(true);
    setError('');
  };

  const openEdit = (member) => {
    setForm({ role: member.role, name: member.name, affiliation: member.affiliation || '', sort_order: member.sort_order });
    setEditId(member.id);
    setShowForm(true);
    setError('');
  };

  const closeForm = () => { setShowForm(false); setEditId(null); setForm(EMPTY_FORM); };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Le nom est requis.'); return; }
    setSaving(true);
    setError('');
    try {
      if (editId) {
        await api.put(`/editorial-board/${editId}`, form);
        setSuccess('Membre mis à jour.');
      } else {
        await api.post('/editorial-board', form);
        setSuccess('Membre ajouté.');
      }
      await fetchBoard();
      closeForm();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la sauvegarde.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer ce membre du comité éditorial ?')) return;
    setDeleting(id);
    try {
      await api.delete(`/editorial-board/${id}`);
      setSuccess('Membre supprimé.');
      await fetchBoard();
      setTimeout(() => setSuccess(''), 3000);
    } catch {
      setError('Erreur lors de la suppression.');
    } finally {
      setDeleting(null);
    }
  };

  const totalMembers = groups.reduce((acc, g) => acc + g.members.length, 0);

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-neutral-800">Comité éditorial</h1>
            <p className="text-sm text-neutral-500 mt-0.5">
              {totalMembers === 0 ? 'Aucun membre enregistré' : `${totalMembers} membre${totalMembers > 1 ? 's' : ''}`}
            </p>
          </div>
          <button onClick={openAdd}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-sm text-sm font-semibold text-white transition-opacity hover:opacity-90"
                  style={{ background: 'linear-gradient(90deg, #1B4427, #1E88C8)' }}>
            <IconPlus /> Ajouter un membre
          </button>
        </div>

        {/* Feedback banners */}
        {success && (
          <div className="flex items-center gap-2 p-3 rounded-sm text-sm"
               style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', color: '#15803D' }}>
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
            </svg>
            {success}
          </div>
        )}
        {error && !showForm && (
          <div className="flex items-center gap-2 p-3 rounded-sm text-sm"
               style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#B91C1C' }}>
            {error}
          </div>
        )}

        {/* ── Formulaire add/edit ────────────────────────────── */}
        {showForm && (
          <div className="bg-white border border-neutral-200 rounded-sm overflow-hidden"
               style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
            <div className="px-6 py-4 flex items-center justify-between"
                 style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
              <h2 className="text-sm font-bold text-neutral-700">
                {editId ? 'Modifier le membre' : 'Ajouter un membre'}
              </h2>
              <button onClick={closeForm} className="text-neutral-400 hover:text-neutral-600 transition-colors">
                <IconClose />
              </button>
            </div>

            <form onSubmit={handleSave} className="px-6 py-5 space-y-4">
              {error && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-sm px-3 py-2">{error}</p>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Rôle */}
                <div>
                  <label className="block text-xs font-semibold mb-1.5 text-neutral-600">Rôle</label>
                  <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                          className="w-full text-sm px-3 py-2 rounded-sm border border-neutral-300 outline-none bg-white"
                          style={{ color: '#111' }}>
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>

                {/* Ordre d'affichage */}
                <div>
                  <label className="block text-xs font-semibold mb-1.5 text-neutral-600">Ordre d'affichage</label>
                  <input type="number" min={0}
                         value={form.sort_order}
                         onChange={e => setForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))}
                         className="w-full text-sm px-3 py-2 rounded-sm border border-neutral-300 outline-none"
                         style={{ color: '#111' }}/>
                  <p className="text-xs text-neutral-400 mt-1">0 = premier, 1 = deuxième…</p>
                </div>

                {/* Nom */}
                <div>
                  <label className="block text-xs font-semibold mb-1.5 text-neutral-600">Nom complet <span className="text-red-500">*</span></label>
                  <input type="text" placeholder="Pr. Jean Dupont"
                         value={form.name}
                         onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                         className="w-full text-sm px-3 py-2 rounded-sm border border-neutral-300 outline-none"
                         style={{ color: '#111' }}/>
                </div>

                {/* Affiliation */}
                <div>
                  <label className="block text-xs font-semibold mb-1.5 text-neutral-600">Affiliation</label>
                  <input type="text" placeholder="Université de Yaoundé — Cameroun"
                         value={form.affiliation}
                         onChange={e => setForm(f => ({ ...f, affiliation: e.target.value }))}
                         className="w-full text-sm px-3 py-2 rounded-sm border border-neutral-300 outline-none"
                         style={{ color: '#111' }}/>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <button type="submit" disabled={saving}
                        className="px-5 py-2 rounded-sm text-sm font-semibold text-white transition-opacity disabled:opacity-60"
                        style={{ background: 'linear-gradient(90deg, #1B4427, #1E88C8)' }}>
                  {saving ? 'Enregistrement…' : editId ? 'Enregistrer' : 'Ajouter'}
                </button>
                <button type="button" onClick={closeForm}
                        className="px-4 py-2 rounded-sm text-sm font-medium text-neutral-600 border border-neutral-300 hover:bg-neutral-50 transition-colors">
                  Annuler
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── Liste groupée ──────────────────────────────────── */}
        {loading ? (
          <div className="bg-white border border-neutral-200 rounded-sm p-12 text-center">
            <svg className="animate-spin w-6 h-6 text-neutral-400 mx-auto" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            <p className="text-sm text-neutral-500 mt-3">Chargement…</p>
          </div>
        ) : groups.length === 0 ? (
          <div className="bg-white border border-neutral-200 rounded-sm p-12 text-center">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
                 style={{ background: '#F3F4F6' }}>
              <svg className="w-7 h-7 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
            </div>
            <p className="text-sm font-semibold text-neutral-600 mb-1">Comité éditorial vide</p>
            <p className="text-xs text-neutral-400 mb-5">
              Ajoutez les membres du comité pour qu'ils apparaissent sur la page "À propos".
            </p>
            <button onClick={openAdd}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-sm text-sm font-semibold text-white"
                    style={{ background: 'linear-gradient(90deg, #1B4427, #1E88C8)' }}>
              <IconPlus /> Ajouter le premier membre
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            {ROLES.map(role => {
              const group = groups.find(g => g.role === role);
              if (!group) return null;
              return (
                <div key={role} className="bg-white border border-neutral-200 rounded-sm overflow-hidden">
                  {/* Rôle header */}
                  <div className="px-5 py-3 flex items-center justify-between"
                       style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500">{role}</h3>
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                            style={{ background: '#EEF5F1', color: '#1B4427' }}>
                        {group.members.length}
                      </span>
                    </div>
                    <button onClick={openAdd}
                            className="text-xs text-primary hover:underline font-medium"
                            style={{ color: '#1E88C8' }}>
                      + Ajouter
                    </button>
                  </div>

                  {/* Members list */}
                  <div className="divide-y divide-neutral-100">
                    {group.members.map(member => (
                      <div key={member.id}
                           className="flex items-center gap-4 px-5 py-3.5 hover:bg-neutral-50 transition-colors">
                        {/* Avatar */}
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                             style={{ background: '#1B4427' }}>
                          {initials(member.name)}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-neutral-800 truncate">{member.name}</p>
                          {member.affiliation && (
                            <p className="text-xs text-neutral-500 truncate">{member.affiliation}</p>
                          )}
                        </div>

                        {/* Ordre */}
                        <span className="text-xs text-neutral-400 hidden sm:block">
                          ordre {member.sort_order}
                        </span>

                        {/* Actions */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button onClick={() => openEdit(member)}
                                  className="p-1.5 rounded transition-colors"
                                  style={{ color: '#1E88C8' }}
                                  title="Modifier">
                            <IconEdit />
                          </button>
                          <button onClick={() => handleDelete(member.id)}
                                  disabled={deleting === member.id}
                                  className="p-1.5 rounded transition-colors"
                                  style={{ color: deleting === member.id ? '#ccc' : '#DC2626' }}
                                  title="Supprimer">
                            {deleting === member.id ? (
                              <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                              </svg>
                            ) : <IconTrash />}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Note d'info */}
        <div className="p-4 rounded-sm text-xs leading-relaxed"
             style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1E40AF' }}>
          <strong>Note :</strong> Les membres ajoutés ici apparaissent automatiquement dans la section
          "Comité éditorial" de la page <em>À propos</em> du site public.
        </div>

      </div>
    </DashboardLayout>
  );
}
