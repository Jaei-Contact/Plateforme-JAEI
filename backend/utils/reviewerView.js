// ============================================================
// JAEI — Vue « reviewer » d'une soumission (évaluation en double anonymat)
//
// Les statuts de la revue (« STATUS OF THE JOURNAL ») prévoient une
// « Double anonymized review » et le client exige qu'aucun reviewer
// n'accède à la Title page (remarque 10 du 23/09). Un reviewer ne reçoit donc :
//   • ni le nom/e-mail de l'auteur, ni la liste des co-auteurs ;
//   • ni la lettre de couverture ni les commentaires privés à l'éditeur ;
//   • ni les fichiers qui révèlent l'identité des auteurs.
//
// LISTE BLANCHE : une colonne ajoutée plus tard à `submissions` n'est jamais
// transmise à un reviewer tant qu'elle n'est pas ajoutée ici.
// ============================================================

const REVIEWER_SUBMISSION_COLUMNS = [
  'id', 'title', 'abstract', 'keywords', 'research_area', 'pdf_url', 'status',
  'submitted_at', 'updated_at', 'article_type', 'manuscript_number',
  'revision_count', 'revised_at',
];

// Fragment SQL « s.id, s.title, … » pour les requêtes destinées aux reviewers
const REVIEWER_SQL_COLUMNS = REVIEWER_SUBMISSION_COLUMNS.map((c) => `s.${c}`).join(', ');

// Types de fichiers jamais servis à un reviewer (identité des auteurs / courrier à l'éditeur)
const HIDDEN_FILE_TYPES_FOR_REVIEWERS = ['Title page', 'Cover Letter', 'Author Agreement'];

// Fragment SQL pour filtrer submission_files (liste fixe, aucune entrée utilisateur)
const REVIEWER_FILES_FILTER = `file_type NOT IN (${HIDDEN_FILE_TYPES_FOR_REVIEWERS.map((t) => `'${t}'`).join(', ')})`;

/** Réduit une ligne `submissions` aux seules colonnes visibles par un reviewer. */
const toReviewerSubmission = (row) => {
  const out = {};
  for (const c of REVIEWER_SUBMISSION_COLUMNS) if (c in row) out[c] = row[c];
  return out;
};

module.exports = {
  REVIEWER_SUBMISSION_COLUMNS, REVIEWER_SQL_COLUMNS,
  HIDDEN_FILE_TYPES_FOR_REVIEWERS, REVIEWER_FILES_FILTER, toReviewerSubmission,
};
