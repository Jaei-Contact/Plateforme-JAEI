import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import api from '../../utils/api';

// ============================================================
// SubmitArticle — Wizard 3 étapes
// 1. General information
// 2. File & Abstract  (upload PDF → AI analyse → résumé + mots-clés)
// 3. Payment          (paiement inline, puis soumission confirmée)
// ============================================================

// ── Domaines de recherche ────────────────────────────────────
const SPECIALTY_GROUPS = [
  {
    label: 'Agroecology and Sustainable Land Use',
    options: [
      'Agronomy', 'Agroforestry', 'Plant genetics',
      'Crop production', 'Soil science', 'Plant pathology',
      'Rural engineering & Hydraulics', 'Rural development',
    ],
  },
  {
    label: 'Animal and Aquatic Sciences',
    options: [
      'Aquaculture & Fisheries', 'Animal nutrition', 'Animal production',
      'Veterinary parasitology', 'Animal husbandry',
    ],
  },
  {
    label: 'Environmental Sciences and Pollution',
    options: [
      'Ecology', 'Environment & Pollution',
      'Climate change & Agriculture', 'Forestry',
      'Natural resource management', 'Water sciences',
    ],
  },
  {
    label: 'Biotechnology and Agricultural Innovation',
    options: ['Agricultural biotechnology', 'Soil microbiology', 'Agricultural economics'],
  },
];

const STEPS = [
  { num: 1, label: 'General information' },
  { num: 2, label: 'File & Abstract' },
  { num: 3, label: 'Payment' },
];

const FEE     = 200000;
const FEE_EUR = 305;
const FEE_USD = 330;

// ── Icônes ───────────────────────────────────────────────────
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
const IconCheckLg = () => (
  <svg className="w-10 h-10" fill="none" stroke="#1B7A4A" viewBox="0 0 24 24">
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
const IconLock = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
  </svg>
);
const IconCard = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
      d="M3 10h18M7 15h1m4 0h1m-7 4h12a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
  </svg>
);
const IconSparkles = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/>
  </svg>
);

// ── Styles communs ───────────────────────────────────────────
const INPUT_STYLE = {
  width: '100%', padding: '10px 14px', fontSize: 14,
  border: '1px solid #D1D5DB', borderRadius: 6, outline: 'none',
  color: '#111', background: '#fff', transition: 'border-color .2s',
};
const LABEL_STYLE = { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 };
const REQUIRED = <span style={{ color: '#DC2626' }}>*</span>;

// ── Barre de progression ─────────────────────────────────────
const StepBar = ({ current }) => (
  <div className="flex items-center justify-center gap-0 mb-10">
    {STEPS.map((step, i) => {
      const done   = current > step.num;
      const active = current === step.num;
      return (
        <div key={step.num} className="flex items-center">
          <div className="flex flex-col items-center" style={{ minWidth: 110 }}>
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

// ── Dev mode : faux formulaire carte (démo) + soumission directe ─
const DevSubmitButton = ({ submissionId, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/payments/dev-confirm', { submission_id: submissionId });
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || 'Error submitting article. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-sm p-6" style={{ border: '1px solid #E5E7EB' }}>
      <div className="flex items-center gap-2 mb-5">
        <IconCard />
        <h2 className="text-base font-bold" style={{ color: '#111827' }}>Card payment</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Faux champs carte — visibles pour la démo, désactivés */}
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#6B7280' }}>Card number</label>
            <input disabled defaultValue="4242 4242 4242 4242" className="w-full px-3 py-2.5 text-sm rounded-sm"
              style={{ border: '1px solid #E5E7EB', color: '#9CA3AF', background: '#F9FAFB' }} />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium mb-1" style={{ color: '#6B7280' }}>Expiry</label>
              <input disabled defaultValue="12 / 28" className="w-full px-3 py-2.5 text-sm rounded-sm"
                style={{ border: '1px solid #E5E7EB', color: '#9CA3AF', background: '#F9FAFB' }} />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium mb-1" style={{ color: '#6B7280' }}>CVC</label>
              <input disabled defaultValue="123" className="w-full px-3 py-2.5 text-sm rounded-sm"
                style={{ border: '1px solid #E5E7EB', color: '#9CA3AF', background: '#F9FAFB' }} />
            </div>
          </div>
        </div>

        <div className="px-3 py-2 rounded-sm text-xs" style={{ background: '#FEF3C7', border: '1px solid #FDE68A', color: '#92400E' }}>
          🧪 <strong>Dev mode</strong> — Simulated payment, no real transaction
        </div>

        {error && (
          <p className="text-sm px-3 py-2 rounded-sm" style={{ background: '#FEF2F2', color: '#B91C1C', border: '1px solid #FECACA' }}>
            {error}
          </p>
        )}

        <button type="submit" disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-3 text-sm font-semibold text-white rounded-sm transition-opacity"
          style={{ background: '#1B4427', opacity: loading ? 0.7 : 1 }}>
          {loading
            ? <><div className="w-4 h-4 rounded-full border-2 animate-spin" style={{ borderColor: '#fff', borderTopColor: 'transparent' }} /> Submitting…</>
            : 'Confirm payment'}
        </button>
      </form>
    </div>
  );
};

// ── CinetPay button (prod) ───────────────────────────────────
const CinetPayButton = ({ submissionId }) => {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const handlePay = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/payments/initiate', { submission_id: parseInt(submissionId) });
      window.location.href = res.data.payment_url;
    } catch (err) {
      setError(err.response?.data?.message || 'Error initializing payment. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-sm p-6" style={{ border: '1px solid #E5E7EB' }}>
      <div className="flex items-center gap-2 mb-5">
        <IconCard />
        <h2 className="text-base font-bold" style={{ color: '#111827' }}>Payment</h2>
      </div>
      <p className="text-sm mb-4" style={{ color: '#6B7280' }}>
        Pay securely via CinetPay. Accepted: Visa, Mastercard, MTN Mobile Money, Orange Money.
      </p>
      {error && (
        <p className="text-sm px-3 py-2 mb-4 rounded-sm"
           style={{ background: '#FEF2F2', color: '#B91C1C', border: '1px solid #FECACA' }}>
          {error}
        </p>
      )}
      <button onClick={handlePay} disabled={loading}
        className="w-full flex items-center justify-center gap-2 py-3 text-sm font-semibold text-white rounded-sm transition-opacity"
        style={{ background: '#1B4427', opacity: loading ? 0.7 : 1 }}>
        {loading
          ? <><div className="w-4 h-4 rounded-full border-2 animate-spin" style={{ borderColor: '#fff', borderTopColor: 'transparent' }} /> Redirecting…</>
          : <><IconLock /> Pay {FEE.toLocaleString('fr-FR')} FCFA via CinetPay</>}
      </button>
      <div className="flex flex-wrap gap-2 justify-center mt-3">
        {['Visa', 'Mastercard', 'MTN MoMo', 'Orange Money'].map(m => (
          <span key={m} className="text-xs px-2 py-0.5 rounded-sm font-medium"
                style={{ background: '#F3F4F6', color: '#6B7280', border: '1px solid #E5E7EB' }}>
            {m}
          </span>
        ))}
      </div>
      <div className="flex items-start gap-3 px-4 py-3 rounded-sm text-xs mt-4"
           style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', color: '#15803D' }}>
        <IconLock />
        <p>Your payment is processed securely by CinetPay. Once confirmed, your article immediately enters the editorial review process.</p>
      </div>
    </div>
  );
};

// ── Composant principal ──────────────────────────────────────
export default function SubmitArticle() {
  const navigate = useNavigate();
  const fileRef  = useRef(null);

  // ── État du wizard ───────────────────────────────────────
  const [step,  setStep]  = useState(1);
  const [error, setError] = useState('');

  // Formulaire
  const [form, setForm] = useState({
    title: '', research_area: '', co_authors: '',
    abstract: '', keywords: '', pdf: null,
  });

  // IA
  const [aiAvailable, setAiAvailable] = useState(false);
  const [aiLoading,   setAiLoading]   = useState(false); // analyse PDF en cours
  const [aiDone,      setAiDone]      = useState(false); // analyse terminée

  // Transition étape 2 → 3 (création soumission)
  const [submissionId,       setSubmissionId]       = useState(null);
  const [creatingSubmission, setCreatingSubmission] = useState(false);

  // Paiement (étape 3)
  const [paymentConfig, setPaymentConfig] = useState(null);
  const [success,       setSuccess]       = useState(false);

  // Scroll en haut à chaque changement d'étape (après le rendu du nouveau contenu)
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [step]);

  useEffect(() => {
    api.get('/ai/status').then(r => setAiAvailable(r.data.available)).catch(() => {});
  }, []);

  // ── Handlers de saisie ───────────────────────────────────
  const set = (field) => (e) => {
    setError('');
    setForm(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.mimetype !== 'application/pdf' && !file.name.endsWith('.pdf') && !file.name.endsWith('.docx')) {
      setError('Only PDF and Word (.docx) files are accepted.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('The file must not exceed 10 MB.');
      return;
    }
    setError('');
    setAiDone(false);
    setForm(prev => ({ ...prev, pdf: file, abstract: '', keywords: '' }));
  };

  // ── Analyse IA du PDF ────────────────────────────────────
  const handleExtractPdf = async () => {
    if (!form.pdf) return;
    setAiLoading(true);
    setError('');
    try {
      const data = new FormData();
      data.append('pdf', form.pdf);
      const res = await api.post('/ai/extract-pdf', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setForm(prev => ({
        ...prev,
        abstract: res.data.abstract || prev.abstract,
        keywords: res.data.keywords || prev.keywords,
      }));
      setAiDone(true);
    } catch (err) {
      setError(err.response?.data?.message || 'AI analysis failed. You can fill in the fields manually.');
    } finally {
      setAiLoading(false);
    }
  };

  // ── Validation par étape ─────────────────────────────────
  const validateStep = () => {
    if (step === 1) {
      if (!form.title.trim())    return 'Title is required.';
      if (!form.research_area)   return 'Please select a research area.';
    }
    if (step === 2) {
      if (!form.pdf)             return 'Please attach the PDF file of the article.';
      if (!form.abstract.trim()) return 'Abstract is required.';
      if (form.abstract.trim().length < 100) return 'The abstract must be at least 100 characters.';
      if (!form.keywords.trim()) return 'Keywords are required.';
    }
    return '';
  };

  // ── Navigation ───────────────────────────────────────────
  const back = () => { setError(''); setStep(s => s - 1); };

  const next = async () => {
    const err = validateStep();
    if (err) { setError(err); return; }
    setError('');

    if (step === 2) {
      // Créer la soumission avant d'afficher l'étape paiement
      setCreatingSubmission(true);
      try {
        const data = new FormData();
        data.append('title',         form.title);
        data.append('research_area', form.research_area);
        data.append('abstract',      form.abstract);
        data.append('keywords',      form.keywords);
        if (form.co_authors.trim()) data.append('co_authors', form.co_authors);
        data.append('pdf', form.pdf);

        const [subRes, cfgRes] = await Promise.all([
          api.post('/submissions', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
          api.get('/payments/config'),
        ]);

        setSubmissionId(subRes.data.submission.id);
        setPaymentConfig(cfgRes.data);
        setStep(3);
      } catch (err) {
        setError(err.response?.data?.message || 'Error creating submission. Please try again.');
      } finally {
        setCreatingSubmission(false);
      }
    } else {
      setStep(s => s + 1);
    }
  };

  // ── Écran de succès ──────────────────────────────────────
  if (success) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center" style={{ minHeight: '60vh', textAlign: 'center' }}>
          <div className="flex items-center justify-center rounded-full mb-6"
            style={{ width: 80, height: 80, background: '#D1FAE5' }}>
            <IconCheckLg />
          </div>
          <h2 className="text-2xl font-bold mb-2" style={{ color: '#111' }}>Payment confirmed!</h2>
          <p className="text-sm mb-1" style={{ color: '#6B7280', maxWidth: 420 }}>
            Your article has been submitted and is now in the editorial review queue.
          </p>
          <p className="text-sm mb-8" style={{ color: '#6B7280' }}>
            You will receive an email notification at each step of the review process.
          </p>
          <div className="flex gap-3">
            <button onClick={() => navigate('/author/dashboard')}
              className="px-5 py-2.5 rounded text-sm font-semibold"
              style={{ background: '#1B4427', color: '#fff' }}>
              Back to dashboard
            </button>
            <button onClick={() => navigate('/author/submissions')}
              className="px-5 py-2.5 rounded text-sm font-semibold border"
              style={{ border: '1px solid #D1D5DB', color: '#374151' }}>
              My submissions
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // ── Rendu ────────────────────────────────────────────────
  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold" style={{ color: '#111' }}>Submit an article</h1>
        <p className="text-sm mt-1" style={{ color: '#6B7280' }}>
          Please complete all steps to finalize your submission.
        </p>
      </div>

      <div className="mx-auto" style={{ maxWidth: 760 }}>
        <div className="bg-white rounded-lg p-8"
          style={{ border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>

          <StepBar current={step} />

          {/* Erreur globale */}
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

          {/* ══ ÉTAPE 1 — Informations générales ══════════════ */}
          {step === 1 && (
            <div className="flex flex-col gap-6">
              <div>
                <label style={LABEL_STYLE}>Article title {REQUIRED}</label>
                <input value={form.title} onChange={set('title')}
                  placeholder="Enter the full title of your article"
                  style={INPUT_STYLE}
                  onFocus={e => e.target.style.borderColor = '#1B5E8A'}
                  onBlur={e => e.target.style.borderColor = '#D1D5DB'} />
                <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>
                  Be precise and descriptive. Avoid abbreviations.
                </p>
              </div>

              <div>
                <label style={LABEL_STYLE}>Research area {REQUIRED}</label>
                <select value={form.research_area} onChange={set('research_area')}
                  style={{ ...INPUT_STYLE, color: form.research_area ? '#111' : '#9CA3AF' }}
                  onFocus={e => e.target.style.borderColor = '#1B5E8A'}
                  onBlur={e => e.target.style.borderColor = '#D1D5DB'}>
                  <option value="">Select a research area</option>
                  {SPECIALTY_GROUPS.map(group => (
                    <optgroup key={group.label} label={group.label}>
                      {group.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </optgroup>
                  ))}
                </select>
              </div>

              <div>
                <label style={LABEL_STYLE}>
                  Co-authors <span className="font-normal text-xs" style={{ color: '#9CA3AF' }}>(optional)</span>
                </label>
                <input value={form.co_authors} onChange={set('co_authors')}
                  placeholder="e.g. Jean Dupont, Marie Martin — separate names with commas"
                  style={INPUT_STYLE}
                  onFocus={e => e.target.style.borderColor = '#1B5E8A'}
                  onBlur={e => e.target.style.borderColor = '#D1D5DB'} />
              </div>
            </div>
          )}

          {/* ══ ÉTAPE 2 — Fichier & Résumé ════════════════════ */}
          {step === 2 && (
            <div className="flex flex-col gap-6">

              {/* Upload PDF */}
              <div>
                <label style={LABEL_STYLE}>Article file (PDF) {REQUIRED}</label>
                {!form.pdf ? (
                  <button type="button" onClick={() => fileRef.current?.click()}
                    className="w-full flex flex-col items-center justify-center gap-3 rounded-lg transition-colors"
                    style={{ padding: '48px 24px', border: '2px dashed #D1D5DB', background: '#F9FAFB', color: '#9CA3AF', cursor: 'pointer' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#1B5E8A'; e.currentTarget.style.color = '#1B5E8A'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#D1D5DB'; e.currentTarget.style.color = '#9CA3AF'; }}>
                    <IconUpload />
                    <span className="text-sm font-medium">Click to select your PDF file</span>
                    <span className="text-xs">PDF — 10 MB maximum</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-3 px-4 py-3 rounded-lg"
                    style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                    <div style={{ color: '#1B7A4A' }}><IconPDF /></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: '#111' }}>{form.pdf.name}</p>
                      <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>
                        {(form.pdf.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <button type="button"
                      onClick={() => { setForm(prev => ({ ...prev, pdf: null, abstract: '', keywords: '' })); setAiDone(false); fileRef.current.value = ''; }}
                      className="p-1 rounded transition-colors" style={{ color: '#6B7280' }}
                      onMouseEnter={e => e.currentTarget.style.color = '#DC2626'}
                      onMouseLeave={e => e.currentTarget.style.color = '#6B7280'}>
                      <IconX />
                    </button>
                  </div>
                )}
                <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={handleFile} />
              </div>

              {/* Bouton analyse IA */}
              {aiAvailable && form.pdf && (
                <div className="rounded-lg p-5"
                  style={{ background: aiDone ? '#F0FDF4' : '#F8FAFC', border: `1px solid ${aiDone ? '#BBF7D0' : '#E5E7EB'}` }}>
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <IconSparkles />
                        <span className="text-sm font-semibold" style={{ color: '#1B4427' }}>AI Analysis</span>
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: '#DCFCE7', color: '#15803D' }}>Gemini</span>
                      </div>
                      <p className="text-xs" style={{ color: '#6B7280' }}>
                        {aiDone
                          ? 'Abstract and keywords have been pre-filled. Feel free to edit them.'
                          : 'Let AI read your PDF and generate a structured abstract and keywords.'}
                      </p>
                    </div>
                    <button type="button" onClick={handleExtractPdf} disabled={aiLoading}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-sm transition-opacity flex-shrink-0"
                      style={{ background: '#1B4427', color: '#fff', opacity: aiLoading ? 0.65 : 1 }}>
                      {aiLoading ? (
                        <><div className="w-4 h-4 rounded-full border-2 animate-spin" style={{ borderColor: '#fff', borderTopColor: 'transparent' }} /> Analyzing…</>
                      ) : aiDone ? (
                        <><IconCheck /> Re-analyze</>
                      ) : (
                        <><IconSparkles /> Analyze with AI</>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Abstract */}
              <div>
                <label style={LABEL_STYLE}>Abstract {REQUIRED}</label>
                <textarea value={form.abstract} onChange={set('abstract')} rows={8}
                  placeholder="Write a clear structured abstract of your article (background, methods, results, conclusion). Minimum 100 characters."
                  style={{ ...INPUT_STYLE, resize: 'vertical', lineHeight: 1.6 }}
                  onFocus={e => e.target.style.borderColor = '#1B5E8A'}
                  onBlur={e => e.target.style.borderColor = '#D1D5DB'} />
                <p className="text-xs mt-1" style={{ color: form.abstract.length < 100 ? '#DC2626' : '#9CA3AF' }}>
                  {form.abstract.length} character{form.abstract.length !== 1 ? 's' : ''} (minimum 100)
                </p>
              </div>

              {/* Keywords */}
              <div>
                <label style={LABEL_STYLE}>Keywords {REQUIRED}</label>
                <input value={form.keywords} onChange={set('keywords')}
                  placeholder="e.g. sustainable agriculture, tropical soil, crop yield"
                  style={INPUT_STYLE}
                  onFocus={e => e.target.style.borderColor = '#1B5E8A'}
                  onBlur={e => e.target.style.borderColor = '#D1D5DB'} />
                <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>
                  3 to 6 keywords separated by commas. These help index your article.
                </p>
              </div>
            </div>
          )}

          {/* ══ ÉTAPE 3 — Paiement ════════════════════════════ */}
          {step === 3 && (
            <div className="flex flex-col gap-5">

              {/* Récapitulatif soumission */}
              <div className="rounded-lg p-5" style={{ background: '#F8FAFC', border: '1px solid #E5E7EB' }}>
                <h3 className="text-sm font-semibold mb-3" style={{ color: '#374151' }}>Submission summary</h3>
                <dl className="flex flex-col gap-2">
                  {[
                    { label: 'Title',      value: form.title },
                    { label: 'Area',       value: form.research_area },
                    { label: 'Co-authors', value: form.co_authors || '—' },
                    { label: 'Keywords',   value: form.keywords },
                    { label: 'Abstract',   value: form.abstract.length > 120 ? form.abstract.substring(0, 120) + '…' : form.abstract },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex gap-3">
                      <dt className="text-xs font-semibold flex-shrink-0" style={{ color: '#6B7280', width: 90 }}>{label}</dt>
                      <dd className="text-xs" style={{ color: '#111', wordBreak: 'break-word', overflowWrap: 'break-word' }}>{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              {/* APC */}
              <div className="bg-white rounded-sm p-5" style={{ border: '1px solid #E5E7EB' }}>
                <p className="text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: '#9CA3AF' }}>
                  Article Processing Charge (APC)
                </p>
                <div className="flex justify-end pt-3" style={{ borderTop: '1px solid #F3F4F6' }}>
                  <div className="text-right">
                    <p className="text-lg font-bold leading-tight" style={{ color: '#1B4427' }}>
                      {FEE.toLocaleString('fr-FR')} FCFA
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>
                      {FEE_EUR} € / {FEE_USD} $
                    </p>
                  </div>
                </div>
              </div>

              {/* Formulaire paiement */}
              {paymentConfig?.devMode
                ? <DevSubmitButton submissionId={submissionId} onSuccess={() => setSuccess(true)} />
                : <CinetPayButton submissionId={submissionId} />
              }
            </div>
          )}

          {/* ── Boutons de navigation ─────────────────────── */}
          <div className="flex items-center justify-between mt-8 pt-6" style={{ borderTop: '1px solid #F3F4F6' }}>
            {/* Gauche : Retour / Annuler (pas de retour depuis l'étape 3) */}
            {step === 3 ? (
              <div /> // pas de bouton Retour une fois la soumission créée
            ) : step > 1 ? (
              <button onClick={back}
                className="px-4 py-2.5 text-sm font-medium rounded transition-colors"
                style={{ color: '#374151', border: '1px solid #D1D5DB' }}
                onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                ← Back
              </button>
            ) : (
              <button onClick={() => navigate('/author/dashboard')}
                className="px-4 py-2.5 text-sm font-medium rounded transition-colors"
                style={{ color: '#374151', border: '1px solid #D1D5DB' }}
                onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                Cancel
              </button>
            )}

            {/* Droite : Suivant (caché à l'étape 3, le bouton est dans le formulaire paiement) */}
            {step < 3 && (
              <button onClick={next} disabled={creatingSubmission}
                className="px-5 py-2.5 text-sm font-semibold rounded flex items-center gap-2 transition-opacity"
                style={{ background: '#1B5E8A', color: '#fff', opacity: creatingSubmission ? 0.7 : 1 }}>
                {creatingSubmission ? (
                  <><div className="w-4 h-4 rounded-full border-2 animate-spin" style={{ borderColor: '#fff', borderTopColor: 'transparent' }} /> Creating…</>
                ) : (
                  step === 2 ? 'Proceed to payment →' : 'Next →'
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
