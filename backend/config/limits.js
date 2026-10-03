// ============================================================
// JAEI — Limites de taille des fichiers téléversés
//
// Limite UNIQUE pour tous les envois stockés sur Cloudinary (manuscrits,
// figures, révisions, rapports de reviewers, PDF de publication, factures).
//
// Pourquoi 10 Mo : l'offre GRATUITE de Cloudinary refuse tout fichier « raw »
// de plus de 10 Mo (20 Mo en offre Plus, 40 Mo en Advanced — voir
// https://cloudinary.com/pricing/compare-plans). Annoncer ou accepter plus
// ferait échouer l'envoi au moment du stockage.
//
// Pour relever la limite après un changement d'offre Cloudinary :
//   • backend  : variable d'environnement MAX_UPLOAD_MB (Render)
//   • frontend : variable VITE_MAX_UPLOAD_MB (relancer un build du site)
// ============================================================

const MAX_UPLOAD_MB = Math.max(1, parseInt(process.env.MAX_UPLOAD_MB, 10) || 10);

module.exports = {
  MAX_UPLOAD_MB,
  MAX_UPLOAD_BYTES: MAX_UPLOAD_MB * 1024 * 1024,
};
