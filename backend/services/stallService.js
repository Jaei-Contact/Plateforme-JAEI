// ============================================================
// JAEI — Surveillance du temps de réaction des éditeurs : alertes (17/11/2026)
//
// Règles et étapes : voir utils/waiting.js. Ici : repérer les articles dont l'éditeur en charge n'a pas réagi depuis
// 14 jours et PRÉVENIR (notification de la cloche + e-mail), une seule fois par blocage :
//   • l'éditeur en chef (E-C) — toujours, même s'il est auteur de l'article (il garde un œil dessus) ;
//     s'il n'est pas auteur, il peut réattribuer, reprendre l'article ou relancer l'éditeur ;
//   • si l'E-C est auteur ou co-auteur (verrou : il ne peut pas agir), les AUTRES éditeurs non auteurs reçoivent
//     « Take charge » : le premier qui réagit remplace l'éditeur absent.
// Déclenchement : une tâche planifiée GitHub appelle POST /api/internal/stall-check chaque jour (le serveur gratuit
// s'endort et ne peut pas surveiller seul), et le contrôle se refait aussi quand un administrateur ouvre ses
// notifications (au plus toutes les 30 minutes) : même sans la tâche planifiée, rien n'est manqué.
// ============================================================

const pool = require('../db/connection');
const { WAITING_JOIN, MONITORED_STATUSES, STEP_LABELS, computeWaiting, daysSince, isStalled } = require('../utils/waiting');
const { analyzeAuthorship } = require('../utils/authorship');
const { getEditorInChief } = require('./settingsService');
const { notify } = require('./notificationService');
const { sendEmail, EMAIL_TEMPLATES } = require('./emailService');

const REMINDER_COOLDOWN_MS = 24 * 3600 * 1000;   // une relance par article et par jour au plus

const CANDIDATES_SQL = `
  SELECT s.id, s.title, s.manuscript_number, s.status, s.editor_id, s.editor_assigned_at, s.revised_at,
         s.revision_count, s.updated_at, s.submitted_at, s.author_id, s.authors,
         ua.email AS submitter_email,
         ue.email AS editor_email, TRIM(ue.first_name || ' ' || ue.last_name) AS editor_name,
         wv.rv_active, wv.rv_completed, wv.rv_declined, wv.rv_last_declined_at, wv.rv_last_reviewed_at
    FROM submissions s
    JOIN users ua ON ua.id = s.author_id
    JOIN users ue ON ue.id = s.editor_id
    ${WAITING_JOIN}
   WHERE s.editor_id IS NOT NULL AND s.status = ANY($1)`;

/** Articles surveillés dont l'éditeur en charge n'a pas réagi depuis 14 jours : [{ row, waiting }]. */
const listStalled = async (now = new Date()) => {
  const r = await pool.query(CANDIDATES_SQL, [MONITORED_STATUSES]);
  return r.rows
    .map(row => ({ row, waiting: computeWaiting(row) }))
    .filter(x => x.waiting && isStalled(x.waiting, now));
};

/** L'attente d'UN article : { row, waiting, stalled } (waiting null si l'article n'attend pas l'éditeur), ou null s'il n'existe pas. */
const loadWaiting = async (submissionId, now = new Date()) => {
  const r = await pool.query(`${CANDIDATES_SQL} AND s.id = $2`, [MONITORED_STATUSES, submissionId]);
  if (r.rows.length === 0) {
    const exists = await pool.query('SELECT 1 FROM submissions WHERE id = $1', [submissionId]);
    return exists.rows.length > 0 ? { row: null, waiting: null, stalled: false } : null;
  }
  const row = r.rows[0];
  const waiting = computeWaiting(row);
  return { row, waiting, stalled: isStalled(waiting, now) };
};

/** Date de la dernière relance de l'éditeur en chef sur cet article (null s'il n'y en a pas). */
const lastReminderAt = async (submissionId) => {
  const r = await pool.query(
    `SELECT MAX(created_at) AS at FROM notifications WHERE submission_id = $1 AND type = 'editor_reminder'`, [submissionId]);
  return r.rows[0]?.at || null;
};

/** Une relance est-elle possible maintenant (aucune dans les dernières 24 h) ? */
const reminderAllowed = (last, now = new Date()) => !last || (now.getTime() - new Date(last).getTime()) >= REMINDER_COOLDOWN_MS;

/**
 * Notification (+ e-mail) créée UNE SEULE FOIS par blocage : rien si une notification du même type existe déjà pour
 * cet article et ce destinataire depuis le départ du compte à rebours.
 */
const notifyOnce = async ({ user, type, title, body, submissionId, link, since, email }) => {
  const exists = await pool.query(
    `SELECT 1 FROM notifications WHERE user_id = $1 AND submission_id = $2 AND type = $3 AND created_at > $4 LIMIT 1`,
    [user.id, submissionId, type, since]
  );
  if (exists.rows.length > 0) return false;
  await notify({ userId: user.id, type, title, body, submissionId, link });
  if (email && user.email) sendEmail({ to: user.email, ...email }).catch(() => {});
  return true;
};

/**
 * Contrôle complet (idempotent : on peut le lancer autant de fois que l'on veut).
 * @returns {Promise<{chief: boolean, stalled: number, notified_chief: number, notified_editors: number}>}
 */
const runStallCheck = async ({ now = new Date() } = {}) => {
  const summary = { chief: false, stalled: 0, notified_chief: 0, notified_editors: 0 };
  const chief = await getEditorInChief();
  if (!chief) return summary;                       // sans éditeur en chef désigné, la fonction est inactive
  summary.chief = true;

  const stalled = await listStalled(now);
  summary.stalled = stalled.length;
  if (stalled.length === 0) return summary;
  const admins = (await pool.query(`SELECT id, email, first_name, last_name FROM users WHERE role = 'admin'`)).rows;

  for (const { row, waiting } of stalled) {
    const manuscript = { author_id: row.author_id, authors: row.authors, submitter_email: row.submitter_email };
    const chiefIsAuthor = analyzeAuthorship(manuscript, { userId: chief.id, email: chief.email }).isAuthor;
    const days = daysSince(waiting.since, now);
    const label = row.manuscript_number || `#${row.id}`;
    const common = {
      editorName: row.editor_name, articleTitle: row.title, manuscriptNumber: label,
      stepLabel: STEP_LABELS[waiting.step], days, submissionId: row.id,
    };
    const since = waiting.since.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

    // 1) L'éditeur en chef garde un œil dessus (sauf s'il est lui-même l'éditeur absent : personne au-dessus de lui)
    if (row.editor_id !== chief.id) {
      const sent = await notifyOnce({
        user: chief, type: 'editor_stalled', submissionId: row.id, since: waiting.since,
        title: `No reaction for ${days} days — ${label}`,
        body: `${row.editor_name} has not acted since ${since}: ${row.title}`,
        link: `/admin/submissions/${row.id}`,
        email: EMAIL_TEMPLATES.editorStalledAlert({ ...common, canAct: !chiefIsAuthor }),
      });
      if (sent) summary.notified_chief += 1;
    }

    // 2) Manuscrit de l'éditeur en chef : il ne peut pas agir, les autres éditeurs peuvent remplacer l'éditeur absent
    if (chiefIsAuthor) {
      for (const a of admins) {
        if (a.id === chief.id || a.id === row.editor_id) continue;
        if (analyzeAuthorship(manuscript, { userId: a.id, email: a.email }).isAuthor) continue;
        const sent = await notifyOnce({
          user: a, type: 'take_charge_request', submissionId: row.id, since: waiting.since,
          title: `Editor needed — ${label}`,
          body: `${row.title} — the editor in charge has not reacted for ${days} days: the first editor to take charge replaces them.`,
          link: `/admin/submissions/${row.id}?take=1`,
          email: EMAIL_TEMPLATES.takeChargeStalledAlert(common),
        });
        if (sent) summary.notified_editors += 1;
      }
    }
  }
  return summary;
};

// Contrôle « paresseux » : quand un administrateur ouvre ses notifications, au plus toutes les 30 minutes, en arrière-plan
let lastLazyRun = 0;
const LAZY_EVERY_MS = 30 * 60 * 1000;
const maybeRunStallCheck = () => {
  if (Date.now() - lastLazyRun < LAZY_EVERY_MS) return;
  lastLazyRun = Date.now();
  runStallCheck().catch(e => console.error('stall-check (paresseux) :', e.message));
};

module.exports = {
  listStalled, loadWaiting, lastReminderAt, reminderAllowed, runStallCheck, maybeRunStallCheck,
  REMINDER_COOLDOWN_MS,
};
