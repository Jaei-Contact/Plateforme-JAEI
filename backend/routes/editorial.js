const express = require('express');
const router  = express.Router();
const pool    = require('../db/connection');
const { verifyToken } = require('../middleware/auth');

// ── Crée la table si elle n'existe pas ───────────────────────
pool.query(`
  CREATE TABLE IF NOT EXISTS editorial_members (
    id          SERIAL PRIMARY KEY,
    role        VARCHAR(100)  NOT NULL,
    name        VARCHAR(200)  NOT NULL,
    affiliation VARCHAR(300),
    sort_order  INTEGER       DEFAULT 0,
    created_at  TIMESTAMP     DEFAULT NOW(),
    updated_at  TIMESTAMP     DEFAULT NOW()
  )
`).catch(err => console.error('editorial_members table init error:', err.message));

// ── Middleware admin ──────────────────────────────────────────
const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin')
    return res.status(403).json({ message: 'Access restricted to administrators' });
  next();
};

// ============================================================
// GET /api/editorial-board
// Public — Retourne les membres groupés par rôle
// ============================================================
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM editorial_members ORDER BY sort_order ASC, id ASC'
    );

    // On regroupe tous les rôles trouvés en base, dans l'ordre défini
    const ROLE_ORDER = [
      'Editor-in-Chief',
      'Co-Editor-in-Chief',
      'Associate Editors',
      'Scientific Committee',
    ];
    const grouped = {};
    result.rows.forEach(m => {
      if (!grouped[m.role]) grouped[m.role] = [];
      grouped[m.role].push(m);
    });

    // Rôles dans l'ordre défini + rôles restants
    const orderedRoles = [
      ...ROLE_ORDER.filter(r => grouped[r]?.length),
      ...Object.keys(grouped).filter(r => !ROLE_ORDER.includes(r)),
    ];
    const data = orderedRoles.map(r => ({ role: r, members: grouped[r] }));

    res.json({ data });
  } catch (err) {
    console.error('GET /editorial-board :', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// ============================================================
// POST /api/editorial-board
// Admin — Ajoute un membre
// ============================================================
router.post('/', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { role, name, affiliation, sort_order } = req.body;
    if (!role || !name)
      return res.status(400).json({ message: 'Role and name are required' });

    const result = await pool.query(
      `INSERT INTO editorial_members (role, name, affiliation, sort_order)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [role, name, affiliation || null, sort_order || 0]
    );
    res.status(201).json({ member: result.rows[0] });
  } catch (err) {
    console.error('POST /editorial-board :', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// ============================================================
// PUT /api/editorial-board/:id
// Admin — Modifie un membre
// ============================================================
router.put('/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { role, name, affiliation, sort_order } = req.body;
    const result = await pool.query(
      `UPDATE editorial_members
       SET role        = COALESCE($1, role),
           name        = COALESCE($2, name),
           affiliation = COALESCE($3, affiliation),
           sort_order  = COALESCE($4, sort_order),
           updated_at  = NOW()
       WHERE id = $5
       RETURNING *`,
      [role || null, name || null, affiliation ?? null, sort_order ?? null, req.params.id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ message: 'Member not found' });
    res.json({ member: result.rows[0] });
  } catch (err) {
    console.error('PUT /editorial-board/:id :', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// ============================================================
// DELETE /api/editorial-board/:id
// Admin — Supprime un membre
// ============================================================
router.delete('/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM editorial_members WHERE id = $1 RETURNING id',
      [req.params.id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ message: 'Member not found' });
    res.json({ message: 'Member deleted' });
  } catch (err) {
    console.error('DELETE /editorial-board/:id :', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
