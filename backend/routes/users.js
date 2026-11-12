const express = require('express');
const router = express.Router();
const pool = require('../db/connection');
const { verifyToken } = require('../middleware/auth');
const { MEMBER_ROLE, ADMIN_ROLE, normalizeRole } = require('../utils/roles');

const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access restricted to administrators' });
  }
  next();
};

// ────────────────────────────────────────────────────────────
// GET /api/users  — Liste tous les utilisateurs (admin)
// Query params: ?research_area=xxx  (optionnel)
// Un seul type de compte « membre » + les admins. `reviews_count` = relectures confiées
// (hors invitations déclinées) : un membre qui en a au moins une est un « reviewer ».
// ────────────────────────────────────────────────────────────
router.get('/', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { research_area } = req.query;
    let query  = `SELECT u.id, u.first_name, u.last_name, u.email, u.role, u.institution,
                         u.country, u.research_area, u.avatar_url, u.created_at,
                         COALESCE(u.available_to_review, FALSE) AS available_to_review,
                         COALESCE(u.profile_completed, TRUE) AS profile_completed,
                         (SELECT COUNT(*) FROM reviews r
                           WHERE r.reviewer_id = u.id AND r.status <> 'declined')::int AS reviews_count,
                         (SELECT COUNT(*) FROM submissions s WHERE s.author_id = u.id)::int AS submissions_count
                  FROM users u`;
    const params = [];
    if (research_area) {
      params.push(research_area);
      query += ` WHERE u.research_area = $1`;
    }
    query += ` ORDER BY u.created_at DESC`;
    const result = await pool.query(query, params);
    res.json({ users: result.rows.map(u => ({ ...u, role: normalizeRole(u.role) })) });
  } catch (err) {
    console.error('GET /users :', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// ────────────────────────────────────────────────────────────
// PATCH /api/users/:id/role  — Changer le rôle d'un utilisateur
//   Deux valeurs : 'author' (= membre, alias 'member') ou 'admin' (équipe éditoriale).
// ────────────────────────────────────────────────────────────
router.patch('/:id/role', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const requested = req.body.role === 'member' ? MEMBER_ROLE : req.body.role;
    const VALID_ROLES = [MEMBER_ROLE, ADMIN_ROLE];

    if (!VALID_ROLES.includes(requested)) {
      return res.status(400).json({ message: `Invalid role. Accepted values: ${VALID_ROLES.join(', ')} (author = member)` });
    }

    const result = await pool.query(
      `UPDATE users SET role = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, first_name, last_name, email, role`,
      [requested, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'Role updated', user: result.rows[0] });
  } catch (err) {
    console.error('PATCH /users/:id/role :', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// ────────────────────────────────────────────────────────────
// DELETE /api/users/:id  — Supprimer un utilisateur (admin)
// ────────────────────────────────────────────────────────────
router.delete('/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent self-deletion
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ message: 'You cannot delete your own account' });
    }

    const result = await pool.query(
      'DELETE FROM users WHERE id = $1 RETURNING id, email, role',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'User deleted', user: result.rows[0] });
  } catch (err) {
    console.error('DELETE /users/:id :', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
