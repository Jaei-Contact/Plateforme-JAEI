import { useState, useEffect } from 'react';
import api from '../../utils/api';

// ── Icônes ──────────────────────────────────────────────────

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
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M5 13l4 4L19 7"/>
  </svg>
);

// ── Composant ────────────────────────────────────────────────

const AssignReviewerModal = ({ submission, onClose, onAssigned }) => {
  const [reviewers, setReviewers]       = useState([]);
  const [loading, setLoading]           = useState(true);
  const [selectedId, setSelectedId]     = useState(null);
  const [submitting, setSubmitting]     = useState(false);
  const [error, setError]               = useState('');

  useEffect(() => {
    api.get('/reviews/reviewers')
      .then(r => setReviewers(r.data.reviewers || []))
      .catch(() => setError('Impossible de charger la liste des évaluateurs.'))
      .finally(() => setLoading(false));
  }, []);

  const handleAssign = async () => {
    if (!selectedId) {
      setError('Veuillez sélectionner un évaluateur.');
      return;
    }
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
      setError(err.response?.data?.message || "Erreur lors de l'assignation.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0"
        style={{ background: 'rgba(0,0,0,0.45)', zIndex: 200 }}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="fixed left-1/2 top-1/2 w-full max-w-lg"
        style={{
          transform: 'translate(-50%, -50%)',
          zIndex: 201,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div className="bg-white rounded-sm overflow-hidden flex flex-col"
             style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.2)', border: '1px solid #E5E7EB' }}>

          {/* En-tête */}
          <div className="px-6 py-4 flex items-center justify-between flex-shrink-0"
               style={{ background: 'linear-gradient(135deg, #1B4427 0%, #1a5c35 100%)', borderBottom: '3px solid #1E88C8' }}>
            <div>
              <h3 className="text-base font-bold" style={{ color: '#fff' }}>
                Assigner un évaluateur
              </h3>
              <p className="text-xs mt-0.5 max-w-xs truncate" style={{ color: 'rgba(255,255,255,0.65)' }}>
                {submission?.title}
              </p>
            </div>
            <button onClick={onClose}
                    className="p-1.5 rounded transition-colors"
                    style={{ color: 'rgba(255,255,255,0.7)' }}
                    onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                    onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}>
              <IconClose />
            </button>
          </div>

          {/* Corps */}
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
                     style={{ borderColor: '#1E88C8', borderTopColor: 'transparent' }}/>
                <span className="ml-2 text-sm" style={{ color: '#6B7280' }}>Chargement…</span>
              </div>
            ) : reviewers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
                     style={{ background: '#F3F4F6' }}>
                  <span style={{ color: '#9CA3AF' }}><IconUser /></span>
                </div>
                <p className="text-sm font-medium" style={{ color: '#374151' }}>
                  Aucun évaluateur disponible
                </p>
                <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>
                  Inscrivez d'abord des évaluateurs sur la plateforme.
                </p>
              </div>
            ) : (
              <>
                <p className="text-sm mb-3" style={{ color: '#6B7280' }}>
                  Sélectionnez un évaluateur dans la liste :
                </p>
                <ul className="space-y-2">
                  {reviewers.map(reviewer => {
                    const isSelected = selectedId === reviewer.id;
                    return (
                      <li key={reviewer.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedId(reviewer.id)}
                          className="w-full flex items-center gap-3 px-4 py-3 rounded-sm text-left transition-all"
                          style={{
                            border: isSelected ? '2px solid #1E88C8' : '2px solid #E5E7EB',
                            background: isSelected ? '#EFF6FF' : '#fff',
                          }}
                        >
                          {/* Avatar */}
                          <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold"
                               style={{
                                 background: isSelected ? '#1E88C8' : '#F3F4F6',
                                 color: isSelected ? '#fff' : '#6B7280',
                               }}>
                            {reviewer.first_name?.[0]}{reviewer.last_name?.[0]}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate"
                               style={{ color: isSelected ? '#1D4ED8' : '#111827' }}>
                              {reviewer.first_name} {reviewer.last_name}
                            </p>
                            <p className="text-xs truncate" style={{ color: '#6B7280' }}>
                              {reviewer.email}
                              {reviewer.institution ? ` — ${reviewer.institution}` : ''}
                            </p>
                          </div>

                          {/* Check */}
                          {isSelected && (
                            <div className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center"
                                 style={{ background: '#1E88C8' }}>
                              <span style={{ color: '#fff' }}><IconCheck /></span>
                            </div>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </>
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
              Annuler
            </button>
            <button
              onClick={handleAssign}
              disabled={submitting || !selectedId}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-sm text-sm font-semibold transition-all"
              style={{
                background: !selectedId || submitting
                  ? '#9CA3AF'
                  : 'linear-gradient(90deg, #1B4427 0%, #1E88C8 100%)',
                color: '#fff',
                cursor: !selectedId || submitting ? 'not-allowed' : 'pointer',
              }}
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 animate-spin"
                       style={{ borderColor: 'rgba(255,255,255,0.4)', borderTopColor: '#fff' }}/>
                  Assignation…
                </>
              ) : (
                <><IconCheck /> Confirmer l'assignation</>
              )}
            </button>
          </div>

        </div>
      </div>
    </>
  );
};

export default AssignReviewerModal;
