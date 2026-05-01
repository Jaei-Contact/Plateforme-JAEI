import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { DOMAIN_MAP, MAIN_DOMAINS } from '../../utils/domains';

// ============================================================
// SubmitArticle — Wizard 7 étapes (style ScienceDirect)
// 1. Article Type       4. Additional Info
// 2. Attach Files       5. Comments
// 3. Research Domain    6. Manuscript Data
//                       7. Review & Submit
// ============================================================

const ARTICLE_TYPES = [
  'Research Article',
  'Short Communication',
  'Review Article',
  'Case Study',
  'Perspective / Opinion',
];

const STEPS = [
  { num: 1, label: 'Article\nType' },
  { num: 2, label: 'Attach\nFiles' },
  { num: 3, label: 'Research\nDomain' },
  { num: 4, label: 'Additional\nInfo' },
  { num: 5, label: 'Comments' },
  { num: 6, label: 'Manuscript\nData' },
  { num: 7, label: 'Review &\nSubmit' },
];

const CONFIRMATION_POINTS = [
  'The full and final name list of all authors and their affiliations, including the corresponding author\'s contact details, is accurate and final.',
  'Figures are submitted as separate high-resolution files (≥300 dpi), numbered sequentially and cited appropriately in the text.',
  'Tables are in editable text format (not images), numbered sequentially, and cited appropriately.',
  'Keywords do not contain abbreviations or acronyms.',
];

// ── Icons ─────────────────────────────────────────────────────
const Ic = {
  Check: () => (
    <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/>
    </svg>
  ),
  Upload: () => (
    <svg width="36" height="36" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
    </svg>
  ),
  File: () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
    </svg>
  ),
  Sparkles: () => (
    <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/>
    </svg>
  ),
  Alert: () => (
    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
    </svg>
  ),
};

const Spinner = () => (
  <span style={{
    display: 'inline-block', width: 12, height: 12,
    border: '2px solid currentColor', borderTopColor: 'transparent',
    borderRadius: '50%', animation: 'jaei-spin .6s linear infinite',
  }} />
);

// ── StepBar ───────────────────────────────────────────────────
const StepBar = ({ current }) => (
  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '14px 16px 0' }}>
    {STEPS.map((s, i) => {
      const done   = current > s.num;
      const active = current === s.num;
      return (
        <div key={s.num} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? '1 1 auto' : 'none' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 54 }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
              background: done ? '#1B4427' : '#fff',
              border: `2px solid ${done || active ? '#1B4427' : '#D1D5DB'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700,
              color: done ? '#fff' : active ? '#1B4427' : '#9CA3AF',
            }}>
              {done ? <Ic.Check /> : s.num}
            </div>
            <span style={{
              fontSize: 9.5, textAlign: 'center', marginTop: 5, lineHeight: 1.3,
              color: active ? '#1B4427' : done ? '#1B4427' : '#9CA3AF',
              fontWeight: active || done ? 600 : 400,
              whiteSpace: 'pre-line', maxWidth: 52,
            }}>{s.label}</span>
          </div>
          {i < STEPS.length - 1 && (
            <div style={{
              flex: 1, height: 2, margin: '0 3px', marginBottom: 18,
              background: done ? '#1B4427' : '#E5E7EB', minWidth: 10,
            }} />
          )}
        </div>
      );
    })}
  </div>
);

// ── SectionCard (comme la barre bleue de SD) ─────────────────
const SectionCard = ({ title, children, hasError, noPad }) => (
  <div style={{ border: '1px solid #D1D5DB', borderRadius: 4, overflow: 'hidden', marginBottom: 16 }}>
    <div style={{
      background: '#1B4427', color: '#fff', padding: '9px 16px',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    }}>
      <span style={{ fontSize: 13, fontWeight: 600 }}>— {title}</span>
      {hasError && <span style={{ fontSize: 13, color: '#FCA5A5' }}>⚠</span>}
    </div>
    <div style={{ padding: noPad ? 0 : '18px 20px' }}>{children}</div>
  </div>
);

// ── Ligne de résumé step 7 ───────────────────────────────────
const SummaryRow = ({ label, children, onEdit }) => (
  <div style={{ border: '1px solid #E5E7EB', borderRadius: 4, marginBottom: 8, overflow: 'hidden' }}>
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '7px 14px', background: '#F9FAFB', borderBottom: '1px solid #E5E7EB',
    }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '.04em' }}>{label}</span>
      <button onClick={onEdit} style={{ fontSize: 12, color: '#1B4427', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontWeight: 600 }}>
        Edit
      </button>
    </div>
    <div style={{ padding: '10px 14px', fontSize: 13, color: '#111' }}>{children}</div>
  </div>
);

// ── Composant principal ───────────────────────────────────────
export default function SubmitArticle() {
  const navigate  = useNavigate();
  const fileRef   = useRef(null);
  const { user }  = useAuth();

  const [step,       setStep]       = useState(1);
  const [error,      setError]      = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Popup IA (step 2, affiché une seule fois)
  const [showAiPopup, setShowAiPopup] = useState(false);
  const [aiPopupSeen, setAiPopupSeen] = useState(false);

  // IA extraction
  const [aiAvailable, setAiAvailable] = useState(false);
  const [aiLoading,   setAiLoading]   = useState(false);
  const [aiDone,      setAiDone]      = useState(false);

  // Formulaire
  const [form, setForm] = useState({
    article_type:       '',
    pdf:                null,
    ai_declaration:     false,
    main_domain:        '',
    selected_subdomains:[],
    funding_acknowledged: '',
    data_availability:  '',
    supplementary_data: '',
    points_confirmed:   [],
    cover_letter:       '',
    title:              '',
    abstract:           '',
    keywords:           '',
    co_authors:         '',
    funding_info:       '',
  });

  // Scroll to top à chaque étape
  useLayoutEffect(() => { window.scrollTo({ top: 0, behavior: 'auto' }); }, [step]);

  // Vérifier dispo IA
  useEffect(() => {
    api.get('/ai/status').then(r => setAiAvailable(r.data.available)).catch(() => {});
  }, []);

  // Popup IA lors de l'entrée en step 2
  useEffect(() => {
    if (step === 2 && !aiPopupSeen) {
      setShowAiPopup(true);
    }
  }, [step]); // eslint-disable-line

  // ── Helpers ────────────────────────────────────────────────
  const setField = (field, value) => {
    setError('');
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const toggleSubdomain = (sub) => {
    setError('');
    setForm(prev => ({
      ...prev,
      selected_subdomains: prev.selected_subdomains.includes(sub)
        ? prev.selected_subdomains.filter(s => s !== sub)
        : [...prev.selected_subdomains, sub],
    }));
  };

  const togglePoint = (point) => {
    setError('');
    setForm(prev => ({
      ...prev,
      points_confirmed: prev.points_confirmed.includes(point)
        ? prev.points_confirmed.filter(p => p !== point)
        : [...prev.points_confirmed, point],
    }));
  };

  const handleFileSelect = (file) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024)                { setError('File must not exceed 10 MB.'); return; }
    const n = file.name.toLowerCase();
    if (!n.endsWith('.pdf') && !n.endsWith('.docx'))  { setError('Only PDF and Word (.docx) files are accepted.'); return; }
    setError(''); setAiDone(false);
    setField('pdf', file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    handleFileSelect(e.dataTransfer.files?.[0]);
  };

  const handleExtractPdf = async () => {
    if (!form.pdf) return;
    setAiLoading(true); setError('');
    try {
      const fd = new FormData();
      fd.append('pdf', form.pdf);
      const res = await api.post('/ai/extract-pdf', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setForm(prev => ({
        ...prev,
        abstract: res.data.abstract || prev.abstract,
        keywords: res.data.keywords || prev.keywords,
        title:    res.data.title    || prev.title,
      }));
      setAiDone(true);
    } catch {
      setError('AI analysis failed. You can fill in the fields manually.');
    } finally { setAiLoading(false); }
  };

  const wordCount = (t) => t.trim() ? t.trim().split(/\s+/).length : 0;

  // ── Validation ─────────────────────────────────────────────
  const validateStep = () => {
    if (step === 1 && !form.article_type)
      return 'Please select an article type.';
    if (step === 2 && !form.pdf)
      return 'Please attach your manuscript file (PDF or Word, max 10 MB).';
    if (step === 3) {
      if (!form.main_domain)               return 'Please select a main research domain.';
      if (!form.selected_subdomains.length) return 'Please select at least one sub-domain.';
    }
    if (step === 4) {
      if (!form.funding_acknowledged) return 'Please answer the funding acknowledgement question.';
      if (!form.data_availability)    return 'Please select a data availability statement.';
      if (!form.supplementary_data)   return 'Please indicate how supplementary material is provided.';
      if (form.points_confirmed.length < CONFIRMATION_POINTS.length)
        return `Please confirm all ${CONFIRMATION_POINTS.length} compliance points before proceeding.`;
    }
    if (step === 6) {
      if (!form.title.trim())           return 'Article title is required.';
      if (form.abstract.trim().length < 100) return 'Abstract must be at least 100 characters long.';
      if (wordCount(form.abstract) > 250) return 'Abstract must not exceed 250 words.';
      if (!form.keywords.trim())        return 'At least 3 keywords are required.';
    }
    return '';
  };

  // ── Navigation ─────────────────────────────────────────────
  const back = () => { setError(''); setStep(s => s - 1); };
  const next = () => {
    const err = validateStep();
    if (err) { setError(err); return; }
    setError('');
    setStep(s => s + 1);
  };

  // ── Soumission finale ──────────────────────────────────────
  const handleSubmit = async () => {
    setSubmitting(true); setError('');
    try {
      const fd = new FormData();
      fd.append('title',         form.title.trim());
      fd.append('abstract',      form.abstract.trim());
      fd.append('keywords',      form.keywords.trim());
      fd.append('research_area', form.selected_subdomains[0] || '');
      fd.append('article_type',  form.article_type);
      fd.append('cover_letter',  form.cover_letter || '');
      fd.append('ai_declaration', form.ai_declaration ? '1' : '0');
      if (form.co_authors?.trim()) fd.append('co_authors', form.co_authors.trim());
      fd.append('pdf', form.pdf);

      const res = await api.post('/submissions', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      navigate(`/author/submissions/${res.data.submission.id}/payment`);
    } catch (err) {
      setError(err.response?.data?.message || 'Error creating submission. Please try again.');
      setSubmitting(false);
    }
  };

  // ── Texte d'aide contextuel ────────────────────────────────
  const GUIDE = {
    1: 'Choose the article type for your submission from the drop-down menu.',
    2: 'Provide a single file containing your manuscript now. The file size should be less than 10 MB. If you upload a Word file, metadata such as title, abstract and keywords may be extracted automatically.',
    3: 'Identify your submission\'s areas of research and specialization by selecting a main domain and at least one sub-domain.',
    4: 'Please respond to the presented questions and statements.',
    5: 'Enter any additional comments or a cover letter you would like to send to the editorial office. These comments will not appear directly in your submission.',
    6: 'When possible these fields will be populated with information collected from your uploaded file. Please review all fields carefully and fill in any missing details.',
    7: 'Please review your complete submission before sending. Click "Edit" on any section to make changes.',
  };

  // ══════════════════════════════════════════════════════════
  return (
    <DashboardLayout>
      <style>{`@keyframes jaei-spin { to { transform: rotate(360deg); } }`}</style>

      {/* ── Popup IA (step 2 — une seule fois) ── */}
      {showAiPopup && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)',
          zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
        }}>
          <div style={{ background: '#fff', borderRadius: 4, maxWidth: 520, width: '100%', border: '1px solid #D1D5DB', boxShadow: '0 8px 32px rgba(0,0,0,.18)' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid #E5E7EB' }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#111', margin: 0 }}>
                Did you use generative AI to prepare this manuscript?
              </h3>
            </div>
            <div style={{ padding: '16px 24px', fontSize: 13, color: '#374151', lineHeight: 1.7 }}>
              <p style={{ margin: '0 0 12px' }}>
                <strong style={{ color: '#1B4427' }}>Generative AI is not an author.</strong> These AI tools should always be used with human oversight and control. If you used generative AI or AI-assisted technology, please include the following statement directly before the references at the end of your manuscript.
              </p>
              <div style={{ background: '#F3F4F6', borderRadius: 4, padding: '12px 16px', fontSize: 12, color: '#6B7280' }}>
                <p style={{ fontWeight: 700, margin: '0 0 6px', color: '#374151' }}>
                  Declaration of generative AI and AI-assisted technologies in the manuscript preparation process
                </p>
                <p style={{ margin: 0, fontStyle: 'italic' }}>
                  "During the preparation of this work the author(s) used [NAME OF TOOL] in order to [REASON]. After using this tool/service, the author(s) reviewed and edited the content as needed and take(s) full responsibility for the content of the published article."
                </p>
              </div>
            </div>
            <div style={{ padding: '12px 24px 18px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setShowAiPopup(false); setAiPopupSeen(true); }}
                style={{ background: '#1B4427', color: '#fff', border: 'none', borderRadius: 4, padding: '8px 28px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ maxWidth: 920, margin: '0 auto' }}>
        {/* Titre page */}
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111', margin: 0 }}>Submit an article</h1>
          <p style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>
            Please complete all steps to finalize your submission.
          </p>
        </div>

        {/* Card principale */}
        <div style={{ background: '#fff', border: '1px solid #D1D5DB', borderRadius: 4, boxShadow: '0 1px 4px rgba(0,0,0,.07)', overflow: 'hidden' }}>

          {/* Barre de navigation supérieure (comme la nav SD) */}
          <div style={{ background: '#1B4427', padding: '10px 24px', display: 'flex', alignItems: 'center', gap: 20 }}>
            <span style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>JAEI — Submit a Manuscript</span>
            <span style={{ color: '#A7D7B8', fontSize: 12 }}>Journal of Applied Environmental Intelligence</span>
          </div>

          {/* Barre de progression */}
          <div style={{ borderBottom: '1px solid #E5E7EB', padding: '0 16px 12px' }}>
            <StepBar current={step} />
          </div>

          {/* Corps du wizard : guidance gauche + contenu droite */}
          <div style={{ display: 'flex', gap: 0 }}>

            {/* Colonne de guidance (style SD) */}
            <div style={{ width: 200, flexShrink: 0, padding: '28px 20px 28px 24px', borderRight: '1px solid #F3F4F6' }}>
              <p style={{ fontSize: 12, color: '#6B7280', fontStyle: 'italic', lineHeight: 1.7, margin: 0 }}>
                {GUIDE[step]}
              </p>
            </div>

            {/* Contenu principal */}
            <div style={{ flex: 1, padding: '28px 32px' }}>

              {/* Erreur */}
              {error && (
                <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', padding: '10px 14px', borderRadius: 4, fontSize: 13, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Ic.Alert /> {error}
                </div>
              )}

              {/* ══ ÉTAPE 1 — Article Type ══════════════════════ */}
              {step === 1 && (
                <SectionCard title="Select Article Type">
                  {/* Guidelines */}
                  <div style={{ fontSize: 12.5, color: '#374151', lineHeight: 1.75, paddingBottom: 18, marginBottom: 18, borderBottom: '1px solid #E5E7EB' }}>
                    <p style={{ fontWeight: 700, margin: '0 0 10px' }}>Author Submission Guidelines</p>
                    <p style={{ margin: '0 0 7px' }}><strong>Title & Author Information:</strong> Ensure that the full and final name list of all authors and affiliations, including the corresponding author's contact details, are accurate and final.</p>
                    <p style={{ margin: '0 0 7px' }}><strong>Figures:</strong> Submit high-resolution figures (≥300 dpi) as separate TIFF, EPS, or JPEG files. Number figures sequentially and cite them appropriately in the text.</p>
                    <p style={{ margin: '0 0 7px' }}><strong>Tables:</strong> Provide tables as editable text (not images). Number them sequentially and include descriptive captions.</p>
                    <p style={{ margin: 0 }}><strong>Authorship:</strong> The editorial team will generally not consider changes to authorship once a manuscript has been submitted. Provide a definitive author list at original submission.</p>
                  </div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                    Article type <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <select
                    value={form.article_type}
                    onChange={e => setField('article_type', e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', fontSize: 13, border: '1px solid #D1D5DB', borderRadius: 4, outline: 'none', color: form.article_type ? '#111' : '#9CA3AF', background: '#fff', cursor: 'pointer' }}
                  >
                    <option value="">— Select an article type —</option>
                    {ARTICLE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </SectionCard>
              )}

              {/* ══ ÉTAPE 2 — Attach Files ══════════════════════ */}
              {step === 2 && (
                <>
                  <SectionCard title="Attach Files" noPad>
                    <div style={{ padding: '18px 20px' }}>
                      {!form.pdf ? (
                        <div
                          onDrop={handleDrop}
                          onDragOver={e => e.preventDefault()}
                          onClick={() => fileRef.current?.click()}
                          style={{
                            border: '2px dashed #D1D5DB', borderRadius: 4,
                            padding: '40px 24px', textAlign: 'center', cursor: 'pointer',
                            color: '#9CA3AF', display: 'flex', flexDirection: 'column',
                            alignItems: 'center', gap: 10, transition: 'all .2s',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = '#1B4427'; e.currentTarget.style.color = '#1B4427'; e.currentTarget.style.background = '#F0FDF4'; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = '#D1D5DB'; e.currentTarget.style.color = '#9CA3AF'; e.currentTarget.style.background = 'transparent'; }}
                        >
                          <Ic.Upload />
                          <div>
                            <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 600 }}>Browse… or Drag & Drop Files Here</p>
                            <p style={{ margin: 0, fontSize: 12 }}>PDF or Word (.docx) — 10 MB maximum</p>
                          </div>
                        </div>
                      ) : (
                        /* Fichier uploadé */
                        <div>
                          <p style={{ fontSize: 12, color: '#6B7280', marginBottom: 10 }}>
                            The order in which the attached items appear is the order they will appear in the PDF.
                          </p>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                            <thead>
                              <tr style={{ background: '#F3F4F6', borderBottom: '1px solid #E5E7EB' }}>
                                {['#', 'Description', 'File Name', 'Size', 'Last Modified', 'Action'].map(h => (
                                  <th key={h} style={{ padding: '7px 10px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
                                <td style={{ padding: '9px 10px', color: '#6B7280' }}>1</td>
                                <td style={{ padding: '9px 10px' }}>Manuscript</td>
                                <td style={{ padding: '9px 10px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#1B4427' }}>
                                    <Ic.File /> {form.pdf.name}
                                  </div>
                                </td>
                                <td style={{ padding: '9px 10px', color: '#6B7280' }}>{(form.pdf.size / 1024).toFixed(0)} KB</td>
                                <td style={{ padding: '9px 10px', color: '#6B7280' }}>{new Date().toLocaleDateString()}</td>
                                <td style={{ padding: '9px 10px' }}>
                                  <button
                                    onClick={() => { setField('pdf', null); setAiDone(false); if (fileRef.current) fileRef.current.value = ''; }}
                                    style={{ fontSize: 12, color: '#DC2626', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                                  >Remove</button>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                          <div style={{ marginTop: 8, textAlign: 'right' }}>
                            <button
                              onClick={() => fileRef.current?.click()}
                              style={{ fontSize: 12, color: '#1B4427', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                            >Replace file</button>
                          </div>
                        </div>
                      )}
                      <input ref={fileRef} type="file" accept=".pdf,.docx" style={{ display: 'none' }} onChange={e => handleFileSelect(e.target.files?.[0])} />
                    </div>
                  </SectionCard>

                  {/* Déclaration IA */}
                  <SectionCard title="AI Usage Declaration">
                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', fontSize: 13, color: '#374151', lineHeight: 1.65 }}>
                      <input
                        type="checkbox"
                        checked={form.ai_declaration}
                        onChange={e => setField('ai_declaration', e.target.checked)}
                        style={{ marginTop: 2, accentColor: '#1B4427', flexShrink: 0, width: 14, height: 14 }}
                      />
                      I confirm that if generative AI was used in the preparation of this manuscript, a proper declaration statement has been included directly before the references, following JAEI's AI usage policy.
                    </label>
                  </SectionCard>

                  {/* Déclaration d'intérêts */}
                  <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 4, padding: '12px 16px', fontSize: 12.5, color: '#92400E', lineHeight: 1.65 }}>
                    <strong>Declaration of Interests:</strong> All authors must disclose any financial or personal relationships that may be perceived as influencing their work. Complete JAEI's Declaration of Interests form. Additional instructions may appear after uploading your main file.
                  </div>
                </>
              )}

              {/* ══ ÉTAPE 3 — Research Domain ═══════════════════ */}
              {step === 3 && (
                <SectionCard title="Research Domain">
                  <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 20, lineHeight: 1.65 }}>
                    Please identify your submission's areas of research by selecting a main domain and at least one sub-domain.
                  </p>

                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                    Main Domain <span style={{ color: '#DC2626' }}>*</span>
                    <span style={{ fontWeight: 400, color: '#9CA3AF', fontSize: 12, marginLeft: 6 }}>Select 1</span>
                  </label>
                  <select
                    value={form.main_domain}
                    onChange={e => {
                      setError('');
                      setForm(prev => ({ ...prev, main_domain: e.target.value, selected_subdomains: [] }));
                    }}
                    style={{ width: '100%', padding: '10px 14px', fontSize: 13, border: '1px solid #D1D5DB', borderRadius: 4, outline: 'none', color: form.main_domain ? '#111' : '#9CA3AF', background: '#fff', marginBottom: 24 }}
                  >
                    <option value="">— Select a main domain —</option>
                    {MAIN_DOMAINS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>

                  {form.main_domain && (
                    <>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                        Sub-domains <span style={{ color: '#DC2626' }}>*</span>
                        <span style={{ fontWeight: 400, color: '#9CA3AF', fontSize: 12, marginLeft: 6 }}>Select at least 1</span>
                      </label>
                      <div style={{ border: '1px solid #E5E7EB', borderRadius: 4, overflow: 'hidden' }}>
                        {(DOMAIN_MAP[form.main_domain] || []).map((sub, i, arr) => (
                          <label
                            key={sub}
                            style={{
                              display: 'flex', alignItems: 'flex-start', gap: 10,
                              padding: '11px 16px', cursor: 'pointer',
                              borderBottom: i < arr.length - 1 ? '1px solid #F3F4F6' : 'none',
                              background: form.selected_subdomains.includes(sub) ? '#F0FDF4' : '#fff',
                              fontSize: 13, color: '#374151', lineHeight: 1.5, transition: 'background .15s',
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={form.selected_subdomains.includes(sub)}
                              onChange={() => toggleSubdomain(sub)}
                              style={{ marginTop: 2, accentColor: '#1B4427', flexShrink: 0 }}
                            />
                            {sub}
                          </label>
                        ))}
                      </div>

                      {form.selected_subdomains.length > 0 && (
                        <div style={{ marginTop: 14, fontSize: 12.5 }}>
                          <strong style={{ color: '#1B4427' }}>Selected ({form.selected_subdomains.length}):</strong>{' '}
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                            {form.selected_subdomains.map(s => (
                              <span key={s} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#D1FAE5', color: '#065F46', padding: '3px 10px', borderRadius: 12, fontSize: 11.5, fontWeight: 500 }}>
                                {s}
                                <button onClick={() => toggleSubdomain(s)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#065F46', padding: 0, lineHeight: 1, fontSize: 14, fontWeight: 700 }}>×</button>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </SectionCard>
              )}

              {/* ══ ÉTAPE 4 — Additional Information ════════════ */}
              {step === 4 && (
                <>
                  {/* Q1 — Financement */}
                  <SectionCard title="Funding Acknowledgement">
                    <p style={{ fontSize: 13, color: '#374151', marginBottom: 16, lineHeight: 1.65 }}>
                      Please confirm that you have mentioned all organizations that funded your research in the Acknowledgements section, including grant numbers where appropriate.
                    </p>
                    {[
                      { v: 'yes', l: 'I confirm that I have mentioned all organizations that funded my research in the Acknowledgements section of my submission, including grant numbers where appropriate.' },
                      { v: 'na',  l: 'Not applicable — this research received no specific grant from any funding agency in the public, commercial, or not-for-profit sectors.' },
                    ].map(opt => (
                      <label key={opt.v} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', fontSize: 13, color: '#374151', lineHeight: 1.65, marginBottom: 12 }}>
                        <input type="radio" name="funding" value={opt.v} checked={form.funding_acknowledged === opt.v} onChange={() => setField('funding_acknowledged', opt.v)} style={{ marginTop: 3, accentColor: '#1B4427', flexShrink: 0 }} />
                        {opt.l}
                      </label>
                    ))}
                  </SectionCard>

                  {/* Q2 — Disponibilité données */}
                  <SectionCard title="Research Data Availability">
                    <p style={{ fontSize: 13, color: '#374151', marginBottom: 16, lineHeight: 1.65 }}>
                      Select the statement which best reflects the availability of your research data and code. This statement will be published alongside your article.
                    </p>
                    {[
                      { v: 'repository', l: 'The data and code that support the findings are openly available in a public repository.' },
                      { v: 'request',    l: 'The data that support the findings of this study are available upon reasonable request from the corresponding author.' },
                      { v: 'none',       l: 'No research data was used for the preparation of this manuscript.' },
                      { v: 'na',         l: 'Not applicable.' },
                    ].map(opt => (
                      <label key={opt.v} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', fontSize: 13, color: '#374151', lineHeight: 1.65, marginBottom: 10 }}>
                        <input type="radio" name="data" value={opt.v} checked={form.data_availability === opt.v} onChange={() => setField('data_availability', opt.v)} style={{ marginTop: 3, accentColor: '#1B4427', flexShrink: 0 }} />
                        {opt.l}
                      </label>
                    ))}
                  </SectionCard>

                  {/* Q3 — Matériel supplémentaire */}
                  <SectionCard title="Supplementary Material">
                    <p style={{ fontSize: 13, color: '#374151', marginBottom: 16, lineHeight: 1.65 }}>
                      The authors confirm that the supplementary data (if available) are provided as separate files and have been included as:
                    </p>
                    {[
                      { v: 'appendix', l: 'Appendix as part of the article.' },
                      { v: 'online',   l: 'Online supplementary material (uploaded as a separate file).' },
                      { v: 'na',       l: 'Not applicable — no supplementary data.' },
                    ].map(opt => (
                      <label key={opt.v} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', fontSize: 13, color: '#374151', lineHeight: 1.65, marginBottom: 10 }}>
                        <input type="radio" name="suppl" value={opt.v} checked={form.supplementary_data === opt.v} onChange={() => setField('supplementary_data', opt.v)} style={{ marginTop: 3, accentColor: '#1B4427', flexShrink: 0 }} />
                        {opt.l}
                      </label>
                    ))}
                  </SectionCard>

                  {/* Q4 — Points à confirmer */}
                  <SectionCard title="Points to be Confirmed">
                    <p style={{ fontSize: 12.5, color: '#DC2626', fontWeight: 600, marginBottom: 16, lineHeight: 1.65 }}>
                      Papers which do not respect the following conditions may be desk-rejected without being sent to reviewers. Please check and confirm that the manuscript follows all of the points below.
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
                      {CONFIRMATION_POINTS.map(point => (
                        <label key={point} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', fontSize: 13, color: '#374151', lineHeight: 1.65 }}>
                          <input
                            type="checkbox"
                            checked={form.points_confirmed.includes(point)}
                            onChange={() => togglePoint(point)}
                            style={{ marginTop: 3, accentColor: '#1B4427', flexShrink: 0, width: 14, height: 14 }}
                          />
                          {point}
                        </label>
                      ))}
                    </div>
                    <div style={{ marginTop: 14, display: 'flex', gap: 12 }}>
                      <button onClick={() => setForm(p => ({ ...p, points_confirmed: [...CONFIRMATION_POINTS] }))} style={{ fontSize: 12, color: '#1B4427', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Select All</button>
                      <button onClick={() => setForm(p => ({ ...p, points_confirmed: [] }))} style={{ fontSize: 12, color: '#6B7280', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Clear All</button>
                    </div>
                  </SectionCard>
                </>
              )}

              {/* ══ ÉTAPE 5 — Comments ══════════════════════════ */}
              {step === 5 && (
                <SectionCard title="Enter Comments">
                  <p style={{ fontSize: 13, color: '#374151', marginBottom: 16, lineHeight: 1.65 }}>
                    Please enter any additional comments you would like to send to the editorial office. These comments will <strong>not</strong> appear directly in your submission.
                  </p>
                  <textarea
                    value={form.cover_letter}
                    onChange={e => setField('cover_letter', e.target.value)}
                    rows={10}
                    placeholder="Optional: cover letter or comments to the editorial team..."
                    style={{ width: '100%', padding: '10px 14px', fontSize: 13, border: '1px solid #D1D5DB', borderRadius: 4, outline: 'none', resize: 'vertical', lineHeight: 1.65, fontFamily: 'inherit', boxSizing: 'border-box' }}
                    onFocus={e => e.target.style.borderColor = '#1B4427'}
                    onBlur={e => e.target.style.borderColor = '#D1D5DB'}
                  />
                </SectionCard>
              )}

              {/* ══ ÉTAPE 6 — Manuscript Data ═══════════════════ */}
              {step === 6 && (
                <>
                  <p style={{ fontSize: 12, color: '#6B7280', marginBottom: 20, fontStyle: 'italic', lineHeight: 1.6 }}>
                    When possible these fields will be populated with information collected from your uploaded file. Steps requiring review will be marked with a warning icon (⚠). Please review these fields carefully.
                  </p>

                  {/* IA extraction */}
                  {aiAvailable && form.pdf && (
                    <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 4, padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                          <Ic.Sparkles />
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#1B4427' }}>AI Extraction</span>
                          <span style={{ fontSize: 10, background: '#DCFCE7', color: '#15803D', padding: '1px 7px', borderRadius: 10, fontWeight: 700 }}>Gemini</span>
                        </div>
                        <p style={{ fontSize: 12, color: '#6B7280', margin: 0 }}>
                          {aiDone ? 'Fields pre-filled from your PDF. Review and edit as needed.' : 'Extract title, abstract and keywords automatically from your PDF.'}
                        </p>
                      </div>
                      <button
                        onClick={handleExtractPdf} disabled={aiLoading}
                        style={{ background: '#1B4427', color: '#fff', border: 'none', borderRadius: 4, padding: '7px 16px', fontSize: 12, fontWeight: 600, cursor: aiLoading ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: 6, opacity: aiLoading ? .7 : 1, flexShrink: 0 }}
                      >
                        {aiLoading ? <><Spinner /> Analyzing…</> : aiDone ? <><Ic.Check /> Re-analyze</> : <><Ic.Sparkles /> Analyze with AI</>}
                      </button>
                    </div>
                  )}

                  {/* Titre */}
                  <SectionCard title="Title" hasError={!form.title.trim()}>
                    <p style={{ fontSize: 12, color: '#DC2626', marginBottom: 10 }}>No acronyms may be used in the title.</p>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                      Full Title <span style={{ color: '#DC2626' }}>*</span>
                    </label>
                    <textarea
                      value={form.title} onChange={e => setField('title', e.target.value)}
                      rows={2} placeholder="Enter the full title of your article"
                      style={{ width: '100%', padding: '10px 14px', fontSize: 14, border: '1px solid #D1D5DB', borderRadius: 4, outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }}
                      onFocus={e => e.target.style.borderColor = '#1B4427'}
                      onBlur={e => e.target.style.borderColor = '#D1D5DB'}
                    />
                  </SectionCard>

                  {/* Abstract */}
                  <SectionCard title="Abstract" hasError={!form.abstract.trim()}>
                    <p style={{ fontSize: 12, color: '#DC2626', marginBottom: 10 }}>Any acronyms used in the abstract must be defined on first use.</p>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                      Abstract <span style={{ color: '#DC2626' }}>*</span>
                      <span style={{ fontWeight: 400, color: '#9CA3AF', fontSize: 12, marginLeft: 6 }}>Limit 250 words</span>
                    </label>
                    <textarea
                      value={form.abstract} onChange={e => setField('abstract', e.target.value)}
                      rows={8} placeholder="Write a clear, structured abstract (background, methods, results, conclusion)..."
                      style={{ width: '100%', padding: '10px 14px', fontSize: 13, border: '1px solid #D1D5DB', borderRadius: 4, outline: 'none', resize: 'vertical', lineHeight: 1.65, fontFamily: 'inherit', boxSizing: 'border-box' }}
                      onFocus={e => e.target.style.borderColor = '#1B4427'}
                      onBlur={e => e.target.style.borderColor = '#D1D5DB'}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5, fontSize: 12 }}>
                      <span style={{ color: form.abstract.trim().length < 100 ? '#DC2626' : '#9CA3AF' }}>
                        {form.abstract.trim().length} characters (min 100)
                      </span>
                      <span style={{ color: wordCount(form.abstract) > 250 ? '#DC2626' : '#9CA3AF' }}>
                        {wordCount(form.abstract)} / 250 words
                      </span>
                    </div>
                  </SectionCard>

                  {/* Keywords */}
                  <SectionCard title="Keywords">
                    <p style={{ fontSize: 12, color: '#DC2626', marginBottom: 10 }}>No acronyms may be used in the keywords.</p>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                      Keywords <span style={{ color: '#DC2626' }}>*</span>
                      <span style={{ fontWeight: 400, color: '#9CA3AF', fontSize: 12, marginLeft: 6 }}>3 to 6 keywords, separated by commas</span>
                    </label>
                    <input
                      value={form.keywords} onChange={e => setField('keywords', e.target.value)}
                      placeholder="e.g. sustainable agriculture, soil carbon, crop yield, tropical soils"
                      style={{ width: '100%', padding: '10px 14px', fontSize: 13, border: '1px solid #D1D5DB', borderRadius: 4, outline: 'none', boxSizing: 'border-box' }}
                      onFocus={e => e.target.style.borderColor = '#1B4427'}
                      onBlur={e => e.target.style.borderColor = '#D1D5DB'}
                    />
                  </SectionCard>

                  {/* Authors */}
                  <SectionCard title="Authors">
                    <p style={{ fontSize: 12, color: '#6B7280', marginBottom: 14, lineHeight: 1.65 }}>
                      The corresponding author will communicate with the editorial office during the review process.
                    </p>
                    <div style={{ border: '1px solid #E5E7EB', borderRadius: 4, marginBottom: 16, overflow: 'hidden' }}>
                      <div style={{ padding: '7px 14px', background: '#F3F4F6', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, color: '#374151' }}>
                        <span>Current Author List</span>
                      </div>
                      <div style={{ padding: '10px 14px', fontSize: 13, color: '#374151' }}>
                        👤 <strong>{user?.first_name} {user?.last_name}</strong>{' '}
                        <span style={{ fontSize: 12, color: '#6B7280' }}>[Corresponding Author] [First Author] [You]</span>
                      </div>
                    </div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                      Co-authors <span style={{ fontSize: 12, fontWeight: 400, color: '#9CA3AF' }}>(optional)</span>
                    </label>
                    <input
                      value={form.co_authors} onChange={e => setField('co_authors', e.target.value)}
                      placeholder="e.g. Jean Dupont (Université de Yaoundé), Marie Martin (CIRAD)"
                      style={{ width: '100%', padding: '10px 14px', fontSize: 13, border: '1px solid #D1D5DB', borderRadius: 4, outline: 'none', boxSizing: 'border-box' }}
                      onFocus={e => e.target.style.borderColor = '#1B4427'}
                      onBlur={e => e.target.style.borderColor = '#D1D5DB'}
                    />
                    <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 5 }}>Separate names with commas. Include institution in parentheses if possible.</p>
                  </SectionCard>

                  {/* Funding Information */}
                  <SectionCard title="Funding Information">
                    <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 12, lineHeight: 1.65 }}>
                      Enter any funding organization or grant number. If funding information is not available, leave this field empty.
                    </p>
                    <input
                      value={form.funding_info} onChange={e => setField('funding_info', e.target.value)}
                      placeholder="e.g. Ministry of Agriculture of Cameroon, Grant #MINSANTE-2024-003"
                      style={{ width: '100%', padding: '10px 14px', fontSize: 13, border: '1px solid #D1D5DB', borderRadius: 4, outline: 'none', boxSizing: 'border-box' }}
                      onFocus={e => e.target.style.borderColor = '#1B4427'}
                      onBlur={e => e.target.style.borderColor = '#D1D5DB'}
                    />
                  </SectionCard>
                </>
              )}

              {/* ══ ÉTAPE 7 — Review & Submit ═══════════════════ */}
              {step === 7 && (
                <>
                  <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 4, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#065F46', lineHeight: 1.65 }}>
                    ✅ All required steps completed. Please review your submission details before final submission. Click <strong>Edit</strong> on any section to make changes.
                  </div>

                  <SummaryRow label="Article Type" onEdit={() => setStep(1)}>
                    <span style={{ fontWeight: 600 }}>{form.article_type}</span>
                  </SummaryRow>

                  <SummaryRow label="Manuscript File" onEdit={() => setStep(2)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#1B4427' }}>
                      <Ic.File /> {form.pdf?.name}
                      <span style={{ color: '#9CA3AF', fontSize: 12 }}>({(form.pdf?.size / 1024).toFixed(0)} KB)</span>
                    </div>
                    {form.ai_declaration && <p style={{ fontSize: 12, color: '#6B7280', margin: '4px 0 0' }}>✓ AI usage declaration confirmed</p>}
                  </SummaryRow>

                  <SummaryRow label="Research Domain" onEdit={() => setStep(3)}>
                    <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 6 }}>{form.main_domain}</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {form.selected_subdomains.map(s => (
                        <span key={s} style={{ background: '#D1FAE5', color: '#065F46', padding: '2px 9px', borderRadius: 12, fontSize: 11.5 }}>{s}</span>
                      ))}
                    </div>
                  </SummaryRow>

                  <SummaryRow label="Additional Information" onEdit={() => setStep(4)}>
                    <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: '#6B7280', lineHeight: 1.85 }}>
                      <li>Funding: {form.funding_acknowledged === 'yes' ? 'Acknowledged in the manuscript' : 'Not applicable'}</li>
                      <li>Data availability: {form.data_availability}</li>
                      <li>Supplementary material: {form.supplementary_data}</li>
                      <li>{form.points_confirmed.length}/{CONFIRMATION_POINTS.length} compliance points confirmed</li>
                    </ul>
                  </SummaryRow>

                  <SummaryRow label="Cover Letter / Comments" onEdit={() => setStep(5)}>
                    {form.cover_letter
                      ? <span style={{ fontSize: 13, color: '#374151' }}>{form.cover_letter.length > 180 ? form.cover_letter.substring(0, 180) + '…' : form.cover_letter}</span>
                      : <span style={{ fontSize: 13, color: '#9CA3AF', fontStyle: 'italic' }}>(none)</span>}
                  </SummaryRow>

                  <SummaryRow label="Title" onEdit={() => setStep(6)}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>{form.title}</span>
                  </SummaryRow>

                  <SummaryRow label="Abstract" onEdit={() => setStep(6)}>
                    <span style={{ fontSize: 12.5, color: '#374151', lineHeight: 1.65 }}>
                      {form.abstract.length > 220 ? form.abstract.substring(0, 220) + '…' : form.abstract}
                    </span>
                    <p style={{ fontSize: 11, color: '#9CA3AF', margin: '4px 0 0' }}>{wordCount(form.abstract)} words</p>
                  </SummaryRow>

                  <SummaryRow label="Keywords" onEdit={() => setStep(6)}>
                    <span style={{ fontSize: 13 }}>{form.keywords}</span>
                  </SummaryRow>

                  <SummaryRow label="Authors" onEdit={() => setStep(6)}>
                    <div style={{ fontSize: 13 }}>
                      <strong>{user?.first_name} {user?.last_name}</strong> <span style={{ color: '#6B7280', fontSize: 12 }}>(Corresponding Author)</span>
                      {form.co_authors && <div style={{ color: '#6B7280', marginTop: 3, fontSize: 12.5 }}>Co-authors: {form.co_authors}</div>}
                    </div>
                  </SummaryRow>
                </>
              )}

            </div>{/* fin contenu principal */}
          </div>{/* fin flex guidance+contenu */}

          {/* ── Boutons de navigation ── */}
          <div style={{
            padding: '14px 32px', borderTop: '1px solid #E5E7EB',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            background: '#FAFAFA',
          }}>
            {step > 1 ? (
              <button
                onClick={back}
                style={{ padding: '8px 20px', fontSize: 13, fontWeight: 600, background: '#fff', border: '1px solid #D1D5DB', borderRadius: 4, cursor: 'pointer', color: '#374151', display: 'flex', alignItems: 'center', gap: 6 }}
                onMouseEnter={e => e.currentTarget.style.background = '#F3F4F6'}
                onMouseLeave={e => e.currentTarget.style.background = '#fff'}
              >
                ← Back
              </button>
            ) : (
              <button
                onClick={() => navigate('/author/dashboard')}
                style={{ padding: '8px 20px', fontSize: 13, fontWeight: 500, background: '#fff', border: '1px solid #D1D5DB', borderRadius: 4, cursor: 'pointer', color: '#6B7280' }}
              >
                Cancel
              </button>
            )}

            {step < 7 ? (
              <button
                onClick={next}
                style={{ padding: '8px 28px', fontSize: 13, fontWeight: 700, background: '#1B5E8A', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                onMouseEnter={e => e.currentTarget.style.background = '#174e74'}
                onMouseLeave={e => e.currentTarget.style.background = '#1B5E8A'}
              >
                Proceed →
              </button>
            ) : (
              <button
                onClick={handleSubmit} disabled={submitting}
                style={{ padding: '8px 28px', fontSize: 13, fontWeight: 700, background: submitting ? '#9CA3AF' : '#1B4427', color: '#fff', border: 'none', borderRadius: 4, cursor: submitting ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
              >
                {submitting ? <><Spinner /> Submitting…</> : 'Submit Manuscript →'}
              </button>
            )}
          </div>

        </div>{/* fin card principale */}
      </div>
    </DashboardLayout>
  );
}
