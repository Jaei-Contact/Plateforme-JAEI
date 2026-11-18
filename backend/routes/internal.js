const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const { runStallCheck } = require('../services/stallService');

// ============================================================
// JAEI — Routes internes (tâches planifiées)
// Protégées par un secret partagé (variable CRON_SECRET, en-tête X-Cron-Secret) : jamais de jeton utilisateur.
// ============================================================

// POST /api/internal/stall-check — surveillance du temps de réaction des éditeurs (utils/waiting.js).
// Appelée chaque jour par la tâche planifiée GitHub (.github/workflows/stall-check.yml) ; sans CRON_SECRET : 503.
// Idempotente : une notification n'est créée qu'une fois par blocage. Ne renvoie que des compteurs.
router.post('/stall-check', async (req, res) => {
  const secret = process.env.CRON_SECRET;
  if (!secret) return res.status(503).json({ message: 'Not configured' });
  const given = Buffer.from(String(req.headers['x-cron-secret'] || ''));
  const wanted = Buffer.from(secret);
  if (given.length !== wanted.length || !crypto.timingSafeEqual(given, wanted)) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  try {
    res.json(await runStallCheck());
  } catch (err) {
    console.error('POST /internal/stall-check :', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
