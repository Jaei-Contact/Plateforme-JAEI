import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
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

const IconCheck = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
  </svg>
);

const IconSend = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
  </svg>
);

const IconExternalLink = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
  </svg>
);

// ── Recommendations ──────────────────────────────────────────

const RECOMMENDATIONS = [
  {
    value: 'accept',
    label: 'Accept',
    desc: 'The article is ready for publication without modifications.',
    bg: '#F0FDF4', color: '#15803D', border: '#BBF7D0',
  },
  {
    value: 'minor_revision',
    label: 'Minor revisions',
    desc: 'The article requires minor corrections before acceptance.',
    bg: '#FFFBEB', color: '#92400E', border: '#FDE68A',
  },
  {
    value: 'major_revision',
    label: 'Major revisions',
    desc: 'Significant changes are needed before resubmission.',
    bg: '#F5F3FF', color: '#6D28D9', border: '#DDD6FE',
  },
  {
    value: 'reject',
    label: 'Reject',
    desc: 'The article does not meet the journal criteria.',
    bg: '#FEF2F2', color: '#B91C1C', border: '#FECACA',
  },
];

// ── Page ─────────────────────────────────────────────────────

const ReviewArticle = () => {
  const { id } = useParams(); // id = review ID
  const navigate = useNavigate();

  const [submission, setSubmission]       = useState(null);
  const [loading, setLoading]             = useState(true);
  const [recommendation, setRecommendation] = useState('');
  const [comments, setComments]           = useState('');
  const [submitting, setSubmitting]       = useState(false);
  const [error, setError]                 = useState('');
  const [success, setSuccess]             = useState(false);

  useEffect(() => {
    // Fetch the submission via the review ID
    api.get(`/reviews/${id}/submission`)
      .then(r => setSubmission(r.data.submission))
      .catch(() => setError('Unable to load the article.'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!recommendation) {
      setError('Please select a recommendation.');
      return;
    }
    if (comments.trim().length < 30) {
      setError('Comments must be at least 30 characters.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post(`/reviews/${id}/submit`, { comments, recommendation });
      setSuccess(true);
      setTimeout(() => navigate('/reviewer/dashboard'), 2500);
    } catch (err) {
      setError(err.response?.data?.message || 'Error submitting the review.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (d) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

  if (loading) {
    return (
      <DashboardLayout title="Article review">
        <div className="flex items-center justify-center py-24">
          <div className="w-6 h-6 rounded-full border-2 animate-spin"
               style={{ borderColor: '#1E88C8', borderTopColor: 'transparent' }}/>
          <span className="ml-3 text-sm" style={{ color: '#6B7280' }}>Loading article…</span>
        </div>
      </DashboardLayout>
    );
  }

  if (success) {
    return (
      <DashboardLayout title="Article review">
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
               style={{ background: '#F0FDF4' }}>
            <span style={{ color: '#15803D' }}><IconCheck /></span>
          </div>
          <h2 className="text-lg font-bold mb-2" style={{ color: '#111827' }}>
            Review submitted successfully!
          </h2>
          <p className="text-sm" style={{ color: '#6B7280' }}>
            The author and editorial team have been notified. Redirecting…
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Article review">

      {/* ── Back ───────────────────────────────────────────── */}
      <div className="mb-6">
        <Link to="/reviewer/dashboard"
              className="inline-flex items-center gap-2 text-sm no-underline transition-colors"
              style={{ color: '#6B7280' }}
              onMouseEnter={e => e.currentTarget.style.color = '#374151'}
              onMouseLeave={e => e.currentTarget.style.color = '#6B7280'}>
          <IconArrowLeft /> Back to dashboard
        </Link>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">

        {/* ── Left column: article info (3/5) ─────────────── */}
        <div className="xl:col-span-3 space-y-4">

          {/* Article card */}
          <div className="bg-white rounded-sm"
               style={{ border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div className="px-6 py-4" style={{ borderBottom: '1px solid #F3F4F6' }}>
              <h3 className="text-base font-bold" style={{ color: '#111827' }}>Article to review</h3>
            </div>
            <div className="px-6 py-5 space-y-4">

              {submission?.research_area && (
                <span className="inline-block text-xs font-medium px-2.5 py-0.5 rounded-sm"
                      style={{ background: '#F0FDF4', color: '#15803D', border: '1px solid #BBF7D0' }}>
                  {submission.research_area}
                </span>
              )}

              <h2 className="text-base font-semibold leading-snug" style={{ color: '#1B4427' }}>
                {submission?.title}
              </h2>

              <div className="flex flex-wrap gap-4 text-xs" style={{ color: '#6B7280' }}>
                <span>Author: <strong style={{ color: '#374151' }}>{submission?.author_name}</strong></span>
                {submission?.submitted_at && (
                  <span style={{ borderLeft: '1px solid #E5E7EB', paddingLeft: '1rem' }}>
                    Submitted on {formatDate(submission.submitted_at)}
                  </span>
                )}
              </div>

              {submission?.keywords && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#9CA3AF' }}>
                    Keywords
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {submission.keywords.split(',').map(kw => (
                      <span key={kw.trim()}
                            className="text-xs px-2 py-0.5 rounded-sm"
                            style={{ background: '#F3F4F6', color: '#374151', border: '1px solid #E5E7EB' }}>
                        {kw.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Abstract */}
          {submission?.abstract && (
            <div className="bg-white rounded-sm"
                 style={{ border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <div className="px-6 py-4" style={{ borderBottom: '1px solid #F3F4F6' }}>
                <h3 className="text-base font-bold" style={{ color: '#111827' }}>Abstract</h3>
              </div>
              <div className="px-6 py-5">
                <p className="text-sm leading-relaxed" style={{ color: '#374151' }}>
                  {submission.abstract}
                </p>
              </div>
            </div>
          )}

          {/* PDF */}
          {submission?.pdf_url && (
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
                <a href={`http://localhost:5000${submission.pdf_url}`}
                   target="_blank"
                   rel="noreferrer"
                   className="inline-flex items-center gap-2 px-4 py-2 rounded-sm text-sm font-semibold no-underline transition-all"
                   style={{ background: '#1E88C8', color: '#fff' }}
                   onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
                   onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                  <IconExternalLink /> Read the article
                </a>
              </div>
            </div>
          )}
        </div>

        {/* ── Right column: review form (2/5) ───── */}
        <div className="xl:col-span-2">
          <div className="bg-white rounded-sm sticky top-20"
               style={{ border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>

            <div className="px-6 py-4" style={{ borderBottom: '1px solid #F3F4F6' }}>
              <h3 className="text-base font-bold" style={{ color: '#111827' }}>Your review</h3>
              <p className="text-xs mt-1" style={{ color: '#6B7280' }}>
                All fields are required
              </p>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">

              {/* Error */}
              {error && (
                <div className="flex items-start gap-2 px-3 py-2.5 rounded-sm text-sm"
                     style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C' }}>
                  <span className="flex-shrink-0 mt-0.5">⊘</span>
                  {error}
                </div>
              )}

              {/* Recommendation */}
              <div>
                <label className="block text-sm font-semibold mb-3" style={{ color: '#374151' }}>
                  Recommendation *
                </label>
                <div className="space-y-2">
                  {RECOMMENDATIONS.map(rec => (
                    <button
                      key={rec.value}
                      type="button"
                      onClick={() => setRecommendation(rec.value)}
                      className="w-full text-left px-4 py-3 rounded-sm transition-all"
                      style={{
                        border: recommendation === rec.value
                          ? `2px solid ${rec.color}`
                          : '2px solid #E5E7EB',
                        background: recommendation === rec.value ? rec.bg : '#fff',
                      }}
                    >
                      <p className="text-sm font-semibold" style={{ color: recommendation === rec.value ? rec.color : '#374151' }}>
                        {rec.label}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>
                        {rec.desc}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Comments */}
              <div>
                <label className="block text-sm font-semibold mb-1.5" style={{ color: '#374151' }}>
                  Comments to the author *
                </label>
                <p className="text-xs mb-2" style={{ color: '#9CA3AF' }}>
                  Minimum 30 characters. Be constructive and precise.
                </p>
                <textarea
                  value={comments}
                  onChange={e => setComments(e.target.value)}
                  rows={7}
                  placeholder="Describe your observations, the strengths and areas for improvement…"
                  className="w-full px-3 py-2.5 text-sm rounded-sm resize-y"
                  style={{
                    border: '1px solid #D1D5DB',
                    outline: 'none',
                    color: '#374151',
                    lineHeight: '1.6',
                    minHeight: '140px',
                  }}
                  onFocus={e => e.target.style.borderColor = '#1E88C8'}
                  onBlur={e => e.target.style.borderColor = '#D1D5DB'}
                />
                <p className="text-xs mt-1 text-right" style={{ color: comments.length < 30 ? '#9CA3AF' : '#15803D' }}>
                  {comments.length} / 30 min
                </p>
              </div>

              {/* Bouton */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-sm text-sm font-semibold transition-all"
                style={{
                  background: submitting ? '#9CA3AF' : 'linear-gradient(90deg, #1B4427 0%, #1E88C8 100%)',
                  color: '#fff',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                }}
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 animate-spin"
                         style={{ borderColor: 'rgba(255,255,255,0.4)', borderTopColor: '#fff' }}/>
                    Submitting…
                  </>
                ) : (
                  <><IconSend /> Submit my review</>
                )}
              </button>

              <p className="text-xs text-center" style={{ color: '#9CA3AF' }}>
                The author and editorial team will be notified by email.
              </p>
            </form>
          </div>
        </div>
      </div>

    </DashboardLayout>
  );
};

export default ReviewArticle;
