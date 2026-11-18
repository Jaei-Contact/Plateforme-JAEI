// ============================================================
// JAEI — Historique d'un manuscrit (panneau « History » de la fiche éditeur)
//
// Retour client du 13/11/2026 : l'éditeur veut suivre, pour chaque article, ce qui s'est passé et
// quand, même quand un autre co-éditeur en est chargé.
//
// L'historique est CONSTRUIT à partir des dates déjà enregistrées (soumission, éditeur désigné,
// invitations / acceptations / refus / évaluations rendues, messages et décisions de l'éditeur,
// versions révisées, paiement de l'APC, facture, publication) : aucune table supplémentaire.
// Limite : une décision prise SANS message n'a pas de date propre (seul le message qui
// l'accompagne est daté) ; le retrait par l'auteur est daté par la dernière mise à jour.
//
// Réservé à la vue éditoriale : il nomme les relecteurs.
// ============================================================

const DECISION_LABELS = {
  accepted:        'Accepted',
  rejected:        'Rejected',
  major_revision:  'Major revision requested',
  minor_revision:  'Minor revision requested',
  revision_needed: 'Revision requested',
  sent_back:       'Sent back to the authors',
  under_review:    'Set to under review',
  revised:         'Marked as revised',
  published:       'Published',
  withdrawn:       'Withdrawn',
  submitted:       'Set to submitted',
  pending:         'Set to submitted',
};

const RECOMMENDATION_LABELS = {
  accept:         'Accept',
  revise:         'Revise',
  minor_revision: 'Minor revisions',
  major_revision: 'Major revisions',
  reject:         'Reject',
};

// À horodatage égal, l'étape la plus avancée vient en premier (tri décroissant).
const RANK = {
  submitted: 0, editor_assigned: 1, reviewer_invited: 2, reviewer_accepted: 3, reviewer_declined: 3,
  review_submitted: 4, revised: 5, message: 6, decision: 6, apc_paid: 7, invoice: 8, published: 9, withdrawn: 9,
  stalled: 10, reminder: 11,
};

const toTime = (d) => (d ? new Date(d).getTime() : NaN);

/**
 * @param {object}   data
 * @param {object}   data.submission   ligne de `submissions` (+ author_name, editor_name)
 * @param {object[]} data.reviews      reviews (+ reviewer_name) — toutes, y compris les invitations déclinées
 * @param {object[]} data.messages     editor_messages (+ sender_name)
 * @param {object[]} data.files        submission_files (revision_round, created_at)
 * @param {object|null} data.invoice   { invoice_number, issued_at }
 * @param {Date|string|null} data.publishedAt
 * @returns {{at:string, type:string, title:string, detail:string}[]}  du plus récent au plus ancien
 */
const buildHistory = ({ submission: s, reviews = [], messages = [], files = [], invoice = null, publishedAt = null, notices = [] }) => {
  const events = [];
  const add = (type, at, title, detail = '') => {
    if (Number.isNaN(toTime(at))) return;
    events.push({ at: new Date(at).toISOString(), type, title, detail });
  };

  add('submitted', s.submitted_at, 'Manuscript submitted', s.author_name ? `by ${s.author_name}` : '');

  if (s.editor_assigned_at) {
    add('editor_assigned', s.editor_assigned_at, 'Editor assigned', s.editor_name || '');
  }

  for (const r of reviews) {
    const who   = r.reviewer_name || 'Reviewer';
    const round = Number(r.round) > 1 ? ` · round ${r.round}` : '';
    add('reviewer_invited', r.created_at, 'Reviewer invited', `${who}${round}`);
    if (r.accepted_at) add('reviewer_accepted', r.accepted_at, 'Invitation accepted', `${who}${round}`);
    if (r.declined_at) add('reviewer_declined', r.declined_at, 'Invitation declined', `${who}${round}`);
    if (r.status === 'completed' && r.reviewed_at) {
      const reco = RECOMMENDATION_LABELS[r.recommendation];
      add('review_submitted', r.reviewed_at, 'Review submitted', `${who}${round}${reco ? ` — ${reco}` : ''}`);
    }
  }

  for (const m of messages) {
    const by = m.sender_name ? `by ${m.sender_name}` : '';
    if (m.decision) {
      add('decision', m.created_at, `Decision: ${DECISION_LABELS[m.decision] || m.decision}`, by);
    } else {
      add('message', m.created_at, 'Message sent to the author', by);
    }
  }

  // Versions révisées : la date du premier fichier déposé pour chaque tour
  const rounds = new Map();
  for (const f of files) {
    const round = Number(f.revision_round) || 0;
    if (round < 1) continue;
    const t = toTime(f.created_at);
    if (!Number.isNaN(t) && (!rounds.has(round) || t < rounds.get(round))) rounds.set(round, t);
  }
  for (const [round, t] of rounds) add('revised', t, `Revised version ${round} received`);

  // Surveillance du temps de réaction (17/11/2026) : alerte de l'éditeur en chef au bout de 14 jours, relances
  for (const n of notices) {
    if (n.type === 'editor_stalled') add('stalled', n.created_at, 'No reaction for 14 days', 'The Editor-in-Chief was alerted');
    else if (n.type === 'editor_reminder') add('reminder', n.created_at, 'Reminder sent to the editor in charge', 'by the Editor-in-Chief');
  }

  if (s.apc_paid && s.apc_paid_at) add('apc_paid', s.apc_paid_at, 'APC payment received');
  if (invoice?.issued_at) add('invoice', invoice.issued_at, 'Invoice issued', invoice.invoice_number || '');
  if (publishedAt) add('published', publishedAt, 'Article published');
  if (s.status === 'withdrawn') add('withdrawn', s.updated_at, 'Withdrawn by the author');

  return events
    .map((e, i) => ({ e, i }))
    .sort((a, b) => (toTime(b.e.at) - toTime(a.e.at)) || ((RANK[b.e.type] || 0) - (RANK[a.e.type] || 0)) || (b.i - a.i))
    .map(({ e }) => e);
};

/** Les deux requêtes qui manquent à la fiche (le reste est déjà chargé par la route). */
const loadHistoryExtras = async (pool, submissionId) => {
  const [rev, pub, notices] = await Promise.all([
    pool.query(
      `SELECT r.id, r.status, r.round, r.recommendation, r.created_at, r.accepted_at, r.declined_at, r.reviewed_at,
              u.first_name || ' ' || u.last_name AS reviewer_name
         FROM reviews r JOIN users u ON u.id = r.reviewer_id
        WHERE r.submission_id = $1`,
      [submissionId]
    ),
    pool.query('SELECT published_at FROM published_articles WHERE submission_id = $1', [submissionId]),
    pool.query(
      `SELECT type, created_at FROM notifications
        WHERE submission_id = $1 AND type IN ('editor_stalled', 'editor_reminder') ORDER BY created_at`,
      [submissionId]
    ),
  ]);
  return { reviews: rev.rows, publishedAt: pub.rows[0]?.published_at || null, notices: notices.rows };
};

module.exports = { buildHistory, loadHistoryExtras };
