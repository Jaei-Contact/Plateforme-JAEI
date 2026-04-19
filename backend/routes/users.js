const express = require('express');
const router = express.Router();
const pool = require('../db/connection');
const { verifyToken } = require('../middleware/auth');

const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access restricted to administrators' });
  }
  next();
};

// ────────────────────────────────────────────────────────────
// GET /api/users  — Liste tous les utilisateurs (admin)
// Query params: ?research_area=xxx  (optionnel)
// ────────────────────────────────────────────────────────────
router.get('/', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { research_area } = req.query;
    let query  = `SELECT id, first_name, last_name, email, role, institution,
                         country, research_area, avatar_url, created_at
                  FROM users`;
    const params = [];
    if (research_area) {
      params.push(research_area);
      query += ` WHERE research_area = $1`;
    }
    query += ` ORDER BY created_at DESC`;
    const result = await pool.query(query, params);
    res.json({ users: result.rows });
  } catch (err) {
    console.error('GET /users :', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// ────────────────────────────────────────────────────────────
// PATCH /api/users/:id/role  — Changer le rôle d'un utilisateur
// ────────────────────────────────────────────────────────────
router.patch('/:id/role', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    const VALID_ROLES = ['author', 'reviewer', 'admin'];

    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({ message: `Invalid role. Accepted values: ${VALID_ROLES.join(', ')}` });
    }

    const result = await pool.query(
      `UPDATE users SET role = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, first_name, last_name, email, role`,
      [role, id]
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
