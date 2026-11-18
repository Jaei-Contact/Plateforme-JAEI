// ============================================================
// JAEI — Règles d'attribution de l'éditeur en charge (14/11/2026)
//
// Retour du client : l'éditeur en chef coiffe tout le monde. Quand c'est LUI qui est auteur ou co-auteur d'un
// article, le verrou éditorial l'empêche d'en choisir l'éditeur ; plutôt que de laisser l'article « Submitted »
// indéfiniment, tous les AUTRES éditeurs sont prévenus et le premier qui clique sur « Take charge » devient
// l'éditeur en charge. Les articles des autres membres du comité suivent le circuit ordinaire.
//
//   • Sans éditeur en chef désigné (Settings), rien de ceci n'est actif : comportement antérieur.
//   • Article de l'éditeur en chef SANS éditeur en charge → « Take charge » uniquement (pas d'attribution manuelle).
//   • Article avec éditeur en charge → seuls cet éditeur et l'éditeur en chef (s'il n'en est pas auteur : le verrou
//     éditorial s'applique avant) peuvent le remplacer.
//   • Article ordinaire sans éditeur en charge → n'importe quel éditeur non auteur l'attribue (comme avant).
// ============================================================

const pool = require('../db/connection');
const { analyzeAuthorship } = require('./authorship');

/** Ligne minimale d'un manuscrit pour juger de la paternité et de l'éditeur en charge (null si inexistant). */
const loadManuscriptRow = async (submissionId) => {
  const r = await pool.query(
    `SELECT s.id, s.author_id, s.authors, s.editor_id, u.email AS submitter_email
       FROM submissions s JOIN users u ON u.id = s.author_id
      WHERE s.id = $1`,
    [submissionId]
  );
  return r.rows[0] || null;
};

/** L'éditeur en chef est-il soumetteur ou co-auteur de ce manuscrit ? (false si aucun éditeur en chef désigné) */
const isChiefAuthored = (row, chief) =>
  !!chief && !!row && analyzeAuthorship(row, { userId: chief.id, email: chief.email }).isAuthor;

/** Mode « Take charge » : manuscrit de l'éditeur en chef, sans éditeur en charge. */
const needsTakeCharge = (row, chief) => isChiefAuthored(row, chief) && !row.editor_id;

/**
 * « Take charge » ouvert : manuscrit de l'éditeur en chef SANS éditeur en charge, ou dont l'éditeur en charge ne réagit
 * plus depuis 14 jours (`stalled`, voir utils/waiting.js) — le premier éditeur non auteur qui clique le remplace.
 */
const takeChargeOpen = (row, chief, stalled = false) => isChiefAuthored(row, chief) && (!row.editor_id || !!stalled);

/**
 * `viewer` (un administrateur NON auteur du manuscrit) peut-il attribuer ou remplacer l'éditeur en charge ?
 * @param {{id:number}} viewer
 */
const canAssignEditor = (row, chief, viewer) => {
  if (!chief) return true;                                     // pas d'éditeur en chef désigné : comportement antérieur
  if (!row.editor_id) return !isChiefAuthored(row, chief);     // article de l'éditeur en chef : « Take charge » seulement
  return viewer.id === row.editor_id || viewer.id === chief.id;
};

module.exports = { loadManuscriptRow, isChiefAuthored, needsTakeCharge, takeChargeOpen, canAssignEditor };
