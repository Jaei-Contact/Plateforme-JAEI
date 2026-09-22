// ============================================================
// JAEI — Regroupement des statuts d'un manuscrit (onglets auteur)
// Remarques 2, 3 et 11 (client, 22/09)
//
// Chaque onglet correspond à une étape du parcours telle que le client l'a
// définie, et non à une valeur brute de la base :
//   Submitted    → l'auteur a soumis
//   Under review → un reviewer a ACCEPTÉ l'invitation
//   Revisions    → un reviewer a envoyé ses commentaires / l'éditeur demande
//                  des corrections / version révisée en attente d'examen
//   Accepted · Published · Rejected
// Auparavant chaque onglet ne comptait qu'un seul statut exact : un article en
// "Major revision" n'apparaissait dans aucun onglet.
// ============================================================

export const STATUS_GROUPS = {
  submitted:    ['pending', 'submitted'],
  under_review: ['under_review'],
  revisions:    ['revision_needed', 'major_revision', 'minor_revision', 'sent_back', 'revised'],
  accepted:     ['accepted'],
  published:    ['published'],
  rejected:     ['rejected'],
};

/** Articles encore en cours de traitement (ni décision finale, ni retrait). */
export const IN_PROGRESS = [
  ...STATUS_GROUPS.submitted,
  ...STATUS_GROUPS.under_review,
  ...STATUS_GROUPS.revisions,
];

/** Vrai si le statut appartient à l'onglet donné ('all' accepte tout). */
export const inGroup = (status, group) =>
  group === 'all' || (STATUS_GROUPS[group] || []).includes(status);

/** Statuts dans lesquels l'auteur peut déposer une version révisée. */
export const REVISION_REQUESTED = ['revision_needed', 'major_revision', 'minor_revision', 'sent_back'];
