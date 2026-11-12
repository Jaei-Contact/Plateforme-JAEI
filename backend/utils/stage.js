// ============================================================
// JAEI — Étape affichée d'un manuscrit (pastille de statut)
//
// Le statut ENREGISTRÉ (submissions.status) pilote la logique : onglets, e-mails, droits…
// Il ne change qu'aux moments définis avec le client (Under review quand un relecteur ACCEPTE,
// décision de l'éditeur, publication…). La pastille affichée doit pourtant suivre la même
// progression que la timeline (« Submission received → Editor assigned → Reviewer assigned →
// Review completed → Editorial decision → APC payment received → Publication »).
//
// On calcule donc une ÉTAPE d'affichage, sans jamais modifier le statut enregistré :
//
//   statut enregistré       avancement                                     → étape affichée
//   submitted / pending     aucun éditeur, aucun relecteur                 → submitted
//                           un éditeur en charge                           → editor_assigned
//                           au moins un relecteur invité (pas de réponse)  → reviewer_assigned
//                           un relecteur a accepté                         → under_review
//                           au moins une évaluation rendue                 → review_completed
//   under_review            (même calcul, au minimum « under_review »)
//   accepted                APC réglée                                     → apc_paid
//   autres (revisions, revised, sent_back, published, rejected, withdrawn) → inchangés
//
// Les relecteurs comptés sont ceux du TOUR D'ÉVALUATION EN COURS (round = nombre de versions
// révisées + 1) : après une version révisée, l'étape repart de l'éditeur, pas des anciennes évaluations.
// Les invitations déclinées ne comptent pas.
// ============================================================

/** À insérer après « FROM submissions s » : ajoute reviews_invited / reviews_accepted / reviews_completed. */
const STAGE_COUNTS_JOIN = `
  LEFT JOIN LATERAL (
    SELECT COUNT(*) FILTER (WHERE r.status <> 'declined')::int               AS reviews_invited,
           COUNT(*) FILTER (WHERE r.status IN ('accepted', 'completed'))::int AS reviews_accepted,
           COUNT(*) FILTER (WHERE r.status = 'completed')::int                AS reviews_completed
      FROM reviews r
     WHERE r.submission_id = s.id
       AND COALESCE(r.round, 1) = COALESCE(s.revision_count, 0) + 1
  ) rv ON TRUE`;

const IN_REVIEW_FLOW = ['submitted', 'pending', 'under_review'];

/**
 * @param {object} s  ligne de submissions (+ reviews_invited / reviews_accepted / reviews_completed)
 * @returns {string}  clé d'étape (voir frontend/src/utils/statuses.js pour les libellés)
 */
const computeStage = (s) => {
  const status = s.status;
  if (status === 'accepted') return s.apc_paid ? 'apc_paid' : 'accepted';
  if (!IN_REVIEW_FLOW.includes(status)) return status;   // revisions, revised, sent_back, published, rejected, withdrawn…

  if (Number(s.reviews_completed) > 0) return 'review_completed';
  if (Number(s.reviews_accepted) > 0 || status === 'under_review') return 'under_review';
  if (Number(s.reviews_invited) > 0) return 'reviewer_assigned';
  if (s.editor_id || s.editor_assigned_at) return 'editor_assigned';
  return 'submitted';
};

/** Ajoute `stage` à une ligne (ne modifie pas `status`). */
const withStage = (s) => ({ ...s, stage: computeStage(s) });

module.exports = { STAGE_COUNTS_JOIN, computeStage, withStage };
