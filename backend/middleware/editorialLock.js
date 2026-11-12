// ============================================================
// JAEI — Verrou éditorial (conflit d'intérêts des éditeurs)
//
// Tout le monde peut désormais soumettre un article, y compris les membres du
// comité (comptes admin). Règle : un administrateur qui est auteur ou co-auteur
// d'un manuscrit n'a AUCUN accès éditorial dessus (changer le statut, assigner
// des relecteurs, écrire à l'auteur, marquer l'APC, publier, supprimer…) :
// un autre éditeur le traite.
//
// Ne concerne que les administrateurs ; pour les autres comptes le middleware
// laisse passer (leurs droits sont vérifiés par la route elle-même).
// ============================================================

const { authorshipOf } = require('../utils/authorship');

const EDITORIAL_LOCK_MESSAGE =
  'You are an author of this manuscript, so it must be handled by another editor.';

/**
 * @param {'params'|'body'} source  où lire l'identifiant du manuscrit
 * @param {string} field            nom du paramètre (« id » ou « submission_id »)
 */
const editorialLock = (source = 'params', field = 'id') => async (req, res, next) => {
  try {
    if (req.user?.role !== 'admin') return next();
    const submissionId = (source === 'body' ? req.body : req.params)?.[field];
    if (!submissionId) return next();   // la route renverra son propre message d'erreur
    const link = await authorshipOf(submissionId, { userId: req.user.id, email: req.user.email });
    if (link.isAuthor) {
      return res.status(403).json({ message: EDITORIAL_LOCK_MESSAGE, editorial_lock: true });
    }
    next();
  } catch (err) {
    console.error('editorialLock :', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { editorialLock, EDITORIAL_LOCK_MESSAGE };
