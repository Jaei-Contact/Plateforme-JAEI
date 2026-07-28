const express = require('express');
const router = express.Router();
const pool = require('../db/connection');
const { verifyToken } = require('../middleware/auth');

// ============================================================
// JAEI — Notifications de l'utilisateur connecté (Remarque 3)
// ============================================================

// GET /api/notifications  — les 30 dernières + compteur non lues
router.get('/', verifyToken, async (req, res) => {
  try {
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
    res.json({ notifications: list.rows, unread: count.rows[0].unread });
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
