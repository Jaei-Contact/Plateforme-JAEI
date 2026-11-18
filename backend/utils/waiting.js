// ============================================================
// JAEI — Surveillance du temps de réaction des éditeurs (14/11/2026 → 17/11/2026)
//
// Retour du client : si un éditeur (ou co-éditeur) à qui un article a été confié ne réagit plus, l'éditeur en chef
// (E-C) doit le savoir au bout de 2 semaines et pouvoir réattribuer l'article, le reprendre lui-même ou relancer
// l'éditeur.
//
// RÈGLES (validées avec l'utilisateur)
//   • La surveillance COMMENCE quand un éditeur est en charge de l'article (`submissions.editor_id`) et s'arrête
//     quand l'article est accepté (ou rejeté, retiré, publié) : avant, l'article attend un éditeur (Take charge).
//   • Elle ne mesure QUE l'attente de l'éditeur : quand la main est à un relecteur ou à l'auteur, il n'y a pas de
//     compte à rebours.
//   • Un compte à rebours de 14 jours démarre chaque fois que c'est à l'éditeur de réagir, et s'arrête dès qu'il réagit.
//
// ÉTAPES où l'article attend l'éditeur (déduites des statuts et des dates DÉJÀ enregistrées : aucune table en plus)
//   editorial_check  contrôle éditorial : éditeur en charge, aucun relecteur invité pour le tour en cours
//                    → départ : prise en charge ; réaction : inviter un relecteur, renvoyer à l'auteur ou rejeter
//   invite_reviewer  plus aucun relecteur actif : toutes les invitations du tour ont été déclinées
//                    → départ : dernier refus ; réaction : inviter un autre relecteur, ou décider
//   decision         toutes les évaluations attendues sont rendues (plus aucun relecteur à attendre)
//                    → départ : dernière évaluation reçue ; réaction : décider, ou inviter un relecteur de plus
//   revised_version  l'auteur a déposé une version révisée (statut « revised »)
//                    → départ : dépôt de la version ; réaction : décider, ou réinviter les relecteurs
//   Après une demande de révision ou un renvoi à l'auteur, la main est à l'auteur : pas de compte à rebours.
// Une décision prise SANS message n'a pas de date propre : on se fie au statut, qui sort alors l'article de la
// surveillance, plutôt qu'à la date de la réaction.
// ============================================================

/** Seuil d'alerte (14 jours, demandé par le client). Les objectifs des statuts (5 jours pour la première décision,
 *  30 jours pour le premier tour, 15 pour le second) restent des objectifs affichés aux auteurs, non mesurés ici. */
const STALL_DAYS = 14;
const DAY_MS = 86400000;

/** Statuts pour lesquels l'éditeur en charge peut avoir à réagir (le reste : auteur, relecteurs, article clos). */
const MONITORED_STATUSES = ['submitted', 'pending', 'under_review', 'revised', 'revision_needed'];

const STEP_LABELS = {
  editorial_check: 'the editorial check (inviting a reviewer, or sending the manuscript back or rejecting it)',
  invite_reviewer: 'the invitation of another reviewer (all the invitations were declined)',
  decision:        'the editorial decision (all the expected reviews are in)',
  revised_version: 'the examination of the revised version',
};

/**
 * À insérer après « FROM submissions s » : agrège les évaluations du TOUR EN COURS (round = versions révisées + 1).
 * Ajoute rv_active (relecteur invité ou ayant accepté, évaluation pas encore rendue), rv_completed, rv_declined,
 * rv_last_declined_at et rv_last_reviewed_at.
 */
const WAITING_JOIN = `
  LEFT JOIN LATERAL (
    SELECT COUNT(*) FILTER (WHERE r.status NOT IN ('declined', 'completed'))::int AS rv_active,
           COUNT(*) FILTER (WHERE r.status = 'completed')::int                    AS rv_completed,
           COUNT(*) FILTER (WHERE r.status = 'declined')::int                     AS rv_declined,
           MAX(r.declined_at) FILTER (WHERE r.status = 'declined')                AS rv_last_declined_at,
           MAX(r.reviewed_at) FILTER (WHERE r.status = 'completed')               AS rv_last_reviewed_at
      FROM reviews r
     WHERE r.submission_id = s.id
       AND COALESCE(r.round, 1) = COALESCE(s.revision_count, 0) + 1
  ) wv ON TRUE`;

const ms = (d) => (d ? new Date(d).getTime() : NaN);
const latest = (...dates) => {
  const t = dates.map(ms).filter(n => !Number.isNaN(n));
  return t.length ? new Date(Math.max(...t)) : null;
};

/**
 * Où en est l'attente de l'éditeur ?
 * @param {object} row  ligne de `submissions` + colonnes de WAITING_JOIN
 * @returns {{step: string, since: Date} | null}  null : l'article n'attend pas l'éditeur (ou n'en a pas encore)
 */
const computeWaiting = (row) => {
  if (!row || !row.editor_id || !MONITORED_STATUSES.includes(row.status)) return null;
  const active = Number(row.rv_active) || 0;
  const completed = Number(row.rv_completed) || 0;
  const declined = Number(row.rv_declined) || 0;
  const hasRevision = Number(row.revision_count) > 0;

  let step; let since;
  if (row.status === 'revised') {
    if (active > 0) return null;                                  // relecteurs réinvités : la main est aux relecteurs
    step = 'revised_version';
    since = latest(row.revised_at) || latest(row.updated_at);
  } else if (row.status === 'revision_needed') {                  // ancien statut : évaluations reçues, l'éditeur doit écrire à l'auteur
    step = 'decision';
    since = latest(row.rv_last_reviewed_at) || latest(row.updated_at);
  } else {
    if (active > 0) return null;                                  // un relecteur doit encore répondre ou rendre son évaluation
    if (completed > 0)      { step = 'decision';        since = latest(row.rv_last_reviewed_at); }
    else if (declined > 0)  { step = 'invite_reviewer'; since = latest(row.rv_last_declined_at); }
    else {
      step = 'editorial_check';
      since = latest(row.editor_assigned_at, hasRevision ? row.revised_at : null) || latest(row.submitted_at);
    }
  }
  // Un éditeur qui vient de prendre ou de recevoir l'article (réattribution, « Take charge ») a ses 14 jours à lui :
  // le compte à rebours ne remonte jamais avant sa prise en charge.
  since = latest(since, row.editor_assigned_at);
  return since ? { step, since } : null;
};

/** Jours entiers écoulés depuis `since`. */
const daysSince = (since, now = new Date()) => Math.max(0, Math.floor((ms(now) - ms(since)) / DAY_MS));

/** Le compte à rebours de 14 jours est-il dépassé ? */
const isStalled = (waiting, now = new Date()) => !!waiting && (ms(now) - ms(waiting.since)) >= STALL_DAYS * DAY_MS;

/** Champs ajoutés aux lignes de liste / à la fiche : { waiting_step, waiting_since, waiting_days, stalled } */
const waitingFields = (row, now = new Date()) => {
  const w = computeWaiting(row);
  return w
    ? { waiting_step: w.step, waiting_since: w.since.toISOString(), waiting_days: daysSince(w.since, now), stalled: isStalled(w, now) }
    : { waiting_step: null, waiting_since: null, waiting_days: null, stalled: false };
};

module.exports = {
  STALL_DAYS, DAY_MS, MONITORED_STATUSES, STEP_LABELS, WAITING_JOIN,
  computeWaiting, daysSince, isStalled, waitingFields,
};
