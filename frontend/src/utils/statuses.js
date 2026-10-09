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

export const STATUS_STYLES = {
  submitted:       SUBMITTED,
  pending:         SUBMITTED, // statut historique : affiché « Submitted » pour tous les rôles
  under_review:    { label: 'Under review',    bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' },
  revision_needed: { label: 'Revision needed', bg: '#FEF3C7', color: '#D97706', border: '#FDE68A' },
  major_revision:  { label: 'Major revision',  bg: '#F5F3FF', color: '#6D28D9', border: '#DDD6FE' },
  minor_revision:  { label: 'Minor revision',  bg: '#FFFBEB', color: '#92400E', border: '#FDE68A' },
  sent_back:       { label: 'Sent back',       bg: '#FFF7ED', color: '#C2410C', border: '#FED7AA' },
  revised:         { label: 'Revised',         bg: '#F5F3FF', color: '#6D28D9', border: '#DDD6FE' },
  accepted:        { label: 'Accepted',        bg: '#F0FDF4', color: '#15803D', border: '#BBF7D0' },
  published:       { label: 'Published',       bg: '#ECFDF5', color: '#065F46', border: '#A7F3D0' },
  rejected:        { label: 'Rejected',        bg: '#FEF2F2', color: '#B91C1C', border: '#FECACA' },
  withdrawn:       { label: 'Withdrawn',       bg: '#F3F4F6', color: '#6B7280', border: '#D1D5DB' },
};

/** Style d'un statut ; un statut inconnu s'affiche comme « Submitted ». */
export const statusStyle = (status) => STATUS_STYLES[status] || STATUS_STYLES.submitted;

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
