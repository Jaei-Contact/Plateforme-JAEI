// ============================================================
// JAEI — Lien d'une personne avec un manuscrit (auteur ou non)
//
// Sert aux deux garde-fous « conflit d'intérêts » :
//   • un auteur ne peut pas ÉVALUER son propre manuscrit (routes/reviews.js) ;
//   • un éditeur (admin) qui est auteur d'un manuscrit n'a AUCUN accès éditorial
//     dessus : il ne le traite pas, ne voit pas l'identité de ses relecteurs
//     (middleware/editorialLock.js, routes/submissions.js).
//
// Est auteur : le soumetteur (id ou e-mail) ou un co-auteur déclaré dans le
// formulaire de soumission (identifié par son e-mail, même sans compte).
// ============================================================

const pool = require('../db/connection');

const parseAuthors = (authors) => {
  if (typeof authors === 'string') {
    try { return JSON.parse(authors); } catch { return null; }
  }
  return authors;
};

const lower = (s) => String(s || '').trim().toLowerCase();

/**
 * Analyse pure (sans requête) du lien entre une personne et un manuscrit.
 * @param {{author_id:number, authors:any, submitter_email?:string}} row  ligne de `submissions` (+ e-mail du soumetteur)
 * @param {{userId?:number, email?:string}} who
 * @returns {{isSubmitter:boolean, coAuthor:object|null, isAuthor:boolean}}
 */
const analyzeAuthorship = (row, { userId = null, email = null } = {}) => {
  const target = lower(email);
  const isSubmitter = !!(
    (userId && row.author_id === userId) ||
    (target && lower(row.submitter_email) === target)
  );
  let coAuthor = null;
  const authors = parseAuthors(row.authors);
  if (target && Array.isArray(authors)) {
    coAuthor = authors.find((a) => lower(a?.email) === target) || null;
  }
  return { isSubmitter, coAuthor, isAuthor: isSubmitter || !!coAuthor };
};

/**
 * Même analyse, en lisant le manuscrit en base.
 * `exists` vaut false si le manuscrit n'existe pas (la route appelante renvoie alors son propre 404).
 */
const authorshipOf = async (submissionId, who = {}) => {
  const r = await pool.query(
    `SELECT s.author_id, s.authors, u.email AS submitter_email
       FROM submissions s JOIN users u ON u.id = s.author_id
      WHERE s.id = $1`,
    [submissionId]
  );
  if (r.rows.length === 0) {
    return { exists: false, submitterId: null, isSubmitter: false, coAuthor: null, isAuthor: false };
  }
  return { exists: true, submitterId: r.rows[0].author_id, ...analyzeAuthorship(r.rows[0], who) };
};

module.exports = { analyzeAuthorship, authorshipOf };
