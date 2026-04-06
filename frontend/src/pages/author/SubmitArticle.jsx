import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import api from '../../utils/api';

// ============================================================
// SubmitArticle — JAEI Platform
// Article submission form (author)
// Style ScienceDirect : steps, champs épurés, upload PDF
// ============================================================

// JAEI official research areas — synchronized with schema.sql
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
    options: [
      'Agricultural biotechnology', 'Soil microbiology', 'Agricultural economics',
    ],
  },
];

const STEPS = [
  { num: 1, label: 'General information' },
  { num: 2, label: 'Abstract & Keywords' },
  { num: 3, label: 'File & Submission' },
];

// ── Icons ──────────────────────────────────────────────────
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

// ── Shared styles ──────────────────────────────────────────
const INPUT_STYLE = {
  width: '100%', padding: '10px 14px', fontSize: 14,
  border: '1px solid #D1D5DB', borderRadius: 6,
  outline: 'none', color: '#111', background: '#fff',
  transition: 'border-color .2s',
};
const LABEL_STYLE = { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 };
const REQUIRED = <span style={{ color: '#DC2626' }}>*</span>;

// ── Step indicator ──────────────────────────────────────────
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
// Main component
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

  const [aiLoading, setAiLoading]     = useState('');  // 'keywords' | 'abstract' | ''
  const [aiKeywords, setAiKeywords]   = useState([]);
  const [aiAbstract, setAiAbstract]   = useState('');
  const [aiAvailable, setAiAvailable] = useState(false);

  useEffect(() => {
    api.get('/ai/status').then(r => setAiAvailable(r.data.available)).catch(() => {});
  }, []);

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
      setError('Only PDF and Word (.docx) files are accepted.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('The file must not exceed 10 MB.');
      return;
    }
    setError('');
    setForm(prev => ({ ...prev, pdf: file }));
  };

  const validateStep = () => {
    if (step === 1) {
      if (!form.title.trim()) return 'Title is required.';
      if (!form.research_area) return 'Please select a research area.';
    }
    if (step === 2) {
      if (!form.abstract.trim()) return 'Abstract is required.';
      if (form.abstract.trim().length < 100) return 'The abstract must be at least 100 characters.';
      if (!form.keywords.trim()) return 'Keywords are required.';
    }
    if (step === 3) {
      if (!form.pdf) return 'Please attach the PDF or Word file of the article.';
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

  const handleAiKeywords = async () => {
    if (!form.title || !form.abstract) return;
    setAiLoading('keywords');
    try {
      const res = await api.post('/ai/suggest-keywords', {
        title: form.title,
        abstract: form.abstract,
        research_area: form.research_area,
      });
      setAiKeywords(res.data.keywords || []);
    } catch {
      // silent
    } finally {
      setAiLoading('');
    }
  };

  const handleAiAbstract = async () => {
    if (!form.title || !form.abstract) return;
    setAiLoading('abstract');
    try {
      const res = await api.post('/ai/improve-abstract', {
        title: form.title,
        abstract: form.abstract,
        research_area: form.research_area,
      });
      setAiAbstract(res.data.improved || '');
    } catch {
      // silent
    } finally {
      setAiLoading('');
    }
  };

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
      setError(err.response?.data?.message || 'Submission error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Success screen ────────────────────────────────────────────
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
          <h2 className="text-2xl font-bold mb-2" style={{ color: '#111' }}>Article submitted successfully!</h2>
          <p className="text-sm mb-1" style={{ color: '#6B7280', maxWidth: 420 }}>
            Your article has been received. It will be reviewed by the JAEI editorial team.
          </p>
          <p className="text-sm mb-8" style={{ color: '#6B7280' }}>
            You will receive a notification once a decision has been made.
          </p>
          <div className="flex gap-3">
            <button onClick={() => navigate('/author/dashboard')}
              className="px-5 py-2.5 rounded text-sm font-semibold transition-colors"
              style={{ background: '#1B5E8A', color: '#fff' }}>
              Back to dashboard
            </button>
            <button onClick={() => { setSuccess(false); setStep(1); setForm({ title:'', research_area:'', co_authors:'', abstract:'', keywords:'', pdf:null }); }}
              className="px-5 py-2.5 rounded text-sm font-semibold border transition-colors"
              style={{ border: '1px solid #D1D5DB', color: '#374151' }}>
              Submit another article
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // ────────────────────────────────────────────────────────────
  return (
    <DashboardLayout>
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold" style={{ color: '#111' }}>Submit an article</h1>
        <p className="text-sm mt-1" style={{ color: '#6B7280' }}>
          Please fill in all required fields (<span style={{ color: '#DC2626' }}>*</span>) before submitting.
        </p>
      </div>

      {/* Form card */}
      <div className="mx-auto" style={{ maxWidth: 760 }}>
        <div className="bg-white rounded-lg p-8" style={{ border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
          <StepBar current={step} />

          {/* ── Error ── */}
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

          {/* ══ STEP 1 — General information ═══════════════════ */}
          {step === 1 && (
            <div className="flex flex-col gap-6">
              {/* Title */}
              <div>
                <label style={LABEL_STYLE}>Article title {REQUIRED}</label>
                <input
                  value={form.title}
                  onChange={set('title')}
                  placeholder="Enter the full title of your article"
                  style={INPUT_STYLE}
                  onFocus={e => e.target.style.borderColor = '#1B5E8A'}
                  onBlur={e => e.target.style.borderColor = '#D1D5DB'}
                />
                <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>
                  Be precise and descriptive. Avoid abbreviations.
                </p>
              </div>

              {/* Research area */}
              <div>
                <label style={LABEL_STYLE}>Research area {REQUIRED}</label>
                <select
                  value={form.research_area}
                  onChange={set('research_area')}
                  style={{ ...INPUT_STYLE, color: form.research_area ? '#111' : '#9CA3AF' }}
                  onFocus={e => e.target.style.borderColor = '#1B5E8A'}
                  onBlur={e => e.target.style.borderColor = '#D1D5DB'}
                >
                  <option value="">Select a research area</option>
                  {SPECIALTY_GROUPS.map(group => (
                    <optgroup key={group.label} label={group.label}>
                      {group.options.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              {/* Co-authors */}
              <div>
                <label style={LABEL_STYLE}>
                  Co-authors <span className="font-normal text-xs" style={{ color: '#9CA3AF' }}>(optional)</span>
                </label>
                <input
                  value={form.co_authors}
                  onChange={set('co_authors')}
                  placeholder="e.g. Jean Dupont, Marie Martin — separate names with commas"
                  style={INPUT_STYLE}
                  onFocus={e => e.target.style.borderColor = '#1B5E8A'}
                  onBlur={e => e.target.style.borderColor = '#D1D5DB'}
                />
              </div>
            </div>
          )}

          {/* ══ STEP 2 — Abstract & Keywords ═══════════════════════ */}
          {step === 2 && (
            <div className="flex flex-col gap-6">
              {/* Abstract */}
              <div>
                <label style={LABEL_STYLE}>Abstract {REQUIRED}</label>
                <textarea
                  value={form.abstract}
                  onChange={set('abstract')}
                  rows={8}
                  placeholder="Write a clear and structured abstract of your article (introduction, methods, results, conclusion). Minimum 100 characters."
                  style={{ ...INPUT_STYLE, resize: 'vertical', lineHeight: 1.6 }}
                  onFocus={e => e.target.style.borderColor = '#1B5E8A'}
                  onBlur={e => e.target.style.borderColor = '#D1D5DB'}
                />
                <p className="text-xs mt-1" style={{ color: form.abstract.length < 100 ? '#DC2626' : '#9CA3AF' }}>
                  {form.abstract.length} character{form.abstract.length > 1 ? 's' : ''} (minimum 100)
                </p>

                {aiAvailable && (
                  <div className="mt-3 rounded-sm p-4" style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-sm font-semibold" style={{ color: '#15803D' }}>✨ AI Assistant</span>
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: '#DCFCE7', color: '#15803D' }}>GPT-4</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {/* Suggest keywords */}
                      <button
                        type="button"
                        onClick={handleAiKeywords}
                        disabled={!!aiLoading || !form.title || !form.abstract}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-sm transition-opacity"
                        style={{ background: '#1B4427', color: '#fff', opacity: (aiLoading || !form.title || !form.abstract) ? 0.5 : 1 }}
                      >
                        {aiLoading === 'keywords' ? (
                          <><div className="w-3 h-3 rounded-full border animate-spin" style={{ borderColor: '#fff', borderTopColor: 'transparent' }} /> Generating…</>
                        ) : '🏷️ Suggest keywords'}
                      </button>
                      {/* Improve abstract */}
                      <button
                        type="button"
                        onClick={handleAiAbstract}
                        disabled={!!aiLoading || !form.title || !form.abstract}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-sm transition-opacity"
                        style={{ background: '#1E88C8', color: '#fff', opacity: (aiLoading || !form.title || !form.abstract) ? 0.5 : 1 }}
                      >
                        {aiLoading === 'abstract' ? (
                          <><div className="w-3 h-3 rounded-full border animate-spin" style={{ borderColor: '#fff', borderTopColor: 'transparent' }} /> Improving…</>
                        ) : '✍️ Improve abstract'}
                      </button>
                    </div>

                    {/* Suggested keywords */}
                    {aiKeywords.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs font-medium mb-2" style={{ color: '#374151' }}>Suggested keywords (click to add):</p>
                        <div className="flex flex-wrap gap-1.5">
                          {aiKeywords.map((kw, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => {
                                const current = form.keywords || '';
                                const sep = current.trim() && !current.trim().endsWith(',') ? ', ' : '';
                                setForm(prev => ({ ...prev, keywords: current + sep + kw }));
                              }}
                              className="px-2.5 py-1 text-xs rounded-sm transition-colors"
                              style={{ background: '#DCFCE7', color: '#15803D', border: '1px solid #BBF7D0' }}
                              title="Click to add to keywords"
                            >
                              + {kw}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Improved abstract */}
                    {aiAbstract && (
                      <div className="mt-3">
                        <p className="text-xs font-medium mb-2" style={{ color: '#374151' }}>AI-improved abstract:</p>
                        <div className="rounded-sm p-3 text-xs leading-relaxed" style={{ background: '#fff', border: '1px solid #BBF7D0', color: '#374151' }}>
                          {aiAbstract}
                        </div>
                        <button
                          type="button"
                          onClick={() => setForm(prev => ({ ...prev, abstract: aiAbstract }))}
                          className="mt-2 px-3 py-1.5 text-xs font-medium rounded-sm"
                          style={{ background: '#1B4427', color: '#fff' }}
                        >
                          Use this abstract
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Keywords */}
              <div>
                <label style={LABEL_STYLE}>Keywords {REQUIRED}</label>
                <input
                  value={form.keywords}
                  onChange={set('keywords')}
                  placeholder="e.g. sustainable agriculture, tropical soil, crop yield"
                  style={INPUT_STYLE}
                  onFocus={e => e.target.style.borderColor = '#1B5E8A'}
                  onBlur={e => e.target.style.borderColor = '#D1D5DB'}
                />
                <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>
                  3 to 6 keywords separated by commas. These help index your article.
                </p>
              </div>
            </div>
          )}

          {/* ══ STEP 3 — File & Submission ════════════════════════ */}
          {step === 3 && (
            <div className="flex flex-col gap-6">
              {/* File upload */}
              <div>
                <label style={LABEL_STYLE}>Article file (PDF or Word) {REQUIRED}</label>
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
                    <span className="text-sm font-medium">Click to select your file</span>
                    <span className="text-xs">PDF or Word (.docx) — 10 MB maximum</span>
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

              {/* Summary */}
              <div className="rounded-lg p-5" style={{ background: '#F8FAFC', border: '1px solid #E5E7EB' }}>
                <h3 className="text-sm font-semibold mb-3" style={{ color: '#374151' }}>Submission summary</h3>
                <dl className="flex flex-col gap-2">
                  {[
                    { label: 'Title', value: form.title },
                    { label: 'Area', value: form.research_area },
                    { label: 'Co-authors', value: form.co_authors || '—' },
                    { label: 'Keywords', value: form.keywords },
                    { label: 'Abstract', value: form.abstract.length > 120 ? form.abstract.substring(0, 120) + '...' : form.abstract },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex gap-3">
                      <dt className="text-xs font-semibold flex-shrink-0" style={{ color: '#6B7280', width: 90 }}>{label}</dt>
                      <dd className="text-xs" style={{ color: '#111' }}>{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              {/* Declaration */}
              <p className="text-xs" style={{ color: '#6B7280', lineHeight: 1.6 }}>
                By submitting this article, you certify that this work is original, has not been published elsewhere,
                and that all co-authors have approved this submission. You agree to the{' '}
                <span style={{ color: '#1B5E8A', cursor: 'pointer' }}>JAEI submission terms</span>.
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

            {step < 3 ? (
              <button onClick={next}
                className="px-5 py-2.5 text-sm font-semibold rounded transition-opacity"
                style={{ background: '#1B5E8A', color: '#fff' }}
                onMouseEnter={e => e.currentTarget.style.opacity = '.88'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                Next →
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
                    Submitting…
                  </>
                ) : 'Submit article'}
              </button>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
