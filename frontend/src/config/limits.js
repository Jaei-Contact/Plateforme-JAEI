// ============================================================
// JAEI — Limites et formats des fichiers (miroir du backend : backend/config/limits.js
// et backend/utils/uploadRules.js — garder les deux en cohérence)
//
// Limite UNIQUE de 10 Mo : c'est le plafond de l'offre GRATUITE de Cloudinary
// (20 Mo en offre Plus, 40 Mo en Advanced). Pour la relever après un changement
// d'offre : variable VITE_MAX_UPLOAD_MB (puis relancer un déploiement du site)
// ET variable MAX_UPLOAD_MB côté serveur.
// ============================================================

export const MAX_UPLOAD_MB = Number(import.meta.env.VITE_MAX_UPLOAD_MB) || 10;
export const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;

// Types de fichiers du formulaire autorisés à être des images (figures haute résolution)
export const IMAGE_ITEM_TYPES = ['Figure', 'Graphical Abstract (for review)'];
export const IMAGE_EXTS = ['.tif', '.tiff', '.eps', '.jpg', '.jpeg', '.png'];

/** Extensions autorisées pour un type de fichier : Word pour tout, images pour les figures. */
export const allowedExtsFor = (itemType) =>
  IMAGE_ITEM_TYPES.includes(itemType) ? ['.docx', ...IMAGE_EXTS] : ['.docx'];

/** Extension (minuscules, avec le point) d'un nom de fichier. */
export const extOf = (name) => ((String(name || '').match(/\.[^.]+$/) || [''])[0]).toLowerCase();

/** Message d'erreur (anglais, court) quand un fichier ne convient pas à son type. */
export const formatErrorFor = (itemType) =>
  IMAGE_ITEM_TYPES.includes(itemType)
    ? 'Figures must be Word (.docx), TIFF, EPS, JPEG or PNG files.'
    : 'Only Word (.docx) files are accepted.';
