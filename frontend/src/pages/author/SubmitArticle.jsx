import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
// domains.js n'est plus utilisé (saisie libre du domaine)

// ============================================================
// SubmitArticle — Wizard 7 étapes (style ScienceDirect)
// 1. Article Type       4. Additional Info
// 2. Attach Files       5. Comments
// 3. Research Domain    6. Manuscript Data
//                       7. Review & Submit
// ============================================================

const ARTICLE_TYPES = [
  'Articles / Original Research Papers',
  'Analysis',
  'Brief Communication',
  'Correspondence',
  'Feature',
  'Letters to the Editor',
  'Registered Report',
  'Review / Mini Reviews',
  'Opinions',
  'Perspective',
  'Short Comments',
  'Short Communications',
  'Special Issues',
  'Technical Advances / Technical Notes',
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

// 14 types de documents (liste Elsevier / Editorial Manager — demande client)
const DOC_TYPES = [
  'Manuscript',
  'Declaration of Interest Statement',
  'Author Agreement',
  'Cover Letter',
  'Detailed Response to Reviewers',
  'Graphical Abstract (for review)',
  'Highlights (for review)',
  'Figure',
  'Table',
  'e-component',
  'Video Still',
  'Supplementary Material for on-line publication only',
  'Macro and style files',
  'Video',
];

// Types requis (préfixés d'une * dans les dropdowns + checklist "Required For Submission", comme ScienceDirect)
const REQUIRED_DOC_TYPES = ['Manuscript', 'Declaration of Interest Statement'];

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
const StepBar = ({ current, maxStep, onGoTo }) => (
  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '14px 16px 0' }}>
    {STEPS.map((s, i) => {
      const done      = s.num < current || (s.num !== current && s.num <= maxStep);
      const active    = current === s.num;
      const clickable = done; // toute étape déjà atteinte (avant ou après) est cliquable

      return (
        <div key={s.num} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? '1 1 auto' : 'none' }}>
          <div
            onClick={() => clickable && onGoTo(s.num)}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 54,
              cursor: clickable ? 'pointer' : 'default',
            }}
            title={clickable ? `Go to ${s.label.replace('\n', ' ')}` : undefined}
          >
            <div style={{
              width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
              background: done ? '#1B4427' : '#fff',
              border: `2px solid ${done || active ? '#1B4427' : '#D1D5DB'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700,
              color: done ? '#fff' : active ? '#1B4427' : '#9CA3AF',
              transition: 'opacity .15s',
            }}
              onMouseEnter={e => { if (clickable) e.currentTarget.style.opacity = '.75'; }}
              onMouseLeave={e => { if (clickable) e.currentTarget.style.opacity = '1'; }}
            >
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

// ── SectionCard — accordéon repliable (clic sur la bande = plier/déplier) ──
const SectionCard = ({ title, children, hasError, noPad, defaultOpen = true }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ border: '1px solid #D1D5DB', borderRadius: 4, overflow: 'hidden', marginBottom: 16 }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          background: '#1B4427', color: '#fff', padding: '9px 16px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          cursor: 'pointer', userSelect: 'none',
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 9 }}>
          {/* Bouton +/− (style Editorial Manager) */}
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 16, height: 16, borderRadius: 3, flexShrink: 0,
            border: '1px solid rgba(255,255,255,0.55)', background: 'rgba(255,255,255,0.12)',
            fontSize: 15, lineHeight: 1, fontWeight: 700,
          }}>{open ? '−' : '+'}</span>
          {title}
        </span>
        {hasError && <span style={{ fontSize: 13, color: '#FCA5A5' }}>⚠</span>}
      </div>
      {open && <div style={{ padding: noPad ? 0 : '18px 20px' }}>{children}</div>}
    </div>
  );
};

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
  const [maxStep,    setMaxStep]    = useState(1); // étape la plus loin atteinte
  const [error,      setError]      = useState('');
  const [submitting, setSubmitting] = useState(false);

  // IA extraction
  const [aiAvailable, setAiAvailable] = useState(false);
  const [aiLoading,   setAiLoading]   = useState(false);
  const [aiDone,      setAiDone]      = useState(false);

  // Formulaire
  const [form, setForm] = useState({
    article_type:       '',
    files:              [],   // [{ id, file, type, description }] — multi-fichiers + type/desc par fichier
    research_area:      '',
    funding_acknowledged: '',
    data_availability:  '',
    supplementary_data: '',
    points_confirmed:   [],
    cover_letter:       '',
    comments:           '',
    title:              '',
    abstract:           '',
    keywords:           '',
    authors:            [],   // [{ id, name, email, affiliation, corresponding }]
    funding_info:       '',
  });

  // Étape 2 "Attach Files" — staging façon ScienceDirect (type + description choisis avant d'attacher)
  const [nextType,        setNextType]        = useState('Manuscript');
  const [nextDescription, setNextDescription] = useState('Manuscript');
  const [selectedIds,     setSelectedIds]     = useState([]); // cases "Select" du tableau
  const [bulkType,        setBulkType]        = useState('');  // "Change Item Type of all … to [X]"
  const [bulkFromType,    setBulkFromType]    = useState('');  // "Change Item Type of all [X] files to …"
  const [arxivId,         setArxivId]         = useState('');  // champ arXiv (réplique ScienceDirect)
  const [showSpecialChars, setShowSpecialChars] = useState(false);

  // Scroll to top à chaque étape
  useLayoutEffect(() => { window.scrollTo({ top: 0, behavior: 'auto' }); }, [step]);

  // Vérifier dispo IA
  useEffect(() => {
    api.get('/ai/status').then(r => setAiAvailable(r.data.available)).catch(() => {});
  }, []);

  // ── Helpers ────────────────────────────────────────────────
  const setField = (field, value) => {
    setError('');
    setForm(prev => ({ ...prev, [field]: value }));
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

  // ── Fichiers (multi + type par fichier) ────────────────────
  const addFiles = (fileList) => {
    const incoming = Array.from(fileList || []);
    if (incoming.length === 0) return;
    setError(''); setAiDone(false);
    const valid = [];
    for (const file of incoming) {
      if (file.size > 10 * 1024 * 1024) { setError(`"${file.name}" exceeds 10 MB.`); continue; }
      if (!file.name.toLowerCase().endsWith('.docx')) { setError('Only Word (.docx) files are accepted.'); continue; }
      valid.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, file, type: nextType, description: (nextDescription || nextType) });
    }
    if (valid.length) setForm(prev => ({ ...prev, files: [...prev.files, ...valid] }));
  };
  const removeFile  = (id)       => setForm(prev => ({ ...prev, files: prev.files.filter(f => f.id !== id) }));
  const setFileType = (id, type) => setForm(prev => ({ ...prev, files: prev.files.map(f => f.id === id ? { ...f, type } : f) }));
  const setFileDescription = (id, description) => setForm(prev => ({ ...prev, files: prev.files.map(f => f.id === id ? { ...f, description } : f) }));
  const moveFile = (id, dir) => setForm(prev => {
    const arr = [...prev.files];
    const idx = arr.findIndex(f => f.id === id);
    const to  = idx + dir;
    if (idx < 0 || to < 0 || to >= arr.length) return prev;
    [arr[idx], arr[to]] = [arr[to], arr[idx]];
    return { ...prev, files: arr };
  });
  const toggleSelect   = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const selectAllFiles = ()   => setSelectedIds(form.files.map(f => f.id));
  const clearSelection = ()   => setSelectedIds([]);
  const removeSelected = ()   => { setForm(prev => ({ ...prev, files: prev.files.filter(f => !selectedIds.includes(f.id)) })); setSelectedIds([]); };
  const changeAllTypes = ()   => { if (!bulkType) return; setForm(prev => ({ ...prev, files: prev.files.map(f => (!bulkFromType || f.type === bulkFromType) ? { ...f, type: bulkType } : f) })); };
  const downloadFile   = (file) => { const url = URL.createObjectURL(file); const a = document.createElement('a'); a.href = url; a.download = file.name; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); };
  const downloadSelectedZip = () => { form.files.filter(f => selectedIds.includes(f.id)).forEach(f => downloadFile(f.file)); };

  const handleDrop = (e) => { e.preventDefault(); addFiles(e.dataTransfer.files); };

  // ── Auteurs (liste structurée façon ScienceDirect) ─────────
  const addAuthor = () => setForm(prev => ({
    ...prev,
    authors: [...prev.authors, {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: '', email: '', affiliation: '', corresponding: false,
    }],
  }));
  const removeAuthor     = (id)           => setForm(prev => ({ ...prev, authors: prev.authors.filter(a => a.id !== id) }));
  const setAuthorField   = (id, field, v) => setForm(prev => ({ ...prev, authors: prev.authors.map(a => a.id === id ? { ...a, [field]: v } : a) }));
  const setCorresponding = (id)           => setForm(prev => ({ ...prev, authors: prev.authors.map(a => ({ ...a, corresponding: a.id === id })) }));

  // Fichier "Manuscript" principal (utilisé pour l'extraction IA)
  const manuscriptFile = () => (form.files.find(f => f.type === 'Manuscript') || form.files[0])?.file || null;

  const handleExtractPdf = async () => {
    const mf = manuscriptFile();
    if (!mf) return;
    setAiLoading(true); setError('');
    try {
      const fd = new FormData();
      fd.append('pdf', mf);
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
    if (step === 2) {
      if (form.files.length === 0) return 'Please attach your files (Word .docx).';
      const missing = REQUIRED_DOC_TYPES.filter(t => !form.files.some(f => f.type === t));
      if (missing.length) return `You must attach a file for each required item type before proceeding — missing: ${missing.join(' and ')}.`;
    }
    if (step === 3) {
      if (!form.research_area.trim()) return 'Please enter your research domain.';
    }
    if (step === 4) {
      if (!form.funding_acknowledged) return 'Please answer the funding acknowledgement question.';
      if (!form.data_availability)    return 'Please select a data availability statement.';
      if (!form.supplementary_data)   return 'Please indicate how supplementary material is provided.';
      if (form.points_confirmed.length < CONFIRMATION_POINTS.length)
        return `Please confirm all ${CONFIRMATION_POINTS.length} compliance points before proceeding.`;
    }
    if (step === 5 && !form.cover_letter.trim()) {
      return 'A cover letter is required to proceed.';
    }
    if (step === 6) {
      if (!form.title.trim())           return 'Article title is required.';
      if (form.abstract.trim().length < 100) return 'Abstract must be at least 100 characters long.';
      if (wordCount(form.abstract) > 250) return 'Abstract must not exceed 250 words.';
      if (!form.keywords.trim())        return 'Please provide 4 to 7 keywords, separated by commas.';
      if (form.authors.some(a => !a.name.trim())) return 'Each added author must have a name (or remove the empty row).';
    }
    return '';
  };

  // ── Navigation ─────────────────────────────────────────────
  const back = () => { setError(''); setStep(s => s - 1); };
  const next = () => {
    const err = validateStep();
    if (err) { setError(err); return; }
    setError('');
    setStep(s => {
      const n = s + 1;
      setMaxStep(prev => Math.max(prev, n));
      return n;
    });
  };

  // ── Soumission finale ──────────────────────────────────────
  const handleSubmit = async () => {
    setSubmitting(true); setError('');
    try {
      const fd = new FormData();
      fd.append('title',         form.title.trim());
      fd.append('abstract',      form.abstract.trim());
      fd.append('keywords',      form.keywords.trim());
      fd.append('research_area', form.research_area.trim());
      fd.append('article_type',  form.article_type);
      fd.append('cover_letter',  form.cover_letter || '');
      fd.append('comments',      form.comments || '');
      // Auteurs structurés (JSON) + co_authors texte pour compat d'affichage
      const authorsClean = form.authors
        .filter(a => a.name.trim())
        .map(a => ({ name: a.name.trim(), email: a.email.trim(), affiliation: a.affiliation.trim(), corresponding: !!a.corresponding }));
      fd.append('authors', JSON.stringify(authorsClean));
      if (authorsClean.length) fd.append('co_authors', authorsClean.map(a => a.name).join(', '));
      // Fichiers multiples + types parallèles (même ordre)
      form.files.forEach(f => fd.append('files', f.file));
      fd.append('file_types', JSON.stringify(form.files.map(f => f.type)));
      fd.append('file_descriptions', JSON.stringify(form.files.map(f => f.description || '')));

      const res = await api.post('/submissions', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      navigate(`/author/submissions/${res.data.submission.id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Error creating submission. Please try again.');
      setSubmitting(false);
    }
  };

  // ── Texte d'aide contextuel ────────────────────────────────
  const GUIDE = {
    1: 'Choose the article type for your submission from the drop-down menu.',
    2: 'Attach your manuscript and any additional files (Word .docx only, 10 MB max each). Assign a type to each file (Manuscript, Cover Letter, Figure…). At least one file must be a Manuscript — its metadata (title, abstract, keywords) may be extracted automatically.',
    3: 'Enter the main research domain or specialization area that best describes your submission.',
    4: 'Please respond to the presented questions and statements.',
    5: 'Write your cover letter to the editor (required) and any additional private comments for the editorial office. These will not appear in your published article.',
    6: 'When possible these fields will be populated with information collected from your uploaded file. Please review all fields carefully and fill in any missing details.',
    7: 'Please review your complete submission before sending. Click "Edit" on any section to make changes.',
  };

  // ══════════════════════════════════════════════════════════
  return (
    <DashboardLayout>
      <style>{`@keyframes jaei-spin { to { transform: rotate(360deg); } }`}</style>

      <div style={{ maxWidth: 1320, margin: '0 auto' }}>
        {/* Titre page */}
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111', margin: 0 }}>Submit an article</h1>
          <p style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>
            Please complete all steps to finalize your submission.
          </p>
        </div>

        {/* Card principale */}
        <div style={{ background: '#fff', border: '1px solid #D1D5DB', borderRadius: 4, boxShadow: '0 1px 4px rgba(0,0,0,.07)', overflow: 'hidden' }}>

          {/* Barre de navigation supérieure */}
          <div style={{ background: '#1B4427', padding: '10px 24px', display: 'flex', alignItems: 'center', gap: 20 }}>
            <span style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>Submit a Manuscript</span>
            <span style={{ color: '#A7D7B8', fontSize: 12 }}>Journal of Agricultural and Environmental Innovation</span>
          </div>

          {/* Barre de progression */}
          <div style={{ borderBottom: '1px solid #E5E7EB', padding: '0 16px 12px' }}>
            <StepBar current={step} maxStep={maxStep} onGoTo={(n) => { setError(''); setStep(n); }} />
          </div>

          {/* Corps du wizard : guidance gauche + contenu droite */}
          <div style={{ display: 'flex', gap: 0 }}>

            {/* Colonne de guidance (style SD) */}
            <div style={{ width: 200, flexShrink: 0, padding: '28px 20px 28px 24px', borderRight: '1px solid #F3F4F6' }}>
              {step === 2 ? (
                <div>
                  <p style={{ fontSize: 12.5, fontWeight: 700, color: '#1B4427', margin: '0 0 8px' }}>Required For Submission:</p>
                  {['Manuscript', 'Declaration of Interest Statement'].map(t => {
                    const ok = form.files.some(f => f.type === t);
                    return (
                      <p key={t} style={{ fontSize: 12, margin: '0 0 5px', color: ok ? '#15803D' : '#9CA3AF', display: 'flex', alignItems: 'flex-start', gap: 5 }}>
                        <span style={{ flexShrink: 0, fontWeight: 700 }}>{ok ? '✓' : '○'}</span> {t}
                      </p>
                    );
                  })}
                  <p style={{ fontSize: 12, color: '#6B7280', fontStyle: 'italic', marginTop: 10, lineHeight: 1.6 }}>Please provide any additional items.</p>
                </div>
              ) : (
                <p style={{ fontSize: 12, color: '#6B7280', fontStyle: 'italic', lineHeight: 1.7, margin: 0 }}>
                  {GUIDE[step]}
                </p>
              )}
            </div>

            {/* Contenu principal */}
            <div style={{ flex: 1, minWidth: 0, padding: '28px 32px' }}>

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
                      {/* ════ Panneau bleu (staging) — réplique ScienceDirect ════ */}
                      <div style={{ background: '#EEF5F1', border: '1px solid #C9E0D2', borderRadius: 3, padding: '14px 18px', position: 'relative' }}>
                        <button type="button" onClick={() => setShowSpecialChars(s => !s)}
                          style={{ position: 'absolute', top: 10, right: 16, fontSize: 12, color: '#1E88C8', background: 'none', border: 'none', cursor: 'pointer' }}>
                          Insert Special Character
                        </button>

                        <div style={{ display: 'flex', gap: 26, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                          <div style={{ flex: '1 1 320px', minWidth: 260 }}>
                            <label style={{ display: 'block', fontSize: 12.5, color: '#1B4427', marginBottom: 3 }}>Select Item Type</label>
                            <select value={nextType}
                              onChange={e => { setNextType(e.target.value); setNextDescription(e.target.value); }}
                              style={{ width: '100%', maxWidth: 320, padding: '5px 7px', fontSize: 12.5, border: '1px solid #BBDFCB', borderRadius: 2, background: '#fff', cursor: 'pointer', color: '#111' }}>
                              {DOC_TYPES.map(t => <option key={t} value={t}>{REQUIRED_DOC_TYPES.includes(t) ? '*' : ''}{t}</option>)}
                            </select>
                            <label style={{ display: 'block', fontSize: 12.5, color: '#1B4427', margin: '10px 0 3px' }}>Description</label>
                            <input value={nextDescription} onChange={e => setNextDescription(e.target.value)} placeholder={nextType}
                              style={{ width: '100%', maxWidth: 320, padding: '5px 7px', fontSize: 12.5, border: '1px solid #BBDFCB', borderRadius: 2, color: '#111', boxSizing: 'border-box' }} />
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 18, paddingTop: 16 }}>
                            <button type="button" onClick={() => fileRef.current?.click()}
                              style={{ background: '#F0FDF4', border: '1px solid #BBDFCB', borderRadius: 3, padding: '7px 18px', fontSize: 12.5, fontWeight: 600, color: '#333', cursor: 'pointer' }}>
                              Browse…
                            </button>
                            <span style={{ fontSize: 12.5, color: '#444', fontWeight: 600 }}>OR</span>
                            <div onDrop={handleDrop} onDragOver={e => e.preventDefault()} onClick={() => fileRef.current?.click()}
                              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, cursor: 'pointer', color: '#8A93A0', textAlign: 'center' }}>
                              <svg width="34" height="30" viewBox="0 0 24 24" fill="#9AA6B5"><path d="M19 13v6H5v-6H3v8h18v-8h-2zM11 4v8.17l-2.59-2.58L7 11l5 5 5-5-1.41-1.41L13 12.17V4h-2z"/></svg>
                              <span style={{ fontSize: 12.5, lineHeight: 1.2 }}>Drag &amp; Drop<br/>Files Here</span>
                            </div>
                          </div>
                        </div>

                        {showSpecialChars && (
                          <div style={{ marginTop: 10, padding: '6px 8px', background: '#fff', border: '1px solid #C9E0D2', borderRadius: 2 }}>
                            {['á','é','í','ó','ú','à','è','ç','ñ','ü','ö','ä','°','±','×','÷','µ','α','β','γ','Δ','Ω','≤','≥','™','©'].map(c => (
                              <button key={c} type="button" onClick={() => setNextDescription(d => d + c)}
                                style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 15, padding: '0 3px', color: '#1E88C8' }}>{c}</button>
                            ))}
                          </div>
                        )}

                        <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid #C9E0D2', fontSize: 12.5, color: '#333' }}>
                          <p style={{ margin: '0 0 8px', lineHeight: 1.5 }}>
                            To attach files from arXiv.org, enter the arXiv identifier (sample: XXXX.XXXXX) and click <strong>Attach arXiv Files</strong>.
                          </p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                            <label style={{ color: '#1B4427' }}>arXiv Identifier:</label>
                            <input value={arxivId} onChange={e => setArxivId(e.target.value)}
                              style={{ width: 220, padding: '5px 7px', fontSize: 12.5, border: '1px solid #BBDFCB', borderRadius: 2, color: '#111' }} />
                          </div>
                          <button type="button" onClick={() => setError('arXiv import is not enabled for JAEI — please upload your Word (.docx) files directly.')}
                            style={{ marginTop: 8, background: '#F0FDF4', border: '1px solid #BBDFCB', borderRadius: 3, padding: '6px 14px', fontSize: 12.5, fontWeight: 600, color: '#333', cursor: 'pointer' }}>
                            Attach arXiv Files
                          </button>
                        </div>
                      </div>

                      {/* ════ Texte d'ordre (réplique ScienceDirect) ════ */}
                      <p style={{ fontSize: 12, color: '#444', margin: '16px 0 10px', lineHeight: 1.5 }}>
                        The order in which the attached items appear is the order established by this publication. You may re-order any items of the same type manually if necessary.
                      </p>

                      {/* ════ Change Item Type of all … to … + Check/Clear All ════ */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#333', flexWrap: 'wrap' }}>
                          <span>Change Item Type of all</span>
                          <select value={bulkFromType} onChange={e => setBulkFromType(e.target.value)}
                            style={{ padding: '4px 6px', fontSize: 12, border: '1px solid #BBDFCB', borderRadius: 2, background: '#fff', cursor: 'pointer', color: '#111' }}>
                            <option value="">Choose…</option>
                            {DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                          <span>files to</span>
                          <select value={bulkType} onChange={e => setBulkType(e.target.value)}
                            style={{ padding: '4px 6px', fontSize: 12, border: '1px solid #BBDFCB', borderRadius: 2, background: '#fff', cursor: 'pointer', color: '#111' }}>
                            <option value="">Choose…</option>
                            {DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                          <button type="button" onClick={changeAllTypes} disabled={!bulkType || form.files.length === 0}
                            style={{ background: '#F0FDF4', border: '1px solid #BBDFCB', borderRadius: 3, padding: '4px 12px', fontSize: 12, fontWeight: 600, color: (!bulkType || form.files.length === 0) ? '#9CA3AF' : '#333', cursor: (!bulkType || form.files.length === 0) ? 'default' : 'pointer' }}>
                            Change Now
                          </button>
                        </div>
                        <div style={{ display: 'flex', gap: 14, fontSize: 12 }}>
                          <button type="button" onClick={selectAllFiles} style={{ color: '#1E88C8', background: 'none', border: 'none', cursor: 'pointer' }}>Check All</button>
                          <button type="button" onClick={clearSelection} style={{ color: '#1E88C8', background: 'none', border: 'none', cursor: 'pointer' }}>Clear All</button>
                        </div>
                      </div>

                      {/* ════ Tableau (Order · Item · Description · File Name · Size · Last Modified · Actions · Select) ════ */}
                      <div style={{ overflowX: 'auto', maxWidth: '100%' }}>
                      <table style={{ width: '100%', minWidth: 720, borderCollapse: 'collapse', fontSize: 12 }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid #C9C9C9' }}>
                            {['Order', 'Item', 'Description', 'File Name', 'Size', 'Last Modified', 'Actions', 'Select'].map(h => (
                              <th key={h} style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 700, color: '#333', whiteSpace: 'nowrap' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {form.files.length === 0 ? (
                            <tr><td colSpan={8} style={{ padding: '14px 8px', textAlign: 'center', color: '#9CA3AF', fontStyle: 'italic' }}>
                              No item attached yet. Select an item type &amp; description above, then Browse or Drag &amp; Drop your Word (.docx) file.
                            </td></tr>
                          ) : form.files.map((f, i) => (
                            <tr key={f.id} style={{ borderBottom: '1px solid #E5E5E5' }}>
                              <td style={{ padding: '7px 8px', whiteSpace: 'nowrap', color: '#555' }}>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                                  <span style={{ color: '#9AA6B5', cursor: 'grab', fontSize: 13 }} title="Re-order">⠿</span>
                                  {i + 1}
                                  <span style={{ display: 'inline-flex', flexDirection: 'column' }}>
                                    <button type="button" onClick={() => moveFile(f.id, -1)} disabled={i === 0} title="Move up"
                                      style={{ lineHeight: 1, fontSize: 9, border: 'none', background: 'none', padding: 0, cursor: i === 0 ? 'default' : 'pointer', color: i === 0 ? '#CBD2DA' : '#1E88C8' }}>▲</button>
                                    <button type="button" onClick={() => moveFile(f.id, 1)} disabled={i === form.files.length - 1} title="Move down"
                                      style={{ lineHeight: 1, fontSize: 9, border: 'none', background: 'none', padding: 0, cursor: i === form.files.length - 1 ? 'default' : 'pointer', color: i === form.files.length - 1 ? '#CBD2DA' : '#1E88C8' }}>▼</button>
                                  </span>
                                </span>
                              </td>
                              <td style={{ padding: '7px 8px' }}>
                                <select value={f.type} onChange={e => setFileType(f.id, e.target.value)}
                                  style={{ minWidth: 150, padding: '4px 6px', fontSize: 12, border: '1px solid #BBDFCB', borderRadius: 2, background: '#fff', cursor: 'pointer', color: '#111' }}>
                                  {DOC_TYPES.map(t => <option key={t} value={t}>{REQUIRED_DOC_TYPES.includes(t) ? '*' : ''}{t}</option>)}
                                </select>
                              </td>
                              <td style={{ padding: '7px 8px' }}>
                                <input value={f.description} onChange={e => setFileDescription(f.id, e.target.value)} placeholder={f.type}
                                  style={{ minWidth: 130, padding: '4px 6px', fontSize: 12, border: '1px solid #BBDFCB', borderRadius: 2, color: '#111', boxSizing: 'border-box' }} />
                              </td>
                              <td style={{ padding: '7px 8px', color: '#333', wordBreak: 'break-all' }}>{f.file.name}</td>
                              <td style={{ padding: '7px 8px', color: '#555', whiteSpace: 'nowrap' }}>{(f.file.size / (1024 * 1024)).toFixed(1)} MB</td>
                              <td style={{ padding: '7px 8px', color: '#555', whiteSpace: 'nowrap' }}>{f.file.lastModified ? new Date(f.file.lastModified).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</td>
                              <td style={{ padding: '7px 8px', whiteSpace: 'nowrap' }}>
                                <button type="button" onClick={() => downloadFile(f.file)} style={{ color: '#1E88C8', background: 'none', border: 'none', cursor: 'pointer' }}>Download</button>
                              </td>
                              <td style={{ padding: '7px 8px', textAlign: 'center' }}>
                                <input type="checkbox" checked={selectedIds.includes(f.id)} onChange={() => toggleSelect(f.id)}
                                  style={{ width: 14, height: 14, cursor: 'pointer' }} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      </div>

                      {/* ════ Bas de page — Update File Order · Download Zip · Remove · Check/Clear All ════ */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginTop: 10 }}>
                        <button type="button" onClick={() => {}} disabled={form.files.length === 0} title="Order is saved automatically as you re-order"
                          style={{ background: '#F0FDF4', border: '1px solid #BBDFCB', borderRadius: 3, padding: '6px 14px', fontSize: 12, fontWeight: 600, color: form.files.length === 0 ? '#9CA3AF' : '#333', cursor: form.files.length === 0 ? 'default' : 'pointer' }}>
                          Update File Order
                        </button>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                          <button type="button" onClick={downloadSelectedZip} disabled={selectedIds.length === 0}
                            style={{ background: '#F0FDF4', border: '1px solid #BBDFCB', borderRadius: 3, padding: '6px 14px', fontSize: 12, fontWeight: 600, color: selectedIds.length === 0 ? '#9CA3AF' : '#333', cursor: selectedIds.length === 0 ? 'default' : 'pointer' }}>
                            Download Selections as Zip File
                          </button>
                          <button type="button" onClick={removeSelected} disabled={selectedIds.length === 0}
                            style={{ background: '#F0FDF4', border: '1px solid #BBDFCB', borderRadius: 3, padding: '6px 14px', fontSize: 12, fontWeight: 600, color: selectedIds.length === 0 ? '#9CA3AF' : '#333', cursor: selectedIds.length === 0 ? 'default' : 'pointer' }}>
                            Remove
                          </button>
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 14, fontSize: 12, marginTop: 6 }}>
                        <button type="button" onClick={selectAllFiles} style={{ color: '#1E88C8', background: 'none', border: 'none', cursor: 'pointer' }}>Check All</button>
                        <button type="button" onClick={clearSelection} style={{ color: '#1E88C8', background: 'none', border: 'none', cursor: 'pointer' }}>Clear All</button>
                      </div>
                      <input ref={fileRef} type="file" accept=".docx" multiple style={{ display: 'none' }}
                             onChange={e => { addFiles(e.target.files); if (fileRef.current) fileRef.current.value = ''; }} />
                    </div>
                  </SectionCard>

                  {/* Déclaration d'intérêts */}
                  <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 4, padding: '12px 16px', fontSize: 12.5, color: '#92400E', lineHeight: 1.65 }}>
                    <strong>Declaration of Interests:</strong> All authors must disclose any financial or personal relationships that may be perceived as influencing their work. Complete the Declaration of Interests form. Additional instructions may appear after uploading your main file.
                  </div>
                </>
              )}

              {/* ══ ÉTAPE 3 — Research Domain ═══════════════════ */}
              {step === 3 && (
                <SectionCard title="Research Domain">
                  <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 20, lineHeight: 1.65 }}>
                    Enter the main research domain or specialization area that best describes your submission.
                  </p>

                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                    Research Domain <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={form.research_area}
                    onChange={e => { setError(''); setForm(prev => ({ ...prev, research_area: e.target.value })); }}
                    placeholder="e.g. Agroecology, Animal Sciences, Environmental Science, Biotechnology…"
                    style={{
                      width: '100%', padding: '10px 14px', fontSize: 13,
                      border: '1px solid #D1D5DB', borderRadius: 4, outline: 'none',
                      color: '#111', background: '#fff', boxSizing: 'border-box',
                    }}
                    onFocus={e => { e.target.style.borderColor = '#1B4427'; e.target.style.boxShadow = '0 0 0 3px rgba(27,68,39,0.08)'; }}
                    onBlur={e => { e.target.style.borderColor = '#D1D5DB'; e.target.style.boxShadow = 'none'; }}
                  />
                  <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 8 }}>
                    Type the domain or specialization area of your research freely.
                  </p>
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
<>
                  <SectionCard title="Cover Letter">
                    <p style={{ fontSize: 13, color: '#374151', marginBottom: 12, lineHeight: 1.65 }}>
                      Write a cover letter to the editor (motivation, significance of the work, suggested or excluded reviewers…).
                    </p>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                      Cover Letter <span style={{ color: '#DC2626' }}>*</span>
                    </label>
                    <textarea
                      value={form.cover_letter}
                      onChange={e => setField('cover_letter', e.target.value)}
                      rows={9}
                      placeholder="Dear Editor, we are pleased to submit our manuscript entitled…"
                      style={{ width: '100%', padding: '10px 14px', fontSize: 13, border: '1px solid #D1D5DB', borderRadius: 4, outline: 'none', resize: 'vertical', lineHeight: 1.65, fontFamily: 'inherit', boxSizing: 'border-box' }}
                      onFocus={e => e.target.style.borderColor = '#1B4427'}
                      onBlur={e => e.target.style.borderColor = '#D1D5DB'}
                    />
                  </SectionCard>

                  <SectionCard title="Comments to the Editorial Office">
                    <p style={{ fontSize: 13, color: '#374151', marginBottom: 16, lineHeight: 1.65 }}>
                      Any additional comments for the editorial office. These comments will <strong>not</strong> appear in your published article.
                    </p>
                    <textarea
                      value={form.comments}
                      onChange={e => setField('comments', e.target.value)}
                      rows={6}
                      placeholder="Optional: private comments to the editorial team…"
                      style={{ width: '100%', padding: '10px 14px', fontSize: 13, border: '1px solid #D1D5DB', borderRadius: 4, outline: 'none', resize: 'vertical', lineHeight: 1.65, fontFamily: 'inherit', boxSizing: 'border-box' }}
                      onFocus={e => e.target.style.borderColor = '#1B4427'}
                      onBlur={e => e.target.style.borderColor = '#D1D5DB'}
                    />
                  </SectionCard>
                </>
              )}

              {/* ══ ÉTAPE 6 — Manuscript Data ═══════════════════ */}
              {step === 6 && (
                <>
                  <p style={{ fontSize: 12, color: '#6B7280', marginBottom: 20, fontStyle: 'italic', lineHeight: 1.6 }}>
                    When possible these fields will be populated with information collected from your uploaded file. Steps requiring review will be marked with a warning icon (⚠). Please review these fields carefully.
                  </p>

                  {/* IA extraction */}
                  {aiAvailable && form.files.length > 0 && (
                    <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 4, padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                          <Ic.Sparkles />
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#1B4427' }}>AI Extraction</span>
                          <span style={{ fontSize: 10, background: '#DCFCE7', color: '#15803D', padding: '1px 7px', borderRadius: 10, fontWeight: 700 }}>Gemini</span>
                        </div>
                        <p style={{ fontSize: 12, color: '#6B7280', margin: 0 }}>
                          {aiDone ? 'Fields pre-filled from your Word file. Review and edit as needed.' : 'Extract title, abstract and keywords automatically from your Word file.'}
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
                      <span style={{ fontWeight: 400, color: '#9CA3AF', fontSize: 12, marginLeft: 6 }}>4 to 7 keywords, separated by commas</span>
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
                      <div style={{ padding: '10px 14px', fontSize: 13, color: '#374151', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                        <span>👤 <strong>{[user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || 'You'}</strong></span>
                        <span style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 5 }}>
                          {['Corresponding author', 'First author', 'You'].map(b => (
                            <span key={b} style={{ fontSize: 11, fontWeight: 600, color: '#1B4427', background: '#EEF5F1', border: '1px solid #BBDFCB', borderRadius: 10, padding: '1px 8px' }}>{b}</span>
                          ))}
                        </span>
                      </div>
                    </div>
                    {/* Co-auteurs structurés : Nom / Email / Affiliation + Add Another Author */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <label style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
                        Co-authors <span style={{ fontSize: 12, fontWeight: 400, color: '#9CA3AF' }}>(optional)</span>
                      </label>
                      <button type="button" onClick={addAuthor}
                        style={{ fontSize: 12, fontWeight: 600, color: '#1B4427', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 4, padding: '5px 10px', cursor: 'pointer' }}>
                        + Add Another Author
                      </button>
                    </div>
                    {form.authors.length === 0 ? (
                      <p style={{ fontSize: 12, color: '#9CA3AF', margin: 0 }}>
                        No co-author added yet. You are listed as the corresponding author — use "Add Another Author" to add co-authors.
                      </p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {form.authors.map((a, i) => (
                          <div key={a.id} style={{ border: '1px solid #E5E7EB', borderRadius: 4, padding: 12, background: '#FAFAFA' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                              <span style={{ fontSize: 12, fontWeight: 600, color: '#6B7280' }}>Author {i + 2}</span>
                              <button type="button" onClick={() => removeAuthor(a.id)}
                                style={{ fontSize: 12, color: '#DC2626', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                                Remove
                              </button>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                              <input value={a.name} onChange={e => setAuthorField(a.id, 'name', e.target.value)}
                                placeholder="Full name *"
                                style={{ padding: '8px 10px', fontSize: 13, border: '1px solid #D1D5DB', borderRadius: 4, outline: 'none', boxSizing: 'border-box' }} />
                              <input value={a.email} onChange={e => setAuthorField(a.id, 'email', e.target.value)}
                                placeholder="Email"
                                style={{ padding: '8px 10px', fontSize: 13, border: '1px solid #D1D5DB', borderRadius: 4, outline: 'none', boxSizing: 'border-box' }} />
                              <input value={a.affiliation} onChange={e => setAuthorField(a.id, 'affiliation', e.target.value)}
                                placeholder="Affiliation (university, laboratory…)"
                                style={{ gridColumn: '1 / -1', padding: '8px 10px', fontSize: 13, border: '1px solid #D1D5DB', borderRadius: 4, outline: 'none', boxSizing: 'border-box' }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
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

                  <SummaryRow label="Files" onEdit={() => setStep(2)}>
                    {form.files.length === 0
                      ? <span style={{ fontSize: 13, color: '#9CA3AF', fontStyle: 'italic' }}>(none)</span>
                      : form.files.map(f => (
                          <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#1B4427', fontSize: 13, marginBottom: 2 }}>
                            <Ic.File /> {f.file.name}
                            <span style={{ color: '#6B7280', fontSize: 12 }}>— {f.type}</span>
                            <span style={{ color: '#9CA3AF', fontSize: 12 }}>({(f.file.size / 1024).toFixed(0)} KB)</span>
                          </div>
                        ))}
                  </SummaryRow>

                  <SummaryRow label="Research Domain" onEdit={() => setStep(3)}>
                    <span style={{ fontSize: 13, color: '#374151' }}>{form.research_area}</span>
                  </SummaryRow>

                  <SummaryRow label="Additional Information" onEdit={() => setStep(4)}>
                    <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: '#6B7280', lineHeight: 1.85 }}>
                      <li>Funding: {form.funding_acknowledged === 'yes' ? 'Acknowledged in the manuscript' : 'Not applicable'}</li>
                      <li>Data availability: {form.data_availability}</li>
                      <li>Supplementary material: {form.supplementary_data}</li>
                      <li>{form.points_confirmed.length}/{CONFIRMATION_POINTS.length} compliance points confirmed</li>
                    </ul>
                  </SummaryRow>

                  <SummaryRow label="Cover Letter" onEdit={() => setStep(5)}>
                    {form.cover_letter
                      ? <span style={{ fontSize: 13, color: '#374151' }}>{form.cover_letter.length > 180 ? form.cover_letter.substring(0, 180) + '…' : form.cover_letter}</span>
                      : <span style={{ fontSize: 13, color: '#9CA3AF', fontStyle: 'italic' }}>(none)</span>}
                    {form.comments && <p style={{ fontSize: 12.5, color: '#6B7280', margin: '6px 0 0' }}><strong>Comments:</strong> {form.comments.length > 160 ? form.comments.substring(0, 160) + '…' : form.comments}</p>}
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
                      <strong>{[user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || 'You'}</strong> <span style={{ color: '#6B7280', fontSize: 12 }}>(Corresponding Author)</span>
                      {form.authors.filter(a => a.name.trim()).length > 0 && <div style={{ color: '#6B7280', marginTop: 3, fontSize: 12.5 }}>Co-authors: {form.authors.filter(a => a.name.trim()).map(a => a.name.trim()).join(', ')}</div>}
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
                onClick={() => navigate('/author/submit')}
                style={{ padding: '8px 20px', fontSize: 13, fontWeight: 500, background: '#fff', border: '1px solid #D1D5DB', borderRadius: 4, cursor: 'pointer', color: '#6B7280' }}
              >
                Cancel
              </button>
            )}

            {step < 7 ? (
              <button
                onClick={next}
                style={{ padding: '8px 28px', fontSize: 13, fontWeight: 700, background: '#1B4427', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                onMouseEnter={e => e.currentTarget.style.background = '#163820'}
                onMouseLeave={e => e.currentTarget.style.background = '#1B4427'}
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
