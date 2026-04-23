import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { DOMAIN_MAP, MAIN_DOMAINS, LEGACY_DOMAIN_MAP } from '../../utils/domains';

const G = '#1B4427';
const B = '#2E9E68';

const IconClose = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
  </svg>
);
const IconUser = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
  </svg>
);
const IconCheck = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
  </svg>
);

// Trouve le domaine principal d'une research_area
// Gère 3 cas : domaine principal actuel / sous-domaine actuel / ancienne valeur legacy
const findMainDomain = (researchArea) => {
  if (!researchArea) return null;
  // 1. C'est déjà un domaine principal (nouvel utilisateur)
  if (MAIN_DOMAINS.includes(researchArea)) return researchArea;
  // 2. C'est un sous-domaine officiel
  for (const [domain, subs] of Object.entries(DOMAIN_MAP)) {
    if (subs.includes(researchArea)) return domain;
  }
  // 3. Ancienne taxonomie (utilisateurs créés avant la refonte)
  if (LEGACY_DOMAIN_MAP[researchArea]) return LEGACY_DOMAIN_MAP[researchArea];
  return null;
};

const ReviewerCard = ({ reviewer, isSelected, onClick, isMatch }) => (
  <button
    type="button"
    onClick={onClick}
    className="w-full flex items-center gap-3 px-4 py-3 rounded-sm text-left transition-all"
    style={{
      border: isSelected ? `2px solid ${B}` : '2px solid #E5E7EB',
      background: isSelected ? '#F0FDF4' : '#fff',
    }}
  >
    {/* Avatar */}
    <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold"
         style={{ background: isSelected ? B : '#F3F4F6', color: isSelected ? '#fff' : '#6B7280' }}>
      {reviewer.first_name?.[0]}{reviewer.last_name?.[0]}
    </div>

    {/* Info */}
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 flex-wrap">
        <p className="text-sm font-semibold truncate"
           style={{ color: isSelected ? G : '#111827' }}>
          {reviewer.first_name} {reviewer.last_name}
        </p>
        {isMatch && (
          <span className="text-xs font-medium px-1.5 py-0.5 rounded-sm flex-shrink-0"
                style={{ background: '#D1FAE5', color: '#065F46' }}>
            ✓ Domain match
          </span>
        )}
      </div>
      <p className="text-xs truncate mt-0.5" style={{ color: '#6B7280' }}>
        {reviewer.email}
        {reviewer.institution ? ` — ${reviewer.institution}` : ''}
      </p>
      {reviewer.research_area && (
        <p className="text-xs mt-0.5 truncate" style={{ color: '#9CA3AF', fontStyle: 'italic' }}>
          {reviewer.research_area}
        </p>
      )}
    </div>

    {isSelected && (
      <div className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center"
           style={{ background: B }}>
        <span style={{ color: '#fff' }}><IconCheck /></span>
      </div>
    )}
  </button>
);

const AssignReviewerModal = ({ submission, onClose, onAssigned }) => {
  const [reviewers,   setReviewers]   = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [selectedId,  setSelectedId]  = useState(null);
  const [submitting,  setSubmitting]  = useState(false);
  const [error,       setError]       = useState('');
  const [showAll,     setShowAll]     = useState(false);

  const submissionDomain = findMainDomain(submission?.research_area);

  useEffect(() => {
    api.get('/reviews/reviewers')
      .then(r => setReviewers(r.data.reviewers || []))
      .catch(() => setError('Unable to load the reviewer list.'))
      .finally(() => setLoading(false));
  }, []);

  const handleAssign = async () => {
    if (!selectedId) { setError('Please select a reviewer.'); return; }
    setError('');
    setSubmitting(true);
    try {
      await api.post('/reviews/assign', {
        submission_id: submission.id,
        reviewer_id: selectedId,
      });
      onAssigned(submission.id);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'An error occurred during assignment.');
    } finally {
      setSubmitting(false);
    }
  };

  // Sépare les reviewers : domaine correspondant / autres
  const matchingReviewers = submissionDomain
    ? reviewers.filter(r => findMainDomain(r.research_area) === submissionDomain)
    : reviewers;
  const otherReviewers = submissionDomain
    ? reviewers.filter(r => findMainDomain(r.research_area) !== submissionDomain)
    : [];

  const visibleOthers = showAll ? otherReviewers : [];

  return (
    <>
      <div className="fixed inset-0" style={{ background: 'rgba(0,0,0,0.45)', zIndex: 200 }} onClick={onClose}/>

      <div className="fixed left-1/2 top-1/2 w-full max-w-lg"
           style={{ transform: 'translate(-50%, -50%)', zIndex: 201, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        <div className="bg-white rounded-sm overflow-hidden flex flex-col"
             style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.2)', border: '1px solid #E5E7EB' }}>

          {/* Header */}
          <div className="px-6 py-4 flex items-center justify-between flex-shrink-0"
               style={{ background: `linear-gradient(135deg, ${G} 0%, #1a5c35 100%)`, borderBottom: `3px solid ${B}` }}>
            <div>
              <h3 className="text-base font-bold" style={{ color: '#fff' }}>Assign a reviewer</h3>
              <p className="text-xs mt-0.5 max-w-xs truncate" style={{ color: 'rgba(255,255,255,0.65)' }}>
                {submission?.title}
              </p>
              {submissionDomain && (
                <p className="text-xs mt-1 font-medium" style={{ color: 'rgba(255,255,255,0.85)' }}>
                  Domain: {submissionDomain}
                </p>
              )}
            </div>
            <button onClick={onClose} className="p-1.5 rounded transition-colors"
                    style={{ color: 'rgba(255,255,255,0.7)' }}
                    onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                    onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}>
              <IconClose />
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-4 flex-1 overflow-y-auto scrollbar-none">
            {error && (
              <div className="mb-4 px-3 py-2.5 rounded-sm text-sm"
                   style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C' }}>
                {error}
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-10">
                <div className="w-5 h-5 rounded-full border-2 animate-spin"
                     style={{ borderColor: B, borderTopColor: 'transparent' }}/>
                <span className="ml-2 text-sm" style={{ color: '#6B7280' }}>Loading…</span>
              </div>
            ) : reviewers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
                     style={{ background: '#F3F4F6' }}>
                  <span style={{ color: '#9CA3AF' }}><IconUser /></span>
                </div>
                <p className="text-sm font-medium" style={{ color: '#374151' }}>No reviewers available</p>
                <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>
                  Please register reviewers on the platform first.
                </p>
              </div>
            ) : (
              <div className="space-y-4">

                {/* ── Reviewers du même domaine ── */}
                {submissionDomain && (
                  <div>
                    <p className="text-xs font-semibold mb-2 uppercase tracking-wide"
                       style={{ color: G }}>
                      Reviewers — {submissionDomain}
                      <span className="ml-2 font-normal normal-case text-xs"
                            style={{ color: '#6B7280' }}>
                        ({matchingReviewers.length} available)
                      </span>
                    </p>
                    {matchingReviewers.length === 0 ? (
                      <p className="text-sm py-3 text-center rounded-sm"
                         style={{ color: '#9CA3AF', background: '#F9FAFB', border: '1px dashed #E5E7EB' }}>
                        No reviewer registered in this domain yet.
                      </p>
                    ) : (
                      <ul className="space-y-2">
                        {matchingReviewers.map(r => (
                          <li key={r.id}>
                            <ReviewerCard
                              reviewer={r}
                              isSelected={selectedId === r.id}
                              isMatch={true}
                              onClick={() => setSelectedId(r.id)}
                            />
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {/* ── Autres reviewers (autres domaines) ── */}
                {submissionDomain && otherReviewers.length > 0 && (
                  <div>
                    <button
                      type="button"
                      onClick={() => setShowAll(v => !v)}
                      className="text-xs font-medium flex items-center gap-1 transition-colors"
                      style={{ color: '#6B7280' }}
                      onMouseEnter={e => e.currentTarget.style.color = G}
                      onMouseLeave={e => e.currentTarget.style.color = '#6B7280'}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <polyline points={showAll ? '18 15 12 9 6 15' : '6 9 12 15 18 9'}/>
                      </svg>
                      {showAll ? 'Hide' : 'Show'} other reviewers ({otherReviewers.length} — other domains)
                    </button>
                    {showAll && (
                      <ul className="space-y-2 mt-2">
                        {visibleOthers.map(r => (
                          <li key={r.id}>
                            <ReviewerCard
                              reviewer={r}
                              isSelected={selectedId === r.id}
                              isMatch={false}
                              onClick={() => setSelectedId(r.id)}
                            />
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {/* Cas sans domaine de soumission : affiche tous */}
                {!submissionDomain && (
                  <ul className="space-y-2">
                    {reviewers.map(r => (
                      <li key={r.id}>
                        <ReviewerCard
                          reviewer={r}
                          isSelected={selectedId === r.id}
                          isMatch={false}
                          onClick={() => setSelectedId(r.id)}
                        />
                      </li>
                    ))}
                  </ul>
                )}

              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 flex items-center justify-end gap-3 flex-shrink-0"
               style={{ borderTop: '1px solid #F3F4F6', background: '#FAFAFA' }}>
            <button onClick={onClose}
                    className="px-4 py-2 rounded-sm text-sm font-medium transition-colors"
                    style={{ background: '#F3F4F6', color: '#374151', border: '1px solid #E5E7EB' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#E5E7EB'}
                    onMouseLeave={e => e.currentTarget.style.background = '#F3F4F6'}>
              Cancel
            </button>
            <button
              onClick={handleAssign}
              disabled={submitting || !selectedId}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-sm text-sm font-semibold transition-all"
              style={{
                background: !selectedId || submitting
                  ? '#9CA3AF'
                  : `linear-gradient(90deg, ${G} 0%, ${B} 100%)`,
                color: '#fff',
                cursor: !selectedId || submitting ? 'not-allowed' : 'pointer',
              }}
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 animate-spin"
                       style={{ borderColor: 'rgba(255,255,255,0.4)', borderTopColor: '#fff' }}/>
                  Assigning…
                </>
              ) : (
                <><IconCheck /> Confirm assignment</>
              )}
            </button>
          </div>

        </div>
      </div>
    </>
  );
};

export default AssignReviewerModal;
