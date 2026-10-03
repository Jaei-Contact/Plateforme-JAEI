// ============================================================
// JAEI — Erreurs d'upload lisibles
// Le gestionnaire d'erreurs global masque tout message en production
// (« Internal server error ») : un fichier trop gros ou d'un mauvais format
// doit au contraire dire clairement ce qui ne va pas.
// ============================================================

const { MAX_UPLOAD_MB } = require('../config/limits');

/** Enveloppe un middleware multer pour renvoyer 413/400 avec un message clair. */
const wrapUpload = (multerMiddleware) => (req, res, next) => multerMiddleware(req, res, (err) => {
  if (!err) return next();
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ message: `File too large: each file must be under ${MAX_UPLOAD_MB} MB.` });
  }
  if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({ message: 'Too many files, or an unexpected file field.' });
  }
  return res.status(400).json({ message: err.message || 'Invalid upload.' });
});

module.exports = { wrapUpload };
