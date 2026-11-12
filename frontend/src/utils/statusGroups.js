// ============================================================
// JAEI — Regroupement des statuts d'un manuscrit (onglets et compteurs)
// Remarques 2, 3 et 11 (client, 22/09) ; harmonisé le 09/10/2026
//
// Chaque onglet correspond à une étape du parcours telle que le client l'a
// définie, et non à une valeur brute de la base :
//   Submitted    → l'auteur a soumis
//   Under review → un reviewer a ACCEPTÉ l'invitation
//   Revisions    → un reviewer a envoyé ses commentaires / l'éditeur demande
//                  des corrections / version révisée en attente d'examen
//   Accepted · Published · Rejected · Withdrawn
// Auparavant chaque onglet ne comptait qu'un seul statut exact : un article en
// "Major revision" n'apparaissait dans aucun onglet.
//
// Libellés et couleurs : utils/statuses.js
// ============================================================

export const STATUS_GROUPS = {
  submitted:    ['pending', 'submitted'],
  under_review: ['under_review'],
  revisions:    ['revision_needed', 'major_revision', 'minor_revision', 'sent_back', 'revised'],
  accepted:     ['accepted'],
  published:    ['published'],
  rejected:     ['rejected'],
  withdrawn:    ['withdrawn'],
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

// ── Onglets de l'espace AUTEUR (tableau de bord ET « My submissions ») ──
export const AUTHOR_TABS = [
  { key: 'all',          label: 'All' },
  { key: 'submitted',    label: 'Submitted' },
  { key: 'under_review', label: 'Under review' },
  { key: 'revisions',    label: 'Revisions' },
  { key: 'accepted',     label: 'Accepted' },
  { key: 'published',    label: 'Published' },
  { key: 'rejected',     label: 'Rejected' },
  { key: 'withdrawn',    label: 'Withdrawn' },
];

// ── Espace ADMIN ─────────────────────────────────────────────
/** Articles qui attendent une action de l'éditeur : assigner un reviewer ou décider (y compris après une version révisée). */
export const NEEDS_ADMIN_ACTION = ['submitted', 'pending', 'revised'];

// Onglets (tableau de bord ET page « Submissions ») : chaque article est atteignable depuis un onglet.
export const ADMIN_TABS = [
  { key: 'all',          label: 'All' },
  { key: 'new',          label: 'New',          statuses: ['submitted', 'pending'] },
  { key: 'under_review', label: 'Under review', statuses: ['under_review'] },
  { key: 'revision',     label: 'Revision',     statuses: ['revision_needed', 'major_revision', 'minor_revision'] },
  { key: 'sent_back',    label: 'Sent back',    statuses: ['sent_back'] },
  { key: 'revised',      label: 'Revised',      statuses: ['revised'] },
  { key: 'accepted',     label: 'Accepted',     statuses: ['accepted'] },
  { key: 'published',    label: 'Published',    statuses: ['published'] },
  { key: 'rejected',     label: 'Rejected',     statuses: ['rejected'] },
  { key: 'withdrawn',    label: 'Withdrawn',    statuses: ['withdrawn'] },
];

// Filtre « éditeur en charge » des listes admin (submissions.editor_id) : un article confié à un autre
// co-éditeur n'a plus à encombrer le tableau de bord de celui qui s'en est dessaisi.
export const EDITOR_FILTERS = [
  { key: 'all',        label: 'All articles' },
  { key: 'open',       label: 'To handle (mine + unassigned)' },
  { key: 'mine',       label: 'Assigned to me' },
  { key: 'unassigned', label: 'Unassigned' },
];

/** Vrai si l'article passe le filtre (`userId` = l'éditeur connecté). */
export const matchesEditorFilter = (submission, filter, userId) => {
  if (filter === 'mine')       return submission.editor_id === userId;
  if (filter === 'unassigned') return !submission.editor_id;
  if (filter === 'open')       return !submission.editor_id || submission.editor_id === userId;
  return true;
};

/** Vrai si la soumission appartient à l'onglet admin donné. */
export const inAdminTab = (submission, tabKey) => {
  if (tabKey === 'all') return true;
  const tab = ADMIN_TABS.find(t => t.key === tabKey);
  return !!tab && tab.statuses.includes(submission.status);
};

// ── Relectures (tableau de bord ET « My reviews ») ───────────
// Tout membre invité à relire a cet espace (compte unique). Historique complet de MES relectures :
//   Invitations → l'éditeur m'a invité, je n'ai pas encore répondu (review_status « assigned »)
//   In progress → j'ai accepté, ma relecture reste à rendre (« accepted »)
//   Completed   → j'ai rendu ma relecture (« completed »)
//   puis le sort de l'article que j'ai relu : Revised · Accepted · Published · Rejected
/** Ma relecture reste à rendre (invitation reçue ou acceptée). */
export const REVIEW_TODO = ['assigned', 'accepted'];

export const REVIEWER_TABS = [
  { key: 'all',         label: 'All',         match: () => true },
  { key: 'invitations', label: 'Invitations', match: a => a.review_status === 'assigned' },
  { key: 'in_progress', label: 'In progress', match: a => a.review_status === 'accepted' },
  { key: 'completed',   label: 'Completed',   match: a => a.review_status === 'completed' },
  { key: 'revised',     label: 'Revised',     match: a => a.status === 'revised' },
  { key: 'accepted',    label: 'Accepted',    match: a => a.status === 'accepted' },
  { key: 'published',   label: 'Published',   match: a => a.status === 'published' },
  { key: 'rejected',    label: 'Rejected',    match: a => a.status === 'rejected' },
];
