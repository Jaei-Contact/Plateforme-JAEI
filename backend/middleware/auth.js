const jwt = require('jsonwebtoken');

// ============================================
// MIDDLEWARE: verifyToken
// Vérifie le JWT dans le header Authorization
// ============================================
const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({ message: 'Token manquant — accès refusé' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, email, role }
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token invalide ou expiré' });
  }
};

module.exports = { verifyToken };
