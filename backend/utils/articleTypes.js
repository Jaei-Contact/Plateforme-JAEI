// ============================================================
// JAEI — Types d'articles et lettre de référence
// Remarque 8 (client, 28/07) : la nature du document apparaît dans
// le code de référence du manuscrit — ex. JAEI-A-26-09928
//   JAEI  : nom du journal
//   A     : type d'article (A = Articles/Original Research Papers…)
//   26    : année
//   09928 : numéro d'ordre de l'article reçu
// ============================================================

const ARTICLE_TYPES = [
  { label: 'Articles / Original Research Papers',   letter: 'A' },
  { label: 'Brief Communication',                   letter: 'B' },
  { label: 'Correspondence',                        letter: 'C' },
  { label: 'Feature',                               letter: 'F' },
  { label: 'Letters to the Editor',                 letter: 'L' },
  { label: 'Review / Mini Reviews',                 letter: 'R' },
  { label: 'Opinions',                              letter: 'O' },
  { label: 'Perspective review',                    letter: 'P' },
  { label: 'Short Comments / Short Communications', letter: 'S' },
  { label: 'Technical Advances / Technical Notes',  letter: 'T' },
];

const TYPE_LABELS = ARTICLE_TYPES.map(t => t.label);

/** Lettre de référence d'un type d'article (défaut : A). */
const letterForType = (label) => {
  const found = ARTICLE_TYPES.find(t => t.label === label);
  if (found) return found.letter;
  // Anciens libellés (avant le nettoyage du 28/07) → rattachés au plus proche
  const legacy = {
    'Analysis': 'A', 'Registered Report': 'A', 'Perspective': 'P',
    'Short Communications': 'S', 'Short Comments': 'S', 'Special Issues': 'A',
    'Review / Mini Reviews': 'R',
  };
  return legacy[label] || 'A';
};

/** Numéro de manuscrit complet : JAEI-A-26-09928 */
const buildManuscriptNumber = (articleType, submissionId, date = new Date()) =>
  `JAEI-${letterForType(articleType)}-${date.getFullYear().toString().slice(-2)}-${String(submissionId).padStart(5, '0')}`;

module.exports = { ARTICLE_TYPES, TYPE_LABELS, letterForType, buildManuscriptNumber };
