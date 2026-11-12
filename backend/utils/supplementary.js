// ============================================================
// JAEI — Documents supplémentaires publiés avec l'article
// (figures, tableaux en plus, jeux de données…)
//
// L'éditeur choisit ce qui devient PUBLIC sur la page de l'article, en plus du PDF de publication :
//   • des fichiers déjà déposés par l'auteur à la soumission (types ci-dessous uniquement) ;
//   • ou des fichiers qu'il dépose lui-même au moment de la publication (formats ci-dessous).
// ============================================================

const path = require('path');

/**
 * Types de fichiers du formulaire de soumission qui peuvent être rendus publics.
 * JAMAIS publiables : « Blinded Manuscript » (remplacé par le PDF de publication), « Title page »,
 * « Cover Letter », « Author Agreement », « Detailed Response to Reviewers »,
 * « Highlights / Graphical Abstract (for review) » et « Macro and style files » (documents internes).
 */
const PUBLISHABLE_TYPES = ['Supplementary Material', 'Figure', 'Table', 'Dataset', 'Video', 'e-component'];

/** Nombre maximum de documents supplémentaires publiés par article. */
const MAX_PUBLISHED_FILES = 30;

/** Formats que l'éditeur peut déposer. */
const SUPPLEMENTARY_EXTS = ['.pdf', '.docx', '.xlsx', '.csv', '.txt', '.zip', '.png', '.jpg', '.jpeg', '.tif', '.tiff', '.eps'];

const TIFF_SIGNATURES = [[0x49, 0x49, 0x2A, 0x00], [0x4D, 0x4D, 0x00, 0x2A], [0x49, 0x49, 0x2B, 0x00], [0x4D, 0x4D, 0x00, 0x2B]];
const ZIP_SIGNATURE   = [[0x50, 0x4B, 0x03, 0x04]];
const SIGNATURES = {
  '.pdf':  [[0x25, 0x50, 0x44, 0x46, 0x2D]],                                  // %PDF-
  '.docx': ZIP_SIGNATURE,
  '.xlsx': ZIP_SIGNATURE,
  '.zip':  ZIP_SIGNATURE,
  '.png':  [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
  '.jpg':  [[0xFF, 0xD8, 0xFF]],
  '.jpeg': [[0xFF, 0xD8, 0xFF]],
  '.tif':  TIFF_SIGNATURES,
  '.tiff': TIFF_SIGNATURES,
  '.eps':  [[0x25, 0x21, 0x50, 0x53], [0xC5, 0xD0, 0xD3, 0xC6]],              // "%!PS" ou en-tête binaire DOS EPS
};
const TEXT_EXTS = ['.csv', '.txt'];

const startsWith = (buf, bytes) => buf.length >= bytes.length && bytes.every((b, i) => buf[i] === b);

/**
 * Valide un fichier multer (extension ET contenu réel, pas seulement le type MIME déclaré).
 * @returns {string|null} message d'erreur (anglais, destiné à l'utilisateur) ou null si OK
 */
const validateSupplementaryFile = (file) => {
  const ext = path.extname(file.originalname || '').toLowerCase();
  if (!SUPPLEMENTARY_EXTS.includes(ext)) {
    return `"${file.originalname}": accepted formats are ${SUPPLEMENTARY_EXTS.join(', ')}.`;
  }
  const head = file.buffer || Buffer.alloc(0);
  if (head.length === 0) return `"${file.originalname}" is empty.`;
  if (TEXT_EXTS.includes(ext)) {
    // Texte : aucun octet nul dans les premiers Ko (sinon c'est un fichier binaire déguisé)
    return head.subarray(0, 8192).includes(0) ? `"${file.originalname}" does not look like a valid ${ext.slice(1).toUpperCase()} file.` : null;
  }
  const ok = (SIGNATURES[ext] || []).some((sig) => startsWith(head, sig));
  return ok ? null : `"${file.originalname}" does not look like a valid ${ext.slice(1).toUpperCase()} file.`;
};

/**
 * multer décode les noms de fichiers en latin1 : « résumé.xlsx » arrive en « rÃ©sumÃ©.xlsx ».
 * On rétablit l'UTF-8 quand c'est sans ambiguïté.
 */
const decodeFileName = (name) => {
  const raw = String(name || '');
  if ([...raw].some((c) => c.charCodeAt(0) > 255)) return raw;     // déjà décodé correctement
  const fixed = Buffer.from(raw, 'latin1').toString('utf8');
  return fixed.includes('�') ? raw : fixed;
};

module.exports = {
  PUBLISHABLE_TYPES, MAX_PUBLISHED_FILES, SUPPLEMENTARY_EXTS,
  validateSupplementaryFile, decodeFileName,
};
