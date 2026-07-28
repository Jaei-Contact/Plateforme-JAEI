const pool = require('../db/connection');

// ============================================================
// JAEI — Notifications in-app (cloche du tableau de bord)
// Remarque 3 (client, 28/07) : toute action des co-éditeurs,
// auteurs ou reviewers doit générer une notification.
// Jamais bloquant : une erreur est loguée, pas propagée.
// ============================================================

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

/** Notifie tous les administrateurs / co-éditeurs. */
const notifyAdmins = async (payload, { exceptUserId } = {}) => {
  try {
    const rows = await pool.query("SELECT id FROM users WHERE role = 'admin'");
    await Promise.all(
      rows.rows
        .filter(r => r.id !== exceptUserId)
        .map(r => notify({ ...payload, userId: r.id }))
    );
  } catch (err) {
    console.error('notifyAdmins:', err.message);
  }
};

module.exports = { notify, notifyAdmins };
