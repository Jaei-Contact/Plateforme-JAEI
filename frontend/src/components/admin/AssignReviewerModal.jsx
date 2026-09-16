import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import api from '../../utils/api';
// domain taxonomy imports removed — domains are now free-text

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

// Vérifie si deux domaines (free-text) se correspondent.
// Correspondance si l'un contient l'autre (insensible à la casse).
const domainsMatch = (a, b) => {
  if (!a || !b) return false;
  const na = a.toLowerCase().trim();
  const nb = b.toLowerCase().trim();
  return na === nb || na.includes(nb) || nb.includes(na);
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
  const [editors,     setEditors]     = useState([]);   // Remarque 11 — co-editors (admins)
  const [tab,         setTab]         = useState('reviewers'); // 'reviewers' | 'editors' | 'invite'
  const [inviteName,  setInviteName]  = useState('');          // Invitation par email (vocal client 20/07)
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteOk,    setInviteOk]    = useState('');
  const [loading,     setLoading]     = useState(true);
  const [selectedId,  setSelectedId]  = useState(null);
  const [submitting,  setSubmitting]  = useState(false);
  const [error,       setError]       = useState('');
  const [showAll,     setShowAll]     = useState(false);

  const submissionDomain = submission?.research_area || null;

  useEffect(() => {
    Promise.all([
      api.get('/reviews/reviewers').then(r => setReviewers(r.data.reviewers || [])),
      api.get('/reviews/editors').then(r => setEditors(r.data.editors || [])).catch(() => {}),
    ])
      .catch(() => setError('Unable to load the reviewer list.'))
      .finally(() => setLoading(false));
  }, []);

  // Assigner comme REVIEWER (reviewer classique OU co-editor qui révise lui-même)
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

  // Vocal client (20/07) — l'éditeur invite un spécialiste PAR EMAIL (compte ou non).
  // Le compte reviewer est créé automatiquement côté serveur si nécessaire.
  const handleInviteExternal = async () => {
    if (!inviteName.trim() || !inviteEmail.trim()) { setError('Please provide the reviewer\'s name and email.'); return; }
    setError(''); setInviteOk('');
    setSubmitting(true);
    try {
      const res = await api.post('/reviews/invite-external', {
        submission_id: submission.id,
        name: inviteName.trim(),
        email: inviteEmail.trim(),
      });
      setInviteOk(res.data.message || 'Invitation sent.');
      setInviteName(''); setInviteEmail('');
      // Remarque 4 (client, 03/08) : l'éditeur doit pouvoir inviter 4-5 reviewers
      // d'affilée → on rafraîchit la page derrière SANS fermer le modal.
      onAssigned(submission.id, { keepOpen: true });
    } catch (err) {
      setError(err.response?.data?.message || 'An error occurred while sending the invitation.');
    } finally {
      setSubmitting(false);
    }
  };

  // Remarque 11 — assigner un co-editor (ou soi-même) comme ÉDITEUR de la soumission
  const handleAssignEditor = async () => {
    if (!selectedId) { setError('Please select a co-editor.'); return; }
    setError('');
    setSubmitting(true);
    try {
      await api.post('/reviews/assign-editor', {
        submission_id: submission.id,
        editor_id: selectedId,
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
    ? reviewers.filter(r => domainsMatch(r.research_area, submissionDomain))
    : reviewers;
  const otherReviewers = submissionDomain
    ? reviewers.filter(r => !domainsMatch(r.research_area, submissionDomain))
    : [];

  const visibleOthers = showAll ? otherReviewers : [];

  // Portal → rendu direct dans <body> : le modal reste centré à l'écran même si
  // un ancêtre de la page porte un transform (animation page-enter).
  return createPortal(
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
              <h3 className="text-base font-bold" style={{ color: '#fff' }}>{tab === 'invite' ? 'Invite a reviewer by email' : tab === 'editors' ? 'Assign a co-editor' : 'Assign a reviewer'}</h3>
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

          {/* Onglets Reviewers / Co-editors (Remarque 11 client) */}
          <div className="flex flex-shrink-0" style={{ borderBottom: '1px solid #E5E7EB', background: '#FAFAFA' }}>
            {[
              { key: 'reviewers', label: 'Reviewers' },
              { key: 'editors',   label: 'Co-editors' },
              { key: 'invite',    label: 'Invite by email' },
            ].map(t => (
              <button key={t.key} type="button"
                onClick={() => { setTab(t.key); setSelectedId(null); setError(''); setInviteOk(''); }}
                className="px-5 py-2.5 text-sm font-semibold transition-colors"
                style={{
                  color: tab === t.key ? G : '#6B7280',
                  background: tab === t.key ? '#fff' : 'transparent',
                  borderBottom: tab === t.key ? `2px solid ${B}` : '2px solid transparent',
                  cursor: 'pointer', border: 'none',
                  borderBottomWidth: 2, borderBottomStyle: 'solid',
                  borderBottomColor: tab === t.key ? B : 'transparent',
                }}>
                {t.label}
              </button>
            ))}
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
            ) : tab === 'invite' ? (
              /* ── Vocal client — inviter un spécialiste par email (hors plateforme) ── */
              <div>
                <p className="text-xs mb-3 leading-relaxed" style={{ color: '#6B7280' }}>
                  Invite a specialist of your choice — they don't need a JAEI account.
                  They will receive the standard invitation email (manuscript details + Accept / Decline links)
                  and a reviewer account will be created for them automatically.
                  <strong> Please invite at least two reviewers per manuscript.</strong>
                </p>
                {inviteOk && (
                  <div className="mb-3 px-3 py-2.5 rounded-sm text-sm"
                       style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', color: '#15803D' }}>
                    ✓ {inviteOk} — you can invite another reviewer below.
                  </div>
                )}
                <label className="block text-xs font-semibold mb-1" style={{ color: '#374151' }}>
                  Full name <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <input value={inviteName} onChange={e => setInviteName(e.target.value)}
                  placeholder="e.g. Jean-Pierre Mbarga"
                  className="w-full mb-3 px-3 py-2 rounded-sm text-sm"
                  style={{ border: '1px solid #D1D5DB', outline: 'none' }} />
                <label className="block text-xs font-semibold mb-1" style={{ color: '#374151' }}>
                  Email address <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} type="email"
                  placeholder="e.g. jp.mbarga@university.edu"
                  className="w-full px-3 py-2 rounded-sm text-sm"
                  style={{ border: '1px solid #D1D5DB', outline: 'none' }} />
              </div>
            ) : tab === 'editors' ? (
              /* ── Remarque 11 — liste des co-editors (admins) ── */
              <div>
                <p className="text-xs mb-3 leading-relaxed" style={{ color: '#6B7280' }}>
                  Co-editors handle the manuscript: they invite reviewers or review it themselves.
                  Assign the submission to a co-editor (or to yourself).
                </p>
                {editors.length === 0 ? (
                  <p className="text-sm py-3 text-center rounded-sm"
                     style={{ color: '#9CA3AF', background: '#F9FAFB', border: '1px dashed #E5E7EB' }}>
                    No co-editor account found.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {editors.map(r => (
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
            {tab === 'editors' && (
              <button
                onClick={handleAssign}
                disabled={submitting || !selectedId}
                className="px-4 py-2 rounded-sm text-sm font-semibold transition-colors"
                style={{
                  background: '#fff', color: !selectedId || submitting ? '#9CA3AF' : G,
                  border: `1px solid ${!selectedId || submitting ? '#E5E7EB' : G}`,
                  cursor: !selectedId || submitting ? 'not-allowed' : 'pointer',
                }}
                title="The co-editor will review the manuscript themselves"
              >
                Assign as reviewer
              </button>
            )}
            <button
              onClick={tab === 'invite' ? handleInviteExternal : tab === 'editors' ? handleAssignEditor : handleAssign}
              disabled={submitting || (tab === 'invite' ? (!inviteName.trim() || !inviteEmail.trim()) : !selectedId)}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-sm text-sm font-semibold transition-all"
              style={{
                background: (submitting || (tab === 'invite' ? (!inviteName.trim() || !inviteEmail.trim()) : !selectedId))
                  ? '#9CA3AF'
                  : `linear-gradient(90deg, ${G} 0%, ${B} 100%)`,
                color: '#fff',
                cursor: (submitting || (tab === 'invite' ? (!inviteName.trim() || !inviteEmail.trim()) : !selectedId)) ? 'not-allowed' : 'pointer',
              }}
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 animate-spin"
                       style={{ borderColor: 'rgba(255,255,255,0.4)', borderTopColor: '#fff' }}/>
                  {tab === 'invite' ? 'Sending…' : 'Assigning…'}
                </>
              ) : tab === 'invite' ? (
                <><IconCheck /> Send invitation</>
              ) : tab === 'editors' ? (
                <><IconCheck /> Assign as editor</>
              ) : (
                <><IconCheck /> Confirm assignment</>
              )}
            </button>
          </div>

        </div>
      </div>
    </>,
    document.body
  );
};

export default AssignReviewerModal;
