import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
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
  submitted:    { label: 'Soumis',       bg: '#F3F4F6', color: '#374151', border: '#D1D5DB' },
  pending:      { label: 'En attente',   bg: '#FFFBEB', color: '#92400E', border: '#FDE68A' },
  under_review: { label: 'En révision',  bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' },
  revised:      { label: 'Révisé',       bg: '#F5F3FF', color: '#6D28D9', border: '#DDD6FE' },
  accepted:     { label: 'Accepté',      bg: '#F0FDF4', color: '#15803D', border: '#BBF7D0' },
  published:    { label: 'Publié',       bg: '#ECFDF5', color: '#065F46', border: '#A7F3D0' },
  rejected:     { label: 'Rejeté',       bg: '#FEF2F2', color: '#B91C1C', border: '#FECACA' },
};

const RECOMMENDATION_CONFIG = {
  accept:         { label: 'Accepter',            bg: '#F0FDF4', color: '#15803D', border: '#BBF7D0' },
  minor_revision: { label: 'Révisions mineures',  bg: '#FFFBEB', color: '#92400E', border: '#FDE68A' },
  major_revision: { label: 'Révisions majeures',  bg: '#F5F3FF', color: '#6D28D9', border: '#DDD6FE' },
  reject:         { label: 'Rejeter',             bg: '#FEF2F2', color: '#B91C1C', border: '#FECACA' },
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

const SubmissionDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [submission, setSubmission] = useState(null);
  const [reviews, setReviews]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [publishing, setPublishing] = useState(false);

  const isAdmin = user?.role === 'admin';
  const backUrl = isAdmin ? '/admin/dashboard' : '/author/dashboard';

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
        setError("Impossible de charger les détails de cette soumission.");
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [id]);

  const handlePublish = async () => {
    if (!window.confirm('Publier cet article ? Il sera visible sur le site public.')) return;
    setPublishing(true);
    try {
      await api.patch(`/submissions/${id}/status`, { status: 'published' });
      setSubmission(prev => ({ ...prev, status: 'published' }));
    } catch (err) {
      alert('Erreur lors de la publication. Veuillez réessayer.');
    } finally {
      setPublishing(false);
    }
  };

  const formatDate = (d) => new Date(d).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  const title = isAdmin ? 'Détail de la soumission' : 'Mon article';

  if (loading) {
    return (
      <DashboardLayout title={title}>
        <div className="flex items-center justify-center py-24">
          <div className="w-6 h-6 rounded-full border-2 animate-spin"
               style={{ borderColor: '#1E88C8', borderTopColor: 'transparent' }}/>
          <span className="ml-3 text-sm" style={{ color: '#6B7280' }}>Chargement…</span>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !submission) {
    return (
      <DashboardLayout title={title}>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-sm font-medium mb-3" style={{ color: '#374151' }}>{error || 'Soumission introuvable.'}</p>
          <Link to={backUrl} className="text-sm no-underline" style={{ color: '#1E88C8' }}>
            ← Retour au tableau de bord
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={title}>

      {/* ── Retour ───────────────────────────────────────────── */}
      <div className="mb-6">
        <Link to={backUrl}
              className="inline-flex items-center gap-2 text-sm no-underline transition-colors"
              style={{ color: '#6B7280' }}
              onMouseEnter={e => e.currentTarget.style.color = '#374151'}
              onMouseLeave={e => e.currentTarget.style.color = '#6B7280'}>
          <IconArrowLeft /> Retour au tableau de bord
        </Link>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* ── Colonne gauche : infos article (2/3) ─────────────── */}
        <div className="xl:col-span-2 space-y-4">

          {/* Carte principale */}
          <div className="bg-white rounded-sm"
               style={{ border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div className="px-6 py-4" style={{ borderBottom: '1px solid #F3F4F6' }}>
              <div className="flex flex-wrap items-center gap-2">
                {submission.research_area && (
                  <span className="text-xs font-medium px-2.5 py-0.5 rounded-sm"
                        style={{ background: '#F0FDF4', color: '#15803D', border: '1px solid #BBF7D0' }}>
                    {submission.research_area}
                  </span>
                )}
                <StatusBadge status={submission.status} />
              </div>
              <h2 className="text-lg font-bold mt-3 leading-snug" style={{ color: '#1B4427' }}>
                {submission.title}
              </h2>
            </div>

            <div className="px-6 py-5 space-y-4">
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
                  <span>Soumis le {formatDate(submission.submitted_at)}</span>
                </div>
              </div>

              {/* Résumé */}
              {submission.abstract && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#9CA3AF' }}>
                    Résumé
                  </p>
                  <p className="text-sm leading-relaxed" style={{ color: '#374151' }}>
                    {submission.abstract}
                  </p>
                </div>
              )}

              {/* Mots-clés */}
              {submission.keywords && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#9CA3AF' }}>
                    Mots-clés
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

              {/* Co-auteurs */}
              {submission.co_authors && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: '#9CA3AF' }}>
                    Co-auteurs
                  </p>
                  <p className="text-sm" style={{ color: '#374151' }}>{submission.co_authors}</p>
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
                    <p className="text-sm font-semibold" style={{ color: '#111827' }}>Fichier de l'article</p>
                    <p className="text-xs" style={{ color: '#6B7280' }}>Format PDF</p>
                  </div>
                </div>
                <a href={`http://localhost:5000${submission.pdf_url}`}
                   target="_blank" rel="noreferrer"
                   className="inline-flex items-center gap-2 px-4 py-2 rounded-sm text-sm font-semibold no-underline transition-all"
                   style={{ background: '#1E88C8', color: '#fff' }}
                   onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
                   onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                  <IconExternalLink /> Télécharger le PDF
                </a>
              </div>
            </div>
          )}

          {/* ── Évaluations ────────────────────────────────────── */}
          <div className="bg-white rounded-sm"
               style={{ border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>

            <div className="px-6 py-4 flex items-center gap-3"
                 style={{ borderBottom: '1px solid #F3F4F6' }}>
              <span style={{ color: '#1E88C8' }}><IconMessageSquare /></span>
              <h3 className="text-base font-bold" style={{ color: '#111827' }}>
                Évaluations reçues
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
                  Aucune évaluation pour le moment
                </p>
                <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>
                  {submission.status === 'pending' || submission.status === 'submitted'
                    ? "L'article est en attente d'assignation à un évaluateur."
                    : "L'évaluation est en cours."}
                </p>
              </div>
            ) : (
              <ul className="divide-y" style={{ borderColor: '#F3F4F6' }}>
                {reviews.map((review, index) => (
                  <li key={review.id} className="px-6 py-5">

                    {/* En-tête évaluation */}
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                             style={{ background: '#1B4427', color: '#fff' }}>
                          {index + 1}
                        </div>
                        <div>
                          {/* Admin voit le nom du reviewer, auteur ne le voit pas (évaluation anonyme) */}
                          <p className="text-sm font-semibold" style={{ color: '#111827' }}>
                            {isAdmin ? review.reviewer_name : `Évaluateur #${index + 1}`}
                          </p>
                          {review.reviewed_at && (
                            <p className="text-xs" style={{ color: '#9CA3AF' }}>
                              Soumis le {formatDate(review.reviewed_at)}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Statut de l'évaluation */}
                        {review.status === 'completed' && review.recommendation ? (
                          <RecommendationBadge value={review.recommendation} />
                        ) : (
                          <span className="text-xs px-2.5 py-0.5 rounded-sm font-medium"
                                style={{ background: '#FFFBEB', color: '#92400E', border: '1px solid #FDE68A' }}>
                            En cours
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Commentaires */}
                    {review.comments ? (
                      <div className="rounded-sm p-4"
                           style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
                        <p className="text-xs font-semibold uppercase tracking-wider mb-2"
                           style={{ color: '#9CA3AF' }}>
                          Commentaires
                        </p>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap"
                           style={{ color: '#374151' }}>
                          {review.comments}
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm italic" style={{ color: '#9CA3AF' }}>
                        L'évaluation n'a pas encore été soumise.
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* ── Colonne droite : résumé statut (1/3) ─────────────── */}
        <div className="space-y-4">

          {/* Statut actuel */}
          <div className="bg-white rounded-sm"
               style={{ border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div className="px-5 py-4" style={{ borderBottom: '1px solid #F3F4F6' }}>
              <h3 className="text-sm font-bold" style={{ color: '#111827' }}>Statut actuel</h3>
            </div>
            <div className="px-5 py-4">
              <StatusBadge status={submission.status} />
              <p className="text-xs mt-3 leading-relaxed" style={{ color: '#6B7280' }}>
                {submission.status === 'pending' && "L'article est en attente d'assignation à un évaluateur."}
                {submission.status === 'submitted' && "L'article a été soumis et est en cours d'examen."}
                {submission.status === 'under_review' && "L'article est en cours d'évaluation par un pair."}
                {submission.status === 'revised' && "L'article a été évalué. Des révisions sont requises."}
                {submission.status === 'accepted' && "Félicitations ! L'article a été accepté pour publication."}
                {submission.status === 'published' && "L'article est publié et accessible en ligne."}
                {submission.status === 'rejected' && "L'article n'a pas été retenu pour publication."}
              </p>

              {/* Bouton Publier — admin uniquement, statut accepted */}
              {isAdmin && submission.status === 'accepted' && (
                <button
                  onClick={handlePublish}
                  disabled={publishing}
                  className="w-full mt-4 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-sm text-sm font-semibold transition-opacity"
                  style={{
                    background: 'linear-gradient(90deg, #1B4427 0%, #1E88C8 100%)',
                    color: '#fff',
                    opacity: publishing ? 0.7 : 1,
                    cursor: publishing ? 'not-allowed' : 'pointer',
                  }}
                >
                  {publishing ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                      </svg>
                      Publication…
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064"/>
                      </svg>
                      Publier l'article
                    </>
                  )}
                </button>
              )}

              {/* Lien vers l'article publié */}
              {submission.status === 'published' && (
                <Link
                  to={`/articles/${id}`}
                  className="w-full mt-4 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-sm text-sm font-semibold no-underline transition-opacity"
                  style={{ background: '#F0FDF4', color: '#15803D', border: '1px solid #BBF7D0' }}
                >
                  <IconExternalLink /> Voir l'article publié
                </Link>
              )}
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-white rounded-sm"
               style={{ border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div className="px-5 py-4" style={{ borderBottom: '1px solid #F3F4F6' }}>
              <h3 className="text-sm font-bold" style={{ color: '#111827' }}>Chronologie</h3>
            </div>
            <div className="px-5 py-4">
              {[
                { label: 'Soumission reçue',       done: true,  date: submission.submitted_at },
                { label: 'Assignation reviewer',   done: reviews.length > 0 },
                { label: 'Évaluation complétée',   done: reviews.some(r => r.status === 'completed') },
                { label: 'Décision éditoriale',    done: ['accepted','rejected','published'].includes(submission.status) },
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
                        {new Date(step.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

    </DashboardLayout>
  );
};

export default SubmissionDetail;
