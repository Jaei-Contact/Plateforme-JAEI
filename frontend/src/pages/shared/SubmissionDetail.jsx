import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import AssignReviewerModal from '../../components/admin/AssignReviewerModal';
import api from '../../utils/api';

// ── Icônes ──────────────────────────────────────────────────

const IconArrowLeft = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
  </svg>
);

const IconDoc = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
  </svg>
);

const IconExternalLink = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
  </svg>
);

const IconUser = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
  </svg>
);

const IconClock = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
  </svg>
);

const IconMessageSquare = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
  </svg>
);

// ── Configs ──────────────────────────────────────────────────

const STATUS_CONFIG = {
  submitted:       { label: 'Submitted',        bg: '#F3F4F6', color: '#374151', border: '#D1D5DB' },
  pending:         { label: 'Payment required', bg: '#FFFBEB', color: '#92400E', border: '#FDE68A' },
  under_review:    { label: 'Under review',     bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' },
  revision_needed: { label: 'Revision needed',  bg: '#FFF7ED', color: '#C2410C', border: '#FED7AA' },
  revised:         { label: 'Revised',          bg: '#F5F3FF', color: '#6D28D9', border: '#DDD6FE' },
  accepted:        { label: 'Accepted',         bg: '#F0FDF4', color: '#15803D', border: '#BBF7D0' },
  published:       { label: 'Published',        bg: '#ECFDF5', color: '#065F46', border: '#A7F3D0' },
  rejected:        { label: 'Rejected',         bg: '#FEF2F2', color: '#B91C1C', border: '#FECACA' },
};

const RECOMMENDATION_CONFIG = {
  accept:         { label: 'Accept',           bg: '#F0FDF4', color: '#15803D', border: '#BBF7D0' },
  minor_revision: { label: 'Minor revisions',  bg: '#FFFBEB', color: '#92400E', border: '#FDE68A' },
  major_revision: { label: 'Major revisions',  bg: '#F5F3FF', color: '#6D28D9', border: '#DDD6FE' },
  reject:         { label: 'Reject',           bg: '#FEF2F2', color: '#B91C1C', border: '#FECACA' },
};

const StatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.submitted;
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-sm text-xs font-medium"
          style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
      {cfg.label}
    </span>
  );
};

const RecommendationBadge = ({ value }) => {
  const cfg = RECOMMENDATION_CONFIG[value];
  if (!cfg) return null;
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-sm text-xs font-medium"
          style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
      {cfg.label}
    </span>
  );
};

// ── Page ─────────────────────────────────────────────────────

const RESEARCH_AREAS = [
  'Agronomy', 'Agroforestry', 'Plant genetics', 'Crop production', 'Soil science',
  'Plant pathology', 'Rural engineering & Hydraulics', 'Rural development',
  'Aquaculture & Fisheries', 'Animal nutrition', 'Animal production',
  'Veterinary parasitology', 'Animal husbandry', 'Ecology', 'Environment & Pollution',
  'Climate change & Agriculture', 'Forestry', 'Natural resource management',
  'Water sciences', 'Agricultural biotechnology', 'Soil microbiology', 'Agricultural economics',
];

const SubmissionDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [submission, setSubmission] = useState(null);
  const [reviews, setReviews]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [publishing, setPublishing]       = useState(false);
  const [deleting, setDeleting]           = useState(false);
  const [assignModal, setAssignModal]     = useState(false);
  const [editorComment, setEditorComment] = useState('');
  const [changingStatus, setChangingStatus] = useState(false);

  // ── Mode édition ───────────────────────────────────────────
  const [editing, setEditing]     = useState(false);
  const [editForm, setEditForm]   = useState({});
  const [saving, setSaving]       = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveOk, setSaveOk]       = useState(false);

  const isAdmin    = user?.role === 'admin';
  const isAuthor   = user?.role === 'author';
  const canEdit    = isAuthor && submission && ['pending', 'submitted', 'revision_needed'].includes(submission.status);
  const canDelete  = isAdmin || (isAuthor && submission && ['pending', 'submitted'].includes(submission.status));
  const backUrl    = isAdmin ? '/admin/dashboard' : '/author/dashboard';

  const startEdit = () => {
    setEditForm({
      title:         submission.title         || '',
      abstract:      submission.abstract      || '',
      keywords:      submission.keywords      || '',
      research_area: submission.research_area || '',
      co_authors:    submission.co_authors    || '',
    });
    setSaveError('');
    setSaveOk(false);
    setEditing(true);
  };

  const handleSave = async () => {
    if (!editForm.title?.trim() || !editForm.abstract?.trim() || !editForm.keywords?.trim() || !editForm.research_area) {
      setSaveError('Title, abstract, keywords and research area are required.');
      return;
    }
    setSaving(true);
    setSaveError('');
    try {
      const res = await api.patch(`/submissions/${id}`, editForm);
      setSubmission(prev => ({ ...prev, ...res.data.submission }));
      setSaveOk(true);
      setEditing(false);
      setTimeout(() => setSaveOk(false), 3000);
    } catch (err) {
      setSaveError(err.response?.data?.message || 'Error saving changes.');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [subRes, revRes] = await Promise.all([
          api.get(`/submissions/${id}`),
          api.get(`/reviews/submission/${id}`),
        ]);
        setSubmission(subRes.data.submission);
        setReviews(revRes.data.reviews || []);
      } catch (err) {
        setError('Unable to load the details of this submission.');
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [id]);

  const handleDelete = async () => {
    const confirmMsg = isAdmin
      ? `Delete "${submission.title}"?\n\nThis action is irreversible. All associated reviews and data will be permanently removed.`
      : `Delete "${submission.title}"?\n\nThis action is irreversible.`;
    if (!window.confirm(confirmMsg)) return;
    setDeleting(true);
    try {
      await api.delete(`/submissions/${id}`);
      navigate(backUrl);
    } catch (err) {
      alert(err.response?.data?.message || 'Error deleting submission. Please try again.');
      setDeleting(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    setChangingStatus(true);
    try {
      const body = { status: newStatus };
      if (editorComment.trim()) body.editor_comment = editorComment.trim();
      await api.patch(`/submissions/${id}/status`, body);
      setSubmission(prev => ({ ...prev, status: newStatus }));
      setEditorComment('');
    } catch {
      alert('Error updating status. Please try again.');
    } finally {
      setChangingStatus(false);
    }
  };

  const handleAssigned = () => {
    setSubmission(prev => ({ ...prev, status: 'under_review' }));
    setAssignModal(false);
  };

  const handlePublish = async () => {
    if (!window.confirm('Publish this article? It will be visible on the public site.')) return;
    setPublishing(true);
    try {
      await api.patch(`/submissions/${id}/status`, { status: 'published' });
      setSubmission(prev => ({ ...prev, status: 'published' }));
    } catch (err) {
      alert('Publication error. Please try again.');
    } finally {
      setPublishing(false);
    }
  };

  const formatDate = (d) => new Date(d).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  const title = isAdmin ? 'Submission detail' : 'My article';

  if (loading) {
    return (
      <DashboardLayout title={title}>
        <div className="flex items-center justify-center py-24">
          <div className="w-6 h-6 rounded-full border-2 animate-spin"
               style={{ borderColor: '#1E88C8', borderTopColor: 'transparent' }}/>
          <span className="ml-3 text-sm" style={{ color: '#6B7280' }}>Loading…</span>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !submission) {
    return (
      <DashboardLayout title={title}>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-sm font-medium mb-3" style={{ color: '#374151' }}>{error || 'Submission not found.'}</p>
          <Link to={backUrl} className="text-sm no-underline" style={{ color: '#1E88C8' }}>
            ← Back to dashboard
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={title}>

      {/* ── Back ───────────────────────────────────────────── */}
      <div className="mb-6">
        <Link to={backUrl}
              className="inline-flex items-center gap-2 text-sm no-underline transition-colors"
              style={{ color: '#6B7280' }}
              onMouseEnter={e => e.currentTarget.style.color = '#374151'}
              onMouseLeave={e => e.currentTarget.style.color = '#6B7280'}>
          <IconArrowLeft /> Back to dashboard
        </Link>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* ── Left column: article info (2/3) ─────────────── */}
        <div className="xl:col-span-2 space-y-4">

          {/* Carte principale */}
          <div className="bg-white rounded-sm"
               style={{ border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div className="px-6 py-4" style={{ borderBottom: '1px solid #F3F4F6' }}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  {submission.research_area && (
                    <span className="text-xs font-medium px-2.5 py-0.5 rounded-sm"
                          style={{ background: '#F0FDF4', color: '#15803D', border: '1px solid #BBF7D0' }}>
                      {submission.research_area}
                    </span>
                  )}
                  <StatusBadge status={submission.status} />
                </div>
                {/* Bouton Edit — auteur uniquement, statut pending/submitted */}
                {canEdit && !editing && (
                  <button onClick={startEdit}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-sm transition-colors"
                    style={{ border: '1px solid #1E88C8', color: '#1E88C8', background: '#EFF6FF' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#DBEAFE'}
                    onMouseLeave={e => e.currentTarget.style.background = '#EFF6FF'}>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                    </svg>
                    Edit
                  </button>
                )}
              </div>

              {/* Titre — lecture ou édition */}
              {editing ? (
                <input
                  value={editForm.title}
                  onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full mt-3 px-3 py-2 text-base font-bold rounded-sm outline-none"
                  style={{ border: '1px solid #1E88C8', color: '#1B4427' }}
                  placeholder="Title"
                />
              ) : (
                <h2 className="text-lg font-bold mt-3 leading-snug" style={{ color: '#1B4427' }}>
                  {submission.title}
                </h2>
              )}
            </div>

            <div className="px-6 py-5 space-y-4">

              {/* ── Formulaire d'édition ────────────────────── */}
              {editing && (
                <div className="space-y-4 pb-4" style={{ borderBottom: '1px solid #F3F4F6' }}>

                  {/* Research area */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#9CA3AF' }}>
                      Research area
                    </label>
                    <select
                      value={editForm.research_area}
                      onChange={e => setEditForm(f => ({ ...f, research_area: e.target.value }))}
                      className="w-full px-3 py-2 text-sm rounded-sm outline-none"
                      style={{ border: '1px solid #E5E7EB', color: '#111827' }}
                      onFocus={e => e.target.style.borderColor = '#1E88C8'}
                      onBlur={e => e.target.style.borderColor = '#E5E7EB'}
                    >
                      <option value="">Select a research area</option>
                      {RESEARCH_AREAS.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>

                  {/* Abstract */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#9CA3AF' }}>
                      Abstract
                    </label>
                    <textarea
                      value={editForm.abstract}
                      onChange={e => setEditForm(f => ({ ...f, abstract: e.target.value }))}
                      rows={6}
                      className="w-full px-3 py-2 text-sm rounded-sm outline-none resize-y"
                      style={{ border: '1px solid #E5E7EB', color: '#374151' }}
                      onFocus={e => e.target.style.borderColor = '#1E88C8'}
                      onBlur={e => e.target.style.borderColor = '#E5E7EB'}
                      placeholder="Abstract…"
                    />
                  </div>

                  {/* Keywords */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#9CA3AF' }}>
                      Keywords <span className="normal-case font-normal" style={{ color: '#9CA3AF' }}>(comma-separated)</span>
                    </label>
                    <input
                      value={editForm.keywords}
                      onChange={e => setEditForm(f => ({ ...f, keywords: e.target.value }))}
                      className="w-full px-3 py-2 text-sm rounded-sm outline-none"
                      style={{ border: '1px solid #E5E7EB', color: '#374151' }}
                      onFocus={e => e.target.style.borderColor = '#1E88C8'}
                      onBlur={e => e.target.style.borderColor = '#E5E7EB'}
                      placeholder="keyword1, keyword2, keyword3…"
                    />
                  </div>

                  {/* Co-authors */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#9CA3AF' }}>
                      Co-authors <span className="normal-case font-normal">(optional)</span>
                    </label>
                    <input
                      value={editForm.co_authors}
                      onChange={e => setEditForm(f => ({ ...f, co_authors: e.target.value }))}
                      className="w-full px-3 py-2 text-sm rounded-sm outline-none"
                      style={{ border: '1px solid #E5E7EB', color: '#374151' }}
                      onFocus={e => e.target.style.borderColor = '#1E88C8'}
                      onBlur={e => e.target.style.borderColor = '#E5E7EB'}
                      placeholder="First name Last name, First name Last name…"
                    />
                  </div>

                  {/* Error */}
                  {saveError && (
                    <p className="text-sm px-3 py-2 rounded-sm" style={{ background: '#FEF2F2', color: '#B91C1C', border: '1px solid #FECACA' }}>
                      {saveError}
                    </p>
                  )}

                  {/* Actions */}
                  <div className="flex gap-3 justify-end">
                    <button onClick={() => setEditing(false)} disabled={saving}
                      className="px-4 py-2 text-sm font-medium rounded-sm"
                      style={{ border: '1px solid #E5E7EB', color: '#374151', background: '#F9FAFB' }}>
                      Cancel
                    </button>
                    <button onClick={handleSave} disabled={saving}
                      className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white rounded-sm transition-opacity"
                      style={{ background: '#1B4427', opacity: saving ? 0.7 : 1 }}>
                      {saving
                        ? <><div className="w-3.5 h-3.5 rounded-full border-2 animate-spin" style={{ borderColor: '#fff', borderTopColor: 'transparent' }} /> Saving…</>
                        : 'Save changes'}
                    </button>
                  </div>
                </div>
              )}

              {/* Succès sauvegarde */}
              {saveOk && (
                <div className="text-sm px-3 py-2 rounded-sm" style={{ background: '#F0FDF4', color: '#15803D', border: '1px solid #BBF7D0' }}>
                  ✓ Changes saved successfully
                </div>
              )}

              {/* Meta */}
              <div className="flex flex-wrap gap-5 text-sm" style={{ color: '#6B7280' }}>
                {isAdmin && submission.author_name && (
                  <div className="flex items-center gap-1.5">
                    <IconUser />
                    <span>{submission.author_name}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <IconClock />
                  <span>Submitted on {formatDate(submission.submitted_at)}</span>
                </div>
              </div>

              {/* Abstract */}
              {!editing && submission.abstract && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#9CA3AF' }}>
                    Abstract
                  </p>
                  <p className="text-sm leading-relaxed" style={{ color: '#374151', wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                    {submission.abstract}
                  </p>
                </div>
              )}

              {/* Keywords */}
              {!editing && submission.keywords && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#9CA3AF' }}>
                    Keywords
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {submission.keywords.split(',').map(kw => (
                      <span key={kw.trim()} className="text-xs px-2 py-0.5 rounded-sm"
                            style={{ background: '#F3F4F6', color: '#374151', border: '1px solid #E5E7EB' }}>
                        {kw.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Co-authors */}
              {submission.co_authors && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: '#9CA3AF' }}>
                    Co-authors
                  </p>
                  <p className="text-sm" style={{ color: '#374151' }}>{submission.co_authors}</p>
                </div>
              )}

              {/* AI Summary */}
              {submission.ai_summary && !editing && (
                <div className="rounded-sm p-4"
                     style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5"
                     style={{ color: '#15803D' }}>
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2a10 10 0 110 20A10 10 0 0112 2zm0 2a8 8 0 100 16A8 8 0 0012 4zm-.5 4h1a.5.5 0 01.5.5v4.793l2.146 2.147a.5.5 0 01-.707.707l-2.293-2.293A.5.5 0 0112 13.5V8.5a.5.5 0 01.5-.5z"/>
                    </svg>
                    AI-generated summary
                  </p>
                  <p className="text-sm leading-relaxed" style={{ color: '#374151' }}>
                    {submission.ai_summary}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* PDF */}
          {submission.pdf_url && (
            <div className="bg-white rounded-sm"
                 style={{ border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <div className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center"
                       style={{ background: '#EFF6FF' }}>
                    <span style={{ color: '#1D4ED8' }}><IconDoc /></span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: '#111827' }}>Article file</p>
                    <p className="text-xs" style={{ color: '#6B7280' }}>PDF format</p>
                  </div>
                </div>
                <a href={submission.pdf_url}
                   target="_blank" rel="noreferrer"
                   className="inline-flex items-center gap-2 px-4 py-2 rounded-sm text-sm font-semibold no-underline transition-all"
                   style={{ background: '#1E88C8', color: '#fff' }}
                   onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
                   onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                  <IconExternalLink /> Download PDF
                </a>
              </div>
            </div>
          )}

          {/* ── Reviews ────────────────────────────────────── */}
          <div className="bg-white rounded-sm"
               style={{ border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>

            <div className="px-6 py-4 flex items-center gap-3"
                 style={{ borderBottom: '1px solid #F3F4F6' }}>
              <span style={{ color: '#1E88C8' }}><IconMessageSquare /></span>
              <h3 className="text-base font-bold" style={{ color: '#111827' }}>
                Reviews received
              </h3>
              <span className="text-xs px-2 py-0.5 rounded-sm font-medium"
                    style={{ background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE' }}>
                {reviews.length}
              </span>
            </div>

            {reviews.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center px-6">
                <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
                     style={{ background: '#F3F4F6' }}>
                  <IconMessageSquare />
                </div>
                <p className="text-sm font-medium" style={{ color: '#374151' }}>
                  No reviews yet
                </p>
                <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>
                  {submission.status === 'pending' || submission.status === 'submitted'
                    ? 'The article is awaiting assignment to a reviewer.'
                    : 'The review is in progress.'}
                </p>
              </div>
            ) : (
              <ul className="divide-y" style={{ borderColor: '#F3F4F6' }}>
                {reviews.map((review, index) => (
                  <li key={review.id} className="px-6 py-5">

                    {/* Review header */}
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                             style={{ background: '#1B4427', color: '#fff' }}>
                          {index + 1}
                        </div>
                        <div>
                          {/* Admin sees reviewer name; author does not (anonymous review) */}
                          <p className="text-sm font-semibold" style={{ color: '#111827' }}>
                            {isAdmin ? review.reviewer_name : `Reviewer #${index + 1}`}
                          </p>
                          {review.reviewed_at && (
                            <p className="text-xs" style={{ color: '#9CA3AF' }}>
                              Submitted on {formatDate(review.reviewed_at)}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Review status */}
                        {review.status === 'completed' && review.recommendation ? (
                          <RecommendationBadge value={review.recommendation} />
                        ) : (
                          <span className="text-xs px-2.5 py-0.5 rounded-sm font-medium"
                                style={{ background: '#FFFBEB', color: '#92400E', border: '1px solid #FDE68A' }}>
                            In progress
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Comments */}
                    {review.comments ? (
                      <div className="rounded-sm p-4"
                           style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
                        <p className="text-xs font-semibold uppercase tracking-wider mb-2"
                           style={{ color: '#9CA3AF' }}>
                          Comments
                        </p>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap"
                           style={{ color: '#374151' }}>
                          {review.comments}
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm italic" style={{ color: '#9CA3AF' }}>
                        The review has not yet been submitted.
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* ── Right column: status summary (1/3) ─────────────── */}
        <div className="space-y-4">

          {/* Current status */}
          <div className="bg-white rounded-sm"
               style={{ border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div className="px-5 py-4" style={{ borderBottom: '1px solid #F3F4F6' }}>
              <h3 className="text-sm font-bold" style={{ color: '#111827' }}>Current status</h3>
            </div>
            <div className="px-5 py-4">
              <StatusBadge status={submission.status} />
              <p className="text-xs mt-3 leading-relaxed" style={{ color: '#6B7280' }}>
                {submission.status === 'pending' && 'Payment is required to complete the submission process.'}
                {submission.status === 'submitted' && 'The article has been submitted and is under examination by the editorial team.'}
                {submission.status === 'under_review' && 'The article is currently being peer-reviewed.'}
                {submission.status === 'revision_needed' && 'The reviewers have requested revisions. Please update your article and resubmit.'}
                {submission.status === 'revised' && 'The revised version has been submitted and is awaiting editorial decision.'}
                {submission.status === 'accepted' && 'The article has been accepted for publication.'}
                {submission.status === 'published' && 'The article is published and accessible online.'}
                {submission.status === 'rejected' && 'The article was not accepted for publication.'}
              </p>

              {/* ── Actions admin selon statut ── */}
              {isAdmin && (
                <div className="mt-4 flex flex-col gap-2">

                  {/* Commentaire éditorial (optionnel, partagé par tous les boutons d'action) */}
                  {['submitted','under_review','revised'].includes(submission.status) && (
                    <textarea
                      rows={2}
                      placeholder="Editor comment (optional)"
                      value={editorComment}
                      onChange={e => setEditorComment(e.target.value)}
                      className="w-full text-xs rounded-sm resize-none outline-none"
                      style={{ border: '1px solid #E5E7EB', padding: '6px 10px', color: '#374151', background: '#FAFAFA' }}
                      onFocus={e => e.target.style.borderColor = '#1E88C8'}
                      onBlur={e => e.target.style.borderColor = '#E5E7EB'}
                    />
                  )}

                  {/* Submitted → Assigner un évaluateur */}
                  {submission.status === 'submitted' && (
                    <button onClick={() => setAssignModal(true)}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-sm text-sm font-semibold"
                      style={{ background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#DBEAFE'}
                      onMouseLeave={e => e.currentTarget.style.background = '#EFF6FF'}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/>
                      </svg>
                      Assign reviewer
                    </button>
                  )}

                  {/* Under review → Demander révision */}
                  {submission.status === 'under_review' && (
                    <button onClick={() => handleStatusChange('revision_needed')} disabled={changingStatus}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-sm text-sm font-semibold transition-opacity"
                      style={{ background: '#FFF7ED', color: '#C2410C', border: '1px solid #FED7AA', opacity: changingStatus ? 0.7 : 1 }}>
                      Request revision
                    </button>
                  )}

                  {/* Revised → Accepter ou Rejeter */}
                  {submission.status === 'revised' && (
                    <>
                      <button onClick={() => handleStatusChange('accepted')} disabled={changingStatus}
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-sm text-sm font-semibold transition-opacity"
                        style={{ background: '#F0FDF4', color: '#15803D', border: '1px solid #BBF7D0', opacity: changingStatus ? 0.7 : 1 }}>
                        Accept
                      </button>
                      <button onClick={() => handleStatusChange('rejected')} disabled={changingStatus}
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-sm text-sm font-semibold transition-opacity"
                        style={{ background: '#FEF2F2', color: '#B91C1C', border: '1px solid #FECACA', opacity: changingStatus ? 0.7 : 1 }}>
                        Reject
                      </button>
                    </>
                  )}

                  {/* Accepted → Publier */}
                  {submission.status === 'accepted' && (
                    <button onClick={handlePublish} disabled={publishing}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-sm text-sm font-semibold transition-opacity"
                      style={{
                        background: 'linear-gradient(90deg, #1B4427 0%, #1E88C8 100%)',
                        color: '#fff', opacity: publishing ? 0.7 : 1,
                      }}>
                      {publishing ? (
                        <><div className="w-4 h-4 rounded-full border-2 animate-spin" style={{ borderColor: '#fff', borderTopColor: 'transparent' }} /> Publishing…</>
                      ) : (
                        <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064"/>
                        </svg> Publish article</>
                      )}
                    </button>
                  )}
                </div>
              )}

              {/* Link to published article */}
              {submission.status === 'published' && (
                <Link
                  to={`/articles/${id}`}
                  className="w-full mt-4 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-sm text-sm font-semibold no-underline transition-opacity"
                  style={{ background: '#F0FDF4', color: '#15803D', border: '1px solid #BBF7D0' }}
                >
                  <IconExternalLink /> View published article
                </Link>
              )}
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-white rounded-sm"
               style={{ border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div className="px-5 py-4" style={{ borderBottom: '1px solid #F3F4F6' }}>
              <h3 className="text-sm font-bold" style={{ color: '#111827' }}>Timeline</h3>
            </div>
            <div className="px-5 py-4">
              {[
                { label: 'Submission received',    done: true,  date: submission.submitted_at },
                { label: 'Reviewer assigned',      done: reviews.length > 0 },
                { label: 'Review completed',       done: reviews.some(r => r.status === 'completed') },
                { label: 'Editorial decision',     done: ['accepted','rejected','published'].includes(submission.status) },
                { label: 'Publication',            done: submission.status === 'published' },
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-3 mb-3 last:mb-0">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                       style={{
                         background: step.done ? '#1B4427' : '#F3F4F6',
                         border: step.done ? 'none' : '1px solid #D1D5DB',
                       }}>
                    {step.done && (
                      <svg className="w-3 h-3" fill="none" stroke="white" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/>
                      </svg>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-medium" style={{ color: step.done ? '#111827' : '#9CA3AF' }}>
                      {step.label}
                    </p>
                    {step.date && (
                      <p className="text-xs" style={{ color: '#9CA3AF' }}>
                        {new Date(step.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* ── Danger zone ───────────────────────────────── */}
          {canDelete && (
            <div className="bg-white rounded-sm"
                 style={{ border: '1px solid #FECACA', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <div className="px-5 py-4" style={{ borderBottom: '1px solid #FEE2E2' }}>
                <h3 className="text-sm font-bold" style={{ color: '#B91C1C' }}>Danger zone</h3>
              </div>
              <div className="px-5 py-4">
                <p className="text-xs leading-relaxed mb-4" style={{ color: '#6B7280' }}>
                  {isAdmin
                    ? 'As an administrator, you can permanently delete this submission along with all associated reviews and data.'
                    : 'You can delete this submission as it has not yet entered the editorial review process.'}
                </p>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-sm text-sm font-semibold transition-opacity"
                  style={{
                    background: '#FEF2F2',
                    color: '#B91C1C',
                    border: '1px solid #FECACA',
                    opacity: deleting ? 0.6 : 1,
                    cursor: deleting ? 'not-allowed' : 'pointer',
                  }}
                  onMouseEnter={e => { if (!deleting) e.currentTarget.style.background = '#FEE2E2'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#FEF2F2'; }}
                >
                  {deleting ? (
                    <>
                      <div className="w-4 h-4 rounded-full border-2 animate-spin"
                           style={{ borderColor: '#B91C1C', borderTopColor: 'transparent' }} />
                      Deleting…
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                      </svg>
                      Delete this submission
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal assignation évaluateur */}
      {assignModal && (
        <AssignReviewerModal
          submission={submission}
          onClose={() => setAssignModal(false)}
          onAssigned={handleAssigned}
        />
      )}

    </DashboardLayout>
  );
};

export default SubmissionDetail;
