// ============================================================
// JAEI — Règles de formats pour les fichiers d'une soumission
//
//  • Tous les types de fichiers : Word (.docx) uniquement (demande du client :
//    plus de PDF).
//  • Exception : les figures (types « Figure » et « Graphical Abstract (for
//    review) ») peuvent être des images haute résolution : TIFF, EPS, JPEG, PNG.
//
// Le contrôle porte sur l'extension ET sur la signature réelle du fichier
// (premiers octets), pas seulement sur le type MIME déclaré par le navigateur.
// ============================================================

const path = require('path');

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

// Types de fichiers (libellés du formulaire) autorisés à être des images
const IMAGE_ITEM_TYPES = ['Figure', 'Graphical Abstract (for review)'];
const IMAGE_EXTS = ['.tif', '.tiff', '.eps', '.jpg', '.jpeg', '.png'];

// Types MIME acceptés par multer (le détail se vérifie ensuite par type d'élément).
// application/octet-stream : certains navigateurs l'envoient pour .eps / .tif.
const ACCEPTED_MIMES = [
  DOCX_MIME,
  'image/tiff', 'image/jpeg', 'image/png',
  'application/postscript', 'application/eps', 'application/x-eps', 'image/eps', 'image/x-eps',
  'application/octet-stream',
];

const startsWith = (buf, bytes) => buf.length >= bytes.length && bytes.every((b, i) => buf[i] === b);

// Signatures (premiers octets) par extension
const SIGNATURES = {
  '.docx': [[0x50, 0x4B, 0x03, 0x04]],                                   // zip
  '.jpg':  [[0xFF, 0xD8, 0xFF]],
  '.jpeg': [[0xFF, 0xD8, 0xFF]],
  '.png':  [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
  '.tif':  [[0x49, 0x49, 0x2A, 0x00], [0x4D, 0x4D, 0x00, 0x2A], [0x49, 0x49, 0x2B, 0x00], [0x4D, 0x4D, 0x00, 0x2B]],
  '.tiff': [[0x49, 0x49, 0x2A, 0x00], [0x4D, 0x4D, 0x00, 0x2A], [0x49, 0x49, 0x2B, 0x00], [0x4D, 0x4D, 0x00, 0x2B]],
  '.eps':  [[0x25, 0x21, 0x50, 0x53], [0xC5, 0xD0, 0xD3, 0xC6]],         // "%!PS" ou en-tête binaire DOS EPS
};

const isImageType = (itemType) => IMAGE_ITEM_TYPES.includes(String(itemType || ''));

/**
 * Valide un fichier multer pour un type d'élément donné.
 * @returns {string|null} message d'erreur (anglais, destiné à l'utilisateur) ou null si OK
 */
function validateSubmissionFile(file, itemType) {
  const ext = path.extname(file.originalname || '').toLowerCase();
  const allowedExts = isImageType(itemType) ? ['.docx', ...IMAGE_EXTS] : ['.docx'];
  if (!allowedExts.includes(ext)) {
    return isImageType(itemType)
      ? `"${file.originalname}": figures must be Word (.docx), TIFF, EPS, JPEG or PNG files.`
      : `"${file.originalname}": only Word (.docx) files are accepted for "${itemType}".`;
  }
  const sigs = SIGNATURES[ext] || [];
  const head = file.buffer || Buffer.alloc(0);
  if (!sigs.some((s) => startsWith(head, s))) {
    return `"${file.originalname}" does not look like a valid ${ext.slice(1).toUpperCase()} file.`;
  }
  return null;
}

module.exports = { DOCX_MIME, ACCEPTED_MIMES, IMAGE_ITEM_TYPES, IMAGE_EXTS, isImageType, validateSubmissionFile };
