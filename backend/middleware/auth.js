const jwt = require('jsonwebtoken');
const { normalizeRole } = require('../utils/roles');

// ============================================
// MIDDLEWARE: verifyToken
// Vérifie le JWT dans le header Authorization
// ============================================
const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({ message: 'Missing token — access denied' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // { id, email, role } — le rôle est normalisé : un seul type de compte « membre »
    // ('author') + 'admin' (voir utils/roles.js ; l'ancien rôle 'reviewer' devient membre).
    req.user = { ...decoded, role: normalizeRole(decoded.role) };
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

module.exports = { verifyToken };
