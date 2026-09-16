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
// GET /api/admin/schema-health
// Diagnostic du schéma réellement présent en base (16/09).
// Permet de vérifier en un appel si les migrations sont bien passées
// en production — sans avoir à lire les logs Render.
// ────────────────────────────────────────────────────────────
const REQUIRED_SCHEMA = {
  notifications: ['id', 'user_id', 'type', 'title', 'body', 'submission_id', 'link', 'read_at'],
  reviews:       ['accepted_at', 'declined_at', 'invitation_token', 'updated_at',
                  'confidential_comments', 'review_file_url'],
  submissions:   ['editor_id', 'editor_assigned_at', 'apc_paid', 'apc_paid_at',
                  'published_pdf_url', 'manuscript_number', 'authors'],
};

router.get('/schema-health', verifyToken, requireAdmin, async (req, res) => {
  try {
    const missing = {};
    for (const [table, columns] of Object.entries(REQUIRED_SCHEMA)) {
      const found = await pool.query(
        `SELECT column_name FROM information_schema.columns WHERE table_name = $1`, [table]
      );
      const names = found.rows.map(r => r.column_name);
      if (names.length === 0) { missing[table] = ['(table absente)']; continue; }
      const gaps = columns.filter(c => !names.includes(c));
      if (gaps.length) missing[table] = gaps;
    }

    // Contraintes CHECK : doivent accepter les statuts/recommandations récents
    const checks = await pool.query(
      `SELECT conname, pg_get_constraintdef(oid) AS def
         FROM pg_constraint
        WHERE conrelid IN ('submissions'::regclass, 'reviews'::regclass) AND contype = 'c'`
    );
    const constraintIssues = [];
    for (const c of checks.rows) {
      if (c.conname === 'submissions_status_check') {
        for (const v of ['withdrawn', 'sent_back', 'major_revision', 'minor_revision']) {
          if (!c.def.includes(v)) constraintIssues.push(`submissions_status_check rejette "${v}"`);
        }
      }
      if (c.conname === 'reviews_recommendation_check' && !c.def.includes('revise')) {
        constraintIssues.push('reviews_recommendation_check rejette "revise"');
      }
    }

    const healthy = Object.keys(missing).length === 0 && constraintIssues.length === 0;
    res.json({
      healthy,
      missing_columns: missing,
      constraint_issues: constraintIssues,
      hint: healthy
        ? 'Schéma à jour.'
        : 'Redémarre le backend (les migrations sont désormais indépendantes) puis relance ce diagnostic.',
    });
  } catch (err) {
    console.error('GET /admin/schema-health :', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

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
    // Groupe 2 — Livestock Sciences / Aquatic Biosciences (Remarque 15)
    'Aquaculture & Fisheries':        'Aquatic Biosciences',
    'Animal nutrition':               'Livestock Sciences',
    'Animal production':              'Livestock Sciences',
    'Veterinary parasitology':        'Livestock Sciences',
    'Animal husbandry':               'Livestock Sciences',
    'Animal and Aquatic Sciences':    'Livestock Sciences',
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
  'Livestock Sciences',
  'Aquatic Biosciences',
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
      valid: !r.research_area || VALID_DOMAINS.includes(r.research_area),
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
