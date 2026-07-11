import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import api from '../../utils/api';

// ── Charte JAEI ──────────────────────────────────────────────
const GREEN_DARK = '#1B4427';
const GREEN      = '#2E9E68';
const LINK       = '#1E88C8';
const PANEL      = '#EEF5F1';
const RED        = '#C0392B';
const BORDER     = '#E5E7EB';
const INK        = '#1a1a1a';
const GRAY       = '#6B7280';
const HEAD_FONT      = "'Inter', 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

// ── Petites icônes ───────────────────────────────────────────
const IconCheck = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);
const IconDoc = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);
const IconPreview = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ marginRight: 6 }}>
    <rect x="3" y="3" width="13" height="13" rx="1.5" /><path strokeLinecap="round" d="M8 21h10a2 2 0 002-2V9" />
  </svg>
);

const REC_OPTIONS = ['accept', 'reject', 'revise'];
const STEPS = ['Feedback for the author(s)', 'Confidential feedback for the Editor', 'Preview'];

const ReviewArticle = () => {
  const { id } = useParams();               // id = submission ID
  const navigate = useNavigate();
  const draftKey = `jaei_review_draft_${id}`;

  const [submission, setSubmission] = useState(null);
  const [files, setFiles]           = useState([]);
  const [reviewId, setReviewId]     = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [success, setSuccess]       = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [step, setStep]                                 = useState(0);
  const [authorComments, setAuthorComments]             = useState('');
  const [reviewFile, setReviewFile]                     = useState(null);
  const [recommendation, setRecommendation]             = useState('');
  const [confidentialComments, setConfidentialComments] = useState('');
  const [showFullAbstract, setShowFullAbstract]         = useState(false);
  const [showDownloads, setShowDownloads]               = useState(false);

  // Indicateur de sauvegarde ("Saving…" → "Last saved N second(s) ago")
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [nowTick, setNowTick] = useState(Date.now());

  useEffect(() => {
    api.get(`/reviews/by-submission/${id}`)
      .then(r => { setSubmission(r.data.submission); setFiles(r.data.files || []); setReviewId(r.data.review_id); })
      .catch(() => setError('Unable to load the article.'))
      .finally(() => setLoading(false));
    try {
      const d = JSON.parse(localStorage.getItem(draftKey) || 'null');
      if (d) { setAuthorComments(d.authorComments || ''); setRecommendation(d.recommendation || ''); setConfidentialComments(d.confidentialComments || ''); }
    } catch { /* ignore */ }
  }, [id]); // eslint-disable-line

  useEffect(() => { const t = setInterval(() => setNowTick(Date.now()), 1000); return () => clearInterval(t); }, []);

  useEffect(() => {
    if (loading) return;
    setSaving(true);
    const t = setTimeout(() => {
      try { localStorage.setItem(draftKey, JSON.stringify({ authorComments, recommendation, confidentialComments })); } catch { /* ignore */ }
      setSaving(false); setSavedAt(Date.now());
    }, 700);
    return () => clearTimeout(t);
  }, [authorComments, recommendation, confidentialComments]); // eslint-disable-line

  const fileHref = (f) => (f?.startsWith?.('http') ? f : `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}${f}`);
  // Nom de téléchargement (avec extension) — depuis original_name, sinon déduit de l'URL
  const dispName = (f) => {
    let n = (f.original_name || 'manuscript').trim();
    if (!/\.[a-z0-9]{2,5}$/i.test(n)) {
      const m = (f.file_url || '').match(/\.(pdf|docx?)(?:$|\?)/i);
      n += m ? `.${m[1].toLowerCase()}` : '.pdf';
    }
    return n;
  };
  // Les fichiers Cloudinary (raw, sans bon Content-Disposition) passent par notre
  // proxy backend qui impose le nom + Content-Type ; les fichiers locaux sont directs.
  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  const fileUrlFor = (f, mode) => {
    const u = fileHref(f.file_url);
    return /^https:\/\/res\.cloudinary\.com\//.test(u)
      ? `${API_BASE}/submissions/file?u=${encodeURIComponent(u)}&name=${encodeURIComponent(dispName(f))}&mode=${mode}`
      : u;
  };
  const allFiles = files.length > 0 ? files
    : (submission?.pdf_url ? [{ id: 'legacy', file_url: submission.pdf_url, file_type: 'Manuscript', original_name: 'Manuscript' }] : []);

  const assigned = submission?.assigned_at ? new Date(submission.assigned_at)
    : (submission?.submitted_at ? new Date(submission.submitted_at) : null);
  const dueDate = assigned ? new Date(assigned.getTime() + 30 * 24 * 3600 * 1000) : null;
  const fmtDue = dueDate ? dueDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  const authorsText = submission
    ? (submission.co_authors ? `${submission.author_name}, ${submission.co_authors}` : submission.author_name)
    : '';
  const abstract = submission?.abstract || '';
  const abstractShort = abstract.length > 300 ? abstract.slice(0, 300).trimEnd() + '…' : abstract;

  const openQuickPreview = () => { if (allFiles[0]) window.open(fileUrlFor(allFiles[0], 'inline'), '_blank', 'noreferrer'); };
  const addToCalendar = () => {
    if (!dueDate) return;
    const dt = (d) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'BEGIN:VEVENT',
      `DTSTART:${dt(dueDate)}`, `DTEND:${dt(dueDate)}`,
      `SUMMARY:JAEI review due — ${submission?.title || ''}`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    const a = document.createElement('a');
    a.href = 'data:text/calendar;charset=utf-8,' + encodeURIComponent(ics);
    a.download = 'jaei-review.ics'; a.click();
  };

  const onPickFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!/\.(docx?|pdf)$/i.test(f.name)) { setError('Only DOC, DOCX or PDF files are accepted.'); return; }
    setError(''); setReviewFile(f);
  };

  const handleSubmit = async () => {
    if (!recommendation) { setStep(1); setError('Please select your recommendation.'); return; }
    if (authorComments.trim().length < 1 && !reviewFile) { setStep(0); setError('Please add comments for the author(s) or upload a review file.'); return; }
    setSubmitting(true); setError('');
    try {
      const fd = new FormData();
      fd.append('comments', authorComments.trim());
      fd.append('recommendation', recommendation);
      fd.append('confidential_comments', confidentialComments.trim());
      if (reviewFile) fd.append('review_file', reviewFile);
      await api.post(`/reviews/${reviewId}/submit`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      localStorage.removeItem(draftKey);
      setSuccess(true);
      setTimeout(() => navigate('/reviewer/dashboard'), 2500);
    } catch (err) {
      setError(err.response?.data?.message || 'Error submitting the review.');
      setSubmitting(false);
    }
  };

  // ── Éléments réutilisables ──
  const Pill = ({ children, onClick, disabled }) => (
    <button type="button" onClick={onClick} disabled={disabled}
      style={{ borderRadius: 9999, padding: '11px 28px', fontWeight: 700, fontSize: 15, fontFamily: 'inherit',
        background: disabled ? '#9CA3AF' : GREEN_DARK, color: '#fff', border: 'none', cursor: disabled ? 'not-allowed' : 'pointer' }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = '#15381f'; }}
      onMouseLeave={e => { if (!disabled) e.currentTarget.style.background = GREEN_DARK; }}>
      {children}
    </button>
  );
  const H = ({ children, size = 26, mb = 0, style }) => (
    <h2 style={{ fontFamily: HEAD_FONT, fontWeight: 700, fontSize: size, color: GREEN_DARK, margin: 0, marginBottom: mb, ...style }}>{children}</h2>
  );
  const linkStyle = { color: LINK, cursor: 'pointer', textDecoration: 'none', background: 'none', border: 'none', font: 'inherit', padding: 0 };
  const req = <span style={{ fontSize: 13, color: GRAY }}><span style={{ color: RED }}>*</span> Indicates a required field</span>;
  const textareaStyle = { width: '100%', minHeight: 200, padding: '12px 14px', fontSize: 15, fontFamily: 'inherit', color: '#374151',
    lineHeight: 1.6, border: '1px solid #C7CDD3', borderRadius: 4, outline: 'none', resize: 'vertical' };

  // ── Loading ──
  if (loading) {
    return (
      <DashboardLayout title="Review">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '96px 0' }}>
          <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: LINK, borderTopColor: 'transparent' }} />
          <span style={{ marginLeft: 12, color: GRAY, fontSize: 14 }}>Loading article…</span>
        </div>
      </DashboardLayout>
    );
  }
  // ── Success ──
  if (success) {
    return (
      <DashboardLayout title="Review">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '96px 0', textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: GREEN_DARK, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
          </div>
          <H size={24} mb={8}>Review report submitted</H>
          <p style={{ color: GRAY, fontSize: 15 }}>The author and editorial team have been notified. Redirecting…</p>
        </div>
      </DashboardLayout>
    );
  }

  const recLabel = (v) => v.charAt(0).toUpperCase() + v.slice(1);

  return (
    <DashboardLayout title="Review">
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>

        <Link to="/reviewer/dashboard" style={{ ...linkStyle, color: GRAY, fontSize: 13, display: 'inline-block', marginBottom: 12 }}>← Back to dashboard</Link>

        {/* ══ ÉCRAN 1 — Bannière + carte article ══ */}
        <div style={{ background: `linear-gradient(90deg, #102a17 0%, ${GREEN_DARK} 55%, ${GREEN} 100%)`, borderRadius: 4, padding: '40px 40px 56px' }}>
          <h1 style={{ fontFamily: HEAD_FONT, fontWeight: 700, fontSize: 40, color: '#fff', margin: 0, lineHeight: 1.1 }}>Your review for JAEI</h1>
        </div>

        <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 4, boxShadow: '0 2px 10px rgba(0,0,0,0.06)', margin: '-32px 20px 0', position: 'relative' }}>
          <div style={{ padding: '28px 32px' }}>
            <h2 style={{ fontWeight: 700, fontSize: 21, color: INK, margin: '0 0 20px', lineHeight: 1.3 }}>{submission?.title}</h2>

            {/* Authors */}
            <div style={{ display: 'flex', gap: 24, marginBottom: 16 }}>
              <div style={{ width: 96, flexShrink: 0, color: GRAY, fontSize: 15 }}>Authors</div>
              <div style={{ flex: 1, minWidth: 0, color: '#374151', fontSize: 15, overflowWrap: 'anywhere' }}>{authorsText}</div>
            </div>
            {/* Abstract */}
            {abstract && (
              <div style={{ display: 'flex', gap: 24, marginBottom: 16 }}>
                <div style={{ width: 96, flexShrink: 0, color: GRAY, fontSize: 15 }}>Abstract</div>
                <div style={{ flex: 1, minWidth: 0, color: '#374151', fontSize: 15, lineHeight: 1.6, overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                  {showFullAbstract ? abstract : abstractShort}
                  {abstract.length > 300 && (
                    <div><button style={{ ...linkStyle, fontWeight: 600, marginTop: 6 }} onClick={() => setShowFullAbstract(v => !v)}>{showFullAbstract ? 'See less' : 'See more'}</button></div>
                  )}
                </div>
              </div>
            )}
            {/* Due date */}
            <div style={{ display: 'flex', gap: 24, marginBottom: 18 }}>
              <div style={{ width: 96, flexShrink: 0, color: GRAY, fontSize: 15 }}>Due date</div>
              <div style={{ flex: 1, minWidth: 0, fontSize: 15 }}>
                <span style={{ color: RED, fontWeight: 700 }}>{fmtDue}</span>
                <button style={{ ...linkStyle, fontWeight: 600, marginLeft: 16 }} onClick={addToCalendar}>Add to calendar ▾</button>
              </div>
            </div>
            {/* ORCID */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 6 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: '50%', background: '#A6CE39', color: '#fff', fontWeight: 700, fontStyle: 'italic', fontSize: 11, flexShrink: 0 }}>iD</span>
              <span style={{ color: '#374151', fontSize: 14 }}>You&apos;ll have the option to add this review to your <a href="https://orcid.org" target="_blank" rel="noreferrer" style={{ color: LINK, fontWeight: 600, textDecoration: 'none' }}>ORCID</a> profile after you submit the review report.</span>
            </div>
          </div>
          {/* Bottom bar : Open Quick Preview / Download files */}
          <div style={{ borderTop: `1px solid ${BORDER}`, padding: '12px 32px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 28 }}>
            <button style={{ ...linkStyle, display: 'inline-flex', alignItems: 'center', fontWeight: 600 }} onClick={openQuickPreview}><IconPreview /> Open Quick Preview</button>
            <div style={{ position: 'relative' }}>
              <button style={{ ...linkStyle, fontWeight: 700 }} onClick={() => setShowDownloads(v => !v)}>Download files ▾</button>
              {showDownloads && (
                <div style={{ position: 'absolute', right: 0, top: 26, background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 4, boxShadow: '0 4px 14px rgba(0,0,0,0.12)', minWidth: 240, zIndex: 20, padding: 6 }}>
                  {allFiles.length > 0 ? allFiles.map(f => (
                    <a key={f.id} href={fileUrlFor(f, 'download')} download={dispName(f)}
                       style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', color: '#374151', textDecoration: 'none', fontSize: 14, borderRadius: 3 }}
                       onMouseEnter={e => e.currentTarget.style.background = PANEL} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <span style={{ color: GREEN_DARK }}><IconDoc /></span>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.original_name || 'File'}</span>
                      <span style={{ marginLeft: 'auto', fontSize: 11, color: GRAY }}>{f.file_type}</span>
                    </a>
                  )) : (
                    <div style={{ padding: '10px 12px', fontSize: 13, color: GRAY }}>No files attached to this submission.</div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ══ ÉCRAN 2 — Guidance ══ */}
        <div style={{ padding: '40px 20px 8px' }}>
          <H size={30}>Guidance</H>
          <hr style={{ border: 'none', borderTop: `1px solid ${BORDER}`, margin: '16px 0 28px' }} />

          <p style={{ fontWeight: 700, color: INK, fontSize: 15, margin: '0 0 24px' }}>Thank you for agreeing to review.</p>

          <H size={20} mb={12}>1. Get started</H>
          <p style={{ color: '#374151', fontSize: 15, lineHeight: 1.7, margin: '0 0 28px' }}>To start your review, download all the relevant files from the download link above.</p>

          <H size={20} mb={12}>2. Writing your report</H>
          <p style={{ color: '#374151', fontSize: 15, lineHeight: 1.7, margin: '0 0 28px' }}>
            {"The feedback you include in your review report will be shared with the manuscript author(s)."}<br />
            {"Please keep it constructive and professional. To keep the review anonymous, please don't include your name in the report."}<br />
            {"We reserve the right to remove any inappropriate language from your report."}<br />
            {"We ask peer reviewers not to upload manuscripts into generative AI tools."}
          </p>

          <H size={20} mb={12}>3. Submitting your report</H>
          <p style={{ color: '#374151', fontSize: 15, lineHeight: 1.7, margin: '0 0 24px' }}>
            {"There's a page in the form where you can share confidential feedback with the Editor. You can use this page to address any sensitive topics you don't want to share with the author(s)."}<br />
            {"Before you submit your report, please review it to make sure it's a complete and thorough review."}
          </p>
          <p style={{ color: '#374151', fontSize: 15, lineHeight: 1.7, margin: 0 }}>
            For further information, please see the <Link to="/" style={{ color: LINK, textDecoration: 'none' }}>JAEI reviewer guidelines</Link>.
          </p>
        </div>

        {/* ══ ÉCRAN 3-5 — Your report ══ */}
        <div style={{ padding: '32px 20px 60px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <H size={30}>Your report</H>
            <span style={{ fontSize: 13, color: GRAY, fontStyle: 'italic', display: 'inline-flex', alignItems: 'center', gap: 7 }}>
              {saving ? 'Saving…' : savedAt ? (
                <>
                  <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, borderRadius: '50%', background: GREEN }}><IconCheck /></span>
                  Last saved {Math.max(0, Math.round((nowTick - savedAt) / 1000))} second(s) ago
                </>
              ) : null}
            </span>
          </div>
          <hr style={{ border: 'none', borderTop: `1px solid ${BORDER}`, margin: '16px 0 0' }} />

          <div style={{ display: 'flex', gap: 0, flexWrap: 'wrap' }}>
            {/* Nav latérale */}
            <nav style={{ width: 240, flexShrink: 0, paddingTop: 24 }}>
              {STEPS.map((s, i) => (
                <div key={s} style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <button onClick={() => { setError(''); setStep(i); }}
                    style={{ ...linkStyle, display: 'block', width: '100%', textAlign: 'left', padding: '14px 4px', fontSize: 15,
                      color: step === i ? INK : LINK, fontWeight: step === i ? 700 : 400 }}>
                    {s}
                  </button>
                </div>
              ))}
            </nav>

            {/* Contenu */}
            <div style={{ flex: 1, minWidth: 0, paddingTop: 24, paddingLeft: 40 }}>
              {error && (
                <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', borderRadius: 4, padding: '10px 14px', fontSize: 14, marginBottom: 20 }}>⊘ {error}</div>
              )}

              {/* ── STEP 0 : Feedback for the author(s) ── */}
              {step === 0 && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16 }}>
                    <H size={24}>Feedback for the author(s)</H>{req}
                  </div>
                  <ul style={{ margin: '18px 0 28px', paddingLeft: 22, color: GRAY, fontStyle: 'italic', fontSize: 15, lineHeight: 1.6 }}>
                    <li style={{ marginBottom: 8 }}>Your review should be constructive and focused on ensuring the results are accurately reported.</li>
                    <li style={{ marginBottom: 8 }}>Please explain how the text can be revised and what essential work is needed to prepare a revision ready for acceptance.</li>
                    <li style={{ marginBottom: 8 }}>If recommending rejection, you should explain why the submission does not meet our editorial criteria for publication.</li>
                    <li style={{ marginBottom: 8 }}>If you wish to keep your anonymity, please avoid adding personal details to your report.</li>
                    <li>You can upload a file with your comments for the author(s) or include them in the text box below.</li>
                  </ul>

                  <H size={20} mb={10}>Review file(s)</H>
                  <p style={{ color: '#374151', fontSize: 15, lineHeight: 1.6, margin: '0 0 16px' }}>
                    Please, upload all the relevant review files. We accept files with a <strong>maximum size of 500MB</strong> each and in the following formats: <strong>DOC, DOCX or PDF.</strong>
                  </p>
                  <label>
                    <span style={{ display: 'inline-block', borderRadius: 9999, padding: '11px 28px', fontWeight: 700, fontSize: 15, background: GREEN_DARK, color: '#fff', cursor: 'pointer' }}>Upload file(s)</span>
                    <input type="file" accept=".doc,.docx,.pdf" style={{ display: 'none' }} onChange={onPickFile} />
                  </label>
                  {reviewFile && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14, padding: '10px 14px', background: PANEL, border: '1px solid #BBDFCB', borderRadius: 4, maxWidth: 480 }}>
                      <span style={{ color: GREEN_DARK }}><IconDoc /></span>
                      <span style={{ fontSize: 14, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{reviewFile.name}</span>
                      <span style={{ fontSize: 12, color: GRAY }}>({(reviewFile.size / 1024).toFixed(0)} KB)</span>
                      <button onClick={() => setReviewFile(null)} style={{ ...linkStyle, marginLeft: 'auto', color: RED, fontWeight: 600, textDecoration: 'underline' }}>Remove</button>
                    </div>
                  )}

                  <div style={{ marginTop: 32 }}>
                    <H size={20} mb={10}>Comments to the author(s)</H>
                    <p style={{ color: GRAY, fontStyle: 'italic', fontSize: 15, margin: '0 0 12px' }}>Please include your comments for the authors in the box below.</p>
                    <textarea value={authorComments} onChange={e => setAuthorComments(e.target.value)} style={textareaStyle}
                      onFocus={e => e.target.style.borderColor = LINK} onBlur={e => e.target.style.borderColor = '#C7CDD3'} />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 28 }}>
                    <Pill onClick={() => { setError(''); setStep(1); }}>Next &gt;</Pill>
                  </div>
                </div>
              )}

              {/* ── STEP 1 : Confidential feedback for the Editor ── */}
              {step === 1 && (
                <div>
                  <H size={24} mb={16}>Confidential feedback for the Editor</H>
                  <hr style={{ border: 'none', borderTop: `1px solid ${BORDER}`, margin: '0 0 18px' }} />
                  <div style={{ marginBottom: 20 }}>{req}</div>

                  <div style={{ background: PANEL, borderRadius: 6, padding: '28px 32px' }}>
                    <p style={{ fontWeight: 700, color: INK, fontSize: 17, margin: '0 0 4px' }}><span style={{ color: RED }}>*</span> Your recommendation</p>
                    <div style={{ display: 'flex', gap: 36, margin: '18px 0 20px' }}>
                      {REC_OPTIONS.map(v => (
                        <label key={v} style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer', fontSize: 16 }}>
                          <input type="radio" name="rec" value={v} checked={recommendation === v} onChange={() => setRecommendation(v)}
                            style={{ width: 18, height: 18, accentColor: GREEN_DARK, cursor: 'pointer' }} />
                          <span style={{ color: INK, fontWeight: 600 }}>{recLabel(v)}</span>
                        </label>
                      ))}
                    </div>
                    <p style={{ color: '#374151', fontSize: 15, lineHeight: 1.6, margin: 0 }}>
                      {"If recommending a revision, please give clear and constructive advice that enables the authors to prepare their manuscript so that it's ready for acceptance – without requiring multiple rounds of revision."}
                    </p>
                  </div>

                  <div style={{ marginTop: 28 }}>
                    <H size={20} mb={10}>Confidential comments to the Editor</H>
                    <p style={{ color: GRAY, fontStyle: 'italic', fontSize: 15, margin: '0 0 12px' }}>{"Use this space for anything sensitive you don't want to share with the author(s). It will only be seen by the editorial team."}</p>
                    <textarea value={confidentialComments} onChange={e => setConfidentialComments(e.target.value)} style={{ ...textareaStyle, minHeight: 150 }}
                      onFocus={e => e.target.style.borderColor = LINK} onBlur={e => e.target.style.borderColor = '#C7CDD3'} />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 28 }}>
                    <button style={{ ...linkStyle, fontWeight: 600 }} onClick={() => { setError(''); setStep(0); }}>&lt; Back</button>
                    <Pill onClick={() => { setError(''); setStep(2); }}>Next &gt;</Pill>
                  </div>
                </div>
              )}

              {/* ── STEP 2 : Preview + Submit ── */}
              {step === 2 && (
                <div>
                  <H size={24} mb={16}>Preview</H>
                  <hr style={{ border: 'none', borderTop: `1px solid ${BORDER}`, margin: '0 0 24px' }} />

                  <p style={{ fontFamily: HEAD_FONT, fontSize: 18, color: GREEN_DARK, fontWeight: 700, margin: '0 0 8px' }}>Recommendation</p>
                  <p style={{ fontSize: 15, color: recommendation ? INK : RED, margin: '0 0 24px', fontWeight: 600 }}>{recommendation ? recLabel(recommendation) : 'Not selected yet'}</p>

                  <p style={{ fontFamily: HEAD_FONT, fontSize: 18, color: GREEN_DARK, fontWeight: 700, margin: '0 0 8px' }}>Feedback for the author(s)</p>
                  <p style={{ fontSize: 15, color: authorComments.trim() ? '#374151' : GRAY, whiteSpace: 'pre-wrap', lineHeight: 1.6, margin: '0 0 8px', fontStyle: authorComments.trim() ? 'normal' : 'italic' }}>{authorComments.trim() || '(none)'}</p>
                  {reviewFile && <p style={{ fontSize: 14, color: GREEN_DARK, display: 'inline-flex', alignItems: 'center', gap: 6, margin: '0 0 24px' }}><IconDoc /> {reviewFile.name}</p>}
                  {!reviewFile && <div style={{ marginBottom: 24 }} />}

                  <p style={{ fontFamily: HEAD_FONT, fontSize: 18, color: GREEN_DARK, fontWeight: 700, margin: '0 0 8px' }}>Confidential feedback for the Editor</p>
                  <p style={{ fontSize: 15, color: confidentialComments.trim() ? '#374151' : GRAY, whiteSpace: 'pre-wrap', lineHeight: 1.6, margin: '0 0 32px', fontStyle: confidentialComments.trim() ? 'normal' : 'italic' }}>{confidentialComments.trim() || '(none)'}</p>

                  {/* Before you submit */}
                  <div style={{ background: PANEL, borderRadius: 4, borderTop: `5px solid ${GREEN_DARK}`, padding: '28px 32px' }}>
                    <p style={{ fontWeight: 700, color: INK, fontSize: 20, margin: '0 0 10px' }}>Before you submit your report</p>
                    <p style={{ color: '#374151', fontSize: 15, lineHeight: 1.6, margin: '0 0 24px' }}>Please review your report thoroughly as you will not be able to make any further changes.</p>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <Pill onClick={handleSubmit} disabled={submitting}>{submitting ? 'Submitting…' : 'Submit review report'}</Pill>
                    </div>
                  </div>

                  <div style={{ marginTop: 24 }}>
                    <button style={{ ...linkStyle, fontWeight: 600 }} onClick={() => { setError(''); setStep(1); }}>&lt; Back</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ReviewArticle;
