const pool = require('../db/connection');
const { analyzeAuthorship } = require('../utils/authorship');

// ============================================================
// JAEI — Notifications in-app (cloche du tableau de bord)
// Remarque 3 (client, 28/07) : toute action des co-éditeurs,
// auteurs ou reviewers doit générer une notification.
// Jamais bloquant : une erreur est loguée, pas propagée.
// ============================================================

/**
 * Types de notifications destinés à l'ÉQUIPE ÉDITORIALE (par opposition à celles de l'auteur ou
 * du relecteur) : ce sont les seules qu'on retire aux autres éditeurs quand un article est pris en charge.
 */
const EDITOR_NOTIFICATION_TYPES = [
  'new_submission', 'invitation_accepted', 'invitation_declined', 'review_submitted',
  'decision', 'withdrawn', 'revision_submitted', 'apc_paid',
];

/**
 * Crée une notification pour un utilisateur.
 * @param {object} n
 * @param {number} n.userId        destinataire
 * @param {string} n.type          slug technique (new_submission, review_submitted…)
 * @param {string} n.title         titre court affiché dans la cloche
 * @param {string} [n.body]        détail (1-2 lignes)
 * @param {number} [n.submissionId]
 * @param {string} [n.link]        route front à ouvrir au clic
 */
const notify = async ({ userId, type, title, body, submissionId, link }) => {
  if (!userId) return;
  try {
    await pool.query(
      `INSERT INTO notifications (user_id, type, title, body, submission_id, link)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, type, String(title).slice(0, 200), body || null, submissionId || null, link || null]
    );
  } catch (err) {
    console.error('notify:', err.message);
  }
};

/**
 * Notifie les administrateurs / co-éditeurs.
 *  • Tant qu'aucun éditeur n'est en charge de l'article (ex. nouvelle soumission), tous les
 *    administrateurs sont prévenus : n'importe lequel peut s'en saisir.
 *  • Dès qu'un éditeur est en charge (`submissions.editor_id`), LUI SEUL est prévenu : les autres
 *    n'ont plus à suivre cet article.
 *  • Verrou éditorial : les administrateurs auteurs ou co-auteurs du manuscrit ne reçoivent jamais
 *    ces notifications — ils ne suivent pas le traitement de leur propre article.
 */
const notifyAdmins = async (payload, { exceptUserId } = {}) => {
  try {
    const rows = await pool.query("SELECT id, email FROM users WHERE role = 'admin'");
    let manuscript = null;
    if (payload.submissionId) {
      const s = await pool.query(
        `SELECT s.author_id, s.authors, s.editor_id, u.email AS submitter_email
           FROM submissions s JOIN users u ON u.id = s.author_id WHERE s.id = $1`,
        [payload.submissionId]
      );
      manuscript = s.rows[0] || null;
    }

    let recipients = rows.rows;
    if (manuscript?.editor_id && recipients.some(r => r.id === manuscript.editor_id)) {
      recipients = recipients.filter(r => r.id === manuscript.editor_id);
    }

    await Promise.all(
      recipients
        .filter(r => r.id !== exceptUserId)
        .filter(r => !manuscript || !analyzeAuthorship(manuscript, { userId: r.id, email: r.email }).isAuthor)
        .map(r => notify({ ...payload, userId: r.id }))
    );
  } catch (err) {
    console.error('notifyAdmins:', err.message);
  }
};

/**
 * Un éditeur prend (ou reçoit) la charge d'un article : les AUTRES administrateurs n'ont plus à
 * suivre ses notifications éditoriales non lues (ex. « nouvelle soumission », envoyée à tous) →
 * elles passent en « lues » et la pastille de la cloche diminue. L'auteur du manuscrit n'est pas concerné.
 */
const clearOtherEditorsNotifications = async (submissionId, editorId) => {
  if (!submissionId || !editorId) return;
  try {
    await pool.query(
      `UPDATE notifications n
          SET read_at = NOW()
         FROM submissions s
        WHERE s.id = $1 AND n.submission_id = s.id
          AND n.read_at IS NULL
          AND n.type = ANY($2)
          AND n.user_id <> $3
          AND n.user_id <> s.author_id
          AND n.user_id IN (SELECT id FROM users WHERE role = 'admin')`,
      [submissionId, EDITOR_NOTIFICATION_TYPES, editorId]
    );
  } catch (err) {
    console.error('clearOtherEditorsNotifications:', err.message);
  }
};

module.exports = { notify, notifyAdmins, clearOtherEditorsNotifications, EDITOR_NOTIFICATION_TYPES };
