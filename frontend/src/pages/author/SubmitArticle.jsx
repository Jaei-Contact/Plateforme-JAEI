import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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

// Remarque 8 (client, 28/07) : liste nettoyée — la lettre entre parenthèses
// alimente le code de référence du manuscrit (ex. JAEI-A-26-09928).
const ARTICLE_TYPES = [
  'Articles / Original Research Papers',   // A
  'Brief Communication',                   // B
  'Correspondence',                        // C
  'Feature',                               // F
  'Letters to the Editor',                 // L
  'Review / Mini Reviews',                 // R
  'Opinions',                              // O
  'Perspective review',                    // P
  'Short Comments / Short Communications', // S
  'Technical Advances / Technical Notes',  // T
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

// Types de documents (liste Elsevier / Editorial Manager — demande client)
// Remarque 10 (23/09) : "Manuscript" scindé en deux documents obligatoires —
// Blinded Manuscript (texte anonymisé, seul document vu des reviewers) et
// Title page (identité des auteurs, JAMAIS montrée aux reviewers — voir le
// filtrage côté serveur dans GET /submissions/:id et /reviews/by-submission).
// "Declaration of Interest Statement" n'est plus un type de fichier : c'est
// désormais une case à cocher (voir declaration_of_interest ci-dessous).
// "Video Still" retiré (doublon avec "Video") ; "Dataset" ajouté.
const DOC_TYPES = [
  'Blinded Manuscript',
  'Title page',
  'Supplementary Material',
  'Author Agreement',
  'Cover Letter',
  'Detailed Response to Reviewers',
  'Graphical Abstract (for review)',
  'Highlights (for review)',
  'Figure',
  'Table',
  'e-component',
  'Macro and style files',
  'Dataset',
  'Video',
];

// Types requis (préfixés d'une * dans les dropdowns + checklist "Required For Submission", comme ScienceDirect)
const REQUIRED_DOC_TYPES = ['Blinded Manuscript', 'Title page'];

// Titres académiques (Remarque 3 client)
const ACADEMIC_TITLES = ['M.', 'Mme', 'Dr.', 'Prof.'];

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
    declaration_of_interest: false, // Remarque 10 (23/09) — case à cocher, plus un fichier
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
  const [nextType,        setNextType]        = useState('Blinded Manuscript');
  const [nextDescription, setNextDescription] = useState('Blinded Manuscript');
  const [selectedIds,     setSelectedIds]     = useState([]); // cases "Select" du tableau
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
      // Remarque 3 (25/09) : empêcher qu'un même fichier soit déposé deux fois sous des
      // types différents (même contrôle que RevisionModal — Remarque 7, 23/09).
      if (form.files.some(f => f.file.name === file.name) || valid.some(f => f.file.name === file.name)) {
        setError(`"${file.name}" is already attached — please rename the file or remove the existing one first.`);
        continue;
      }
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
  const downloadFile   = (file) => { const url = URL.createObjectURL(file); const a = document.createElement('a'); a.href = url; a.download = file.name; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); };
  const downloadSelectedZip = () => { form.files.filter(f => selectedIds.includes(f.id)).forEach(f => downloadFile(f.file)); };

  const handleDrop = (e) => { e.preventDefault(); addFiles(e.dataTransfer.files); };

  // ── Auteurs (Remarque 3 client) ────────────────────────────
  // Liste unique (soumetteur inclus) : titre académique, nom*, email*,
  // 1-3 affiliations*, case "Corresponding author" (1 ou 2 max), ordre modifiable.
  const addAuthor = () => setForm(prev => ({
    ...prev,
    authors: [...prev.authors, {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: '', name: '', email: '', affiliations: [''], corresponding: false,
    }],
  }));
  const removeAuthor     = (id)           => setForm(prev => ({ ...prev, authors: prev.authors.filter(a => a.id !== id || a.isSubmitter) }));
  const setAuthorField   = (id, field, v) => setForm(prev => ({ ...prev, authors: prev.authors.map(a => a.id === id ? { ...a, [field]: v } : a) }));
  // 1 ou 2 corresponding authors maximum (Remarque 3.3)
  const toggleCorresponding = (id) => setForm(prev => {
    const target = prev.authors.find(a => a.id === id);
    if (!target) return prev;
    const count = prev.authors.filter(a => a.corresponding).length;
    if (!target.corresponding && count >= 2) return prev;   // maximum 2
    return { ...prev, authors: prev.authors.map(a => a.id === id ? { ...a, corresponding: !a.corresponding } : a) };
  });
  // Ordre des auteurs modifiable (Remarque 3.2)
  const moveAuthor = (id, dir) => setForm(prev => {
    const arr = [...prev.authors];
    const idx = arr.findIndex(a => a.id === id);
    const to  = idx + dir;
    if (idx < 0 || to < 0 || to >= arr.length) return prev;
    [arr[idx], arr[to]] = [arr[to], arr[idx]];
    return { ...prev, authors: arr };
  });
  // 1 à 3 adresses par auteur (Remarque 3.4)
  const addAffiliation    = (id) => setForm(prev => ({ ...prev, authors: prev.authors.map(a => a.id === id && (a.affiliations?.length || 0) < 3 ? { ...a, affiliations: [...a.affiliations, ''] } : a) }));
  const setAffiliation    = (id, idx, v) => setForm(prev => ({ ...prev, authors: prev.authors.map(a => a.id === id ? { ...a, affiliations: a.affiliations.map((x, i) => i === idx ? v : x) } : a) }));
  const removeAffiliation = (id, idx) => setForm(prev => ({ ...prev, authors: prev.authors.map(a => a.id === id && a.affiliations.length > 1 ? { ...a, affiliations: a.affiliations.filter((_, i) => i !== idx) } : a) }));

  // Le soumetteur est le 1er auteur de la liste (email + affiliation visibles — Remarque 3.1)
  useEffect(() => {
    if (!user) return;
    setForm(prev => {
      if (prev.authors.some(a => a.isSubmitter)) return prev;
      return {
        ...prev,
        authors: [{
          id: 'submitter', isSubmitter: true, title: '',
          name: [user.firstName, user.lastName].filter(Boolean).join(' ') || '',
          email: user.email || '',
          affiliations: [user.institution || ''],
          corresponding: true,
        }, ...prev.authors],
      };
    });
  }, [user]);

  // Fichier "Manuscript" principal (utilisé pour l'extraction IA)
  const manuscriptFile = () => (form.files.find(f => f.type === 'Blinded Manuscript') || form.files[0])?.file || null;

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
      if (!form.declaration_of_interest) return 'Please confirm the Declaration of Interests before proceeding.';
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
      if (wordCount(form.title) < 10)   return 'Title must contain at least 10 words.';
      if (wordCount(form.title) > 20)   return 'Title must not exceed 20 words.';
      if (form.abstract.trim().length < 100) return 'Abstract must be at least 100 characters long.';
      if (wordCount(form.abstract) > 250) return 'Abstract must not exceed 250 words.';
      if (!form.keywords.trim())        return 'Please provide 4 to 7 keywords, separated by commas.';
      // Remarque 3 — nom, email et affiliation obligatoires pour CHAQUE auteur
      for (const a of form.authors) {
        const who = a.name.trim() || `Author ${form.authors.indexOf(a) + 1}`;
        if (!a.name.trim())  return 'Each author must have a full name (or remove the empty row).';
        if (!a.email.trim() || !/\S+@\S+\.\S+/.test(a.email)) return `Please provide a valid email address for ${who}.`;
        if (!(a.affiliations?.[0] || '').trim()) return `Please provide at least one affiliation for ${who}.`;
      }
      const corr = form.authors.filter(a => a.corresponding).length;
      if (corr < 1) return 'Please designate a corresponding author.';
      if (corr > 2) return 'A maximum of two corresponding authors is allowed.';
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
      fd.append('declaration_of_interest', form.declaration_of_interest ? '1' : '0');
      // Auteurs structurés (JSON, ordre respecté) + co_authors texte pour compat d'affichage
      const authorsClean = form.authors
        .filter(a => a.name.trim())
        .map(a => ({
          title: a.title || '',
          name: a.name.trim(),
          email: a.email.trim(),
          affiliations: (a.affiliations || []).map(x => x.trim()).filter(Boolean),
          affiliation: (a.affiliations || []).map(x => x.trim()).filter(Boolean).join(' | '),
          corresponding: !!a.corresponding,
          is_submitter: !!a.isSubmitter,
        }));
      fd.append('authors', JSON.stringify(authorsClean));
      const coNames = authorsClean.filter(a => !a.is_submitter).map(a => a.name);
      if (coNames.length) fd.append('co_authors', coNames.join(', '));
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

  // Nav horizontale compacte (Remarque 1 client — remplace la sidebar sur cette page)
  const NAV_LINKS = [
    { label: 'Dashboard',         to: '/author/dashboard',   icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/> },
    { label: 'My submissions',    to: '/author/submissions', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/> },
    { label: 'Submit an article', to: '/author/submit',      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>, active: true },
    { label: 'My profile',        to: '/profile',            icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/> },
  ];

  // ══════════════════════════════════════════════════════════
  return (
    <DashboardLayout hideSidebar>
      <style>{`@keyframes jaei-spin { to { transform: rotate(360deg); } }`}</style>

      <div style={{ maxWidth: 1320, margin: '0 auto' }}>
        {/* Titre page + nav horizontale (Remarque 1 — position 1 de la maquette client) */}
        <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111', margin: 0 }}>Submit an article</h1>
            <p style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>
              Please complete all steps to finalize your submission.
            </p>
          </div>
          <nav style={{ display: 'flex', alignItems: 'stretch', background: '#fff', border: '1px solid #D1D5DB', borderRadius: 4, overflow: 'hidden' }}>
            {NAV_LINKS.map((l, i) => (
              <Link key={l.to} to={l.to}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px',
                  fontSize: 12.5, fontWeight: l.active ? 700 : 500, textDecoration: 'none',
                  color: l.active ? '#1B4427' : '#374151',
                  background: l.active ? '#EEF5F1' : 'transparent',
                  borderLeft: i > 0 ? '1px solid #E5E7EB' : 'none',
                }}
                onMouseEnter={e => { if (!l.active) e.currentTarget.style.background = '#F9FAFB'; }}
                onMouseLeave={e => { if (!l.active) e.currentTarget.style.background = 'transparent'; }}>
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">{l.icon}</svg>
                {l.label}
              </Link>
            ))}
          </nav>
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
                  {REQUIRED_DOC_TYPES.map(t => {
                    const ok = form.files.some(f => f.type === t);
                    return (
                      <p key={t} style={{ fontSize: 12, margin: '0 0 5px', color: ok ? '#15803D' : '#9CA3AF', display: 'flex', alignItems: 'flex-start', gap: 5 }}>
                        <span style={{ flexShrink: 0, fontWeight: 700 }}>{ok ? '✓' : '○'}</span> {t}
                      </p>
                    );
                  })}
                  <p key="doi" style={{ fontSize: 12, margin: '0 0 5px', color: form.declaration_of_interest ? '#15803D' : '#9CA3AF', display: 'flex', alignItems: 'flex-start', gap: 5 }}>
                    <span style={{ flexShrink: 0, fontWeight: 700 }}>{form.declaration_of_interest ? '✓' : '○'}</span> Declaration of Interests
                  </p>
                  <p style={{ fontSize: 12, color: '#6B7280', fontStyle: 'italic', marginTop: 10, lineHeight: 1.6 }}>Please provide any additional items.</p>
                  {/* Remarque 10 (23/09) : Title page = identité des auteurs, jamais vue
                      des reviewers (double-aveugle). Blinded Manuscript = texte seul. */}
                  <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid #E5E7EB', fontSize: 11.5, color: '#374151', lineHeight: 1.65 }}>
                    <p style={{ margin: 0 }}>
                      The <strong>title page</strong> must include the title, author names, author
                      institutions, and corresponding author(s). Reviewers never have access to it.
                      The <strong>blinded manuscript</strong> should contain only the title and the
                      main body: Abstract, Introduction, Materials and Methods, Results, Discussion
                      (or Results and Discussion), Conclusion, and Acknowledgement.
                    </p>
                  </div>
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

                        {/* Remarque 1 (22/09) : bloc d'import arXiv supprimé à la demande du client */}
                      </div>

                      {/* Remarque 2 (client) : blocs "ordre des items" + "Change Item Type of all" supprimés */}

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

                  {/* Remarque 1 (25/09) — Declaration of Interests déplacée dans le contenu
                      principal, sous le tableau de fichiers (position 2 choisie par le
                      client) : bien visible, sans avoir à scroller la colonne étroite. */}
                  <div style={{
                    marginTop: 16, padding: '16px 20px', borderRadius: 4,
                    background: form.declaration_of_interest ? '#F0FDF4' : '#FFF7ED',
                    border: `1px solid ${form.declaration_of_interest ? '#BBF7D0' : '#FED7AA'}`,
                  }}>
                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
                      <input type="checkbox" checked={!!form.declaration_of_interest}
                        onChange={e => setField('declaration_of_interest', e.target.checked)}
                        style={{ marginTop: 2, width: 15, height: 15, accentColor: '#C2410C', flexShrink: 0 }} />
                      <span style={{ fontSize: 13, lineHeight: 1.65, color: '#374151' }}>
                        <strong style={{ color: form.declaration_of_interest ? '#15803D' : '#C2410C' }}>Declaration of Interests:</strong> The
                        authors declare that they have no known competing financial interests or
                        personal relationships that could have appeared to influence the work
                        reported in this paper.
                      </span>
                    </label>
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
                      <span style={{ fontWeight: 400, color: '#9CA3AF', fontSize: 12, marginLeft: 6 }}>Limits 10 to 20 words</span>
                    </label>
                    <textarea
                      value={form.title} onChange={e => setField('title', e.target.value)}
                      rows={2} placeholder="Enter the full title of your article"
                      style={{ width: '100%', padding: '10px 14px', fontSize: 14, border: '1px solid #D1D5DB', borderRadius: 4, outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }}
                      onFocus={e => e.target.style.borderColor = '#1B4427'}
                      onBlur={e => e.target.style.borderColor = '#D1D5DB'}
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 5, fontSize: 12 }}>
                      <span style={{ color: (wordCount(form.title) < 10 || wordCount(form.title) > 20) ? '#DC2626' : '#9CA3AF' }}>
                        {wordCount(form.title)} / 20 words (min 10)
                      </span>
                    </div>
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

                  {/* Authors — Remarque 3 client : ordre modifiable, corresponding (1-2),
                      1-3 adresses par auteur, titre académique, infos obligatoires */}
                  <SectionCard title="Authors">
                    <p style={{ fontSize: 12, color: '#6B7280', marginBottom: 14, lineHeight: 1.65 }}>
                      The corresponding author will communicate with the editorial office during the review process.
                    </p>
                    <div style={{ border: '1px solid #E5E7EB', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ padding: '7px 14px', background: '#F3F4F6', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, color: '#374151' }}>
                        <span>Current Author List</span>
                        <button type="button" onClick={addAuthor}
                          style={{ fontSize: 12, fontWeight: 600, color: '#1B4427', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 4, padding: '4px 10px', cursor: 'pointer' }}>
                          + Add Another Author
                        </button>
                      </div>

                      {form.authors.map((a, i) => (
                        <div key={a.id} style={{ display: 'flex', borderBottom: i < form.authors.length - 1 ? '1px solid #E5E7EB' : 'none', background: a.isSubmitter ? '#FAFAFA' : '#fff' }}>
                          {/* Colonne Order (Remarque 3.2 — réordonner) */}
                          <div style={{ width: 46, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, borderRight: '1px solid #F3F4F6', padding: '10px 0' }}>
                            <button type="button" onClick={() => moveAuthor(a.id, -1)} disabled={i === 0} title="Move up"
                              style={{ lineHeight: 1, fontSize: 11, border: 'none', background: 'none', padding: 2, cursor: i === 0 ? 'default' : 'pointer', color: i === 0 ? '#D1D5DB' : '#1E88C8' }}>▲</button>
                            <span style={{ fontSize: 12, fontWeight: 700, color: '#6B7280' }}>{i + 1}</span>
                            <button type="button" onClick={() => moveAuthor(a.id, 1)} disabled={i === form.authors.length - 1} title="Move down"
                              style={{ lineHeight: 1, fontSize: 11, border: 'none', background: 'none', padding: 2, cursor: i === form.authors.length - 1 ? 'default' : 'pointer', color: i === form.authors.length - 1 ? '#D1D5DB' : '#1E88C8' }}>▼</button>
                          </div>

                          {/* Fiche auteur */}
                          <div style={{ flex: 1, minWidth: 0, padding: '12px 14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, gap: 8, flexWrap: 'wrap' }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: 700, color: '#374151' }}>
                                👤 Author {i + 1}
                                {a.isSubmitter && (
                                  <span style={{ fontSize: 11, fontWeight: 600, color: '#1B4427', background: '#EEF5F1', border: '1px solid #BBDFCB', borderRadius: 10, padding: '1px 8px' }}>You</span>
                                )}
                              </span>
                              {!a.isSubmitter && (
                                <button type="button" onClick={() => removeAuthor(a.id)}
                                  style={{ fontSize: 12, color: '#DC2626', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                                  Remove
                                </button>
                              )}
                            </div>

                            {/* Titre académique + nom + email (Remarque 3 — * obligatoires) */}
                            <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr 1fr', gap: 8, marginBottom: 8 }}>
                              <select value={a.title || ''} onChange={e => setAuthorField(a.id, 'title', e.target.value)}
                                style={{ padding: '8px 8px', fontSize: 13, border: '1px solid #D1D5DB', borderRadius: 4, background: '#fff', cursor: 'pointer', color: a.title ? '#111' : '#9CA3AF' }}>
                                <option value="">Title…</option>
                                {ACADEMIC_TITLES.map(t => <option key={t} value={t}>{t}</option>)}
                              </select>
                              <div style={{ position: 'relative' }}>
                                <span style={{ position: 'absolute', left: 8, top: 8, color: '#DC2626', fontWeight: 700 }}>*</span>
                                <input value={a.name} onChange={e => setAuthorField(a.id, 'name', e.target.value)} placeholder="Full name"
                                  style={{ width: '100%', padding: '8px 10px 8px 18px', fontSize: 13, border: '1px solid #D1D5DB', borderRadius: 4, outline: 'none', boxSizing: 'border-box' }} />
                              </div>
                              <div style={{ position: 'relative' }}>
                                <span style={{ position: 'absolute', left: 8, top: 8, color: '#DC2626', fontWeight: 700 }}>*</span>
                                <input value={a.email} onChange={e => setAuthorField(a.id, 'email', e.target.value)} placeholder="Email address" type="email"
                                  style={{ width: '100%', padding: '8px 10px 8px 18px', fontSize: 13, border: '1px solid #D1D5DB', borderRadius: 4, outline: 'none', boxSizing: 'border-box' }} />
                              </div>
                            </div>

                            {/* Adresses / affiliations — 1 à 3 (Remarque 3.4) */}
                            {(a.affiliations || ['']).map((aff, ai) => (
                              <div key={ai} style={{ position: 'relative', marginBottom: 6 }}>
                                {ai === 0 && <span style={{ position: 'absolute', left: 8, top: 8, color: '#DC2626', fontWeight: 700 }}>*</span>}
                                <input value={aff} onChange={e => setAffiliation(a.id, ai, e.target.value)}
                                  placeholder={ai === 0 ? 'Affiliation / address (institution, laboratory, city, country)' : `Additional address ${ai + 1}`}
                                  style={{ width: '100%', padding: ai === 0 ? '8px 30px 8px 18px' : '8px 30px 8px 10px', fontSize: 13, border: '1px solid #D1D5DB', borderRadius: 4, outline: 'none', boxSizing: 'border-box' }} />
                                {ai > 0 && (
                                  <button type="button" onClick={() => removeAffiliation(a.id, ai)} title="Remove this address"
                                    style={{ position: 'absolute', right: 6, top: 6, border: 'none', background: 'none', color: '#DC2626', cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>×</button>
                                )}
                              </div>
                            ))}

                            {/* Corresponding author (1-2 max) + Add another address */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, flexWrap: 'wrap', gap: 8 }}>
                              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#374151', background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 12, padding: '3px 10px', cursor: 'pointer' }}>
                                <input type="checkbox" checked={!!a.corresponding} onChange={() => toggleCorresponding(a.id)}
                                  style={{ width: 13, height: 13, cursor: 'pointer' }} />
                                Corresponding author
                              </label>
                              {(a.affiliations?.length || 0) < 3 && (
                                <button type="button" onClick={() => addAffiliation(a.id)}
                                  style={{ fontSize: 12, fontWeight: 600, color: '#1B4427', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 4, padding: '4px 10px', cursor: 'pointer' }}>
                                  + Add another address
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <p style={{ fontSize: 11.5, color: '#9CA3AF', margin: '8px 0 0' }}>
                      <span style={{ color: '#DC2626', fontWeight: 700 }}>*</span> Name, email and affiliation are required for every author.
                      One or two authors can be designated as corresponding author. Use ▲▼ to change the author order.
                    </p>
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
                      {form.authors.filter(a => a.name.trim()).map((a, i) => (
                        <div key={a.id} style={{ marginBottom: 3 }}>
                          {i + 1}. <strong>{[a.title, a.name.trim()].filter(Boolean).join(' ')}</strong>
                          {a.corresponding && <span style={{ color: '#1B4427', fontSize: 12, fontWeight: 600 }}> (Corresponding Author)</span>}
                          {a.isSubmitter && <span style={{ color: '#6B7280', fontSize: 12 }}> — you</span>}
                        </div>
                      ))}
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
