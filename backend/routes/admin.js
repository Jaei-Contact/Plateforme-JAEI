const express = require('express');
const router = express.Router();
const pool = require('../db/connection');
const { verifyToken } = require('../middleware/auth');

const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin only' });
  }
  next();
};

// ────────────────────────────────────────────────────────────
// POST /api/admin/migrate-domains
// Migration one-shot : ancienne taxonomie → nouvelle taxonomie JAEI
// Sécurisé : admin uniquement
// ────────────────────────────────────────────────────────────
router.post('/migrate-domains', verifyToken, requireAdmin, async (req, res) => {
  const LEGACY_MAP = {
    // Groupe 1 — Agroecology and Sustainable Land Use
    'Agronomy':                       'Agroecology and Sustainable Land Use',
    'Agroforestry':                   'Agroecology and Sustainable Land Use',
    'Plant genetics':                 'Agroecology and Sustainable Land Use',
    'Crop production':                'Agroecology and Sustainable Land Use',
    'Soil science':                   'Agroecology and Sustainable Land Use',
    'Plant pathology':                'Agroecology and Sustainable Land Use',
    'Rural engineering & Hydraulics': 'Agroecology and Sustainable Land Use',
    'Rural development':              'Agroecology and Sustainable Land Use',
    'Forestry':                       'Agroecology and Sustainable Land Use',
    // Groupe 2 — Animal and Aquatic Sciences
    'Aquaculture & Fisheries':        'Animal and Aquatic Sciences',
    'Animal nutrition':               'Animal and Aquatic Sciences',
    'Animal production':              'Animal and Aquatic Sciences',
    'Veterinary parasitology':        'Animal and Aquatic Sciences',
    'Animal husbandry':               'Animal and Aquatic Sciences',
    // Groupe 3 — Environmental Science and Pollution Control
    'Ecology':                        'Environmental Science and Pollution Control',
    'Environment & Pollution':        'Environmental Science and Pollution Control',
    'Water sciences':                 'Environmental Science and Pollution Control',
    'Environmental Sciences and Pollution': 'Environmental Science and Pollution Control',
    // Groupe 4 — Interdisciplinary and Emerging Areas
    'Climate change & Agriculture':   'Interdisciplinary and Emerging Areas',
    // Groupe 5 — Socio-Economic
    'Natural resource management':    'Socio-Economic and Policy Dimensions of Natural Resource Use',
    'Agricultural economics':         'Socio-Economic and Policy Dimensions of Natural Resource Use',
    // Groupe 6 — Biotechnology and Biochemistry
    'Agricultural biotechnology':     'Biotechnology and Biochemistry',
    'Soil microbiology':              'Biotechnology and Biochemistry',
    'Biotechnology and Agricultural Innovation': 'Biotechnology and Biochemistry',
  };

  const results = { users: 0, submissions: 0, details: [] };

  try {
    for (const [oldVal, newVal] of Object.entries(LEGACY_MAP)) {
      // Mise à jour des utilisateurs
      const uRes = await pool.query(
        `UPDATE users SET research_area = $1 WHERE research_area = $2 RETURNING id`,
        [newVal, oldVal]
      );
      if (uRes.rowCount > 0) {
        results.users += uRes.rowCount;
        results.details.push({ table: 'users', from: oldVal, to: newVal, count: uRes.rowCount });
      }

      // Mise à jour des soumissions
      const sRes = await pool.query(
        `UPDATE submissions SET research_area = $1 WHERE research_area = $2 RETURNING id`,
        [newVal, oldVal]
      );
      if (sRes.rowCount > 0) {
        results.submissions += sRes.rowCount;
        results.details.push({ table: 'submissions', from: oldVal, to: newVal, count: sRes.rowCount });
      }
    }

    // Migration editorial board : anciens rôles → Co-Editor-in-Chief
    const ebRes = await pool.query(
      `UPDATE editorial_members SET role = 'Co-Editor-in-Chief'
       WHERE role IN ('Co-Editor', 'Associate Editors', 'Associate Editor')
       RETURNING id`,
    );

    res.json({
      message: 'Migration completed',
      users_updated: results.users,
      submissions_updated: results.submissions,
      editorial_roles_updated: ebRes.rowCount,
      details: results.details,
    });
  } catch (err) {
    console.error('POST /admin/migrate-domains :', err.message);
    res.status(500).json({ message: 'Migration failed', error: err.message });
  }
});

// ────────────────────────────────────────────────────────────
// GET /api/admin/domain-audit
// Vérifie les valeurs de research_area non reconnues en DB
// ────────────────────────────────────────────────────────────
const VALID_DOMAINS = [
  'Agroecology and Sustainable Land Use',
  'Animal and Aquatic Sciences',
  'Environmental Science and Pollution Control',
  'Biotechnology and Biochemistry',
  'Socio-Economic and Policy Dimensions of Natural Resource Use',
  'Interdisciplinary and Emerging Areas',
  'Language, Communication, and Knowledge Translation',
];

router.get('/domain-audit', verifyToken, requireAdmin, async (req, res) => {
  try {
    const uRes = await pool.query(
      `SELECT research_area, COUNT(*) AS nb FROM users GROUP BY research_area ORDER BY nb DESC`
    );
    const sRes = await pool.query(
      `SELECT research_area, COUNT(*) AS nb FROM submissions GROUP BY research_area ORDER BY nb DESC`
    );

    const flag = (rows) => rows.map(r => ({
      value: r.research_area,
      count: parseInt(r.nb),
      valid: !r.research_area || VALID_DOMAINS.some(d =>
        d === r.research_area || Object.values(require('../db/connection')) // just flag
      ),
    }));

    res.json({
      users: uRes.rows,
      submissions: sRes.rows,
      valid_domains: VALID_DOMAINS,
    });
  } catch (err) {
    console.error('GET /admin/domain-audit :', err.message);
    res.status(500).json({ message: 'Audit failed', error: err.message });
  }
});

module.exports = router;
