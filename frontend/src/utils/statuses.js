// ============================================================
// JAEI — Statuts d'un manuscrit : libellés et couleurs (SOURCE UNIQUE)
//
// Utilisé par tous les tableaux de bord et listes (admin, auteur, reviewer)
// et par la page de détail. Avant, chaque page avait sa propre copie : un
// statut ajouté (Major / Minor revision, Sent back…) manquait à plusieurs
// endroits et s'affichait « Submitted » par repli.
//
// Pour ajouter un statut : l'ajouter ici (+ dans utils/statusGroups.js pour
// les onglets et les compteurs, et dans VALID_STATUSES côté serveur).
// ============================================================

const SUBMITTED = { label: 'Submitted', bg: '#F3F4F6', color: '#374151', border: '#D1D5DB' };

// Étapes d'AFFICHAGE : la pastille suit la timeline (Submission received → Editor assigned → Reviewer
// assigned → Review completed → … → Publication). Elles sont calculées par le serveur (`stage`, voir
// backend/utils/stage.js) à partir du statut enregistré et de l'avancement réel ; le statut enregistré,
// lui, ne change pas (il pilote les onglets, les e-mails et les droits).
export const STATUS_STYLES = {
  submitted:       SUBMITTED,
  pending:         SUBMITTED, // statut historique : affiché « Submitted » pour tous les rôles
  editor_assigned:   { label: 'Editor assigned',   bg: '#F0F9FF', color: '#0369A1', border: '#BAE6FD' },
  reviewer_assigned: { label: 'Reviewer assigned', bg: '#EEF2FF', color: '#4338CA', border: '#C7D2FE' },
  under_review:    { label: 'Under review',    bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' },
  review_completed:  { label: 'Review completed',  bg: '#ECFEFF', color: '#0E7490', border: '#A5F3FC' },
  revision_needed: { label: 'Revision needed', bg: '#FEF3C7', color: '#D97706', border: '#FDE68A' },
  major_revision:  { label: 'Major revision',  bg: '#F5F3FF', color: '#6D28D9', border: '#DDD6FE' },
  minor_revision:  { label: 'Minor revision',  bg: '#FFFBEB', color: '#92400E', border: '#FDE68A' },
  sent_back:       { label: 'Sent back',       bg: '#FFF7ED', color: '#C2410C', border: '#FED7AA' },
  revised:         { label: 'Revised',         bg: '#F5F3FF', color: '#6D28D9', border: '#DDD6FE' },
  accepted:        { label: 'Accepted',        bg: '#F0FDF4', color: '#15803D', border: '#BBF7D0' },
  apc_paid:        { label: 'APC paid',        bg: '#F0FDFA', color: '#0F766E', border: '#99F6E4' },
  published:       { label: 'Published',       bg: '#ECFDF5', color: '#065F46', border: '#A7F3D0' },
  rejected:        { label: 'Rejected',        bg: '#FEF2F2', color: '#B91C1C', border: '#FECACA' },
  withdrawn:       { label: 'Withdrawn',       bg: '#F3F4F6', color: '#6B7280', border: '#D1D5DB' },
};

/** Style d'un statut ; un statut inconnu s'affiche comme « Submitted ». */
export const statusStyle = (status) => STATUS_STYLES[status] || STATUS_STYLES.submitted;

/**
 * Clé à passer à <StatusBadge> pour un manuscrit : l'étape affichée (`stage`, fournie par le serveur),
 * à défaut le statut enregistré (ancien serveur, ou objet qui n'en porte pas).
 */
export const displayStatus = (submission) => (submission && (submission.stage || submission.status)) || 'submitted';

/**
 * « Under review » s'active quand un relecteur ACCEPTE l'invitation (étape `under_review`, calculée par le
 * serveur) OU quand l'éditeur a commenté l'article : révision mineure / majeure, renvoi aux auteurs.
 * Dans ce second cas le statut enregistré est la décision ; l'article reste en cours d'évaluation, donc la
 * pastille « Under review » s'affiche DEVANT la décision et l'étape « Under review » de la timeline est cochée.
 * (« revision_needed » = ancien nom de « révision demandée », gardé pour l'historique.)
 */
export const EDITOR_COMMENT_STATUSES = ['minor_revision', 'major_revision', 'revision_needed', 'sent_back'];

/** Clés de pastilles d'un manuscrit : [« Under review », décision] pour une décision de révision, sinon [étape]. */
export const displayStatuses = (submission) => {
  const key = displayStatus(submission);
  return EDITOR_COMMENT_STATUSES.includes(key) ? ['under_review', key] : [key];
};

/**
 * Répartition en pourcentages entiers dont la somme fait exactement 100
 * (méthode du plus fort reste) : évite d'afficher 101 % à cause des arrondis.
 */
export const percentages = (counts) => {
  const total = counts.reduce((a, b) => a + b, 0);
  if (total === 0) return counts.map(() => 0);
  const exact = counts.map(c => (c / total) * 100);
  const floors = exact.map(Math.floor);
  let rest = 100 - floors.reduce((a, b) => a + b, 0);
  exact
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac)
    .forEach(({ i }) => { if (rest > 0) { floors[i] += 1; rest -= 1; } });
  return floors;
};
