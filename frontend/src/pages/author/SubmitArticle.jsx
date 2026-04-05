import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import api from '../../utils/api';

// ============================================================
// SubmitArticle — JAEI Platform
// Formulaire de soumission d'article (auteur)
// Style ScienceDirect : steps, champs épurés, upload PDF
// ============================================================

// Domaines officiels JAEI — synchronisés avec schema.sql
const SPECIALTY_GROUPS = [
  {
    label: 'Agroécologie et Utilisation Durable des Terres',
    options: [
      'Agronomie', 'Agroforesterie', 'Génétique des plantes',
      'Productions végétales', 'Sciences du sol', 'Phytopathologie',
      'Génie rural & Hydraulique', 'Développement rural',
    ],
  },
  {
    label: 'Sciences Animales et Aquatiques',
    options: [
      'Aquaculture & Pêche', 'Nutrition animale', 'Productions animales',
      'Parasitologie vétérinaire', 'Zootechnie',
    ],
  },
  {
    label: 'Sciences Environnementales et Pollution',
    options: [
      'Écologie', 'Environnement & Pollution',
      'Changement climatique & Agriculture', 'Foresterie',
      'Gestion des ressources naturelles', "Sciences de l'eau",
    ],
  },
  {
    label: 'Biotechnologie et Innovation Agricole',
    options: [
      'Biotechnologie agricole', 'Microbiologie du sol', 'Économie agricole',
    ],
  },
];

const STEPS = [
  { num: 1, label: 'Informations générales' },
  { num: 2, label: 'Résumé & Mots-clés' },
  { num: 3, label: 'Fichier & Confirmation' },
];

// ── Icônes ──────────────────────────────────────────────────
const IconUpload = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
  </svg>
);
const IconCheck = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
  </svg>
);
const IconPDF = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
  </svg>
);
const IconX = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
  </svg>
);

// ── Styles partagés ──────────────────────────────────────────
const INPUT_STYLE = {
  width: '100%', padding: '10px 14px', fontSize: 14,
  border: '1px solid #D1D5DB', borderRadius: 6,
  outline: 'none', color: '#111', background: '#fff',
  transition: 'border-color .2s',
};
const LABEL_STYLE = { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 };
const REQUIRED = <span style={{ color: '#DC2626' }}>*</span>;

// ── Indicateur d'étapes ──────────────────────────────────────
const StepBar = ({ current }) => (
  <div className="flex items-center justify-center gap-0 mb-10">
    {STEPS.map((step, i) => {
      const done = current > step.num;
      const active = current === step.num;
      return (
        <div key={step.num} className="flex items-center">
          <div className="flex flex-col items-center" style={{ minWidth: 120 }}>
            <div className="flex items-center justify-center rounded-full text-sm font-semibold"
              style={{
                width: 36, height: 36,
                background: done ? '#1B7A4A' : active ? '#1B5E8A' : '#E5E7EB',
                color: done || active ? '#fff' : '#9CA3AF',
                border: active ? '2px solid #1B5E8A' : 'none',
              }}>
              {done ? <IconCheck /> : step.num}
            </div>
            <span className="mt-1.5 text-xs font-medium text-center"
              style={{ color: active ? '#1B5E8A' : done ? '#1B7A4A' : '#9CA3AF', lineHeight: 1.3 }}>
              {step.label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div style={{ width: 60, height: 2, background: done ? '#1B7A4A' : '#E5E7EB', marginBottom: 22 }} />
          )}
        </div>
      );
    })}
  </div>
);

// ────────────────────────────────────────────────────────────
// Composant principal
// ────────────────────────────────────────────────────────────
export default function SubmitArticle() {
  const navigate = useNavigate();
  const fileRef = useRef(null);

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    title: '',
    research_area: '',
    co_authors: '',
    abstract: '',
    keywords: '',
    pdf: null,
  });

  const set = (field) => (e) => {
    setError('');
    setForm(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (!allowed.includes(file.type)) {
      setError('Seuls les fichiers PDF et Word (.docx) sont acceptés.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Le fichier ne doit pas dépasser 10 Mo.');
      return;
    }
    setError('');
    setForm(prev => ({ ...prev, pdf: file }));
  };

  const validateStep = () => {
    if (step === 1) {
      if (!form.title.trim()) return 'Le titre est obligatoire.';
      if (!form.research_area) return 'Veuillez sélectionner un domaine.';
    }
    if (step === 2) {
      if (!form.abstract.trim()) return 'Le résumé est obligatoire.';
      if (form.abstract.trim().length < 100) return 'Le résumé doit comporter au moins 100 caractères.';
      if (!form.keywords.trim()) return 'Les mots-clés sont obligatoires.';
    }
    if (step === 3) {
      if (!form.pdf) return 'Veuillez joindre le fichier PDF ou Word de l\'article.';
    }
    return '';
  };

  const next = () => {
    const err = validateStep();
    if (err) { setError(err); return; }
    setError('');
    setStep(s => s + 1);
  };

  const back = () => { setError(''); setStep(s => s - 1); };

  const handleSubmit = async () => {
    const err = validateStep();
    if (err) { setError(err); return; }

    setLoading(true);
    setError('');
    try {
      const data = new FormData();
      data.append('title', form.title);
      data.append('research_area', form.research_area);
      data.append('abstract', form.abstract);
      data.append('keywords', form.keywords);
      if (form.co_authors.trim()) data.append('co_authors', form.co_authors);
      data.append('pdf', form.pdf);

      await api.post('/submissions', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la soumission. Réessayez.');
    } finally {
      setLoading(false);
    }
  };

  // ── Écran succès ────────────────────────────────────────────
  if (success) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center" style={{ minHeight: '60vh', textAlign: 'center' }}>
          <div className="flex items-center justify-center rounded-full mb-6"
            style={{ width: 80, height: 80, background: '#D1FAE5' }}>
            <svg className="w-10 h-10" fill="none" stroke="#1B7A4A" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-2" style={{ color: '#111' }}>Article soumis avec succès !</h2>
          <p className="text-sm mb-1" style={{ color: '#6B7280', maxWidth: 420 }}>
            Votre article a bien été reçu. Il sera examiné par l'équipe éditoriale de JAEI.
          </p>
          <p className="text-sm mb-8" style={{ color: '#6B7280' }}>
            Vous recevrez une notification dès qu'une décision sera prise.
          </p>
          <div className="flex gap-3">
            <button onClick={() => navigate('/author/dashboard')}
              className="px-5 py-2.5 rounded text-sm font-semibold transition-colors"
              style={{ background: '#1B5E8A', color: '#fff' }}>
              Retour au tableau de bord
            </button>
            <button onClick={() => { setSuccess(false); setStep(1); setForm({ title:'', research_area:'', co_authors:'', abstract:'', keywords:'', pdf:null }); }}
              className="px-5 py-2.5 rounded text-sm font-semibold border transition-colors"
              style={{ border: '1px solid #D1D5DB', color: '#374151' }}>
              Soumettre un autre article
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // ────────────────────────────────────────────────────────────
  return (
    <DashboardLayout>
      {/* En-tête page */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold" style={{ color: '#111' }}>Soumettre un article</h1>
        <p className="text-sm mt-1" style={{ color: '#6B7280' }}>
          Veuillez remplir tous les champs obligatoires (<span style={{ color: '#DC2626' }}>*</span>) avant de soumettre.
        </p>
      </div>

      {/* Card formulaire */}
      <div className="mx-auto" style={{ maxWidth: 760 }}>
        <div className="bg-white rounded-lg p-8" style={{ border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
          <StepBar current={step} />

          {/* ── Erreur ── */}
          {error && (
            <div className="flex items-center gap-2 mb-6 px-4 py-3 rounded text-sm"
              style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C' }}>
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              {error}
            </div>
          )}

          {/* ══ ÉTAPE 1 — Informations générales ═══════════════════ */}
          {step === 1 && (
            <div className="flex flex-col gap-6">
              {/* Titre */}
              <div>
                <label style={LABEL_STYLE}>Titre de l'article {REQUIRED}</label>
                <input
                  value={form.title}
                  onChange={set('title')}
                  placeholder="Entrez le titre complet de votre article"
                  style={INPUT_STYLE}
                  onFocus={e => e.target.style.borderColor = '#1B5E8A'}
                  onBlur={e => e.target.style.borderColor = '#D1D5DB'}
                />
                <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>
                  Soyez précis et descriptif. Évitez les abréviations.
                </p>
              </div>

              {/* Domaine */}
              <div>
                <label style={LABEL_STYLE}>Domaine de recherche {REQUIRED}</label>
                <select
                  value={form.research_area}
                  onChange={set('research_area')}
                  style={{ ...INPUT_STYLE, color: form.research_area ? '#111' : '#9CA3AF' }}
                  onFocus={e => e.target.style.borderColor = '#1B5E8A'}
                  onBlur={e => e.target.style.borderColor = '#D1D5DB'}
                >
                  <option value="">Sélectionner un domaine</option>
                  {SPECIALTY_GROUPS.map(group => (
                    <optgroup key={group.label} label={group.label}>
                      {group.options.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              {/* Co-auteurs */}
              <div>
                <label style={LABEL_STYLE}>
                  Co-auteurs <span className="font-normal text-xs" style={{ color: '#9CA3AF' }}>(optionnel)</span>
                </label>
                <input
                  value={form.co_authors}
                  onChange={set('co_authors')}
                  placeholder="Ex : Jean Dupont, Marie Martin — séparez les noms par des virgules"
                  style={INPUT_STYLE}
                  onFocus={e => e.target.style.borderColor = '#1B5E8A'}
                  onBlur={e => e.target.style.borderColor = '#D1D5DB'}
                />
              </div>
            </div>
          )}

          {/* ══ ÉTAPE 2 — Résumé & Mots-clés ═══════════════════════ */}
          {step === 2 && (
            <div className="flex flex-col gap-6">
              {/* Résumé */}
              <div>
                <label style={LABEL_STYLE}>Résumé (Abstract) {REQUIRED}</label>
                <textarea
                  value={form.abstract}
                  onChange={set('abstract')}
                  rows={8}
                  placeholder="Rédigez un résumé clair et structuré de votre article (introduction, méthodes, résultats, conclusion). Minimum 100 caractères."
                  style={{ ...INPUT_STYLE, resize: 'vertical', lineHeight: 1.6 }}
                  onFocus={e => e.target.style.borderColor = '#1B5E8A'}
                  onBlur={e => e.target.style.borderColor = '#D1D5DB'}
                />
                <p className="text-xs mt-1" style={{ color: form.abstract.length < 100 ? '#DC2626' : '#9CA3AF' }}>
                  {form.abstract.length} caractère{form.abstract.length > 1 ? 's' : ''} (minimum 100)
                </p>
              </div>

              {/* Mots-clés */}
              <div>
                <label style={LABEL_STYLE}>Mots-clés {REQUIRED}</label>
                <input
                  value={form.keywords}
                  onChange={set('keywords')}
                  placeholder="Ex : agriculture durable, sol tropical, rendement agricole"
                  style={INPUT_STYLE}
                  onFocus={e => e.target.style.borderColor = '#1B5E8A'}
                  onBlur={e => e.target.style.borderColor = '#D1D5DB'}
                />
                <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>
                  3 à 6 mots-clés séparés par des virgules. Ces mots facilitent l'indexation de votre article.
                </p>
              </div>
            </div>
          )}

          {/* ══ ÉTAPE 3 — Fichier & Confirmation ════════════════════ */}
          {step === 3 && (
            <div className="flex flex-col gap-6">
              {/* Upload fichier */}
              <div>
                <label style={LABEL_STYLE}>Fichier de l'article (PDF ou Word) {REQUIRED}</label>
                {!form.pdf ? (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="w-full flex flex-col items-center justify-center gap-3 rounded-lg transition-colors"
                    style={{
                      padding: '48px 24px', border: '2px dashed #D1D5DB',
                      background: '#F9FAFB', color: '#9CA3AF', cursor: 'pointer',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#1B5E8A'; e.currentTarget.style.color = '#1B5E8A'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#D1D5DB'; e.currentTarget.style.color = '#9CA3AF'; }}
                  >
                    <IconUpload />
                    <span className="text-sm font-medium">Cliquez pour sélectionner votre fichier</span>
                    <span className="text-xs">PDF ou Word (.docx) — 10 Mo maximum</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-3 px-4 py-3 rounded-lg"
                    style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                    <div style={{ color: '#1B7A4A' }}><IconPDF /></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: '#111' }}>{form.pdf.name}</p>
                      <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>
                        {(form.pdf.size / 1024 / 1024).toFixed(2)} Mo
                      </p>
                    </div>
                    <button type="button" onClick={() => { setForm(prev => ({ ...prev, pdf: null })); fileRef.current.value = ''; }}
                      className="p-1 rounded transition-colors"
                      style={{ color: '#6B7280' }}
                      onMouseEnter={e => e.currentTarget.style.color = '#DC2626'}
                      onMouseLeave={e => e.currentTarget.style.color = '#6B7280'}>
                      <IconX />
                    </button>
                  </div>
                )}
                <input ref={fileRef} type="file" accept=".pdf,.docx" className="hidden" onChange={handleFile} />
              </div>

              {/* Récapitulatif */}
              <div className="rounded-lg p-5" style={{ background: '#F8FAFC', border: '1px solid #E5E7EB' }}>
                <h3 className="text-sm font-semibold mb-3" style={{ color: '#374151' }}>Récapitulatif de la soumission</h3>
                <dl className="flex flex-col gap-2">
                  {[
                    { label: 'Titre', value: form.title },
                    { label: 'Domaine', value: form.research_area },
                    { label: 'Co-auteurs', value: form.co_authors || '—' },
                    { label: 'Mots-clés', value: form.keywords },
                    { label: 'Résumé', value: form.abstract.length > 120 ? form.abstract.substring(0, 120) + '...' : form.abstract },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex gap-3">
                      <dt className="text-xs font-semibold flex-shrink-0" style={{ color: '#6B7280', width: 90 }}>{label}</dt>
                      <dd className="text-xs" style={{ color: '#111' }}>{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              {/* Déclaration */}
              <p className="text-xs" style={{ color: '#6B7280', lineHeight: 1.6 }}>
                En soumettant cet article, vous certifiez que ce travail est original, n'a pas été publié ailleurs,
                et que tous les co-auteurs ont approuvé cette soumission. Vous acceptez les{' '}
                <span style={{ color: '#1B5E8A', cursor: 'pointer' }}>conditions de soumission de JAEI</span>.
              </p>
            </div>
          )}

          {/* ── Navigation ── */}
          <div className="flex items-center justify-between mt-8 pt-6" style={{ borderTop: '1px solid #F3F4F6' }}>
            {step > 1 ? (
              <button onClick={back} className="px-4 py-2.5 text-sm font-medium rounded transition-colors"
                style={{ color: '#374151', border: '1px solid #D1D5DB' }}
                onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                ← Précédent
              </button>
            ) : (
              <button onClick={() => navigate('/author/dashboard')}
                className="px-4 py-2.5 text-sm font-medium rounded transition-colors"
                style={{ color: '#374151', border: '1px solid #D1D5DB' }}
                onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                Annuler
              </button>
            )}

            {step < 3 ? (
              <button onClick={next}
                className="px-5 py-2.5 text-sm font-semibold rounded transition-opacity"
                style={{ background: '#1B5E8A', color: '#fff' }}
                onMouseEnter={e => e.currentTarget.style.opacity = '.88'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                Suivant →
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={loading}
                className="px-6 py-2.5 text-sm font-semibold rounded flex items-center gap-2 transition-opacity"
                style={{ background: loading ? '#9CA3AF' : '#1B7A4A', color: '#fff', cursor: loading ? 'not-allowed' : 'pointer' }}>
                {loading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                    </svg>
                    Soumission en cours...
                  </>
                ) : 'Soumettre l\'article'}
              </button>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
