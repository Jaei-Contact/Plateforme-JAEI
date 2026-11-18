const express = require('express');
const router = express.Router();
const pool = require('../db/connection');
const { verifyToken } = require('../middleware/auth');
const { analyzeAuthorship } = require('../utils/authorship');
const { getEditorInChief } = require('../services/settingsService');
const { takeChargeOpen } = require('../utils/chief');
const { loadWaiting, maybeRunStallCheck } = require('../services/stallService');

// ============================================================
// JAEI — Notifications de l'utilisateur connecté (Remarque 3)
// ============================================================

// GET /api/notifications  — les 30 dernières + compteur non lues
// `take_charge_available` (14/11/2026) : pour une notification « Editor needed » (manuscrit de l'éditeur en chef),
// vrai tant qu'aucun éditeur n'a pris la charge et que l'utilisateur peut le faire → bouton « Take charge » dans la cloche.
router.get('/', verifyToken, async (req, res) => {
  try {
    // Surveillance du temps de réaction des éditeurs (17/11/2026) : contrôle « paresseux » quand un administrateur
    // ouvre ses notifications (au plus toutes les 30 min, en arrière-plan) — en plus de la tâche planifiée quotidienne
    if (req.user.role === 'admin') maybeRunStallCheck();
    const [list, count] = await Promise.all([
      pool.query(
        `SELECT id, type, title, body, submission_id, link, read_at, created_at
           FROM notifications
          WHERE user_id = $1
          ORDER BY created_at DESC
          LIMIT 30`,
        [req.user.id]
      ),
      pool.query(
        'SELECT COUNT(*)::int AS unread FROM notifications WHERE user_id = $1 AND read_at IS NULL',
        [req.user.id]
      ),
    ]);
    const takeChargeIds = [...new Set(list.rows
      .filter(n => n.type === 'take_charge_request' && n.submission_id)
      .map(n => n.submission_id))];
    const available = new Map();
    if (takeChargeIds.length > 0 && req.user.role === 'admin') {
      const chief = await getEditorInChief();
      const subs = await pool.query(
        `SELECT s.id, s.author_id, s.authors, s.editor_id, u.email AS submitter_email
           FROM submissions s JOIN users u ON u.id = s.author_id WHERE s.id = ANY($1)`,
        [takeChargeIds]
      );
      for (const s of subs.rows) {
        const viewerIsAuthor = analyzeAuthorship(s, { userId: req.user.id, email: req.user.email }).isAuthor;
        // Sans éditeur en charge, ou dont l'éditeur ne réagit plus depuis 14 jours (jamais l'éditeur en place lui-même)
        const stalled = s.editor_id ? !!(await loadWaiting(s.id))?.stalled : false;
        available.set(s.id, !viewerIsAuthor && s.editor_id !== req.user.id && takeChargeOpen(s, chief, stalled));
      }
    }
    res.json({
      notifications: list.rows.map(n => ({ ...n, take_charge_available: !!available.get(n.submission_id) })),
      unread: count.rows[0].unread,
    });
  } catch (err) {
    console.error('GET /notifications :', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// PATCH /api/notifications/read  — tout marquer comme lu
router.patch('/read', verifyToken, async (req, res) => {
  try {
    await pool.query(
      'UPDATE notifications SET read_at = NOW() WHERE user_id = $1 AND read_at IS NULL',
      [req.user.id]
    );
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    console.error('PATCH /notifications/read :', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// PATCH /api/notifications/:id/read  — marquer une notification comme lue
router.patch('/:id/read', verifyToken, async (req, res) => {
  try {
    await pool.query(
      'UPDATE notifications SET read_at = NOW() WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    res.json({ message: 'Notification marked as read' });
  } catch (err) {
    console.error('PATCH /notifications/:id/read :', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
